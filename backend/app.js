// backend/app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import advertisingRouter from './routes/advertising.js';
import productsRouter from './routes/products.js';
import clustersRouter from './routes/clusters.js';
import seoRouter from './routes/seo.js';
import contentRouter from './routes/content.js';
import shopsRouter from './routes/shops.js';
import tariffsRouter from './routes/tariffs.js';
import financesRouter from './routes/finances.js';
import reportsRouter from './routes/reports.js';
import ordersRouter from './routes/orders.js';
import settingsRouter from './routes/settings.js';
import adminRouter from './routes/admin.js';
import wbRouter from './routes/wb.js';
import connectDB from './config/db.js';

// Подхватываем .env из backend/.env
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

// Подключаемся к MongoDB
connectDB();

// Вспомогательные переменные __dirname в ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ---------------- Маршруты ----------------
app.use('/api/auth',        authRouter);
app.use('/api/dashboard',   dashboardRouter);
app.use('/api/advertising', advertisingRouter);
app.use('/api/products',    productsRouter);
app.use('/api/clusters',    clustersRouter);
app.use('/api/seo',         seoRouter);
app.use('/api/content',     contentRouter);
app.use('/api/shops',       shopsRouter);
app.use('/api/tariffs',     tariffsRouter);
app.use('/api/finances',    financesRouter);
app.use('/api/reports',     reportsRouter);
app.use('/api/orders',      ordersRouter);
app.use('/api/settings',    settingsRouter);
app.use('/api/admin',       adminRouter);
app.use('/api/wb',          wbRouter);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Раздача фронтенда
const frontendDir = path.resolve(__dirname, '../dist');
app.use(express.static(frontendDir));

// 404 для API
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// SPA fallback для фронтенда
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('[ERROR]', err?.stack || err);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app;
