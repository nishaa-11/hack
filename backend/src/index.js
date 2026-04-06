require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// ── Route Modules ─────────────────────────────────────────────
const profilesRouter    = require('./routes/profiles');
const reportsRouter     = require('./routes/reports');
const challengesRouter  = require('./routes/challenges');
const leaderboardRouter = require('./routes/leaderboard');
const rewardsRouter     = require('./routes/rewards');
const categoriesRouter  = require('./routes/categories');
const locationsRouter   = require('./routes/locations');

const app = express();

// ── Security & Logging ────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow Postman / curl (no origin) in development
    if (!origin || process.env.NODE_ENV !== 'production') return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CivicPulse API',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/v1/profiles',    profilesRouter);
app.use('/api/v1/reports',     reportsRouter);
app.use('/api/v1/challenges',  challengesRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/rewards',     rewardsRouter);
app.use('/api/v1/categories',  categoriesRouter);
app.use('/api/v1/locations',   locationsRouter);

// ── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🌿 CivicPulse API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL || '(not set)'}\n`);
});

module.exports = app;
