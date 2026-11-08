import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { connectDatabase } from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import applicationMethodRoutes from './routes/applicationMethodRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cropRoutes from './routes/cropRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import problemRoutes from './routes/problemRoutes.js';
import productRoutes from './routes/productRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const configuredOrigins = [
  ...(process.env.CLIENT_ORIGIN || '').split(','),
  ...(process.env.FRONTEND_URL || '').split(','),
  ...(process.env.CORS_ORIGIN || '').split(','),
]
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultProductionOrigins = new Set([
  'https://himalaya-farmcare.vercel.app',
]);

const developmentOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  if (configuredOrigins.includes(cleanOrigin)) return true;
  if (defaultProductionOrigins.has(cleanOrigin)) return true;
  if (developmentOrigins.has(cleanOrigin)) return true;
  // Allow any Vercel deployment preview / sub-branch domain
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(cleanOrigin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Rejected request from unauthorized origin: "${origin}"`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Serve uploaded assets statically
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.use('/api/admin', adminRoutes);
app.use('/api/application-methods', applicationMethodRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/products', productRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    database: 'connected',
  });
});

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, '0.0.0.0', () => {
      console.log(`API server listening on port ${port} (bound to 0.0.0.0)`);
    });
  } catch (error) {
    console.error(`API server was not started because the database is unavailable: ${error.message}`);
    process.exit(1);
  }
}

startServer();
