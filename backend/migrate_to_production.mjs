import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { connectDatabase } from './src/config/db.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });

export async function executeMigration({ execute = false } = {}) {
  await connectDatabase();
  const client = mongoose.connection.client;
  const sourceDb = client.db('smartagriwebapp');
  const targetDb = client.db('himalaya_farmcare');

  const report = {
    crops: { attempted: 0, inserted: 0, skipped: 0 },
    problems: { attempted: 0, inserted: 0, skipped: 0 },
    methods: { attempted: 0, inserted: 0, skipped: 0 },
    products: { attempted: 0, inserted: 0, skipped: 0 },
    admin: { attempted: 0, inserted: 0, skipped: 0 },
  };

  // 1. Crops (5)
  const sourceCrops = await sourceDb.collection('crops').find().toArray();
  report.crops.attempted = sourceCrops.length;
  for (const crop of sourceCrops) {
    if (execute) {
      const res = await targetDb.collection('crops').updateOne(
        { _id: crop._id },
        { $setOnInsert: crop },
        { upsert: true }
      );
      if (res.upsertedCount > 0) report.crops.inserted++;
      else report.crops.skipped++;
    }
  }

  // 2. Problems (5)
  const sourceProblems = await sourceDb.collection('problems').find().toArray();
  report.problems.attempted = sourceProblems.length;
  for (const problem of sourceProblems) {
    if (execute) {
      const res = await targetDb.collection('problems').updateOne(
        { _id: problem._id },
        { $setOnInsert: problem },
        { upsert: true }
      );
      if (res.upsertedCount > 0) report.problems.inserted++;
      else report.problems.skipped++;
    }
  }

  // 3. Application Methods (3)
  const sourceMethods = await sourceDb.collection('applicationmethods').find().toArray();
  report.methods.attempted = sourceMethods.length;
  for (const method of sourceMethods) {
    if (execute) {
      const res = await targetDb.collection('applicationmethods').updateOne(
        { _id: method._id },
        { $setOnInsert: method },
        { upsert: true }
      );
      if (res.upsertedCount > 0) report.methods.inserted++;
      else report.methods.skipped++;
    }
  }

  // 4. Products (21)
  const sourceProducts = await sourceDb.collection('products').find().toArray();
  report.products.attempted = sourceProducts.length;
  for (const product of sourceProducts) {
    if (execute) {
      const res = await targetDb.collection('products').updateOne(
        { _id: product._id },
        { $setOnInsert: product },
        { upsert: true }
      );
      if (res.upsertedCount > 0) report.products.inserted++;
      else report.products.skipped++;
    }
  }

  // 5. Admin Account (1) - strictly exclude ordinary users
  const adminUser = await sourceDb.collection('users').findOne({ role: 'admin' });
  if (adminUser) {
    report.admin.attempted = 1;
    if (execute) {
      const res = await targetDb.collection('users').updateOne(
        { _id: adminUser._id },
        { $setOnInsert: adminUser },
        { upsert: true }
      );
      if (res.upsertedCount > 0) report.admin.inserted++;
      else report.admin.skipped++;
    }
  }

  await mongoose.disconnect();
  return report;
}

// When run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('migrate_to_production.mjs')) {
  if (process.argv.includes('--execute')) {
    console.log('Executing live migration...');
    executeMigration({ execute: true }).then((rep) => {
      console.log('Migration completed successfully:', rep);
    }).catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
  } else {
    console.log('Running dry-run mode (use --execute to apply live changes)...');
    executeMigration({ execute: false }).then((rep) => {
      console.log('Dry run completed. Target writes: 0. Prepared report:', rep);
    }).catch(err => {
      console.error('Dry run failed:', err);
      process.exit(1);
    });
  }
}
