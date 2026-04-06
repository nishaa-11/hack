const express = require('express');
const { query, validationResult } = require('express-validator');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── GET /leaderboard ──────────────────────────────────────────
// scope: 'city' | 'college' | 'friends' | 'ward'
// time_period: 'all_time' | 'weekly' | 'monthly'
router.get('/', authenticate, [
  query('scope').optional().isIn(['city', 'college', 'friends', 'ward']),
  query('time_period').optional().isIn(['all_time', 'weekly', 'monthly']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req, res) => {
  const { scope = 'city', time_period = 'all_time', limit = 20 } = req.query;

  // Always fetch live from profiles table to ensure realtime XP updates for demo
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, xp_total, level, title, avatar_url')
    .order('xp_total', { ascending: false })
    .limit(Number(limit));

  if (error || !profiles) {
    console.warn('[DB WARN] Leaderboard live fetch failed:', error?.message);
    return res.json({ leaderboard: [], scope, time_period });
  }

  const ranked = profiles.map((p, i) => ({
    rank: i + 1,
    user_id: p.id,
    name: p.name,
    title: p.title,
    avatar_url: p.avatar_url,
    level: p.level,
    xp: p.xp_total,
    rank_change: 0,
    is_me: p.id === req.user.id,
  }));

  return res.json({ leaderboard: ranked, scope, time_period });
});

module.exports = router;
