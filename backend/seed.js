/**
 * CivicPulse — DB Seed Script
 * Creates 10 Supabase auth users + realistic profile/report/badge data.
 *
 * Usage:
 *   cd backend
 *   node seed.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ── Seed Data ────────────────────────────────────────────────

const USERS = [
  { email: 'arjun.sharma@civicpulse.in',   password: 'Civic@1234', name: 'Arjun Sharma',     xp: 1240, level: 2, title: 'Guardian',     streak: 14 },
  { email: 'priya.mehta@civicpulse.in',    password: 'Civic@1234', name: 'Priya Mehta',      xp:  980, level: 2, title: 'Activist',     streak: 9  },
  { email: 'rohan.nair@civicpulse.in',     password: 'Civic@1234', name: 'Rohan Nair',       xp:  870, level: 1, title: 'Influencer',   streak: 6  },
  { email: 'divya.krishnan@civicpulse.in', password: 'Civic@1234', name: 'Divya Krishnan',   xp:  760, level: 1, title: 'Activist',     streak: 5  },
  { email: 'karthik.iyer@civicpulse.in',   password: 'Civic@1234', name: 'Karthik Iyer',    xp:  650, level: 1, title: 'Newcomer',     streak: 3  },
  { email: 'meera.pillai@civicpulse.in',   password: 'Civic@1234', name: 'Meera Pillai',    xp:  590, level: 1, title: 'Activist',     streak: 7  },
  { email: 'suresh.babu@civicpulse.in',    password: 'Civic@1234', name: 'Suresh Babu',     xp:  480, level: 1, title: 'Newcomer',     streak: 2  },
  { email: 'ananya.reddy@civicpulse.in',   password: 'Civic@1234', name: 'Ananya Reddy',    xp:  390, level: 1, title: 'Newcomer',     streak: 4  },
  { email: 'vijay.kumar@civicpulse.in',    password: 'Civic@1234', name: 'Vijay Kumar',     xp:  270, level: 1, title: 'Newcomer',     streak: 1  },
  { email: 'lakshmi.devi@civicpulse.in',   password: 'Civic@1234', name: 'Lakshmi Devi',   xp:  150, level: 1, title: 'Newcomer',     streak: 0  },
];

// Reports seeded per user (cycle through wards & categories from DB)
const REPORT_TEMPLATES = [
  { title: 'Garbage dump near metro station',       description: 'Large pile of garbage blocking pedestrian path near the metro entrance. Smell is unbearable.', status: 'resolved',    priority: 'high'   },
  { title: 'Broken streetlight on main road',       description: 'Streetlight has been non-functional for 2 weeks creating safety hazard at night.',              status: 'in_progress', priority: 'medium' },
  { title: 'Overflowing drain after rain',          description: 'Storm drain overflowing and flooding the road after last night\'s rain.',                        status: 'in_review',   priority: 'high'   },
  { title: 'Deep pothole causing accidents',         description: 'Large pothole on the main road has caused 2 bike accidents this week.',                          status: 'submitted',   priority: 'high'   },
  { title: 'Stray dog menace near school',          description: 'Pack of aggressive stray dogs near the primary school entrance. Children are scared.',            status: 'in_review',   priority: 'medium' },
  { title: 'Illegal waste burning in open area',    description: 'Residents burning plastic waste daily in the vacant plot. Air quality severely affected.',        status: 'resolved',    priority: 'high'   },
  { title: 'Water supply contaminated',             description: 'Tap water has strong odour and brown colour. Multiple households affected.',                     status: 'in_progress', priority: 'high'   },
  { title: 'Park equipment broken and rusty',       description: 'Swings and slides in the neighbourhood park are broken and have sharp rusty edges.',             status: 'submitted',   priority: 'medium' },
  { title: 'Footpath encroached by vendors',        description: 'Street vendors have completely blocked the footpath forcing pedestrians onto the road.',          status: 'in_review',   priority: 'medium' },
  { title: 'Sewage overflow on residential street', description: 'Sewage pipe burst 3 days ago. Raw sewage flowing on the street.',                                status: 'resolved',    priority: 'high'   },
  { title: 'Dangling electrical wire near tree',    description: 'Electrical wire has come loose and is hanging dangerously low near a large tree.',                status: 'in_progress', priority: 'high'   },
  { title: 'Open manhole without cover',            description: 'Manhole cover missing for over a week. Children and two-wheelers at serious risk.',               status: 'submitted',   priority: 'high'   },
  { title: 'Tree blocking visibility at junction',  description: 'Overgrown tree branches block traffic signal visibility at the main junction.',                   status: 'in_review',   priority: 'medium' },
  { title: 'Construction debris dumped on road',    description: 'Builder has dumped construction material on the public road for months.',                        status: 'resolved',    priority: 'medium' },
  { title: 'Mosquito breeding in stagnant water',   description: 'Water logged in pothole for days. Mosquito larvae visible. Dengue risk area.',                  status: 'submitted',   priority: 'high'   },
];

// Approximate Bengaluru coordinates for each ward (lat, lng)
const WARD_COORDS = {
  'Koramangala':    { lat: 12.9352, lng: 77.6245 },
  'Indiranagar':    { lat: 12.9784, lng: 77.6408 },
  'HSR Layout':     { lat: 12.9116, lng: 77.6389 },
  'Jayanagar':      { lat: 12.9304, lng: 77.5826 },
  'Whitefield':     { lat: 12.9698, lng: 77.7499 },
  'Malleshwaram':   { lat: 13.0031, lng: 77.5687 },
  'Hebbal':         { lat: 13.0351, lng: 77.5966 },
  'Electronic City': { lat: 12.8456, lng: 77.6603 },
  'Cubbon Park':    { lat: 12.9763, lng: 77.5929 },
  'MG Road':        { lat: 12.9757, lng: 77.6101 },
};

// ── Helpers ──────────────────────────────────────────────────

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function jitter(coord, amount = 0.005) { return coord + (Math.random() - 0.5) * amount; }

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('\n🌿 CivicPulse Seed Script\n');

  // ── Fetch existing lookup data ──────────────────────────────
  console.log('📦 Fetching categories, wards, badges from DB...');

  const { data: categories } = await supabase.from('issue_categories').select('id, name, default_authority');
  const { data: wards }      = await supabase.from('wards').select('id, name');
  const { data: badges }     = await supabase.from('badges').select('id, name');

  if (!categories?.length) { console.error('❌ No categories found. Run the DB migration first.'); process.exit(1); }
  if (!wards?.length)      { console.error('❌ No wards found. Run the DB migration first.');      process.exit(1); }
  if (!badges?.length)     { console.error('❌ No badges found. Run the DB migration first.');     process.exit(1); }

  console.log(`   ✓ ${categories.length} categories, ${wards.length} wards, ${badges.length} badges\n`);

  const createdUserIds = [];

  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    console.log(`👤 [${i + 1}/${USERS.length}] Seeding ${u.name}...`);

    // ── Create auth user ──────────────────────────────────────
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email:             u.email,
      password:          u.password,
      email_confirm:     true,
      user_metadata:     { full_name: u.name },
    });

    if (authErr) {
      if (authErr.message?.includes('already been registered') || authErr.message?.includes('already exists')) {
        console.log(`   ⚠️  Auth user already exists — fetching existing profile`);
        // Try to find existing user by email
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users.find(u2 => u2.email === u.email);
        if (existing) {
          createdUserIds.push(existing.id);
          // Update profile XP if needed
          await supabase.from('profiles').upsert({
            id: existing.id, name: u.name, xp_total: u.xp,
            level: u.level, title: u.title, streak_days: u.streak,
          }, { onConflict: 'id' });
        }
        continue;
      }
      console.error(`   ❌ Failed to create auth user: ${authErr.message}`);
      continue;
    }

    const userId = authData.user.id;
    createdUserIds.push(userId);

    // ── Upsert profile ────────────────────────────────────────
    const ward = wards[i % wards.length];
    const { error: profErr } = await supabase.from('profiles').upsert({
      id:          userId,
      name:        u.name,
      xp_total:    u.xp,
      level:       u.level,
      title:       u.title,
      streak_days: u.streak,
      ward_id:     ward.id,
      role:        'citizen',
      last_active: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profErr) console.warn(`   ⚠️  Profile upsert error: ${profErr.message}`);

    // ── Insert reports ─────────────────────────────────────────
    const numReports = 3 + (i % 4); // 3–6 reports per user
    const coords = WARD_COORDS[ward.name] ?? { lat: 12.9716, lng: 77.5946 };

    for (let r = 0; r < numReports; r++) {
      const tmpl    = REPORT_TEMPLATES[(i * 4 + r) % REPORT_TEMPLATES.length];
      const cat     = categories[(i + r) % categories.length];
      const xpAward = 10 + (r * 5);
      const daysAgo = (r + 1) * 3;
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

      const { error: repErr } = await supabase.from('reports').insert({
        user_id:             userId,
        category_id:         cat.id,
        ward_id:             ward.id,
        title:               tmpl.title,
        description:         tmpl.description,
        lat:                 jitter(coords.lat),
        lng:                 jitter(coords.lng),
        address:             `${ward.name}, Bengaluru, Karnataka`,
        status:              tmpl.status,
        priority:            tmpl.priority,
        authority_routed_to: cat.default_authority,
        ai_classified:       true,
        ai_confidence:       0.75 + Math.random() * 0.2,
        xp_awarded:          xpAward,
        created_at:          createdAt,
        resolved_at:         tmpl.status === 'resolved' ? createdAt : null,
      });

      if (repErr) console.warn(`   ⚠️  Report insert error: ${repErr.message}`);
    }

    // ── Award badges ───────────────────────────────────────────
    const numBadges = 1 + (i % 3); // 1–3 badges
    for (let b = 0; b < numBadges; b++) {
      const badge = badges[(i + b) % badges.length];
      const { error: badgeErr } = await supabase.from('user_badges').upsert({
        user_id:   userId,
        badge_id:  badge.id,
        earned_at: new Date(Date.now() - b * 7 * 86400000).toISOString(),
      }, { onConflict: 'user_id,badge_id' });
      if (badgeErr) console.warn(`   ⚠️  Badge insert error: ${badgeErr.message}`);
    }

    console.log(`   ✓ Profile, ${numReports} reports, ${numBadges} badge(s) created`);
  }

  // ── Leaderboard snapshot ────────────────────────────────────
  console.log('\n🏆 Creating leaderboard snapshot...');

  // Create or reuse a city all_time leaderboard
  let lbId;
  const { data: existingLb } = await supabase
    .from('leaderboards')
    .select('id')
    .eq('scope', 'city')
    .eq('time_period', 'all_time')
    .limit(1)
    .single();

  if (existingLb) {
    lbId = existingLb.id;
  } else {
    const { data: newLb, error: lbErr } = await supabase
      .from('leaderboards')
      .insert({ scope: 'city', time_period: 'all_time' })
      .select()
      .single();
    if (lbErr) { console.warn('⚠️  Leaderboard insert error:', lbErr.message); }
    else lbId = newLb.id;
  }

  if (lbId) {
    // Fetch all profiles sorted by XP
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, xp_total, title')
      .order('xp_total', { ascending: false })
      .limit(50);

    for (let r = 0; r < (profiles?.length ?? 0); r++) {
      const p = profiles[r];
      await supabase.from('leaderboard_entries').upsert({
        leaderboard_id: lbId,
        user_id:        p.id,
        xp:             p.xp_total,
        rank:           r + 1,
        rank_change:    Math.floor(Math.random() * 5) - 2, // -2 to +2
        title:          p.title,
      }, { onConflict: 'leaderboard_id,user_id' });
    }
    console.log(`   ✓ Leaderboard entries upserted (${profiles?.length ?? 0} users)`);
  }

  // ── Status history for resolved reports ─────────────────────
  console.log('\n📋 Adding status history for resolved reports...');
  const { data: resolvedReports } = await supabase
    .from('reports')
    .select('id, created_at')
    .eq('status', 'resolved')
    .limit(30);

  for (const rep of resolvedReports ?? []) {
    const reviewedAt = new Date(new Date(rep.created_at).getTime() + 86400000).toISOString();
    const resolvedAt = new Date(new Date(rep.created_at).getTime() + 2 * 86400000).toISOString();

    await supabase.from('report_status_history').insert([
      { report_id: rep.id, from_status: 'submitted', to_status: 'in_review',   changed_by: 'system', changed_at: reviewedAt },
      { report_id: rep.id, from_status: 'in_review', to_status: 'resolved',    changed_by: 'authority', note: 'Issue addressed and verified by field officers.', changed_at: resolvedAt },
    ]).then(() => {}).catch(() => {});
  }
  console.log(`   ✓ Status history added for ${resolvedReports?.length ?? 0} resolved reports`);

  console.log('\n✅ Seed complete!\n');
  console.log('📧 Test accounts (password: Civic@1234):');
  USERS.forEach(u => console.log(`   ${u.email}`));
  console.log('');
}

main().catch(err => { console.error('Seed failed:', err); process.exit(1); });
