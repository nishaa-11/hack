const express = require('express');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /locations/cities ─────────────────────────────────────
router.get('/cities', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name, state')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ cities: data });
});

// ── GET /locations/wards?city_id=uuid ────────────────────────
router.get('/wards', authenticate, async (req, res) => {
  const { city_id } = req.query;

  let qb = supabase
    .from('wards')
    .select('id, name, ward_number, zone, city_id')
    .order('ward_number', { ascending: true });

  if (city_id) qb = qb.eq('city_id', city_id);

  const { data, error } = await qb;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ wards: data });
});

module.exports = router;
