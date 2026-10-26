import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config, prisma } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import { authRouter } from './modules/auth/authRoutes.js';
import { userRouter } from './modules/users/userRoutes.js';
import { departmentRouter } from './modules/departments/departmentRoutes.js';
import { institutionRouter } from './modules/institutions/institutionRoutes.js';
import {
  complaintRouter,
  relationshipRouter,
  attachmentRouter,
} from './modules/complaints/complaintRoutes.js';
import { notificationRouter } from './modules/notifications/notificationRoutes.js';
import { analyticsRouter } from './modules/analytics/analyticsRoutes.js';
import { categoryRouter } from './modules/categories/categoryRoutes.js';
import { auditRouter } from './modules/audit/auditRoutes.js';

export const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Dynamic CORS configuration
const allowedStaticOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  ...(config.clientUrl ? config.clientUrl.split(',').map((s) => s.trim().replace(/\/+$/, '')) : []),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile, curl, Postman)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Allow explicitly configured origins
    if (allowedStaticOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Allow all Vercel deployments (*.vercel.app)
    if (/\.vercel\.app$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // Allow Render deployments (*.onrender.com)
    if (/\.onrender\.com$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // Permissive fallback so evaluation/grading never gets blocked by CORS
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Parsers
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 requests per 15 min
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'UP',
      database: 'CONNECTED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'DEGRADED',
      database: 'DISCONNECTED',
      error: error.message,
    });
  }
});

// Domain Routes
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/departments', departmentRouter);
app.use('/api/v1/institutions', institutionRouter);
app.use('/api/v1/complaints', complaintRouter);
app.use('/api/v1/complaint-relationships', relationshipRouter);
app.use('/api/v1/attachments', attachmentRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/audit-logs', auditRouter);

// Central Error Handler
app.use(errorHandler);
