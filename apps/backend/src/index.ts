// env vars injected by Cloud Run — no dotenv needed in production
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';

import { connectDB } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initSocketHandlers } from './services/socketService';

// Routes
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import providerRoutes from './routes/providers';
import paymentRoutes from './routes/payments';
import reviewRoutes from './routes/reviews';
import chatRoutes from './routes/chat';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import seedRoutes from './routes/seed';

const app = express();
const httpServer = http.createServer(app);

// ── Socket.io ─────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocketHandlers(io);

// ── Middleware ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiados pedidos. Tente novamente mais tarde.' },
}));

// ── Health check ──────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Esta Feito API', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────
const API = '/api';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/jobs`, jobRoutes);
app.use(`${API}/providers`, providerRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/reviews`, reviewRoutes);
app.use(`${API}/chat`, chatRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/upload`, uploadRoutes);
// Seed route — protected by SEED_SECRET header, remove after first deploy
app.use(`${API}/seed`, seedRoutes);

// ── 404 ───────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada.' });
});

// ── Error handler ─────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '5000', 10);

async function start() {
  // Listen on port FIRST so Cloud Run health checks pass,
  // then connect to MongoDB. If DB fails, log but keep serving
  // so the container doesn't get killed before we can debug.
  httpServer.listen(PORT, () => {
    logger.info(`🚀 Esta Feito API running on port ${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`📡 Socket.io ready`);
  });

  try {
    await connectDB();
    logger.info('✅ MongoDB connected');
  } catch (err) {
    logger.error('❌ MongoDB connection failed — check MONGODB_URI env var:', err);
    // Do NOT exit — keep the process alive so Cloud Run doesn't restart loop
  }
}

start().catch((err) => {
  logger.error('Unexpected startup error:', err);
});
