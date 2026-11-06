/**
 * Crop Display Order Utility
 * Defines standard presentation order for agricultural crops across Himalaya FarmCare:
 * 1. CORN
 * 2. Cotton
 * 3. Soyabean
 * 4. Turmeric
 * ... (any other crops alphabetically)
 * 5. OTHER (always at the very end)
 */

export const CROP_PRIORITY_ORDER = ['CORN', 'Cotton', 'Soyabean', 'Turmeric'];

/**
 * Sorts an array of crop strings or crop objects { name: string } according to
 * the official display order specification.
 *
 * @param {Array<string|Object>} crops
 * @returns {Array<string|Object>} Sorted copy of the input array
 */
export function sortCropNames(crops) {
  if (!Array.isArray(crops)) return [];

  return [...crops].sort((a, b) => {
    const nameA = (typeof a === 'string' ? a : a?.name || '').trim();
    const nameB = (typeof b === 'string' ? b : b?.name || '').trim();

    const isOtherA = nameA.toUpperCase() === 'OTHER';
    const isOtherB = nameB.toUpperCase() === 'OTHER';

    // OTHER must always appear at the end
    if (isOtherA && !isOtherB) return 1;
    if (!isOtherA && isOtherB) return -1;
    if (isOtherA && isOtherB) return 0;

    const indexA = CROP_PRIORITY_ORDER.findIndex(
      (c) => c.toLowerCase() === nameA.toLowerCase()
    );
    const indexB = CROP_PRIORITY_ORDER.findIndex(
      (c) => c.toLowerCase() === nameB.toLowerCase()
    );

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return nameA.localeCompare(nameB);
  });
}
