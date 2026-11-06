/**
 * Generates a unique, professional order number for Himalaya FarmCare.
 * Format: HFC-YYYYMMDD-XXXX (e.g. HFC-20261101-7891)
 */
export function generateOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `HFC-${year}${month}${day}-${randomSuffix}`;
}
