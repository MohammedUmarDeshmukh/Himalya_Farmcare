import { PLANS } from '../data/mockProducts.js';

export function mlPerAcre(problem) { return problem === 'Insecticide' ? 100 : problem === 'Fungicide' ? 500 : 200; }
export function getProblemFilter(filter) { return filter === 'All' ? null : [filter]; }
export function matchesFilters(product, filters) {
  const problems = getProblemFilter(filters.problem);
  return (filters.crop === 'All' || product.crop === filters.crop) && (filters.method === 'All' || product.method === filters.method) && (!problems || problems.includes(product.problem)) && (filters.seq === 'All' || (filters.seq === '2' ? product.seq === 2 : product.seq >= 3));
}
export function buildPlanProjection(crop, cart, products) {
  const rules = PLANS[crop] || [];
  const slots = Object.fromEntries(rules.map((rule) => [rule.key, Array(rule.count).fill(null)]));
  const extras = [];
  cart.forEach((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product || product.crop !== crop || !slots[product.problem]) return extras.push(line);
    const index = slots[product.problem].findIndex((slot) => slot === null);
    if (index < 0) extras.push(line); else slots[product.problem][index] = line;
  });
  const required = rules.filter((rule) => rule.level !== 'optional');
  const filled = required.reduce((sum, rule) => sum + slots[rule.key].filter(Boolean).length, 0);
  const total = required.reduce((sum, rule) => sum + rule.count, 0);
  return { rules, slots, extras, filled, total, pct: total ? Math.round((filled / total) * 100) : 0, complete: total > 0 && filled >= total };
}
