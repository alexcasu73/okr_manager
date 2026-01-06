/**
 * OKR Manager Server
 * Uses @ncode/backend-core for auth, users, billing
 * Adds OKR-specific functionality
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import from backend-core (submodule)
import {
  createPool,
  initializeCoreSchema,
  createAuthRoutes,
  createAuthMiddleware,
  createUsersRoutes,
  ensureAdminUser,
  initEmailClient,
  initStripe,
  createBillingRoutes,
  createAuthLimiter,
  createGeneralLimiter,
  errorHandler,
  hashPassword,
  generateJWT
} from '../backend/src/index.js';

// OKR modules
import { initializeOKRSchema } from './db/schema.js';
import { createOKRRoutes } from './okr/okr.routes.js';
import { createTeamRoutes } from './team/team.routes.js';

const app = express();
const PORT = process.env.PORT || 3002;

// === SECURITY ===
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(createGeneralLimiter());

// Body parsing (raw for Stripe webhooks, JSON for everything else)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '5mb' }));

// === DATABASE ===
const pool = createPool(process.env.DATABASE_URL);

// Initialize schemas
await initializeCoreSchema(pool);
await initializeOKRSchema(pool);

// === EMAIL SERVICE ===
let emailService = null;
if (process.env.GMAIL_USER) {
  emailService = initEmailClient({
    gmailUser: process.env.GMAIL_USER,
    gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    appName: 'OKR Manager',
    primaryColor: '#3B82F6'
  });
}

// === STRIPE ===
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = initStripe(process.env.STRIPE_SECRET_KEY);
}

// === CONFIG ===
const config = {
  pool,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  emailService,
  rateLimiter: createAuthLimiter()
};

// Auth middleware for protected routes
const authMiddleware = createAuthMiddleware(config);

// === ROUTES ===

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (register, login, etc.)
app.use('/api/auth', createAuthRoutes(config));

// User management (admin only)
app.use('/api/users', createUsersRoutes(config));

// Billing routes (if Stripe is configured)
if (stripe) {
  app.use('/api/billing', createBillingRoutes({
    ...config,
    stripe,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      yearly: process.env.STRIPE_PRICE_YEARLY
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  }));
}

// OKR routes
app.use('/api/okr', createOKRRoutes({
  pool,
  authMiddleware,
  requireAdmin: (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }
}));

// Team routes
app.use('/api/teams', createTeamRoutes({
  pool,
  authMiddleware,
  emailService,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  hashPassword,
  generateJWT: (userId) => generateJWT(userId, process.env.JWT_SECRET || 'dev-secret-change-in-production', '7d')
}));

// === ERROR HANDLING ===
app.use(errorHandler());

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// === START SERVER ===
async function start() {
  try {
    // Ensure admin user exists
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      await ensureAdminUser(pool, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    }

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                  OKR Manager Server                   ║
╠═══════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}              ║
║  API Base URL: http://localhost:${PORT}/api              ║
╠═══════════════════════════════════════════════════════╣
║  Endpoints:                                           ║
║  - GET  /api/health         Health check              ║
║  - POST /api/auth/register  Register                  ║
║  - POST /api/auth/login     Login                     ║
║  - GET  /api/okr/objectives List objectives           ║
║  - POST /api/okr/objectives Create objective          ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
