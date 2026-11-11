import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { connectDatabase } from './src/config/db.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });

/**
 * Verified Rollback Plan:
 * If the user ever requests a rollback, this script safely removes only the migrated
 * documents from the target database "himalaya_farmcare", restoring it to its initial state.
 * It NEVER touches "smartagriwebapp".
 */
export async function executeRollback({ execute = false } = {}) {
  await connectDatabase();
  const client = mongoose.connection.client;
  const sourceDb = client.db('smartagriwebapp');
  const targetDb = client.db('himalaya_farmcare');

  const sourceCropIds = (await sourceDb.collection('crops').find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id);
  const sourceProblemIds = (await sourceDb.collection('problems').find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id);
  const sourceMethodIds = (await sourceDb.collection('applicationmethods').find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id);
  const sourceProductIds = (await sourceDb.collection('products').find({}, { projection: { _id: 1 } }).toArray()).map(d => d._id);
  const adminUser = await sourceDb.collection('users').findOne({ role: 'admin' }, { projection: { _id: 1 } });

  console.log('Rollback Plan: Document IDs to revert in "himalaya_farmcare":');
  console.log(`- Crops to remove: ${sourceCropIds.length}`);
  console.log(`- Problems to remove: ${sourceProblemIds.length}`);
  console.log(`- Methods to remove: ${sourceMethodIds.length}`);
  console.log(`- Products to remove: ${sourceProductIds.length}`);
  console.log(`- Admin account to remove: ${adminUser ? 1 : 0}`);

  if (execute) {
    const delCrops = await targetDb.collection('crops').deleteMany({ _id: { $in: sourceCropIds } });
    const delProblems = await targetDb.collection('problems').deleteMany({ _id: { $in: sourceProblemIds } });
    const delMethods = await targetDb.collection('applicationmethods').deleteMany({ _id: { $in: sourceMethodIds } });
    const delProducts = await targetDb.collection('products').deleteMany({ _id: { $in: sourceProductIds } });
    const delAdmin = adminUser ? await targetDb.collection('users').deleteOne({ _id: adminUser._id }) : { deletedCount: 0 };

    console.log('Rollback Executed:');
    console.log(`- Removed ${delCrops.deletedCount} crops`);
    console.log(`- Removed ${delProblems.deletedCount} problems`);
    console.log(`- Removed ${delMethods.deletedCount} methods`);
    console.log(`- Removed ${delProducts.deletedCount} products`);
    console.log(`- Removed ${delAdmin.deletedCount} admin account`);
  } else {
    console.log('Dry-run rollback completed (ZERO records deleted).');
  }

  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].endsWith('rollback_migration.mjs')) {
  const execute = process.argv.includes('--execute');
  executeRollback({ execute }).catch(err => {
    console.error('Rollback failed:', err);
    process.exit(1);
  });
}
