import Product from '../models/Product.js';

function hasUsableStock(product) {
  return product.stock === undefined || product.stock === null || product.stock > 0;
}

function getDosage(product, acreage) {
  const perAcre = Number(product.dosagePerAcre);
  const unit = product.dosageUnit?.trim();

  if (!Number.isFinite(perAcre) || perAcre < 0 || !unit) return null;

  return {
    perAcre,
    unit,
    totalForAcreage: perAcre * acreage,
  };
}

function matchesSequence(product, spraySequence) {
  if (spraySequence === undefined) return true;
  if (spraySequence === '3+') return product.sequence >= 3;
  return product.sequence === spraySequence;
}

function sequenceReason(spraySequence) {
  if (spraySequence === undefined) return null;
  return spraySequence === '3+'
    ? 'Matches the selected spray sequence of 3 or later.'
    : `Matches spray sequence ${spraySequence}.`;
}

/**
 * Finds products by exact farmer-selected attributes. Results are not an
 * effectiveness claim: every returned product matches the same requested
 * fields and is ordered deterministically by sequence and product name.
 */
export async function generateProductRecommendations(input) {
  const activeProducts = await Product.find({
    crop: input.crop,
    problem: input.problem,
    applicationMethod: input.applicationMethod,
    status: 'active',
  }).lean();

  const matchingProducts = activeProducts
    .filter((product) => hasUsableStock(product) && matchesSequence(product, input.spraySequence))
    .sort((left, right) => left.sequence - right.sequence || left.name.localeCompare(right.name));

  const products = matchingProducts.map((product, index) => {
    const reasons = [
      `Matches crop: ${input.crop}.`,
      `Matches problem: ${input.problem}.`,
      `Matches application method: ${input.applicationMethod}.`,
    ];
    const selectedSequenceReason = sequenceReason(input.spraySequence);
    if (selectedSequenceReason) reasons.push(selectedSequenceReason);

    return {
      rank: index + 1,
      matchScore: input.spraySequence === undefined ? 100 : 110,
      product,
      reasons,
      dosage: getDosage(product, input.acreage),
    };
  });

  return {
    status: products.length ? 'recommendations_found' : 'no_match',
    input,
    summary: {
      totalMatches: products.length,
      ranking: 'Products must exactly match the selected crop, problem, and application method. Active, available matches are ordered by spray sequence and then product name; this is not an effectiveness ranking.',
    },
    message: products.length
      ? `${products.length} matching product${products.length === 1 ? '' : 's'} found.`
      : 'No active, available products match all selected inputs.',
    products,
  };
}
