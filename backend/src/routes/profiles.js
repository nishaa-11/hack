const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── GET /profiles/me ────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, name, phone, xp_total, level, role, title,
      streak_days, last_active, avatar_url, created_at,
      wards ( id, name, ward_number, zone,
        cities ( id, name, state )
      )
    `)
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

// ── PATCH /profiles/me ───────────────────────────────────────
router.patch('/me', authenticate, [
  body('name').optional().isString().trim().notEmpty(),
  body('phone').optional().isString().trim(),
  body('ward_id').optional().isUUID(),
  body('avatar_url').optional().isURL(),
], validate, async (req, res) => {
  const allowed = ['name', 'phone', 'ward_id', 'avatar_url'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'No valid fields provided' });

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

// ── GET /profiles/me/impact ──────────────────────────────────
// Uses the neighborhood_impact view from db.txt
router.get('/me/impact', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('neighborhood_impact')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ impact: data });
  } catch (err) {
    console.warn('[DB WARN] neighborhood_impact view missing or empty:', err.message);
    // Fallback: Return sensible defaults so the UI doesn't break
    res.json({
      impact: {
        user_id: req.user.id,
        total_reports: 0,
        resolved_reports: 0,
        streak_days: 0,
        impact_score: 0,
      }
    });
  }
});

// ── GET /profiles/me/badges ──────────────────────────────────
router.get('/me/badges', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('user_badges')
    .select('earned_at, badges ( id, name, icon, color, description, tier )')
    .eq('user_id', req.user.id)
    .order('earned_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ badges: data });
});

module.exports = router;
