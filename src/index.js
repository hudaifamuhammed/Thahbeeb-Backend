import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './lib/db.js';

import authRoutes from './routes/auth.routes.js';
import teamRoutes from './routes/team.routes.js';
import newsRoutes from './routes/news.routes.js';
import itemRoutes from './routes/item.routes.js';
import galleryRoutes from './routes/gallery.routes.js';
import scoreRoutes from './routes/score.routes.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Middlewares =====
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ===== Static uploads =====
const uploadsDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsDir));

// ===== Health Check =====
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Server is healthy 🚀' });
});

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/scores', scoreRoutes);

// ===== Start Server =====
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`✅ API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
