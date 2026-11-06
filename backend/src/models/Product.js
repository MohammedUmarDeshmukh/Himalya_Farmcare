import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema(
  {
    size: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    brand: { type: String, trim: true, maxlength: 120 },
    company: { type: String, trim: true, maxlength: 120 },
    crop: { type: String, required: true, trim: true, maxlength: 80 },
    problem: { type: String, required: true, trim: true, maxlength: 80 },
    applicationMethod: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, trim: true, maxlength: 80 },
    sequence: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true, maxlength: 2000 },
    image: { type: String, trim: true, maxlength: 500 },
    dosagePerAcre: { type: Number, min: 0 },
    dosageUnit: { type: String, trim: true, maxlength: 30 },
    availableSizes: [{ type: Number, min: 1 }],
    prices: { type: [priceSchema], default: undefined },
    stock: { type: Number, min: 0, default: 50 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true },
);

productSchema.index(
  { name: 1, crop: 1, problem: 1, applicationMethod: 1, sequence: 1 },
  { unique: true },
);

export default mongoose.model('Product', productSchema);
