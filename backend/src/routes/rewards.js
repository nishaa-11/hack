const express = require('express');
const { param, validationResult } = require('express-validator');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// ── GET /rewards ───────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('rewards')
    .select('id, title, description, partner, xp_cost, type, valid_until')
    .eq('active', true)
    .order('xp_cost', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ rewards: data });
});

// ── GET /rewards/me ────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select(`
      id, voucher_code, status, redeemed_at,
      rewards ( id, title, description, partner, type )
    `)
    .eq('user_id', req.user.id)
    .order('redeemed_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ redemptions: data });
});

// ── POST /rewards/:id/redeem ────────────────────────────────────
router.post('/:id/redeem', [param('id').isUUID()], validate, authenticate, async (req, res) => {
  const { id: rewardId } = req.params;
  const userId = req.user.id;

  // Fetch reward
  const { data: reward, error: rErr } = await supabase
    .from('rewards')
    .select('id, xp_cost, active, valid_until, voucher_code_template')
    .eq('id', rewardId)
    .single();

  if (rErr || !reward) return res.status(404).json({ error: 'Reward not found' });
  if (!reward.active) return res.status(400).json({ error: 'Reward is not active' });
  if (reward.valid_until && new Date(reward.valid_until) < new Date())
    return res.status(400).json({ error: 'Reward has expired' });

  // Fetch user XP
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('xp_total')
    .eq('id', userId)
    .single();

  if (pErr || !profile) return res.status(500).json({ error: 'Could not fetch user profile' });
  if (profile.xp_total < reward.xp_cost)
    return res.status(400).json({ error: `Insufficient XP. You have ${profile.xp_total}, need ${reward.xp_cost}` });

  // Generate voucher code
  const { v4: uuidv4 } = require('uuid');
  const code = reward.voucher_code_template
    ? reward.voucher_code_template.replace('{UUID6}', uuidv4().slice(0, 6).toUpperCase())
    : null;

  // Deduct XP
  await supabase
    .from('profiles')
    .update({ xp_total: profile.xp_total - reward.xp_cost })
    .eq('id', userId);

  // Create redemption record
  const { data: redemption, error: redErr } = await supabase
    .from('reward_redemptions')
    .insert({ user_id: userId, reward_id: rewardId, voucher_code: code, status: 'confirmed' })
    .select()
    .single();

  if (redErr) return res.status(500).json({ error: redErr.message });

  res.status(201).json({ redemption, voucher_code: code });
});

module.exports = router;
