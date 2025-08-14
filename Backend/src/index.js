import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { requireEnv } from './utils/validateEnv.js';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import messageRoutes from './routes/message.routes.js';
import { createSocketServer } from './socket/index.js';

// Validate required envs early (fail fast)
const PORT = Number(requireEnv('PORT', 4000));
const MONGODB_URI = requireEnv('MONGODB_URI');
const CORS_ORIGIN = requireEnv('CORS_ORIGIN', '*');
requireEnv('JWT_SECRET'); // ensure present

await connectDB(MONGODB_URI);

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Basic rate limit for auth
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth', authLimiter);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);

const server = http.createServer(app);
createSocketServer(server, CORS_ORIGIN);

server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
