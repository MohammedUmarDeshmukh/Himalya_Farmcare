import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { connectDatabase } from '../config/db.js';
import Problem from '../models/Problem.js';
import Product from '../models/Product.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toSeedProblem(name) {
  return { name, slug: slugify(name), status: 'active' };
}

export async function seedProblems() {
  const summary = { inserted: 0, updated: 0, skipped: 0 };
  await connectDatabase();

  const productProblems = (await Product.distinct('problem'))
    .map((name) => name?.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  for (const name of productProblems) {
    const problem = toSeedProblem(name);
    try {
      await new Problem(problem).validate();
    } catch (error) {
      summary.skipped += 1;
      console.error(`Skipped invalid seed problem "${name}": ${error.message}`);
      continue;
    }

    const existing = await Problem.findOne({ slug: problem.slug });
    if (!existing) {
      await Problem.create(problem);
      summary.inserted += 1;
      continue;
    }
    existing.set(problem);
    if (existing.modifiedPaths().length === 0) {
      summary.skipped += 1;
      continue;
    }
    await existing.save();
    summary.updated += 1;
  }

  console.log(`Problem seed complete — inserted: ${summary.inserted}, updated: ${summary.updated}, skipped: ${summary.skipped}`);
  return summary;
}

const isExecutedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isExecutedDirectly) {
  seedProblems()
    .catch((error) => {
      console.error(`Problem seed failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
