const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

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

async function request(path, query = {}) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'All') search.set(key, value);
  });
  const response = await fetch(`${apiBaseUrl}${path}${search.size ? `?${search}` : ''}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Product API request failed (${response.status}).`);
  return payload;
}

export async function getProducts(filters = {}) {
  const payload = await request('/products', { limit: 100, status: 'active', ...filters });
  return {
    products: (payload.data ?? []).map(normalizeProduct),
    pagination: payload.pagination,
  };
}

export async function getProductById(id) {
  const payload = await request(`/products/${encodeURIComponent(id)}`);
  return normalizeProduct(payload.data);
}
