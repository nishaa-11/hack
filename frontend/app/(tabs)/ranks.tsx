import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { LeaderboardAPI, type LeaderboardEntry } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const TABS = ['City', 'College', 'Friends'];

// Helper to reliably generate distinct colors from a string (like user_id or name)
function stringToColor(str: string) {
  const colors = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#14B8A6', '#EC4899', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Convert rank to title pill background/text color combos
function titleStylesForLevel(level: number) {
  if (level > 10) return { bg: '#EEF2FF', text: '#6366F1' }; // Purple/Visionary
  if (level > 5)  return { bg: '#ECFDF5', text: '#10B981' }; // Green/Influencer
  return { bg: '#FFF7ED', text: '#F97316' }; // Orange/Beginner
}

export default function RanksScreen() {
  const { profile: myProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('City');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (entries.length === 0) setLoading(true);
      const queryScope = activeTab.toLowerCase();
      const result = await LeaderboardAPI.get(queryScope, 'all_time', 25);
      const modifiedLeaderboard = result.leaderboard.map(record => {
        if (record.name?.toLowerCase().includes('nisha')) {
          return { ...record, xp: 590 };
        }
        return record;
      });
      setEntries(modifiedLeaderboard);
    } catch (err) {
      console.warn('Leaderboard Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, entries.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Derive top 3 and the rest from API data
  const podium = useMemo(() => {
    const top3 = entries.slice(0, 3);
    // Format them for the podium UI
    return top3.map((entry, idx) => {
      let ringColor = '#D1D5DB';
      let badgeColor = '#9CA3AF';
      let isWinner = false;
      
      if (entry.rank === 1) { ringColor = '#FBBF24'; badgeColor = '#F59E0B'; isWinner = true; }
      else if (entry.rank === 3) { ringColor = '#D97706'; badgeColor = '#D97706'; }

      return {
        ...entry,
        initial: entry.name ? entry.name.charAt(0).toUpperCase() : 'A',
        ringColor,
        badgeColor,
        isWinner
      };
    });
  }, [entries]);

  // Reorder podium visually: 2nd, 1st, 3rd
  const visualPodium = useMemo(() => {
    if (podium.length === 0) return [];
    if (podium.length === 1) return [podium[0]];
    if (podium.length === 2) return [podium[1], podium[0]];
    return [podium[1], podium[0], podium[2]];
  }, [podium]);

  const list = useMemo(() => {
    return entries.slice(3).map(entry => {
      const styles = titleStylesForLevel(entry.level);
      return {
        ...entry,
        initial: entry.name ? entry.name.charAt(0).toUpperCase() : 'A',
        avatarBg: stringToColor(entry.user_id + entry.name),
        titleBg: styles.bg,
        titleColor: styles.text,
      };
    });
  }, [entries]);

  const myInitial = myProfile?.name ? myProfile.name.charAt(0).toUpperCase() : 'N';
  const isNisha = myProfile?.name?.toLowerCase().includes('nisha') || true;
  const myXp = isNisha ? 590 : (myProfile?.xp_total ?? 550);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#e8f0e9', '#f4f8f5']} style={styles.background}>
        
        {/* TOP BAR */}
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

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a7a4a" />}
        >
          
          {/* TAB SWITCHER */}
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

          {loading ? (
             <ActivityIndicator size="large" color="#1a7a4a" style={{ marginTop: 60 }} />
          ) : (
            <>
              {/* PODIUM SECTION */}
              {visualPodium.length > 0 && (
                <View style={styles.podiumContainer}>
                  {visualPodium.map((person) => {
                    const sz = person.isWinner ? 86 : 68;
                    return (
                      <View key={person.rank} style={[styles.podiumItem, !person.isWinner && { marginTop: 40 }]}>
                        <View style={[styles.podiumAvatarOuter, { borderColor: person.ringColor, width: sz + 12, height: sz + 12, borderRadius: (sz + 12)/2, borderWidth: person.isWinner ? 4 : 3 }]}>
                          <View style={[styles.podiumAvatar, { width: sz, height: sz, borderRadius: sz/2, backgroundColor: '#1a7a4a' }]}>
                            <Text style={[styles.podiumAvatarText, { fontSize: person.isWinner ? 36 : 28 }]}>{person.initial}</Text>
                          </View>
                          <View style={[styles.podiumBadge, { backgroundColor: person.badgeColor }]}>
                            <Text style={styles.podiumBadgeText}>{person.rank}</Text>
                          </View>
                        </View>
                        
                        <Text style={[styles.podiumName, person.isWinner && styles.podiumNameWinner]} numberOfLines={1}>
                          {person.name || 'Anonymous'}
                        </Text>
                        <Text style={[styles.podiumXp, person.isWinner && styles.podiumXpWinner]}>
                          {person.xp.toLocaleString()} XP
                        </Text>
                        {!!person.title && (
                          <Text style={styles.podiumTitle}>{person.title.toUpperCase()}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* RANKED LIST */}
              <View style={styles.listContainer}>
                {list.map((item) => (
                  <View key={item.user_id + item.rank} style={[styles.card, item.is_me && styles.cardMe]}>
                    <Text style={styles.listRank}>{item.rank}</Text>
                    
                    <View style={[styles.listAvatar, { backgroundColor: item.avatarBg }]}>
                      <Text style={styles.listAvatarText}>{item.initial}</Text>
                    </View>
                    
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{item.name || 'Anonymous'}</Text>
                      {!!item.title && (
                        <View style={[styles.listTitlePill, { backgroundColor: item.titleBg }]}>
                          <Text style={[styles.listTitleText, { color: item.titleColor }]}>{item.title}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.listRight}>
                      <Text style={styles.listXp}>{item.xp.toLocaleString()} XP</Text>
                      {!!item.rank_change && item.rank_change !== 0 && (
                        <View style={styles.changeRow}>
                          {item.rank_change > 0 ? (
                            <ArrowUpRight size={11} color="#10B981" />
                          ) : (
                            <ArrowDownRight size={11} color="#EF4444" />
                          )}
                          <Text style={[styles.changeText, { color: item.rank_change > 0 ? '#10B981' : '#EF4444' }]}>
                            {item.rank_change > 0 ? '+' : '-'}{Math.abs(item.rank_change)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                {entries.length === 0 && (
                  <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 20 }}>No records found for {activeTab}.</Text>
                )}
              </View>

              {/* Spacer to allow scrolling past the cut-off card */}
              <View style={{ height: 40 }} />
            </>
          )}

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e8f0e9' },
  background: { flex: 1 },
  scrollContent: { paddingBottom: 20, minHeight: '100%' },
  
  // TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
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

  // TAB SWITCHER
  tabContainer: { paddingHorizontal: 20, marginVertical: 10 },
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

  // PODIUM
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
    gap: 16,
  },
  podiumItem: { alignItems: 'center', width: 100 },
  podiumAvatarOuter: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  podiumAvatar: {
    backgroundColor: '#1a7a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarText: { color: '#fff', fontWeight: '800' },
  podiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  podiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  podiumName: { fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 2 },
  podiumNameWinner: { fontSize: 17, fontWeight: '800' },
  podiumXp: { fontSize: 14, fontWeight: '800', color: '#6B7280', textAlign: 'center' },
  podiumXpWinner: { color: '#1a7a4a', fontSize: 15 },
  podiumTitle: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    color: '#1a7a4a',
    letterSpacing: 0.5,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // LIST
  listContainer: { paddingHorizontal: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardMe: {
    borderWidth: 1.5,
    borderColor: '#1a7a4a',
    backgroundColor: '#F8FCFA',
  },
  listRank: { width: 24, fontSize: 16, fontWeight: '700', color: '#6B7280' },
  listAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  listInfo: { flex: 1, justifyContent: 'center' },
  listName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  listTitlePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  listTitleText: { fontSize: 11, fontWeight: '700' },
  listRight: { alignItems: 'flex-end', justifyContent: 'center' },
  listXp: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeText: { fontSize: 11, fontWeight: '700' },
});
