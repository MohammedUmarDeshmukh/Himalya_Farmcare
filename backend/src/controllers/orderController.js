import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

function getProductPrice(product, sizeMl) {
  const size = Number(sizeMl);
  if (Array.isArray(product.prices) && product.prices.length > 0) {
    const match = product.prices.find((p) => Number(p.size) === size);
    if (match && typeof match.amount === 'number' && match.amount >= 0) {
      return match.amount;
    }
  }
  // Fallback to legacy flat fields p100 / p500 if present
  if (size === 100 && typeof product.p100 === 'number') return product.p100;
  if (size === 500 && typeof product.p500 === 'number') return product.p500;
  return null;
}

export async function createOrder(req, res) {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body || {};

    // 1. Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Order must include at least one product item.',
      });
    }

    // 2. Validate shipping address
    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return res.status(400).json({
        message: 'Shipping delivery address is required.',
      });
    }

    const { name, phone, village, district, state, pincode } = shippingAddress;
    const errors = {};
    if (!name || !name.trim()) errors.name = 'Full name is required.';
    if (!phone || !phone.trim()) errors.phone = 'Phone number is required.';
    if (!village || !village.trim()) errors.village = 'Village / Town is required.';
    if (!district || !district.trim()) errors.district = 'District is required.';
    if (!state || !state.trim()) errors.state = 'State is required.';
    if (!pincode || !/^\d{6}$/.test(String(pincode).trim())) {
      errors.pincode = 'Pincode must be a valid 6-digit number.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed for shipping address.',
        errors,
      });
    }

    // 3. Look up trusted product data, prices, and stock
    const processedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { productId, sizeMl, qty } = item || {};

      if (!productId || !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: `Invalid product ID: "${productId}".` });
      }

      const quantity = Math.max(1, Number.parseInt(qty, 10) || 1);
      const size = Number(sizeMl);

      if (!size || size <= 0) {
        return res.status(400).json({ message: 'Valid bottle size (ml) is required.' });
      }

      const product = await Product.findById(productId);
      if (!product || product.status !== 'active') {
        return res.status(400).json({
          message: `Product "${product?.name || productId}" is not available for purchase.`,
        });
      }

      const unitPrice = getProductPrice(product, size);
      if (unitPrice === null) {
        return res.status(400).json({
          message: `Price for size ${size} ml not found for product "${product.name}".`,
        });
      }

      // Check current stock
      const currentStock = typeof product.stock === 'number' ? product.stock : 50;
      if (currentStock < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Only ${currentStock} unit(s) available.`,
        });
      }

      const lineTotal = Number((unitPrice * quantity).toFixed(2));
      subtotal += lineTotal;

      processedItems.push({
        productId: product._id,
        name: product.name,
        crop: product.crop,
        problem: product.problem,
        applicationMethod: product.applicationMethod,
        sizeMl: size,
        qty: quantity,
        unitPrice,
        lineTotal,
        dosagePerAcre: product.dosagePerAcre,
        dosageUnit: product.dosageUnit,
      });
    }

    // 4. Atomic Inventory Deduction with Rollback Protection
    const successfullyDeducted = [];
    for (const item of processedItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } },
        { new: true },
      );

      if (!updatedProduct) {
        // Rollback any previously deducted items in this order
        for (const prev of successfullyDeducted) {
          await Product.findByIdAndUpdate(prev.productId, { $inc: { stock: prev.qty } });
        }
        return res.status(400).json({
          message: `Insufficient stock for product "${item.name}". Stock was reserved by another order. Please try again.`,
        });
      }

      successfullyDeducted.push(item);
    }

    // 5. Calculate GST (5%) & Grand Total
    const taxAmount = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    // 6. Generate Unique Order Number
    let orderNumber = generateOrderNumber();
    let attempts = 0;
    while ((await Order.exists({ orderNumber })) && attempts < 5) {
      orderNumber = generateOrderNumber();
      attempts += 1;
    }

    // 7. Persist Order in MongoDB
    const order = await Order.create({
      orderNumber,
      farmer: req.user._id,
      items: processedItems,
      subtotal,
      taxAmount,
      totalAmount,
      shippingAddress: {
        name: name.trim(),
        phone: phone.trim(),
        village: village.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: String(pincode).trim(),
      },
      paymentMethod: paymentMethod === 'COD' ? 'Cash on Delivery' : (paymentMethod || 'Cash on Delivery'),
      paymentStatus: 'pending',
      orderStatus: 'pending',
      stockDeducted: true,
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    return res.status(201).json({
      message: 'Order placed successfully.',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      message: 'Failed to place order. Please try again later.',
    });
  }
}

export async function getMyOrders(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));

    const filter = { farmer: req.user._id };
    if (req.query.status && req.query.status !== 'all') {
      filter.orderStatus = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    return res.status(500).json({ message: 'Unable to retrieve your orders.' });
  }
}

export async function getOrderById(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order ID.' });
  }

  try {
    const order = await Order.findById(id).populate('farmer', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Security check: Only the owner farmer or an admin can access this order
    const isOwner = order.farmer?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'You are not authorized to view this order.',
      });
    }

    return res.status(200).json({ data: order });
  } catch (error) {
    console.error('Get order by ID error:', error);
    return res.status(500).json({ message: 'Unable to retrieve order details.' });
  }
}

export async function cancelMyOrder(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order ID.' });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Security check: Owner farmer or admin
    const isOwner = order.farmer?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'You are not authorized to cancel this order.',
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'This order is already cancelled.' });
    }

    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      return res.status(400).json({
        message: `Orders with status "${order.orderStatus}" cannot be cancelled.`,
      });
    }

    // Restore stock if previously deducted
    if (order.stockDeducted) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.qty },
        });
      }
      order.stockDeducted = false;
    }

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'cancelled';
    await order.save();

    return res.status(200).json({
      message: 'Order cancelled successfully and inventory restored.',
      data: order,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({ message: 'Unable to cancel order.' });
  }
}

export async function getAdminOrders(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 15));

    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.orderStatus = req.query.status;
    }

    if (req.query.search?.trim()) {
      const searchExp = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { orderNumber: searchExp },
        { 'shippingAddress.name': searchExp },
        { 'shippingAddress.phone': searchExp },
        { 'shippingAddress.village': searchExp },
        { 'shippingAddress.district': searchExp },
      ];
    }

    if (req.query.farmer && mongoose.isValidObjectId(req.query.farmer)) {
      filter.farmer = req.query.farmer;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('farmer', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    return res.status(500).json({ message: 'Unable to retrieve orders.' });
  }
}

export async function adminUpdateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid order ID.' });
  }

  const allowedStatuses = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: `Invalid status. Allowed values are: ${allowedStatuses.join(', ')}.`,
    });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Do not allow transitioning away from cancelled without explicit logic
    if (order.orderStatus === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({
        message: 'Cancelled orders cannot be reopened because stock has already been returned to inventory.',
      });
    }

    // Handle transition to cancelled -> restore inventory safely
    if (status === 'cancelled' && order.stockDeducted) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.qty },
        });
      }
      order.stockDeducted = false;
      order.paymentStatus = 'cancelled';
    }

    // Handle delivered -> mark payment as paid if Cash on Delivery
    if (status === 'delivered') {
      order.paymentStatus = 'paid';
    }

    order.orderStatus = status;
    await order.save();

    return res.status(200).json({
      message: `Order status updated to "${status}".`,
      data: order,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ message: 'Unable to update order status.' });
  }
}

export function sanitizeCsvValue(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Prevent spreadsheet formula injection (CWE-1236)
  if (/^[=+\-@\t\r|]/.test(str) || /^[=+\-@\t\r|]/.test(str.trim())) {
    str = `'${str.trim()}`;
  } else {
    str = str.trim();
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export async function exportAdminOrdersCSV(req, res) {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.orderStatus = req.query.status;
    }

    if (req.query.search?.trim()) {
      const searchExp = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { orderNumber: searchExp },
        { 'shippingAddress.name': searchExp },
        { 'shippingAddress.phone': searchExp },
        { 'shippingAddress.village': searchExp },
        { 'shippingAddress.district': searchExp },
      ];
    }

    const orders = await Order.find(filter)
      .populate('farmer', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Order Number',
      'Order Date',
      'Customer Name',
      'Phone',
      'Village',
      'District',
      'State',
      'Pincode',
      'Products Summary',
      'Total Items (Bottles)',
      'Subtotal (INR)',
      'GST 5% (INR)',
      'Grand Total (INR)',
      'Payment Method',
      'Payment Status',
      'Order Status',
    ];

    const rows = orders.map((order) => {
      const dateStr = new Date(order.createdAt).toISOString().slice(0, 10);
      const customerName = order.shippingAddress?.name || order.farmer?.name || '';
      const phone = order.shippingAddress?.phone || order.farmer?.phone || '';
      const village = order.shippingAddress?.village || '';
      const district = order.shippingAddress?.district || '';
      const state = order.shippingAddress?.state || '';
      const pincode = order.shippingAddress?.pincode || '';

      const productsSummary = (order.items || [])
        .map((i) => `${i.name} (${i.sizeMl}ml x ${i.qty})`)
        .join('; ');
      const totalBottles = (order.items || []).reduce((sum, i) => sum + i.qty, 0);

      return [
        sanitizeCsvValue(order.orderNumber),
        sanitizeCsvValue(dateStr),
        sanitizeCsvValue(customerName),
        sanitizeCsvValue(phone),
        sanitizeCsvValue(village),
        sanitizeCsvValue(district),
        sanitizeCsvValue(state),
        sanitizeCsvValue(pincode),
        sanitizeCsvValue(productsSummary),
        sanitizeCsvValue(totalBottles),
        sanitizeCsvValue(order.subtotal?.toFixed(2) || '0.00'),
        sanitizeCsvValue(order.taxAmount?.toFixed(2) || '0.00'),
        sanitizeCsvValue(order.totalAmount?.toFixed(2) || '0.00'),
        sanitizeCsvValue(order.paymentMethod || 'COD'),
        sanitizeCsvValue(order.paymentStatus || 'pending'),
        sanitizeCsvValue(order.orderStatus || 'pending'),
      ].join(',');
    });

    const csvContent = [headers.map(sanitizeCsvValue).join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="himalaya_orders_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ message: 'Unable to export orders CSV.' });
  }
}
