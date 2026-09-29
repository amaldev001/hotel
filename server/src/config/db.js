import mongoose from 'mongoose';
import env from './env.js';

/**
 * Connect to MongoDB with fail-fast strategy.
 * Never logs the connection string.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected to database: "${conn.connection.name}"`);
    return conn;
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Check MongoDB connection status for /api/health endpoint.
 */
export const checkDBHealth = () => {
  // 1 = connected, 2 = connecting
  const state = mongoose.connection.readyState;
  const isConnected = state === 1;
  return {
    connected: isConnected,
    state: isConnected ? 'connected' : state === 2 ? 'connecting' : 'disconnected',
  };
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};
