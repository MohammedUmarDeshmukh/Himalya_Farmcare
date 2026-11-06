import { generateProductRecommendations } from '../services/recommendationService.js';

function requiredText(value, field, errors) {
  if (typeof value !== 'string' || !value.trim() || value.trim().toLowerCase() === 'all') {
    errors[field] = `${field} is required.`;
    return null;
  }
  return value.trim();
}

function parseSpraySequence(value, errors) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === '3+') return value;
  const sequence = Number(value);
  if (!Number.isInteger(sequence) || sequence < 1) {
    errors.spraySequence = 'spraySequence must be a positive whole number or "3+".';
    return undefined;
  }
  return sequence;
}

function validateInput(body = {}) {
  const errors = {};
  const acreage = Number(body.acreage);
  const input = {
    crop: requiredText(body.crop, 'crop', errors),
    problem: requiredText(body.problem, 'problem', errors),
    applicationMethod: requiredText(body.applicationMethod, 'applicationMethod', errors),
    acreage,
    spraySequence: parseSpraySequence(body.spraySequence, errors),
  };

  if (!Number.isFinite(acreage) || acreage <= 0) {
    errors.acreage = 'acreage must be a positive number.';
  }

  return Object.keys(errors).length ? { errors } : { input };
}

export async function generateRecommendations(request, response) {
  const { input, errors } = validateInput(request.body);
  if (errors) return response.status(400).json({ message: 'Invalid recommendation input.', errors });

  try {
    const recommendation = await generateProductRecommendations(input);
    return response.status(200).json(recommendation);
  } catch (error) {
    console.error('Recommendation API error:', error);
    return response.status(500).json({ message: 'Unable to generate recommendations.' });
  }
}
