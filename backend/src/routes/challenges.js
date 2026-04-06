const express = require('express');
const { param, body, validationResult } = require('express-validator');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── GET /challenges ───────────────────────────────────────────
// List all available challenges (optionally filtered by type)
router.get('/', authenticate, async (req, res) => {
  const { type } = req.query;

  let qb = supabase
    .from('challenges')
    .select('*')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('xp_reward', { ascending: false });

  if (type) qb = qb.eq('type', type);

  const { data, error } = await qb;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ challenges: data });
});

// ── GET /challenges/me ────────────────────────────────────────
// Current user's challenge participation
router.get('/me', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('user_challenges')
    .select(`
      id, progress, status, completed_at, created_at,
      challenges ( id, title, description, type, xp_reward, target_count, metric )
    `)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ challenges: data });
});

// ── POST /challenges/:id/join ─────────────────────────────────
router.post('/:id/join', [param('id').isUUID()], validate, authenticate, async (req, res) => {
  // Upsert: if already joined, ignore
  const { data, error } = await supabase
    .from('user_challenges')
    .upsert({
      user_id: req.user.id,
      challenge_id: req.params.id,
      progress: 0,
      status: 'in_progress',
    }, { onConflict: 'user_id,challenge_id', ignoreDuplicates: true })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  
  // Increment participant_count safely (don't crash if RPC is missing)
  try {
    await supabase.rpc('increment_participant', { cid: req.params.id });
  } catch (rpcErr) {
    console.warn('[RPC WARN] increment_participant failed:', rpcErr.message);
  }

  res.status(201).json({ participation: data });
});

// ── PATCH /challenges/:id/progress ───────────────────────────
router.patch('/:id/progress', [
  param('id').isUUID(),
  body('increment').isInt({ min: 1 }),
], validate, authenticate, async (req, res) => {
  const { increment } = req.body;

  // Fetch user_challenge row
  const { data: row, error: fetchErr } = await supabase
    .from('user_challenges')
    .select('id, progress, status, challenges(target_count, xp_reward)')
    .eq('user_id', req.user.id)
    .eq('challenge_id', req.params.id)
    .single();

  if (fetchErr || !row) return res.status(404).json({ error: 'Challenge participation not found' });
  if (row.status === 'completed') return res.status(400).json({ error: 'Challenge already completed' });

  const newProgress = row.progress + increment;
  const target = row.challenges.target_count;
  const completed = newProgress >= target;

  const { data, error } = await supabase
    .from('user_challenges')
    .update({
      progress: Math.min(newProgress, target),
      status: completed ? 'completed' : 'in_progress',
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', row.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  let xp_awarded = 0;
  if (completed) {
    xp_awarded = row.challenges.xp_reward;
    await supabase.rpc('increment_xp', { uid: req.user.id, amount: xp_awarded }).catch(() => {});
  }

  res.json({ participation: data, completed, xp_awarded });
});

module.exports = router;
