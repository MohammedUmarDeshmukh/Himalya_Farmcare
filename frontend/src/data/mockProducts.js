// Temporary frontend-only data. This module will be replaced by the product API.
export const PRODUCTS = [
  { id: 1, crop: 'Cotton', method: 'Spray', problem: 'Insecticide', seq: 2, name: 'BugNox Prime', p100: 288, p500: 2848.76 },
  { id: 2, crop: 'Cotton', method: 'Spray', problem: 'Insecticide', seq: 2, name: 'Insektor Max', p100: 324, p500: 3830.8 },
  { id: 3, crop: 'Cotton', method: 'Spray', problem: 'Fungicide', seq: 1, name: 'FungiClear Pro', p100: 324, p500: 2344.56 },
  { id: 4, crop: 'Cotton', method: 'Spray', problem: 'Fungicide', seq: 1, name: 'MycoShield', p100: 468, p500: 4361.18 },
  { id: 5, crop: 'Cotton', method: 'Spray', problem: 'PGR', seq: 3, name: 'GrowLift', p100: 396, p500: 3564.16 },
  { id: 6, crop: 'Cotton', method: 'Drip', problem: 'Insecticide', seq: 4, name: 'PestAway Ultra', p100: 432, p500: 4122.06 },
  { id: 7, crop: 'Cotton', method: 'Drip', problem: 'Insecticide', seq: 1, name: 'HexaKill', p100: 432, p500: 5203.53 },
  { id: 8, crop: 'Cotton', method: 'Drip', problem: 'Fungicide', seq: 2, name: 'SporeX', p100: 288, p500: 2602.25 },
  { id: 9, crop: 'Cotton', method: 'Drip', problem: 'Fungicide', seq: 3, name: 'CropGuard F', p100: 288, p500: 4323.87 },
  { id: 10, crop: 'Cotton', method: 'Spray', problem: 'Special PGR', seq: 1, name: 'VitaBoost X', p100: 324, p500: 2568.08 },
  { id: 11, crop: 'Cotton', method: 'Spray', problem: 'Special PGR', seq: 1, name: 'RootMax Plus', p100: 324, p500: 3014.48 },
  { id: 12, crop: 'Cotton', method: 'Drip', problem: 'Special PGR', seq: 2, name: 'Floratek', p100: 252, p500: 2548.47 },
  { id: 13, crop: 'Turmeric', method: 'Spray', problem: 'Insecticide', seq: 1, name: 'NeoBug Kill', p100: 216, p500: 2488.39 },
  { id: 14, crop: 'Turmeric', method: 'Spray', problem: 'Insecticide', seq: 3, name: 'LarvaStop', p100: 252, p500: 1598.7 },
  { id: 15, crop: 'Turmeric', method: 'Spray', problem: 'Insecticide', seq: 4, name: 'CritterOff', p100: 216, p500: 3231.65 },
  { id: 16, crop: 'Turmeric', method: 'Spray', problem: 'Fungicide', seq: 2, name: 'BlightSafe', p100: 432, p500: 5858.57 },
  { id: 17, crop: 'Turmeric', method: 'Spray', problem: 'PGR', seq: 2, name: 'StemStrong', p100: 216, p500: 3909.41 },
  { id: 18, crop: 'Turmeric', method: 'Drip', problem: 'PGR', seq: 1, name: 'YieldUp', p100: 432, p500: 5291.92 },
  { id: 19, crop: 'Turmeric', method: 'Drip', problem: 'Special PGR', seq: 2, name: 'CellVigor', p100: 396, p500: 3012.3 },
  { id: 20, crop: 'Turmeric', method: 'Spray', problem: 'Special PGR', seq: 4, name: 'UltraBloom Z', p100: 324, p500: 5783.26 },
];

export const PLANS = {
  Cotton: [
    { key: 'Insecticide', label: 'Insecticides', level: 'mandatory', dot: 'red', count: 2 },
    { key: 'Fungicide', label: 'Fungicide', level: 'recommended', dot: 'yellow', count: 1 },
    { key: 'PGR', label: 'PGR', level: 'recommended', dot: 'green', count: 2 },
    { key: 'Special PGR', label: 'Special PGR', level: 'optional', dot: 'green', count: 1 },
  ],
  Turmeric: [
    { key: 'Insecticide', label: 'Insecticide', level: 'mandatory', dot: 'red', count: 1 },
    { key: 'Fungicide', label: 'Fungicide', level: 'recommended', dot: 'yellow', count: 1 },
    { key: 'PGR', label: 'PGR', level: 'recommended', dot: 'green', count: 1 },
    { key: 'Special PGR', label: 'Special PGR', level: 'optional', dot: 'green', count: 1 },
  ],
};
