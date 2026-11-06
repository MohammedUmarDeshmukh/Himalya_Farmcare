import mongoose from 'mongoose';
import Crop from '../models/Crop.js';

const sortableFields = new Set(['name', 'slug', 'status', 'createdAt', 'updatedAt']);

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function prepareCropPayload(body) {
  const payload = { ...body };
  if (payload.name !== undefined && payload.slug === undefined) payload.slug = slugify(payload.name);
  if (payload.slug !== undefined) payload.slug = slugify(payload.slug);
  return payload;
}

function sendDatabaseError(error, response) {
  if (error.name === 'ValidationError') {
    return response.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return response.status(409).json({ message: 'A crop with the same name or slug already exists.' });
  }
  console.error('Crop API error:', error);
  return response.status(500).json({ message: 'Unable to process the crop request.' });
}

export async function getCrops(request, response) {
  try {
    const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 20));
    const sortBy = sortableFields.has(request.query.sortBy) ? request.query.sortBy : 'name';
    const sortOrder = request.query.sortOrder === 'desc' ? -1 : 1;
    const filters = {};

    if (request.query.status && request.query.status !== 'all') {
      filters.status = request.query.status;
    } else if (!request.query.status) {
      filters.status = 'active';
    }
    if (request.query.search?.trim()) {
      const expression = new RegExp(request.query.search.trim(), 'i');
      filters.$or = [{ name: expression }, { slug: expression }];
    }

    const [crops, total] = await Promise.all([
      Crop.find(filters).sort({ [sortBy]: sortOrder }).skip((page - 1) * limit).limit(limit),
      Crop.countDocuments(filters),
    ]);

    return response.status(200).json({
      data: crops,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function getCropById(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid crop ID.' });
  }
  try {
    const crop = await Crop.findById(request.params.id);
    return crop ? response.status(200).json({ data: crop }) : response.status(404).json({ message: 'Crop not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function createCrop(request, response) {
  try {
    const crop = await Crop.create(prepareCropPayload(request.body));
    return response.status(201).json({ data: crop });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function updateCrop(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid crop ID.' });
  }
  try {
    const crop = await Crop.findByIdAndUpdate(request.params.id, prepareCropPayload(request.body), { new: true, runValidators: true });
    return crop ? response.status(200).json({ data: crop }) : response.status(404).json({ message: 'Crop not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function deleteCrop(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid crop ID.' });
  }
  try {
    const crop = await Crop.findByIdAndDelete(request.params.id);
    return crop ? response.status(204).send() : response.status(404).json({ message: 'Crop not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}
