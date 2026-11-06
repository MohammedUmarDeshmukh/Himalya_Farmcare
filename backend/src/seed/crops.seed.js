import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { connectDatabase } from '../config/db.js';
import Crop from '../models/Crop.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });

// These are the crop names already offered by the current frontend filter.
const existingCropNames = ['Cotton', 'Turmeric', 'Soyabean', 'Others'];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toSeedCrop(name) {
  return { name, slug: slugify(name), status: 'active' };
}

export async function seedCrops() {
  const summary = { inserted: 0, updated: 0, skipped: 0 };
  const validCrops = [];

  for (const name of existingCropNames) {
    const crop = toSeedCrop(name);
    try {
      await new Crop(crop).validate();
      validCrops.push(crop);
    } catch (error) {
      summary.skipped += 1;
      console.error(`Skipped invalid seed crop "${name}": ${error.message}`);
    }
  }

  await connectDatabase();
  for (const crop of validCrops) {
    const existing = await Crop.findOne({ slug: crop.slug });
    if (!existing) {
      await Crop.create(crop);
      summary.inserted += 1;
      continue;
    }
    existing.set(crop);
    if (existing.modifiedPaths().length === 0) {
      summary.skipped += 1;
      continue;
    }
    await existing.save();
    summary.updated += 1;
  }

  console.log(`Crop seed complete — inserted: ${summary.inserted}, updated: ${summary.updated}, skipped: ${summary.skipped}`);
  return summary;
}

const isExecutedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isExecutedDirectly) {
  seedCrops()
    .catch((error) => {
      console.error(`Crop seed failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
