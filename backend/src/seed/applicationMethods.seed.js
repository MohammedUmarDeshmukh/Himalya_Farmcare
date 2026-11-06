import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { connectDatabase } from '../config/db.js';
import ApplicationMethod from '../models/ApplicationMethod.js';
import Product from '../models/Product.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toSeedApplicationMethod(name) {
  return { name, slug: slugify(name), status: 'active' };
}

export async function seedApplicationMethods() {
  const summary = { inserted: 0, updated: 0, skipped: 0 };
  await connectDatabase();

  const productMethods = (await Product.distinct('applicationMethod'))
    .map((name) => name?.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  for (const name of productMethods) {
    const applicationMethod = toSeedApplicationMethod(name);
    try {
      await new ApplicationMethod(applicationMethod).validate();
    } catch (error) {
      summary.skipped += 1;
      console.error(`Skipped invalid seed application method "${name}": ${error.message}`);
      continue;
    }

    const existing = await ApplicationMethod.findOne({ slug: applicationMethod.slug });
    if (!existing) {
      await ApplicationMethod.create(applicationMethod);
      summary.inserted += 1;
      continue;
    }
    existing.set(applicationMethod);
    if (existing.modifiedPaths().length === 0) {
      summary.skipped += 1;
      continue;
    }
    await existing.save();
    summary.updated += 1;
  }

  console.log(`Application method seed complete — inserted: ${summary.inserted}, updated: ${summary.updated}, skipped: ${summary.skipped}`);
  return summary;
}

const isExecutedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isExecutedDirectly) {
  seedApplicationMethods()
    .catch((error) => {
      console.error(`Application method seed failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
