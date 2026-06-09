import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownRight, ArrowUpRight, Star } from 'lucide-react-native';
import { LeaderboardAPI, type LeaderboardEntry } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const TABS = ['City', 'College', 'Friends'] as const;

const DUMMY_LEADERBOARD_BY_TAB: Record<string, LeaderboardEntry[]> = {
  City: [
    { rank: 1, user_id: 'city-1', name: 'Mira Patel', avatar_url: null, level: 12, title: 'City Guardian', xp: 1825, rank_change: 2, is_me: false },
    { rank: 2, user_id: 'city-2', name: 'Jonas Rivera', avatar_url: null, level: 11, title: 'Water Warrior', xp: 1760, rank_change: -1, is_me: false },
    { rank: 3, user_id: 'city-3', name: 'Anya Chen', avatar_url: null, level: 10, title: 'Green Sentinel', xp: 1698, rank_change: 3, is_me: true },
    { rank: 4, user_id: 'city-4', name: 'Leo Martinez', avatar_url: null, level: 9, title: 'Street Scout', xp: 1520, rank_change: 0, is_me: false },
    { rank: 5, user_id: 'city-5', name: 'Zara Singh', avatar_url: null, level: 9, title: 'Cleanup Crew', xp: 1478, rank_change: 1, is_me: false },
    { rank: 6, user_id: 'city-6', name: 'Omar Hassan', avatar_url: null, level: 8, title: 'Transit Hero', xp: 1404, rank_change: -2, is_me: false },
    { rank: 7, user_id: 'city-7', name: 'Lina Brooks', avatar_url: null, level: 8, title: 'Park Protector', xp: 1362, rank_change: 0, is_me: false },
    { rank: 8, user_id: 'city-8', name: 'Sage Wilson', avatar_url: null, level: 7, title: 'Neighborhood Lead', xp: 1296, rank_change: 2, is_me: false },
    { rank: 9, user_id: 'city-9', name: 'Hugo Nguyen', avatar_url: null, level: 7, title: 'Sanitation Star', xp: 1240, rank_change: -1, is_me: false },
    { rank: 10, user_id: 'city-10', name: 'Nia Robinson', avatar_url: null, level: 6, title: 'Community Spark', xp: 1188, rank_change: 1, is_me: false },
  ],
  College: [
    { rank: 1, user_id: 'college-1', name: 'Priya Rao', avatar_url: null, level: 13, title: 'Campus Lead', xp: 2045, rank_change: 1, is_me: false },
    { rank: 2, user_id: 'college-2', name: 'Ethan Yu', avatar_url: null, level: 12, title: 'Research Ranger', xp: 1984, rank_change: 0, is_me: false },
    { rank: 3, user_id: 'college-3', name: 'Noah Kim', avatar_url: null, level: 12, title: 'Studio Steward', xp: 1916, rank_change: 4, is_me: false },
    { rank: 4, user_id: 'college-4', name: 'Sana Ahmed', avatar_url: null, level: 10, title: 'Library Hero', xp: 1868, rank_change: -1, is_me: true },
    { rank: 5, user_id: 'college-5', name: 'Mateo Cruz', avatar_url: null, level: 10, title: 'Lab Leader', xp: 1769, rank_change: 2, is_me: false },
    { rank: 6, user_id: 'college-6', name: 'Avery Lopez', avatar_url: null, level: 9, title: 'Dorm Guardian', xp: 1648, rank_change: -2, is_me: false },
    { rank: 7, user_id: 'college-7', name: 'Niko Torres', avatar_url: null, level: 9, title: 'Green Captain', xp: 1580, rank_change: 1, is_me: false },
    { rank: 8, user_id: 'college-8', name: 'Mila Foster', avatar_url: null, level: 8, title: 'Hallway Hero', xp: 1496, rank_change: 0, is_me: false },
    { rank: 9, user_id: 'college-9', name: 'Kai Raman', avatar_url: null, level: 8, title: 'Recycle Ace', xp: 1424, rank_change: -1, is_me: false },
    { rank: 10, user_id: 'college-10', name: 'Talia Grant', avatar_url: null, level: 7, title: 'Campus Star', xp: 1361, rank_change: 3, is_me: false },
  ],
  Friends: [
    { rank: 1, user_id: 'friends-1', name: 'Chloe Adams', avatar_url: null, level: 11, title: 'Social Spark', xp: 1724, rank_change: 1, is_me: false },
    { rank: 2, user_id: 'friends-2', name: 'Damon Bell', avatar_url: null, level: 10, title: 'Good Neighbor', xp: 1652, rank_change: -1, is_me: false },
    { rank: 3, user_id: 'friends-3', name: 'Iris Wright', avatar_url: null, level: 10, title: 'Trailblazer', xp: 1608, rank_change: 2, is_me: false },
    { rank: 4, user_id: 'friends-4', name: 'Marcus Hale', avatar_url: null, level: 9, title: 'Buddy Booster', xp: 1544, rank_change: 0, is_me: false },
    { rank: 5, user_id: 'friends-5', name: 'Tessa Cole', avatar_url: null, level: 9, title: 'Community Pal', xp: 1490, rank_change: 3, is_me: true },
    { rank: 6, user_id: 'friends-6', name: 'Julian Diaz', avatar_url: null, level: 8, title: 'Weekend Warrior', xp: 1418, rank_change: -2, is_me: false },
    { rank: 7, user_id: 'friends-7', name: 'Mina Ortiz', avatar_url: null, level: 8, title: 'Team Hero', xp: 1366, rank_change: 1, is_me: false },
    { rank: 8, user_id: 'friends-8', name: 'Leo Graham', avatar_url: null, level: 7, title: 'Streak Setter', xp: 1292, rank_change: -1, is_me: false },
    { rank: 9, user_id: 'friends-9', name: 'Raya Brooks', avatar_url: null, level: 7, title: 'Friend Flow', xp: 1244, rank_change: 0, is_me: false },
    { rank: 10, user_id: 'friends-10', name: 'Devin Hart', avatar_url: null, level: 6, title: 'Helpful Hand', xp: 1188, rank_change: 2, is_me: false },
  ],
};

