import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables.');
  }
  return jwt.sign(
    { id: user._id, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

export async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body || {};

    const errors = {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length > 100) {
      errors.name = 'Name cannot exceed 100 characters.';
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim().toLowerCase())) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors,
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email address already exists.',
      });
    }

    // SECURITY: Public registration ALWAYS creates a 'farmer' account.
    // User cannot supply their own role or status.
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password,
      role: 'farmer',
      status: 'active',
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }
    return res.status(500).json({ message: 'Unable to complete registration. Please try again later.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide both email and password.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Query user and explicitly include password for bcrypt verification
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Account is deactivated. Please contact support.',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to process login. Please try again later.' });
  }
}

export async function getMe(req, res) {
  try {
    // req.user is set by the protect middleware
    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ message: 'Unable to fetch user profile.' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, phone, primaryRegion } = req.body || {};
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name && typeof name === 'string') {
      const cleanName = name.trim();
      if (!cleanName) {
        return res.status(400).json({ message: 'Name cannot be blank.' });
      }
      if (cleanName.length > 100) {
        return res.status(400).json({ message: 'Name cannot exceed 100 characters.' });
      }
      user.name = cleanName;
    }

    if (phone !== undefined) {
      const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
      if (cleanPhone.length > 20) {
        return res.status(400).json({ message: 'Phone number cannot exceed 20 characters.' });
      }
      user.phone = cleanPhone;
    }

    if (primaryRegion !== undefined) {
      const cleanRegion = typeof primaryRegion === 'string' ? primaryRegion.trim() : '';
      if (cleanRegion.length > 100) {
        return res.status(400).json({ message: 'Primary region cannot exceed 100 characters.' });
      }
      user.primaryRegion = cleanRegion;
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Unable to update profile.' });
  }
}

export async function addSavedAddress(req, res) {
  try {
    const { title, name, phone, village, district, state, pincode, acreage, isDefault } = req.body || {};

    const errors = {};
    if (!name || !String(name).trim()) errors.name = 'Contact name is required.';
    if (!phone || !String(phone).trim()) errors.phone = 'Phone number is required.';
    if (!village || !String(village).trim()) errors.village = 'Village / Town is required.';
    if (!district || !String(district).trim()) errors.district = 'District is required.';
    if (!state || !String(state).trim()) errors.state = 'State is required.';
    if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) {
      errors.pincode = 'Valid 6-digit pincode is required.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Validation failed for address.', errors });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const makeDefault = Boolean(isDefault) || user.savedAddresses.length === 0;
    if (makeDefault) {
      user.savedAddresses.forEach((addr) => {
        addr.isDefault = false;
      });
    }

    user.savedAddresses.push({
      title: title?.trim() || 'Farm',
      name: String(name).trim(),
      phone: String(phone).trim(),
      village: String(village).trim(),
      district: String(district).trim(),
      state: String(state).trim(),
      pincode: String(pincode).trim(),
      acreage: Math.max(0, Number(acreage) || 0),
      isDefault: makeDefault,
    });

    await user.save();

    return res.status(201).json({
      message: 'Address saved successfully.',
      savedAddresses: user.savedAddresses,
    });
  } catch (error) {
    console.error('Add address error:', error);
    return res.status(500).json({ message: 'Unable to save address.' });
  }
}

export async function updateSavedAddress(req, res) {
  try {
    const { addressId } = req.params;
    const { title, name, phone, village, district, state, pincode, acreage, isDefault } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const address = user.savedAddresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Saved address not found.' });
    }

    if (name !== undefined) address.name = String(name).trim();
    if (phone !== undefined) address.phone = String(phone).trim();
    if (village !== undefined) address.village = String(village).trim();
    if (district !== undefined) address.district = String(district).trim();
    if (state !== undefined) address.state = String(state).trim();
    if (pincode !== undefined) {
      const cleanPincode = String(pincode).trim();
      if (!/^\d{6}$/.test(cleanPincode)) {
        return res.status(400).json({ message: 'Pincode must be exactly 6 digits.' });
      }
      address.pincode = cleanPincode;
    }
    if (title !== undefined) address.title = String(title).trim() || 'Farm';
    if (acreage !== undefined) address.acreage = Math.max(0, Number(acreage) || 0);

    if (isDefault) {
      user.savedAddresses.forEach((addr) => {
        addr.isDefault = addr._id.toString() === addressId;
      });
    }

    await user.save();

    return res.status(200).json({
      message: 'Address updated successfully.',
      savedAddresses: user.savedAddresses,
    });
  } catch (error) {
    console.error('Update address error:', error);
    return res.status(500).json({ message: 'Unable to update address.' });
  }
}

export async function deleteSavedAddress(req, res) {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const addressIndex = user.savedAddresses.findIndex((a) => a._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found.' });
    }

    const wasDefault = user.savedAddresses[addressIndex].isDefault;
    user.savedAddresses.splice(addressIndex, 1);

    if (wasDefault && user.savedAddresses.length > 0) {
      user.savedAddresses[0].isDefault = true;
    }

    await user.save();

    return res.status(200).json({
      message: 'Address removed successfully.',
      savedAddresses: user.savedAddresses,
    });
  } catch (error) {
    console.error('Delete address error:', error);
    return res.status(500).json({ message: 'Unable to delete address.' });
  }
}

export async function setDefaultSavedAddress(req, res) {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let found = false;
    user.savedAddresses.forEach((addr) => {
      if (addr._id.toString() === addressId) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    if (!found) {
      return res.status(404).json({ message: 'Address not found.' });
    }

    await user.save();

    return res.status(200).json({
      message: 'Default address updated.',
      savedAddresses: user.savedAddresses,
    });
  } catch (error) {
    console.error('Set default address error:', error);
    return res.status(500).json({ message: 'Unable to update default address.' });
  }
}
