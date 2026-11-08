import { request } from './apiClient';
import { normalizeProduct } from './productService';

export async function generateRecommendations(input) {
  const payload = await request('/recommendations/generate', {
    method: 'POST',
    body: input,
  });

  return {
    ...payload,
    products: (payload.products ?? []).map((item) => ({ ...item, product: normalizeProduct(item.product) })),
  };
}
