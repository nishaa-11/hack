const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');
const { classifyIssue } = require('../lib/gemini');

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

// ── GET /reports/nearby ──────────────────────────────────────
// Returns reports within ~radius km of lat/lng using bounding box
router.get('/nearby', authenticate, async (req, res) => {
  const lat    = parseFloat(req.query.lat);
  const lng    = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 5; // km
  const limit  = Math.min(parseInt(req.query.limit) || 30, 100);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  // 1 degree latitude ≈ 111 km
  const delta = radius / 111;

  const { data, error } = await supabase
    .from('reports')
    .select(`
      id, title, lat, lng, status, priority,
      issue_categories ( id, name, icon, color )
    `)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .gte('lat', lat - delta)
    .lte('lat', lat + delta)
    .gte('lng', lng - delta)
    .lte('lng', lng + delta)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ reports: data, count: data.length });
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
  let { title, description, category_id, subcategory_id,
          ward_id, lat, lng, address, priority,
          ai_classified, ai_confidence, authority_routed_to } = req.body;

  // -- AI Auto-Classification using Gemini --
  if (title || description) {
    const { data: allCats } = await supabase.from('issue_categories').select('id, name, default_authority');
    if (allCats && allCats.length > 0) {
      const geminiResult = await classifyIssue(title, description, allCats);
      if (geminiResult && geminiResult.category_id) {
        category_id = geminiResult.category_id;
        ai_classified = true;
        ai_confidence = geminiResult.ai_confidence;
        priority = geminiResult.priority; // Set the AI-determined priority
        
        // Also auto-route if the category has a default authority mapping
        const assignedCat = allCats.find(c => c.id === category_id);
        if (assignedCat && assignedCat.default_authority) {
          authority_routed_to = assignedCat.default_authority;
        }
      }
    }
  }

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

  // Update user XP manually since increment_xp RPC is missing
  try {
    const { data: profile } = await supabase.from('profiles').select('xp_total').eq('id', req.user.id).single();
    if (profile) {
      await supabase.from('profiles')
        .update({ xp_total: (profile.xp_total || 0) + xp_awarded })
        .eq('id', req.user.id);
    }
  } catch (err) {
    console.warn('[XP Warning]', err.message);
  }

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
