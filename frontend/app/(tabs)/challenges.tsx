import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import initialChallengesData from '@/lib/challenges';

type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';

interface ChallengeState {
  id: string;
  type: string;
  icon: string;
  title: string;
  desc: string;
  xp: number;
  status: ChallengeStatus;
  progress: number;
  total: number;
  joined?: number;
}

const STORAGE_KEY = 'challenges-screen-state-v1';
const FILTERS = ['All', 'Daily', 'Weekly', 'Monthly', 'Community'];
const TYPE_COLORS: Record<string, string> = {
  daily: '#dcfce7',
  weekly: '#dbeafe',
  monthly: '#fef3c7',
  community: '#ede9fe',
};

export default function ChallengesScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [challengeList, setChallengeList] = useState<ChallengeState[]>(initialChallengesData as ChallengeState[]);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw || !isMounted) return;

        try {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.challenges)) {
            const restoredById = new Map<string, ChallengeState>(
              parsed.challenges.map((item: ChallengeState) => [item.id, item])
            );
            setChallengeList((current) => current.map((item) => restoredById.get(item.id) ?? item));
          }
          if (typeof parsed?.totalXP === 'number') {
            setTotalXP(parsed.totalXP);
          }
        } catch (error) {
          console.warn('Failed to restore challenges state', error);
        }
      })
      .catch((error) => {
        console.warn('Failed to read saved challenges state', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ totalXP, challenges: challengeList }))
      .catch((error) => {
        console.warn('Failed to persist challenges state', error);
      });
  }, [challengeList, totalXP]);

  const filteredChallenges = useMemo(() => {
    if (activeFilter === 'All') return challengeList;
    return challengeList.filter((challenge) => challenge.type === activeFilter.toLowerCase());
  }, [activeFilter, challengeList]);

  const handleStart = (id: string) => {
    setChallengeList((current) =>
      current.map((challenge) =>
        challenge.id === id ? { ...challenge, status: 'in_progress', progress: 0 } : challenge
      )
    );
  };

  const handleProgress = (id: string) => {
    setChallengeList((current) =>
      current.map((challenge) => {
        if (challenge.id !== id) return challenge;
        if (challenge.status !== 'in_progress') return challenge;

        const nextProgress = challenge.progress + 1;
        if (nextProgress >= challenge.total) {
          setTotalXP((currentXP) => currentXP + challenge.xp);
          return {
            ...challenge,
            progress: nextProgress,
            status: 'completed',
          };
        }

        return {
          ...challenge,
          progress: nextProgress,
        };
      })
    );
  };

  const renderChallenge = ({ item }: { item: ChallengeState }) => {
    const progressPercent = Math.min(100, Math.round((item.progress / item.total) * 100));
    const inProgress = item.status === 'in_progress';
    const completed = item.status === 'completed';

    return (
      <TouchableOpacity
        activeOpacity={inProgress ? 0.9 : 1}
        onPress={() => {
          if (inProgress) handleProgress(item.id);
        }}
        style={[
          styles.card,
          item.type === 'community' && styles.communityCard,
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconBubble, { backgroundColor: TYPE_COLORS[item.type] ?? '#dcfce7' }]}>
            <Text style={styles.iconText}>{item.icon}</Text>
          </View>

          <View style={styles.statusBadgeWrap}>
            {completed ? (
              <View style={[styles.statusBadge, styles.completedBadge]}>
                <Text style={styles.completedBadgeText}>✅ COMPLETED</Text>
              </View>
            ) : item.type === 'community' ? (
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedBadgeText}>👥 {item.joined ?? 0} JOINED</Text>
              </View>
            ) : inProgress ? (
              <View style={styles.inProgressBadge}>
                <Text style={styles.inProgressBadgeText}>IN PROGRESS</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.xpBadge, inProgress || completed ? styles.xpBadgeActive : styles.xpBadgeInactive]}>
            <Text style={[styles.xpBadgeText, inProgress || completed ? styles.xpBadgeTextActive : styles.xpBadgeTextInactive]}>
              +{item.xp} XP
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.desc}</Text>

        {completed ? null : inProgress ? (
          <View style={styles.progressSection}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>PROGRESS</Text>
              <Text style={styles.progressCounter}>{item.progress}/{item.total} TRIPS</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => handleStart(item.id)}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Challenges</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, active ? styles.filterPillActive : styles.filterPillInactive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterPillText, active ? styles.filterPillTextActive : styles.filterPillTextInactive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.xpBanner}>
          <Text style={styles.xpBannerText}>⚡ Total XP: {totalXP}</Text>
        </View>
      </View>

      <FlatList
        data={filteredChallenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallenge}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No challenges here yet.</Text>
            <Text style={styles.emptyText}>Switch tabs to see more opportunities.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f7f0',
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#f0f7f0',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1f5f2f',
    marginBottom: 12,
  },
  filterRow: {
    gap: 10,
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  filterPillInactive: {
    backgroundColor: '#fff',
    borderColor: '#2e7d32',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  filterPillTextInactive: {
    color: '#2e7d32',
  },
  xpBanner: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bfe0c3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  xpBannerText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2e7d32',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 26,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  communityCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  statusBadgeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inProgressBadge: {
    backgroundColor: '#2e7d32',
  },
  joinedBadge: {
    backgroundColor: '#e5e7eb',
  },
  completedBadge: {
    backgroundColor: '#2e7d32',
  },
  inProgressBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  joinedBadgeText: {
    color: '#4b5563',
    fontSize: 10,
    fontWeight: '800',
  },
  completedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  xpBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.2,
  },
  xpBadgeActive: {
    borderColor: '#2e7d32',
    backgroundColor: '#fff',
  },
  xpBadgeInactive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fff',
  },
  xpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  xpBadgeTextActive: {
    color: '#2e7d32',
  },
  xpBadgeTextInactive: {
    color: '#f59e0b',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  progressSection: {
    marginTop: 4,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e7d32',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#d1e6d5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2e7d32',
  },
  startButton: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2e7d32',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
