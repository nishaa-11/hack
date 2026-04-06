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
} from 'react-native';
import { LeaderboardAPI, type LeaderboardEntry } from '@/lib/api';

const SCOPES = [
  { label: 'City', value: 'city' },
  { label: 'College', value: 'college' },
  { label: 'Friends', value: 'friends' },
] as const;

export default function RanksScreen() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]['value']>('city');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Don't set global loading to true on every filter switch to prevent blank flickering
      if (entries.length === 0) setLoading(true); 
      setError(null);
      const result = await LeaderboardAPI.get(scope, 'all_time', 25);
      setEntries(result.leaderboard);
    } catch (err) {
      console.error('[RANKS ERROR]', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope, entries.length]);

  useEffect(() => {
    load();
  }, [load]);

  const podium = useMemo(() => entries.slice(0, 3), [entries]);
  const others = useMemo(() => entries.slice(3), [entries]);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <Text style={styles.pageTitle}>Leaderboard</Text>

        <View style={styles.scopeRow}>
          {SCOPES.map((item) => {
            const active = scope === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.scopeBtn, active && styles.scopeBtnActive]}
                onPress={() => setScope(item.value)}
              >
                <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 3</Text>
          {podium.length === 0 ? (
            <Text style={styles.emptyText}>No entries available.</Text>
          ) : (
            podium.map((person) => (
              <View key={person.user_id} style={styles.row}>
                <Text style={styles.rank}>#{person.rank}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{person.name || 'Anonymous'}</Text>
                  <Text style={styles.role}>{person.title}</Text>
                </View>
                <Text style={styles.xp}>{person.xp} XP</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Ranks</Text>
          {others.length === 0 ? (
            <Text style={styles.emptyText}>No additional users.</Text>
          ) : (
            others.map((person) => (
              <View key={person.user_id} style={[styles.row, person.is_me && styles.meRow]}>
                <Text style={styles.rank}>#{person.rank}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{person.name || 'Anonymous'}{person.is_me ? ' (You)' : ''}</Text>
                  <Text style={styles.role}>{person.title}</Text>
                </View>
                <Text style={styles.xp}>{person.xp} XP</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 30 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#1a7a4a', marginBottom: 12 },
  scopeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  scopeBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, backgroundColor: '#d5eadf', borderRadius: 999 },
  scopeBtnActive: { backgroundColor: '#1a7a4a' },
  scopeText: { color: '#1a7a4a', fontWeight: '700' },
  scopeTextActive: { color: '#fff' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  meRow: { backgroundColor: '#eef6f2', borderRadius: 8, paddingHorizontal: 8 },
  rank: { width: 38, fontWeight: '800', color: '#111827' },
  name: { fontWeight: '600', color: '#111827' },
  role: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  xp: { fontWeight: '700', color: '#1a7a4a' },
  emptyText: { color: '#6b7280' },
  errorText: { color: '#b91c1c', marginBottom: 10 },
});
