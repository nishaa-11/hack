const express = require('express');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── GET /categories ───────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('issue_categories')
    .select(`
      id, name, icon, color, default_authority, base_xp,
      issue_subcategories ( id, name, priority_default, priority_score )
    `)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ categories: data });
});

module.exports = router;
