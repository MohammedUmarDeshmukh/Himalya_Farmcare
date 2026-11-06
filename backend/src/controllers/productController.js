import mongoose from 'mongoose';
import { removeProductImageFile } from '../middleware/uploadMiddleware.js';
import Product from '../models/Product.js';

const sortableFields = new Set(['name', 'crop', 'problem', 'applicationMethod', 'sequence', 'status', 'createdAt', 'updatedAt']);

function asList(value) {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function addListFilter(filters, key, value) {
  if (!value) return;
  const values = asList(value);
  if (values.length) filters[key] = values.length === 1 ? values[0] : { $in: values };
}

function buildProductFilters(query) {
  const filters = {};
  addListFilter(filters, 'crop', query.crop);
  addListFilter(filters, 'problem', query.problem);
  addListFilter(filters, 'applicationMethod', query.applicationMethod ?? query.method);
  if (query.status && query.status !== 'all') {
    addListFilter(filters, 'status', query.status);
  }

  if (query.sequence !== undefined) {
    const sequence = Number(query.sequence);
    if (Number.isInteger(sequence) && sequence > 0) filters.sequence = sequence;
  }
  if (query.minSequence !== undefined) {
    const minSequence = Number(query.minSequence);
    if (Number.isInteger(minSequence) && minSequence > 0) {
      filters.sequence = { ...(filters.sequence ?? {}), $gte: minSequence };
    }
  }
  if (query.search?.trim()) {
    const expression = new RegExp(query.search.trim(), 'i');
    filters.$or = [{ name: expression }, { brand: expression }, { company: expression }, { crop: expression }, { problem: expression }];
  }
  return filters;
}

function sendDatabaseError(error, response) {
  if (error.name === 'ValidationError') {
    return response.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return response.status(409).json({ message: 'A matching product already exists.' });
  }
  console.error('Product API error:', error);
  return response.status(500).json({ message: 'Unable to process the product request.' });
}

export async function getProducts(request, response) {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 20));
    const sortBy = sortableFields.has(request.query.sortBy) ? request.query.sortBy : 'createdAt';
    const sortOrder = request.query.sortOrder === 'asc' ? 1 : -1;
    const filters = buildProductFilters(request.query);
    const [products, total] = await Promise.all([
      Product.find(filters).sort({ [sortBy]: sortOrder }).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filters),
    ]);

    return response.status(200).json({
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function getProductById(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid product ID.' });
  }
  try {
    const product = await Product.findById(request.params.id);
    return product ? response.status(200).json({ data: product }) : response.status(404).json({ message: 'Product not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function createProduct(request, response) {
  try {
    const product = await Product.create(request.body);
    return response.status(201).json({ data: product });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function updateProduct(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid product ID.' });
  }
  try {
    const product = await Product.findByIdAndUpdate(request.params.id, request.body, { new: true, runValidators: true });
    return product ? response.status(200).json({ data: product }) : response.status(404).json({ message: 'Product not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function deleteProduct(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid product ID.' });
  }
  try {
    const product = await Product.findByIdAndDelete(request.params.id);
    if (!product) {
      return response.status(404).json({ message: 'Product not found.' });
    }
    // Delete associated uploaded file if present
    if (product.image) {
      removeProductImageFile(product.image);
    }
    return response.status(204).send();
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function uploadProductImage(request, response) {
  if (!request.file) {
    return response.status(400).json({ message: 'No image file was provided.' });
  }
  const imageUrl = `/uploads/products/${request.file.filename}`;
  return response.status(201).json({
    message: 'Product image uploaded successfully.',
    imageUrl,
    file: {
      filename: request.file.filename,
      size: request.file.size,
      mimetype: request.file.mimetype,
    },
  });
}

export async function replaceProductImage(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid product ID.' });
  }
  if (!request.file) {
    return response.status(400).json({ message: 'No image file was provided.' });
  }

  try {
    const product = await Product.findById(request.params.id);
    if (!product) {
      removeProductImageFile(`/uploads/products/${request.file.filename}`);
      return response.status(404).json({ message: 'Product not found.' });
    }

    // Clean up old image if it was an uploaded file
    if (product.image) {
      removeProductImageFile(product.image);
    }

    const newImageUrl = `/uploads/products/${request.file.filename}`;
    product.image = newImageUrl;
    await product.save();

    return response.status(200).json({
      message: 'Product image updated successfully.',
      imageUrl: newImageUrl,
      data: product,
    });
  } catch (error) {
    removeProductImageFile(`/uploads/products/${request.file.filename}`);
    return sendDatabaseError(error, response);
  }
}

export async function removeProductImage(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid product ID.' });
  }

  try {
    const product = await Product.findById(request.params.id);
    if (!product) {
      return response.status(404).json({ message: 'Product not found.' });
    }

    if (product.image) {
      removeProductImageFile(product.image);
      product.image = '';
      await product.save();
    }

    return response.status(200).json({
      message: 'Product image removed successfully.',
      data: product,
    });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}
