import express from 'express';
import cors from 'cors';
import { createAuth } from './auth.js';
import { createServices } from './services.js';
import { ApiError } from './util.js';
import catalogRoutes from './routes/catalog.js';
import accountRoutes from './routes/accounts.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';

export function createApp(db, cfg) {
  const app = express();
  const auth = createAuth(db, cfg);
  const svc = createServices(db, cfg);
  const ctx = { db, cfg, svc, auth };

  app.disable('x-powered-by');
  app.use(cors({ origin: cfg.corsOrigins, allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(auth.attach);

  app.get('/health', (_req, res) => res.json({ ok: true, payments: cfg.paymentMode, otp: cfg.otpMode }));
  for (const mk of [catalogRoutes, accountRoutes, bookingRoutes, paymentRoutes, adminRoutes]) app.use(mk(ctx));

  app.use((req, _res, next) => next(new ApiError(404, `No route for ${req.method} ${req.path}`)));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status === 500) console.error(err);
    res.status(status).json({ message: status === 500 ? 'Something went wrong on the server.' : err.message, timeStamp: new Date().toISOString() });
  });
  return { app, svc, auth };
}
