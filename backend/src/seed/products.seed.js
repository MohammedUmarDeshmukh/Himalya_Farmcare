import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PRODUCTS } from '../../../frontend/src/data/mockProducts.js';
import { connectDatabase } from '../config/db.js';
import Product from '../models/Product.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });

function dosageForProblem(problem) {
  if (problem === 'Insecticide') return 100;
  if (problem === 'Fungicide') return 500;
  return 200;
}

export function toSeedProduct(product) {
  return {
    name: product.name,
    crop: product.crop,
    problem: product.problem,
    applicationMethod: product.method,
    sequence: product.seq,
    image: `/products/${product.id}.jpg`,
    dosagePerAcre: dosageForProblem(product.problem),
    dosageUnit: 'ml',
    availableSizes: [100, 500],
    prices: [{ size: 100, amount: product.p100 }, { size: 500, amount: product.p500 }],
    status: 'active',
  };
}

function naturalKey(product) {
  return {
    name: product.name,
    crop: product.crop,
    problem: product.problem,
    applicationMethod: product.applicationMethod,
    sequence: product.sequence,
  };
}

export async function seedProducts() {
  const summary = { inserted: 0, updated: 0, skipped: 0 };
  const validProducts = [];

  for (const sourceProduct of PRODUCTS) {
    const product = toSeedProduct(sourceProduct);
    try {
      await new Product(product).validate();
      validProducts.push(product);
    } catch (error) {
      summary.skipped += 1;
      console.error(`Skipped invalid seed product "${sourceProduct.name}": ${error.message}`);
    }
  }

  await connectDatabase();
  for (const product of validProducts) {
    const existing = await Product.findOne(naturalKey(product));
    if (!existing) {
      await Product.create(product);
      summary.inserted += 1;
      continue;
    }
    existing.set(product);
    if (existing.modifiedPaths().length === 0) {
      summary.skipped += 1;
      continue;
    }
    await existing.save();
    summary.updated += 1;
  }
  console.log(`Product seed complete — inserted: ${summary.inserted}, updated: ${summary.updated}, skipped: ${summary.skipped}`);
  return summary;
}

const isExecutedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isExecutedDirectly) {
  seedProducts()
    .catch((error) => {
      console.error(`Product seed failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
