import mongoose from 'mongoose';
import ApplicationMethod from '../models/ApplicationMethod.js';

const sortableFields = new Set(['name', 'slug', 'status', 'createdAt', 'updatedAt']);

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function prepareApplicationMethodPayload(body) {
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
    return response.status(409).json({ message: 'An application method with the same name or slug already exists.' });
  }
  console.error('Application method API error:', error);
  return response.status(500).json({ message: 'Unable to process the application method request.' });
}

export async function getApplicationMethods(request, response) {
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

    const [applicationMethods, total] = await Promise.all([
      ApplicationMethod.find(filters).sort({ [sortBy]: sortOrder }).skip((page - 1) * limit).limit(limit),
      ApplicationMethod.countDocuments(filters),
    ]);

    return response.status(200).json({
      data: applicationMethods,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function getApplicationMethodById(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid application method ID.' });
  }
  try {
    const applicationMethod = await ApplicationMethod.findById(request.params.id);
    return applicationMethod ? response.status(200).json({ data: applicationMethod }) : response.status(404).json({ message: 'Application method not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

// Authentication and admin authorization will protect write routes in a future phase.
export async function createApplicationMethod(request, response) {
  try {
    const applicationMethod = await ApplicationMethod.create(prepareApplicationMethodPayload(request.body));
    return response.status(201).json({ data: applicationMethod });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function updateApplicationMethod(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid application method ID.' });
  }
  try {
    const applicationMethod = await ApplicationMethod.findByIdAndUpdate(request.params.id, prepareApplicationMethodPayload(request.body), { new: true, runValidators: true });
    return applicationMethod ? response.status(200).json({ data: applicationMethod }) : response.status(404).json({ message: 'Application method not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function deleteApplicationMethod(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid application method ID.' });
  }
  try {
    const applicationMethod = await ApplicationMethod.findByIdAndDelete(request.params.id);
    return applicationMethod ? response.status(204).send() : response.status(404).json({ message: 'Application method not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}
