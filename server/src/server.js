import app from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start Express server
  server = app.listen(env.PORT, () => {
    console.log(`🚀 Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
};

// Graceful shutdown handler
const shutdown = async (signal) => {
  console.log(`\n⚠️ Received ${signal}. Initiating graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      console.log('🔒 HTTP server closed.');
      await disconnectDB();
      console.log('💾 Database connection closed.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
