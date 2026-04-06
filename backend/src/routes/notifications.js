const express = require('express');
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /notifications
 * Returns the authenticated user's recent notifications derived from:
 *  - report_status_history (status changes on their reports)
 *  - XP awards from resolved reports
 *  - New challenges available
 */
router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = [];

    // ── Status change notifications from user's reports ─────
    const { data: statusChanges } = await supabase
      .from('report_status_history')
      .select(`
        id, to_status, note, changed_at,
        reports!inner ( id, title, user_id )
      `)
      .eq('reports.user_id', userId)
      .order('changed_at', { ascending: false })
      .limit(10);

    for (const change of statusChanges ?? []) {
      const report = change.reports;
      let title = '';
      let body  = '';

      if (change.to_status === 'resolved') {
        title = '✅ Issue Resolved';
        body  = `"${report.title || 'Your report'}" has been resolved by the authorities.`;
      } else if (change.to_status === 'in_review') {
        title = '🔍 Under Review';
        body  = `"${report.title || 'Your report'}" is now under review.`;
      } else if (change.to_status === 'in_progress') {
        title = '🔧 Work in Progress';
        body  = `Authorities are working on "${report.title || 'your report'}".`;
      } else {
        continue; // skip other transitions for brevity
      }

      notifications.push({
        id:     `status-${change.id}`,
        type:   'status_change',
        title,
        body,
        report_id: report.id,
        time:   change.changed_at,
        unread: true,
      });
    }

    // ── XP award notifications from recently resolved reports ─
    const { data: resolvedReports } = await supabase
      .from('reports')
      .select('id, title, xp_awarded, resolved_at')
      .eq('user_id', userId)
      .eq('status', 'resolved')
      .not('xp_awarded', 'is', null)
      .gt('xp_awarded', 0)
      .order('resolved_at', { ascending: false })
      .limit(5);

    for (const rep of resolvedReports ?? []) {
      notifications.push({
        id:        `xp-${rep.id}`,
        type:      'xp_award',
        title:     '⭐ XP Awarded',
        body:      `You earned +${rep.xp_awarded} XP for reporting "${rep.title || 'an issue'}"!`,
        report_id: rep.id,
        time:      rep.resolved_at,
        unread:    false,
      });
    }

    // ── New challenge notification ────────────────────────────
    const { data: newChallenges } = await supabase
      .from('challenges')
      .select('id, title, xp_reward, type')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(2);

    for (const ch of newChallenges ?? []) {
      notifications.push({
        id:    `challenge-${ch.id}`,
        type:  'new_challenge',
        title: '🏆 New Challenge',
        body:  `"${ch.title}" is live! Complete it to earn +${ch.xp_reward} XP.`,
        time:  new Date().toISOString(),
        unread: false,
      });
    }

    // Sort by time desc
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ notifications: notifications.slice(0, 15) });
  } catch (err) {
    console.error('[NOTIFICATIONS ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

module.exports = router;
