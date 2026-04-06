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

// ── GET /reports ─────────────────────────────────────────────
// Public feed — all authenticated users can read
router.get('/', authenticate, async (req, res) => {
  const { ward_id, status, category_id, limit = 20, offset = 0 } = req.query;

  let qb = supabase
    .from('reports')
    .select(`
      id, title, description, address, lat, lng, status, priority,
      ai_classified, ai_confidence, xp_awarded,
      authority_routed_to, created_at, updated_at,
      profiles ( id, name, avatar_url, title ),
      issue_categories ( id, name, icon, color ),
      issue_subcategories ( id, name ),
      wards ( id, name, ward_number )
    `)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (ward_id)     qb = qb.eq('ward_id', ward_id);
  if (status)      qb = qb.eq('status', status);
  if (category_id) qb = qb.eq('category_id', category_id);

  const { data, error } = await qb;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reports: data });
});

// ── GET /reports/mine ────────────────────────────────────────
router.get('/mine', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id, title, description, address, status, priority,
      ai_classified, xp_awarded, created_at, updated_at,
      issue_categories ( id, name, icon, color ),
      issue_subcategories ( id, name )
    `)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ reports: data });
});

// ── GET /reports/:id ─────────────────────────────────────────
router.get('/:id', [param('id').isUUID()], validate, authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      profiles ( id, name, avatar_url, title ),
      issue_categories ( * ),
      issue_subcategories ( * ),
      wards ( id, name, ward_number, zone ),
      report_media ( id, url, type, uploaded_at ),
      report_status_history ( id, from_status, to_status, changed_by, note, changed_at )
    `)
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Report not found' });
  res.json({ report: data });
});

// ── POST /reports ─────────────────────────────────────────────
router.post('/', authenticate, [
  body('title').optional().isString().trim(),
  body('description').optional().isString().trim(),
  body('category_id').optional().isUUID(),
  body('subcategory_id').optional().isUUID(),
  body('ward_id').optional().isUUID(),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
  body('address').optional().isString().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('ai_classified').optional().isBoolean(),
  body('ai_confidence').optional().isFloat({ min: 0, max: 1 }),
  body('authority_routed_to').optional().isString().trim(),
], validate, async (req, res) => {
  const { title, description, category_id, subcategory_id,
          ward_id, lat, lng, address, priority,
          ai_classified, ai_confidence, authority_routed_to } = req.body;

  // Award base XP from the category (default fallback 10 XP)
  let xp_awarded = 10;
  if (category_id) {
    const { data: cat } = await supabase
      .from('issue_categories')
      .select('base_xp')
      .eq('id', category_id)
      .single();
    if (cat) xp_awarded = cat.base_xp;
  }

  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      user_id: req.user.id,
      title, description, category_id, subcategory_id,
      ward_id, lat, lng, address,
      priority: priority || 'medium',
      ai_classified: ai_classified || false,
      ai_confidence: ai_confidence || null,
      authority_routed_to: authority_routed_to || null,
      xp_awarded,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Update user XP
  await supabase.rpc('increment_xp', { uid: req.user.id, amount: xp_awarded })
    .catch(() => {}); // non-fatal if RPC not yet created

  res.status(201).json({ report, xp_awarded });
});

// ── PATCH /reports/:id/status ────────────────────────────────
// For authority / admin use
router.patch('/:id/status', [param('id').isUUID(), body('status').isIn(['submitted','in_review','in_progress','resolved','rejected'])], validate, authenticate, async (req, res) => {
  const { status, note } = req.body;

  const { data, error } = await supabase
    .from('reports')
    .update({ status, updated_at: new Date().toISOString(), ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ report: data });
});

module.exports = router;
