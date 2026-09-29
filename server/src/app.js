import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import requestLogger from './middleware/requestLogger.js';
import originCheck from './middleware/originCheck.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import configRoutes from './routes/configRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRestaurantRoutes from './routes/adminRestaurantRoutes.js';
import restaurantOwnerRoutes from './routes/restaurantOwnerRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import cuisineTagRoutes from './routes/cuisineTagRoutes.js';
import publicCatalogRoutes from './routes/publicCatalogRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';

import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import restaurantDashboardRoutes from './routes/restaurantDashboardRoutes.js';

const app = express();

// Trust Proxy Configuration
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Security Middleware
app.use(helmet());

// CORS restriction
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        env.NODE_ENV === 'test' ||
        origin === env.FRONTEND_ORIGIN ||
        (env.NODE_ENV === 'development' && /^http:\/\/localhost:(3000|3001|5173)$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Idempotency-Key'],
  })
);

// Serve uploads directory with safe headers
const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:;");
  next();
}, express.static(uploadDir));

// Raw body parser for webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});

// JSON Body parser (100kb limit)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie Parser
app.use(cookieParser());

// Request Logger
app.use(requestLogger);

// CSRF Origin Check
app.use(originCheck);

// Global Rate Limiter
app.use('/api', globalLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/uploads', uploadRoutes);

// Admin Routes
app.use('/api/admin/restaurants', adminRestaurantRoutes);
app.use('/api/admin/cuisine-tags', cuisineTagRoutes);
app.use('/api/admin', adminRoutes);

// Restaurant Owner Routes
app.use('/api/restaurant', restaurantOwnerRoutes);
app.use('/api/restaurant', menuRoutes);
app.use('/api/restaurant', restaurantDashboardRoutes);

// Public Catalog & Search Routes
app.use('/api/restaurants', publicCatalogRoutes);
app.use('/api/search', searchRoutes);

// Customer Cart, Checkout & Orders Routes
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', quoteRoutes);
app.use('/api', orderRoutes);

// Payment Webhook Routes
app.use('/api/payments', paymentRoutes);

// Notifications Routes
app.use('/api/notifications', notificationRoutes);

// ─────────────────────────────────────────────────────────────────────
// Production: Serve React SPA static assets from client/dist
// Must come AFTER all /api routes so API 404s work correctly.
// ─────────────────────────────────────────────────────────────────────
if (env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(process.cwd(), '../client/dist');
  app.use(express.static(clientDistPath, { index: false }));

  // SPA wildcard fallback — client-side router handles all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 Fallback Handler (API routes only — in production, client handles the rest)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
