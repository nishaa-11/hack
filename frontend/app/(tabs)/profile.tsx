import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Star } from 'lucide-react-native';
import {
  Profile,
  ProfilesAPI,
  ReportsAPI,
  type NeighborhoodImpact,
  type Redemption,
  type Report,
  type UserBadge,
} from '@/lib/api';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [impact, setImpact] = useState<NeighborhoodImpact | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myRewards, setMyRewards] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    try {
      setError(null);
      
      // Load me immediately to show the header
      const me = await ProfilesAPI.me();
      setProfile(me.profile);
      setLoading(false); // Header data is ready

      // Load secondary stats in parallel, but handle failures individually
      const [impactRes, badgesRes, reportsRes, rewardsRes] = await Promise.allSettled([
        ProfilesAPI.impact(),
        ProfilesAPI.badges(),
        ReportsAPI.mine(),
        RewardsAPI.mine(),
      ]);

      if (impactRes.status === 'fulfilled') setImpact(impactRes.value.impact);
      if (badgesRes.status === 'fulfilled') setBadges(badgesRes.value.badges);
      if (reportsRes.status === 'fulfilled') setMyReports(reportsRes.value.reports);
      if (rewardsRes.status === 'fulfilled') setMyRewards(rewardsRes.value.redemptions);

    } catch (err) {
      console.error('[PROFILE ERROR]', err);
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, [loadProfileData]);

  const progressPercent = useMemo(() => {
    if (!profile) return 0;
    const nextLevelXp = Math.max(profile.level * 100, 100);
    return Math.min(100, Math.round((profile.xp_total / nextLevelXp) * 100));
  }, [profile]);

  const renderReportItem = ({ item }: { item: Report }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportMain}>
        <Text style={styles.reportTitle} numberOfLines={2}>{item.title || 'Untitled report'}</Text>
        <Text style={styles.reportMeta}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1a7a4a" />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Profile not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfileData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>CivicPulse</Text>
          <View style={styles.xpPill}>
            <Star size={14} color="#1a7a4a" fill="#1a7a4a" />
            <Text style={styles.xpText}>{profile.xp_total} XP</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.name}>{profile.name || 'Citizen'}</Text>
          <Text style={styles.subtitle}>
            {profile.wards?.cities?.name ?? 'City'} • {profile.title}
          </Text>
          <Text style={styles.level}>Level {profile.level}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Reports" value={String(impact?.total_reports ?? 0)} />
          <StatCard label="Resolved" value={String(impact?.resolved_reports ?? 0)} />
          <StatCard label="Streak" value={`${impact?.streak_days ?? 0}d`} />
        </View>

        <Section title="My Badges">
          {badges.length === 0 ? (
            <Text style={styles.emptyText}>No badges yet.</Text>
          ) : (
            badges.slice(0, 6).map((entry) => (
              <View key={`${entry.badges.id}-${entry.earned_at}`} style={styles.rowItem}>
                <Text style={styles.rowTitle}>{entry.badges.name}</Text>
                <Text style={styles.rowSub}>{entry.badges.tier}</Text>
              </View>
            ))
          )}
        </Section>

        <Section title="My Reports">
          <FlatList
            data={myReports.slice(0, 5)}
            renderItem={renderReportItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.emptyText}>No reports submitted yet.</Text>}
          />
        </Section>

        <Section title="My Rewards">
          {myRewards.length === 0 ? (
            <Text style={styles.emptyText}>No redeemed rewards yet.</Text>
          ) : (
            myRewards.slice(0, 4).map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <View>
                  <Text style={styles.rowTitle}>{reward.rewards.title}</Text>
                  <Text style={styles.rowSub}>
                    {reward.status.toUpperCase()}
                    {reward.voucher_code ? ` • ${reward.voucher_code}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1a7a4a' },
  xpPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#e8f5ee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  xpText: { color: '#1a7a4a', fontWeight: '700' },
  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  name: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  level: { marginTop: 8, fontWeight: '700', color: '#1a7a4a' },
  progressTrack: { marginTop: 10, height: 8, borderRadius: 6, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1a7a4a' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  rowItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowTitle: { fontWeight: '600', color: '#111827' },
  rowSub: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  reportCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reportMain: { flex: 1, paddingRight: 10 },
  reportTitle: { fontWeight: '600', color: '#111827' },
  reportMeta: { marginTop: 3, fontSize: 12, color: '#6b7280' },
  statusBadge: { backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, color: '#374151', fontWeight: '700' },
  rewardCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  emptyText: { color: '#6b7280', fontSize: 13 },
  errorText: { color: '#b91c1c', marginBottom: 10 },
  retryBtn: { backgroundColor: '#1a7a4a', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
});