function stringToColor(str: string) {
  const colors = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#14B8A6', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getRankAccent(rank: number) {
  if (rank === 1) return { badge: '🥇', bg: '#FFF7D6', border: '#FBBF24', text: '#B45309' };
  if (rank === 2) return { badge: '🥈', bg: '#F3F4F6', border: '#D1D5DB', text: '#4B5563' };
  if (rank === 3) return { badge: '🥉', bg: '#FFF1E6', border: '#FB923C', text: '#C2410C' };
  return { badge: String(rank), bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' };
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const initials = (entry.name || 'A')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const accent = getRankAccent(entry.rank);
  const avatarBg = stringToColor(entry.user_id || entry.name || 'anonymous');

  return (
    <View style={[styles.rowCard, entry.is_me && styles.rowCardActive]}>
      <View style={[styles.rankBadge, { backgroundColor: accent.bg, borderColor: accent.border }]}>
        <Text style={[styles.rankBadgeText, { color: accent.text }]}>{accent.badge}</Text>
      </View>

      <View style={[styles.rowAvatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.rowAvatarText}>{initials}</Text>
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{entry.name}</Text>
        <View style={styles.rowMetaRow}>
          <Text style={styles.rowMetaText}>{entry.title || 'Community Member'}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.rowMetaText}>Lvl {entry.level}</Text>
        </View>
      </View>

      <View style={styles.scoreColumn}>
        <Text style={styles.scoreText}>{entry.xp.toLocaleString()} XP</Text>
        {entry.rank_change !== 0 && (
          <View style={styles.changeRow}>
            {entry.rank_change > 0 ? (
              <ArrowUpRight size={11} color="#10B981" />
            ) : (
              <ArrowDownRight size={11} color="#EF4444" />
            )}
            <Text style={[styles.changeText, { color: entry.rank_change > 0 ? '#10B981' : '#EF4444' }]}>
              {entry.rank_change > 0 ? '+' : ''}{entry.rank_change}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function RanksScreen() {
  const { profile: myProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('City');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(DUMMY_LEADERBOARD_BY_TAB.City);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const queryScope = activeTab.toLowerCase();
      const result = await LeaderboardAPI.get(queryScope, 'all_time', 25);
      setEntries(result.leaderboard.length > 0 ? result.leaderboard : DUMMY_LEADERBOARD_BY_TAB[activeTab]);
    } catch (err) {
      console.warn('Leaderboard Error:', err);
      setEntries(DUMMY_LEADERBOARD_BY_TAB[activeTab]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setEntries(DUMMY_LEADERBOARD_BY_TAB[activeTab]);
    loadData(true);
  }, [activeTab, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const podium = useMemo(() => {
    return entries.slice(0, 3).map((entry) => {
      let ringColor = '#CBD5E1';
      let accentBoost = false;

      if (entry.rank === 1) {
        ringColor = '#FBBF24';
        accentBoost = true;
      } else if (entry.rank === 2) {
        ringColor = '#9CA3AF';
      } else if (entry.rank === 3) {
        ringColor = '#FB923C';
      }

      return {
        ...entry,
        initial: (entry.name || 'A').charAt(0).toUpperCase(),
        ringColor,
        accentBoost,
      };
    });
  }, [entries]);

  const visualPodium = useMemo(() => {
    if (podium.length === 0) return [];
    if (podium.length === 1) return [podium[0]];
    if (podium.length === 2) return [podium[1], podium[0]];
    return [podium[1], podium[0], podium[2]];
  }, [podium]);

  const myInitial = myProfile?.name ? myProfile.name.charAt(0).toUpperCase() : 'N';
  const myXp = myProfile?.xp_total ?? 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#e8f0e9', '#f4f8f5']} style={styles.background}>
        <View style={styles.topBar}>
          <View style={styles.avatarMini}>
            <Text style={styles.avatarMiniText}>{myInitial}</Text>
          </View>
          <Text style={styles.headerTitle}>CivicPulse</Text>
          <View style={styles.xpPill}>
            <Star size={14} color="#F97316" fill="#F97316" />
            <Text style={styles.xpPillText}>{myXp.toLocaleString()} XP</Text>
          </View>
        </View>

        <FlatList
          data={entries}
          keyExtractor={(item) => `${item.user_id}-${item.rank}`}
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a7a4a" />}
          ListHeaderComponent={
            <>
              <View style={styles.tabContainer}>
                <View style={styles.tabBg}>
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                      >
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sectionHeaderCard}>
                <View>
                  <Text style={styles.sectionEyebrow}>Community leaderboard</Text>
                  <Text style={styles.sectionTitle}>{activeTab} rankings</Text>
                  <Text style={styles.sectionSubtitle}>Top contributors, themed by your selected community hub.</Text>
                </View>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>Live demo</Text>
                </View>
              </View>

              {visualPodium.length > 0 && (
                <View style={styles.podiumContainer}>
                  {visualPodium.map((person) => (
                    <View
                      key={`${person.user_id}-${person.rank}`}
                      style={[styles.podiumItem, person.accentBoost && styles.podiumItemWinner]}
                    >
                      <View
                        style={[
                          styles.podiumAvatarOuter,
                          {
                            borderColor: person.ringColor,
                            width: person.accentBoost ? 94 : 78,
                            height: person.accentBoost ? 94 : 78,
                            borderRadius: person.accentBoost ? 47 : 39,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.podiumAvatar,
                            {
                              backgroundColor: person.accentBoost ? '#1a7a4a' : '#0F766E',
                              width: person.accentBoost ? 82 : 66,
                              height: person.accentBoost ? 82 : 66,
                              borderRadius: person.accentBoost ? 41 : 33,
                            },
                          ]}
                        >
                          <Text style={[styles.podiumAvatarText, person.accentBoost && styles.podiumAvatarTextWinner]}>
                            {person.initial}
                          </Text>
                        </View>
                        <View style={[styles.podiumBadge, { backgroundColor: person.ringColor }]}>
                          <Text style={styles.podiumBadgeText}>{person.rank}</Text>
                        </View>
                      </View>

                      <Text style={[styles.podiumName, person.accentBoost && styles.podiumNameWinner]} numberOfLines={1}>
                        {person.name || 'Anonymous'}
                      </Text>
                      <Text style={[styles.podiumXp, person.accentBoost && styles.podiumXpWinner]}>
                        {person.xp.toLocaleString()} XP
                      </Text>
                      {!!person.title && <Text style={styles.podiumTitle}>{person.title.toUpperCase()}</Text>}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.listHeaderRow}>
                <Text style={styles.listHeaderTitle}>Full leaderboard</Text>
                <Text style={styles.listHeaderCount}>{entries.length} ranked members</Text>
              </View>
            </>
          }
          renderItem={({ item }) => <LeaderboardRow entry={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No records found for {activeTab}.</Text>
              <Text style={styles.emptyStateBody}>The demo leaderboard will appear here while the live feed is empty.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e8f0e9' },
  background: { flex: 1 },
  flatList: { flex: 1 },
  listContent: { paddingBottom: 32 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a7a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  xpPillText: { fontSize: 13, fontWeight: '800', color: '#111827' },

  tabContainer: { paddingHorizontal: 20, marginTop: 6, marginBottom: 12 },
  tabBg: {
    flexDirection: 'row',
    backgroundColor: '#E6EFE8',
    borderRadius: 999,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#1a7a4a' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#1a7a4a' },
  tabTextActive: { color: '#fff' },

  sectionHeaderCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionEyebrow: { fontSize: 11, fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', maxWidth: 220 },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E6F8EF',
  },
  liveBadgeText: { color: '#047857', fontSize: 11, fontWeight: '800' },

  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 12,
    marginBottom: 18,
    paddingHorizontal: 6,
    gap: 8,
  },
  podiumItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.52)' },
  podiumItemWinner: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    transform: [{ translateY: -6 }],
  },
  podiumAvatarOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    position: 'relative',
  },
  podiumAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarText: { color: '#fff', fontWeight: '800', fontSize: 26 },
  podiumAvatarTextWinner: { fontSize: 30 },
  podiumBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  podiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  podiumName: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 3 },
  podiumNameWinner: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  podiumXp: { fontSize: 12, fontWeight: '800', color: '#6B7280', textAlign: 'center' },
  podiumXpWinner: { color: '#1a7a4a' },
  podiumTitle: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: '800',
    color: '#1a7a4a',
    letterSpacing: 0.4,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  listHeaderRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  listHeaderCount: { fontSize: 11, fontWeight: '800', color: '#059669', backgroundColor: '#E6F8EF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  rowCardActive: {
    borderWidth: 1.5,
    borderColor: '#1a7a4a',
    backgroundColor: '#F8FCFA',
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeText: { fontSize: 14, fontWeight: '900' },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  rowInfo: { flex: 1, justifyContent: 'center' },
  rowName: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowMetaText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9CA3AF' },
  scoreColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  scoreText: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeText: { fontSize: 10, fontWeight: '800' },

  separator: { height: 10 },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 28,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptyStateBody: { fontSize: 12, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
});
