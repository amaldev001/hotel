import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer = null;

/**
 * Connect to test MongoDB instance.
 * MUST refuse any connection if the database name does not end with '_test'.
 */
export const connectTestDb = async () => {
  let uri = process.env.MONGODB_TEST_URI;

  if (!uri) {
    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'food_ordering_integration_test',
        },
      });
    }
    uri = mongoServer.getUri('food_ordering_integration_test');
  }

  // Parse dbName from URI
  let dbName = '';
  try {
    const urlObj = new URL(uri);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    dbName = pathParts.length > 0 ? pathParts[0] : '';
  } catch (e) {
    dbName = '';
  }

  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error(`[DB SAFETY LOCK] Refusing database connection: database name "${dbName}" does not end with "_test".`);
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
};

/**
 * Disconnect and stop test MongoDB instance.
 */
export const disconnectTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

/**
 * Helper to test the DB safety guard explicitly.
 */
export const validateDbNameIsTest = (uriString) => {
  const urlObj = new URL(uriString);
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const dbName = pathParts.length > 0 ? pathParts[0] : '';
  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error(`[DB SAFETY LOCK] Refusing database connection: database name "${dbName}" does not end with "_test".`);
  }
  return true;
};
