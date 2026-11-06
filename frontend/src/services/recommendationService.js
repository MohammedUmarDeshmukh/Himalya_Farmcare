import { normalizeProduct } from './productService';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export async function generateRecommendations(input) {
  const response = await fetch(`${apiBaseUrl}/recommendations/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = payload.errors ? Object.values(payload.errors).join(' ') : '';
    throw new Error(details || payload.message || `Recommendation API request failed (${response.status}).`);
  }

  return {
    ...payload,
    products: (payload.products ?? []).map((item) => ({ ...item, product: normalizeProduct(item.product) })),
  };
}
