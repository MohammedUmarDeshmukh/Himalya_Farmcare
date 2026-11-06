import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const savedAddressSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [60, 'Title cannot exceed 60 characters.'],
      default: 'Farm',
    },
    name: {
      type: String,
      required: [true, 'Contact name is required.'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters.'],
    },
    village: {
      type: String,
      required: [true, 'Village / Town is required.'],
      trim: true,
      maxlength: [120, 'Village cannot exceed 120 characters.'],
    },
    district: {
      type: String,
      required: [true, 'District is required.'],
      trim: true,
      maxlength: [120, 'District cannot exceed 120 characters.'],
    },
    state: {
      type: String,
      required: [true, 'State is required.'],
      trim: true,
      maxlength: [120, 'State cannot exceed 120 characters.'],
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required.'],
      trim: true,
      match: [/^\d{6}$/, 'Pincode must be a 6-digit number.'],
    },
    acreage: {
      type: Number,
      min: [0, 'Acreage cannot be negative.'],
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address.'],
      maxlength: [120, 'Email cannot exceed 120 characters.'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Phone number cannot exceed 20 characters.'],
    },
    primaryRegion: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Primary farming region cannot exceed 100 characters.'],
    },
    savedAddresses: {
      type: [savedAddressSchema],
      default: [],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [6, 'Password must be at least 6 characters long.'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['farmer', 'admin'],
        message: '{VALUE} is not a valid role.',
      },
      default: 'farmer',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status.',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Ensure password is never included in JSON output
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
