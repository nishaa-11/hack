import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  CheckCircle,
  Droplets,
  FileText,
  Flame,
  Gift,
  Leaf,
  ShieldCheck,
  Star,
  Users,
  Building2,
  Zap,
  Trash2,
  Bus,
  Coffee,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import {
  Profile,
  ProfilesAPI,
  ReportsAPI,
  RewardsAPI,
  type NeighborhoodImpact,
  type Redemption,
  type Report,
  type UserBadge,
} from '@/lib/api';

const { width: SCREEN_W } = Dimensions.get('window');

// Map badge names / tiers to icons & colors
function badgeIconFor(name: string, color: string) {
  const n = name.toLowerCase();
  if (n.includes('water')) return <Droplets size={26} color={color} />;
  if (n.includes('eco') || n.includes('green')) return <Leaf size={26} color={color} />;
  if (n.includes('reporter') || n.includes('report')) return <FileText size={26} color={color} />;
  if (n.includes('guardian') || n.includes('city')) return <Building2 size={26} color={color} />;
  if (n.includes('contrib')) return <Users size={26} color={color} />;
  if (n.includes('shield')) return <ShieldCheck size={26} color={color} />;
  return <Star size={26} color={color} />;
}

// Status chip styles
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  resolved: { bg: '#E8F5EE', text: '#1a7a4a', label: 'RESOLVED' },
  in_review: { bg: '#FEF3C7', text: '#D97706', label: 'IN REVIEW' },
  submitted: { bg: '#F3F4F6', text: '#6B7280', label: 'SUBMITTED' },
  in_progress: { bg: '#EFF6FF', text: '#2563EB', label: 'IN PROGRESS' },
  rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'REJECTED' },
};

function statusStyle(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS['submitted'];
}

