import dns from 'node:dns';
import mongoose from 'mongoose';

const publicDnsServers = ['8.8.8.8', '1.1.1.1'];

export async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured. Add it to backend/.env before starting the API.');
  }

  try {
    // Atlas SRV connection strings require DNS SRV/TXT lookups. Use public
    // resolvers before Mongoose initiates those lookups.
    dns.setServers(publicDnsServers);
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}
