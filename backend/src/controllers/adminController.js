import mongoose from 'mongoose';
import ApplicationMethod from '../models/ApplicationMethod.js';
import Crop from '../models/Crop.js';
import Order from '../models/Order.js';
import Problem from '../models/Problem.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

export async function getAdminStats(req, res) {
  try {
    const [
      totalProducts,
      totalActiveProducts,
      totalFarmers,
      totalCrops,
      totalProblems,
      totalMethods,
      totalOrders,
      lowStockProducts,
      recentFarmers,
      recentProducts,
      recentOrders,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'farmer' }),
      Crop.countDocuments(),
      Problem.countDocuments(),
      ApplicationMethod.countDocuments(),
      Order.countDocuments(),
      Product.find({ stock: { $lte: 10 } })
        .sort({ stock: 1 })
        .limit(10)
        .lean(),
      User.find({ role: 'farmer' })
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Product.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return res.status(200).json({
      stats: {
        totalProducts,
        totalActiveProducts,
        totalFarmers,
        totalCrops,
        totalProblems,
        totalMethods,
        totalOrders,
      },
      lowStockProducts,
      recentFarmers,
      recentProducts,
      recentOrders,
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return res.status(500).json({ message: 'Unable to retrieve dashboard statistics.' });
  }
}

export async function getUsers(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));

    const filter = { role: req.query.role || 'farmer' };

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.search?.trim()) {
      const exp = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [{ name: exp }, { email: exp }, { phone: exp }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return res.status(500).json({ message: 'Unable to retrieve users.' });
  }
}

export async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Status must be either "active" or "inactive".' });
  }

  // SECURITY: Never allow an admin to accidentally deactivate their own account
  if (req.user?._id?.toString() === id && status === 'inactive') {
    return res.status(400).json({ message: 'Security restriction: You cannot deactivate your own account.' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      message: `User account has been set to ${status}.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Failed to update user status:', error);
    return res.status(500).json({ message: 'Unable to update user status.' });
  }
}
