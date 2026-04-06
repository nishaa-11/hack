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

  // Find the matching leaderboard row
  const { data: lb, error: lbErr } = await supabase
    .from('leaderboards')
    .select('id')
    .eq('scope', scope)
    .eq('time_period', time_period)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lbErr || !lb) {
    // Fallback: derive from profiles XP (all_time city)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, xp_total, level, title, avatar_url')
      .order('xp_total', { ascending: false })
      .limit(Number(limit));

    if (error || !profiles) {
      console.warn('[DB WARN] Leaderboard fallback failed or empty:', error?.message);
      return res.json({ leaderboard: [], scope, time_period });
    }

    const ranked = profiles.map((p, i) => ({
      rank: i + 1,
      user_id: p.id,
      name: p.name,
      title: p.title,
      avatar_url: p.avatar_url,
      xp: p.xp_total,
      rank_change: 0,
      is_me: p.id === req.user.id,
    }));

    return res.json({ leaderboard: ranked, scope, time_period });
  }

  // Use stored leaderboard entries
  const { data: entries, error } = await supabase
    .from('leaderboard_entries')
    .select(`
      rank, xp, rank_change, title, updated_at,
      profiles ( id, name, avatar_url, level )
    `)
    .eq('leaderboard_id', lb.id)
    .order('rank', { ascending: true })
    .limit(Number(limit));

  if (error) return res.status(500).json({ error: error.message });

  const result = entries.map(e => ({
    rank: e.rank,
    user_id: e.profiles?.id,
    name: e.profiles?.name,
    avatar_url: e.profiles?.avatar_url,
    level: e.profiles?.level,
    title: e.title,
    xp: e.xp,
    rank_change: e.rank_change,
    is_me: e.profiles?.id === req.user.id,
  }));

  res.json({ leaderboard: result, scope, time_period });
});

module.exports = router;
