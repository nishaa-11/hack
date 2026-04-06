import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChallengesAPI, type Challenge, type UserChallenge } from '@/lib/api';

const FILTERS: { label: string; value?: string }[] = [
  { label: 'All' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Community', value: 'community' },
];

export default function ChallengesScreen() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [mine, setMine] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const [listRes, mineRes] = await Promise.allSettled([
        ChallengesAPI.list(filter),
        ChallengesAPI.mine(),
      ]);

      if (listRes.status === 'fulfilled') setChallenges(listRes.value.challenges);
      if (mineRes.status === 'fulfilled') setMine(mineRes.value.challenges);
    } catch (err) {
      console.error('[CHALLENGES ERROR]', err);
      setError(err instanceof Error ? err.message : 'Failed to load challenges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Initial load — show spinner
  useEffect(() => { load(true); }, [load]);

  const myByChallengeId = useMemo(() => {
    const map = new Map<string, UserChallenge>();
    for (const item of mine) {
      map.set(item.challenges.id, item);
    }
    return map;
  }, [mine]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleJoin = async (challengeId: string) => {
    try {
      setBusyId(challengeId);
      await ChallengesAPI.join(challengeId);
      await load();
    } catch (err) {
      Alert.alert('Join failed', err instanceof Error ? err.message : 'Could not join challenge');
    } finally {
      setBusyId(null);
    }
  };

  const handleProgress = async (challengeId: string) => {
    try {
      setBusyId(challengeId);
      const result = await ChallengesAPI.progress(challengeId, 1);
      if (result.completed) {
        Alert.alert('Challenge completed', `+${result.xp_awarded} XP awarded`);
      }
      await load();
    } catch (err) {
      Alert.alert('Update failed', err instanceof Error ? err.message : 'Could not update progress');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1a7a4a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.pageTitle}>Challenges</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const active = item.value === filter || (!item.value && !filter);
            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.value)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {challenges.length === 0 ? (
          <Text style={styles.emptyText}>No challenges available.</Text>
        ) : (
          challenges.map((challenge) => {
            const joined = myByChallengeId.get(challenge.id);
            const progress = joined?.progress ?? 0;
            const total = challenge.target_count || 1;
            const percent = Math.min(100, Math.round((progress / total) * 100));
            const completed = joined?.status === 'completed';

            return (
              <View key={challenge.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardType}>{challenge.type.toUpperCase()}</Text>
                  <Text style={styles.cardXp}>+{challenge.xp_reward} XP</Text>
                </View>

                <Text style={styles.cardTitle}>{challenge.title}</Text>
                <Text style={styles.cardSub}>{challenge.description || 'No description'}</Text>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}/{total} {challenge.metric}</Text>

                {!joined ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, busyId === challenge.id && styles.actionBtnDisabled]}
                    disabled={busyId === challenge.id}
                    onPress={() => handleJoin(challenge.id)}
                  >
                    <Text style={styles.actionText}>{busyId === challenge.id ? 'Joining...' : 'Join challenge'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, completed && styles.doneBtn, busyId === challenge.id && styles.actionBtnDisabled]}
                    disabled={busyId === challenge.id || completed}
                    onPress={() => handleProgress(challenge.id)}
                  >
                    <Text style={styles.actionText}>
                      {completed ? 'Completed' : busyId === challenge.id ? 'Updating...' : 'Add progress +1'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#1a7a4a', marginBottom: 14 },
  filters: { gap: 8, marginBottom: 14 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#d5eadf' },
  filterChipActive: { backgroundColor: '#1a7a4a' },
  filterText: { color: '#1a7a4a', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardType: { color: '#6b7280', fontWeight: '700', fontSize: 11 },
  cardXp: { color: '#1a7a4a', fontWeight: '700', fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardSub: { marginTop: 4, marginBottom: 10, color: '#6b7280' },
  progressTrack: { backgroundColor: '#e5e7eb', height: 8, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1a7a4a' },
  progressText: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  actionBtn: { marginTop: 12, borderRadius: 10, backgroundColor: '#1a7a4a', paddingVertical: 10, alignItems: 'center' },
  doneBtn: { backgroundColor: '#6b7280' },
  actionBtnDisabled: { opacity: 0.7 },
  actionText: { color: '#fff', fontWeight: '700' },
  errorText: { color: '#b91c1c', marginBottom: 8 },
  emptyText: { color: '#6b7280' },
});
