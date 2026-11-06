import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required.'],
    },
    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
    },
    crop: { type: String, trim: true },
    problem: { type: String, trim: true },
    applicationMethod: { type: String, trim: true },
    sizeMl: {
      type: Number,
      required: [true, 'Size in ml is required.'],
      min: [1, 'Size must be at least 1 ml.'],
    },
    qty: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Quantity must be at least 1.'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required.'],
      min: [0, 'Unit price cannot be negative.'],
    },
    lineTotal: {
      type: Number,
      required: [true, 'Line total is required.'],
      min: [0, 'Line total cannot be negative.'],
    },
    dosagePerAcre: { type: Number },
    dosageUnit: { type: String, trim: true },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
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
      required: [true, 'Village or town is required.'],
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
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required.'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required.'],
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'At least one order item is required.'],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item.',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required.'],
      min: [0, 'Subtotal cannot be negative.'],
    },
    taxAmount: {
      type: Number,
      required: [true, 'Tax amount is required.'],
      min: [0, 'Tax amount cannot be negative.'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required.'],
      min: [0, 'Total amount cannot be negative.'],
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, 'Shipping address is required.'],
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['Cash on Delivery', 'COD'],
        message: '{VALUE} is not a supported payment method.',
      },
      default: 'Cash on Delivery',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
        message: '{VALUE} is not a valid order status.',
      },
      default: 'pending',
      index: true,
    },
    stockDeducted: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters.'],
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('Order', orderSchema);