export default function ProfileScreen() {
  const { profile: authProfile, localAvatarUri, setLocalAvatarUri } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [impact, setImpact] = useState<NeighborhoodImpact | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myRewards, setMyRewards] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Fire all 5 requests in parallel — no sequential waterfall
      const [meRes, impactRes, badgesRes, reportsRes, rewardsRes] = await Promise.allSettled([
        ProfilesAPI.me(),
        ProfilesAPI.impact(),
        ProfilesAPI.badges(),
        ReportsAPI.mine(),
        RewardsAPI.mine(),
      ]);

      if (meRes.status === 'fulfilled') setProfile(meRes.value.profile);
      else if (meRes.status === 'rejected') setError(meRes.reason?.message ?? 'Failed to load profile');

      if (impactRes.status === 'fulfilled') setImpact(impactRes.value.impact ?? null);
      if (badgesRes.status === 'fulfilled') setBadges(badgesRes.value.badges ?? []);
      if (reportsRes.status === 'fulfilled') setMyReports(reportsRes.value.reports ?? []);
      if (rewardsRes.status === 'fulfilled') setMyRewards(rewardsRes.value.redemptions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const data = profile ?? authProfile;

  // XP progress toward next level
  const { xpCurrent, xpNext, progressPercent, progressLabel } = useMemo(() => {
    if (!data) return { xpCurrent: 0, xpNext: 750, progressPercent: 0, progressLabel: '0 / 750 XP' };
    const level = data.level ?? 1;
    const nextLevelXp = level * 750; // e.g. level 12 → 9000 XP threshold; simplified here as level*100
    const xpTotal = data.xp_total ?? 0;
    // Show XP within current level band
    const bandSize = 750;
    const xpInBand = xpTotal % bandSize;
    const pct = Math.min(100, Math.round((xpInBand / bandSize) * 100));
    return {
      xpCurrent: xpInBand,
      xpNext: bandSize,
      progressPercent: pct,
      progressLabel: `${xpInBand} / ${bandSize} XP`,
    };
  }, [data]);

  const initials = useMemo(() => {
    if (!data?.name) return 'N';
    return data.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }, [data]);

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  // Build locked placeholder badges to fill grid to 6
  const LOCKED_BADGES = [
    { name: 'Clean City Champion', icon: <Building2 size={26} color="#C0C0C0" /> },
    { name: 'Guardian', icon: <ShieldCheck size={26} color="#C0C0C0" /> },
    { name: 'Top Contributor', icon: <Users size={26} color="#C0C0C0" /> },
  ];

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color="#1a7a4a" />
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={loadData}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF5EE" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a7a4a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP BAR ── */}
        <View style={s.topBar}>
          <View style={s.logoCon}>
            <Leaf size={20} color="#1a7a4a" />
            <Text style={s.logoText}>CivicPulse</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={s.xpPill}>
              <Star size={14} color="#1a7a4a" fill="#1a7a4a" />
              <Text style={s.xpPillText}>{data?.xp_total ?? 0} XP</Text>
            </View>
            <TouchableOpacity style={s.logoutBtnSmall} onPress={signOut}>
              <LogOut size={18} color="#E8593C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── HERO ── */}
        <View style={s.hero}>
          {/* Avatar Ring */}
          <TouchableOpacity style={s.avatarRing} onPress={pickProfileImage} activeOpacity={0.8}>
            <View style={s.avatarInner}>
              {localAvatarUri ? (
                <Image source={{ uri: localAvatarUri }} style={{ width: '100%', height: '100%', borderRadius: 42 }} />
              ) : (
                <Text style={s.avatarText}>{initials}</Text>
              )}
            </View>
            {/* Level badge */}
            <View style={s.levelBadge}>
              <Text style={s.levelBadgeText}>LVL {data?.level ?? 1}</Text>
            </View>
          </TouchableOpacity>

          <Text style={s.name}>{data?.name ?? 'Citizen'}</Text>
          <View style={s.subtitleRow}>
            <Text style={s.pin}>📍</Text>
            <Text style={s.subtitleCity}>{data?.wards?.cities?.name ?? 'City'}</Text>
            <Text style={s.dot}> • </Text>
            <Text style={s.subtitleTitle}>{data?.title ?? 'Activist'}</Text>
          </View>
        </View>

        {/* ── XP PROGRESS ── */}
        <View style={s.progressSection}>
          <View style={s.progressHeader}>
            <Text style={s.progressPathLabel}>Influencer Path</Text>
            <Text style={s.progressXPLabel}>{progressLabel}</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={s.progressHint}>
            Earn {xpNext - xpCurrent} XP more to unlock 'Influencer' perks
          </Text>
        </View>

        {/* ── STATS ROW ── */}
        <View style={s.statsRow}>
          <StatCard
            icon={<FileText size={22} color="#1a7a4a" />}
            label="REPORTS"
            value={String(impact?.total_reports ?? myReports.length ?? 0)}
          />
          <StatCard
            icon={<CheckCircle size={22} color="#1a7a4a" />}
            label="RESOLVED"
            value={String(impact?.resolved_reports ?? 0)}
          />
          <StatCard
            icon={<Flame size={22} color="#E8593C" />}
            label="STREAK"
            value={`${impact?.streak_days ?? data?.streak_days ?? 0} days`}
          />
        </View>

        {/* ── BADGES ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Badges</Text>
          <View style={s.badgesGrid}>
            {/* Earned badges */}
            {badges.slice(0, 6).map((entry) => {
              const color = entry.badges.color ?? '#1a7a4a';
              const bgColor = color + '22';
              return (
                <View key={entry.badges.id + entry.earned_at} style={s.badgeItem}>
                  <View style={[s.badgeCircle, { backgroundColor: bgColor }]}>
                    {badgeIconFor(entry.badges.name, color)}
                  </View>
                  <Text style={s.badgeName} numberOfLines={2}>{entry.badges.name}</Text>
                </View>
              );
            })}
            {/* Locked placeholder badges */}
            {badges.length < 6 &&
              LOCKED_BADGES.slice(0, 6 - badges.length).map((b) => (
                <View key={b.name} style={s.badgeItem}>
                  <View style={[s.badgeCircle, s.badgeCircleLocked]}>{b.icon}</View>
                  <Text style={[s.badgeName, s.badgeNameLocked]} numberOfLines={2}>{b.name}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* ── MY REPORTS ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>My Reports</Text>
            <TouchableOpacity>
              <Text style={s.viewAll}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>
          {myReports.length === 0 ? (
            <Text style={s.emptyText}>No reports submitted yet.</Text>
          ) : (
            myReports.slice(0, 5).map((report, idx) => {
              const ss = statusStyle(report.status);
              // Pick icon color based on category color if available
              const catColor = (report.issue_categories?.color) ?? '#1a7a4a';
              return (
                <View
                  key={report.id}
                  style={[
                    s.reportCard,
                    { borderLeftColor: catColor },
                    idx < Math.min(myReports.length, 5) - 1 && s.reportCardGap,
                  ]}
                >
                  <View style={[s.reportIconBox, { backgroundColor: catColor + '20' }]}>
                    {report.issue_categories?.name === 'zap' ? (
                      <Zap size={18} color={catColor} />
                    ) : report.issue_categories?.name === 'trash' ? (
                      <Trash2 size={18} color={catColor} />
                    ) : (
                      <Leaf size={18} color={catColor} />
                    )}
                  </View>
                  <View style={s.reportBody}>
                    <Text style={s.reportTitle} numberOfLines={2}>
                      {report.title ?? 'Untitled report'}
                    </Text>
                    <Text style={s.reportDate}>
                      {new Date(report.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[s.statusChip, { backgroundColor: ss.bg }]}>
                    <Text style={[s.statusText, { color: ss.text }]}>{ss.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── REWARDS ── */}
        <View style={[s.section, s.lastSection]}>
          <Text style={s.sectionTitle}>Rewards</Text>
          {myRewards.length === 0 ? (
            <Text style={s.emptyText}>No redeemed rewards yet.</Text>
          ) : (
            myRewards.slice(0, 4).map((r, idx) => (
              <View
                key={r.id}
                style={[s.rewardCard, idx < Math.min(myRewards.length, 4) - 1 && s.reportCardGap]}
              >
                <View style={[s.rewardIconBox, { backgroundColor: r.rewards.type === 'voucher' ? '#F3E8FF' : '#E8F5EE' }]}>
                  {r.rewards.type === 'voucher' ? (
                    <Coffee size={22} color="#8B5CF6" />
                  ) : (
                    <Bus size={22} color="#1a7a4a" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rewardTitle}>{r.rewards.title}</Text>
                  <Text style={s.rewardSub}>Cost: {r.rewards.xp_cost} XP</Text>
                </View>
                <View style={[s.redeemBtn, { backgroundColor: '#1a7a4a' }]}>
                  <Text style={[s.redeemText, { color: '#fff' }]}>REDEEM</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={s.statCard}>
      {icon}
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

const GREEN = '#1a7a4a';
const BG = '#EEF5EE';
const WHITE = '#FFFFFF';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 12 : 0, paddingBottom: 12,
  },
  logoCon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoText: { fontSize: 18, fontWeight: '800', color: GREEN },
  xpPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: WHITE, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: '#C8E6D5',
  },
  xpPillText: { fontSize: 13, fontWeight: '700', color: GREEN },
  logoutBtnSmall: {
    backgroundColor: WHITE,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  // Hero
  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 24 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8, position: 'relative',
  },
  avatarInner: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: GREEN },
  levelBadge: {
    position: 'absolute', bottom: -10,
    backgroundColor: '#E8593C', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 999, borderWidth: 2, borderColor: WHITE,
  },
  levelBadgeText: { color: WHITE, fontSize: 11, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginTop: 14 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pin: { fontSize: 13 },
  subtitleCity: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  dot: { color: '#9CA3AF' },
  subtitleTitle: { fontSize: 14, color: GREEN, fontWeight: '700' },

  // XP Progress
  progressSection: {
    marginHorizontal: 20, backgroundColor: WHITE, borderRadius: 18,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressPathLabel: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  progressXPLabel: { fontSize: 13, fontWeight: '700', color: GREEN },
  progressTrack: { height: 8, borderRadius: 6, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: GREEN },
  progressHint: { marginTop: 8, fontSize: 12, color: '#6B7280', textAlign: 'center' },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 14,
  },
  statCard: {
    flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#111827' },

  // Section
  section: {
    marginHorizontal: 20, backgroundColor: WHITE, borderRadius: 18,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  lastSection: { marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 14 },
  viewAll: { fontSize: 12, fontWeight: '800', color: GREEN, letterSpacing: 0.5 },
  emptyText: { color: '#9CA3AF', fontSize: 13 },

  // Badges
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  badgeItem: { width: (SCREEN_W - 40 - 32 - 24) / 3, alignItems: 'center', gap: 6 },
  badgeCircle: {
    width: 62, height: 62, borderRadius: 31,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeCircleLocked: { backgroundColor: '#F3F4F6' },
  badgeName: { fontSize: 11, fontWeight: '700', color: '#374151', textAlign: 'center' },
  badgeNameLocked: { color: '#C0C0C0' },

  // Reports
  reportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderLeftWidth: 3, borderRadius: 12,
    backgroundColor: '#FAFAFA', padding: 12,
  },
  reportCardGap: { marginBottom: 10 },
  reportIconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  reportBody: { flex: 1 },
  reportTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  reportDate: { marginTop: 3, fontSize: 12, color: '#9CA3AF' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },

  // Rewards
  rewardCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 12,
    borderWidth: 1, borderColor: '#C8E6D5', borderStyle: 'dashed', padding: 12,
  },
  rewardIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5EE', justifyContent: 'center', alignItems: 'center' },
  rewardTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  rewardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  redeemBtn: { backgroundColor: GREEN, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  redeemText: { color: WHITE, fontSize: 11, fontWeight: '800' },

  // Error
  errorText: { color: '#B91C1C', marginBottom: 10, fontSize: 14 },
  retryBtn: { backgroundColor: GREEN, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: WHITE, fontWeight: '800' },
});
