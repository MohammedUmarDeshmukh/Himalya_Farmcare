export const money = (amount) => `₹ ${(Number(amount) || 0).toFixed(2)}`;

export const formatAcre = (value) => (Number.isInteger(Number(value)) ? String(Number(value)) : String(value));

export function getProductImageUrl(product, fallback = '/products/res.jpg') {
  if (!product) return fallback;
  const image = typeof product === 'string' ? product.trim() : product.image?.trim();
  if (!image) {
    if (typeof product === 'object' && product.id) {
      return `/products/${product.id}.jpg`;
    }
    return fallback;
  }
  if (
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('data:') ||
    image.startsWith('blob:')
  ) {
    return image;
  }
  if (image.startsWith('/uploads/')) {
    const rawApiUrl =
      typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL
        : 'http://localhost:5000/api';
    const backendOrigin = rawApiUrl.replace(/\/api\/?$/, '');
    return `${backendOrigin}${image}`;
  }
  return image;
}
