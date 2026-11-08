import { request } from './apiClient';

function priceForSize(product, size) {
  const price = product.prices?.find((item) => Number(item.size) === size);
  return price?.amount ?? product[`p${size}`];
}

export function normalizeProduct(product) {
  return {
    ...product,
    id: product._id ?? product.id,
    method: product.applicationMethod ?? product.method,
    seq: product.sequence ?? product.seq,
    p100: priceForSize(product, 100),
    p500: priceForSize(product, 500),
  };
}

export async function getProducts(filters = {}) {
  const payload = await request('/products', { query: { limit: 100, status: 'active', ...filters } });
  return {
    products: (payload.data ?? []).map(normalizeProduct),
    pagination: payload.pagination,
  };
}

export async function getProductById(id) {
  const payload = await request(`/products/${encodeURIComponent(id)}`);
  return normalizeProduct(payload.data);
}
