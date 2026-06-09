const express = require('express');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const quickCategorySpecs = [
  {
    label: 'Garbage Dumping',
    parentName: 'Solid Waste',
    subcategoryMatchers: ['Illegal dumping / garbage dump', 'Overflowing public bin', 'Bulk waste not collected'],
  },
  {
    label: 'Water Leakage',
    parentName: 'Water & Drainage',
    subcategoryMatchers: ['Water pipe leak / burst main', 'Blocked stormwater drain'],
  },
  {
    label: 'Pothole',
    parentName: 'Roads & Infrastructure',
    subcategoryMatchers: ['Pothole (dry)', 'Pothole in road (water-related)'],
  },
  {
    label: 'Streetlight Fault',
    parentName: 'Street Lighting',
    subcategoryMatchers: ['Streetlight not working', 'Streetlight flickering', 'No street lighting (new area)'],
  },
  {
    label: 'Sewage Overflow',
    parentName: 'Water & Drainage',
    subcategoryMatchers: ['Sewage overflow on road', 'Open manhole / drain cover missing'],
  },
];

function buildQuickCategories(issueCategories, issueSubcategories) {
  return quickCategorySpecs.map((spec) => {
    const parentCategory = issueCategories.find((category) => category.name === spec.parentName) || null;
    const matchedSubcategory = issueSubcategories.find((subCategory) =>
      spec.subcategoryMatchers.some((matcher) => subCategory.name === matcher)
    ) || null;

    return {
      id: matchedSubcategory?.id || parentCategory?.id,
      name: spec.label,
      icon: parentCategory?.icon || null,
      color: parentCategory?.color || null,
      default_authority: parentCategory?.default_authority || null,
      base_xp: parentCategory?.base_xp || 10,
      category_id: parentCategory?.id || null,
      subcategory_id: matchedSubcategory?.id || null,
      parent_name: parentCategory?.name || null,
      priority_default: matchedSubcategory?.priority_default || null,
      priority_score: matchedSubcategory?.priority_score || null,
    };
  }).filter((category) => category.category_id && category.subcategory_id);
}

// ── GET /categories ───────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const [{ data: issueCategories, error: categoriesError }, { data: issueSubcategories, error: subcategoriesError }] = await Promise.all([
    supabase
      .from('issue_categories')
      .select('id, name, icon, color, default_authority, base_xp')
      .order('name', { ascending: true }),
    supabase
      .from('issue_subcategories')
      .select('id, category_id, name, priority_default, priority_score'),
  ]);

  if (categoriesError) return res.status(500).json({ error: categoriesError.message });
  if (subcategoriesError) return res.status(500).json({ error: subcategoriesError.message });

  const categories = buildQuickCategories(issueCategories || [], issueSubcategories || []);
  res.json({ categories });
});

module.exports = router;
