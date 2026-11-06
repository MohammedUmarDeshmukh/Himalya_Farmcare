import mongoose from 'mongoose';
import Problem from '../models/Problem.js';

const sortableFields = new Set(['name', 'slug', 'status', 'createdAt', 'updatedAt']);

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function prepareProblemPayload(body) {
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
    return response.status(409).json({ message: 'A problem with the same name or slug already exists.' });
  }
  console.error('Problem API error:', error);
  return response.status(500).json({ message: 'Unable to process the problem request.' });
}

export async function getProblems(request, response) {
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

    const [problems, total] = await Promise.all([
      Problem.find(filters).sort({ [sortBy]: sortOrder }).skip((page - 1) * limit).limit(limit),
      Problem.countDocuments(filters),
    ]);

    return response.status(200).json({
      data: problems,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function getProblemById(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid problem ID.' });
  }
  try {
    const problem = await Problem.findById(request.params.id);
    return problem ? response.status(200).json({ data: problem }) : response.status(404).json({ message: 'Problem not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

// Authentication and admin authorization will protect write routes in a future phase.
export async function createProblem(request, response) {
  try {
    const problem = await Problem.create(prepareProblemPayload(request.body));
    return response.status(201).json({ data: problem });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function updateProblem(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid problem ID.' });
  }
  try {
    const problem = await Problem.findByIdAndUpdate(request.params.id, prepareProblemPayload(request.body), { new: true, runValidators: true });
    return problem ? response.status(200).json({ data: problem }) : response.status(404).json({ message: 'Problem not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}

export async function deleteProblem(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(400).json({ message: 'Invalid problem ID.' });
  }
  try {
    const problem = await Problem.findByIdAndDelete(request.params.id);
    return problem ? response.status(204).send() : response.status(404).json({ message: 'Problem not found.' });
  } catch (error) {
    return sendDatabaseError(error, response);
  }
}
