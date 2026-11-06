import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resolve } from 'node:path';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });

export async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'Himalaya FarmCare Admin';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in environment before running seed:admin.');
    process.exit(1);
  }

  await connectDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    let updated = false;
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      updated = true;
    }
    if (existing.status !== 'active') {
      existing.status = 'active';
      updated = true;
    }
    if (updated) {
      await existing.save();
      console.log(`Updated existing user "${email}" to admin role.`);
    } else {
      console.log(`Admin account "${email}" is already active and up-to-date.`);
    }
  } else {
    // Rely on User schema pre-save hook to hash password with bcrypt
    await User.create({
      name,
      email,
      password,
      role: 'admin',
      status: 'active',
    });
    console.log(`Admin account "${email}" created successfully with admin permissions.`);
  }

  await mongoose.disconnect();
}

if (process.argv[1]?.endsWith('admin.seed.js')) {
  seedAdmin().catch((err) => {
    console.error('Admin seeding failed:', err.message);
    process.exit(1);
  });
}
