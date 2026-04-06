import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CategoriesAPI, LocationsAPI, ReportsAPI, type Category, type Ward } from '@/lib/api';

export default function ReportScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [wardIndex, setWardIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadMetadata = useCallback(async () => {
    try {
      const [cats, wardRes] = await Promise.all([
        CategoriesAPI.list(),
        LocationsAPI.wards(),
      ]);
      setCategories(cats.categories);
      setWards(wardRes.wards);
    } catch (err) {
      Alert.alert('Load failed', err instanceof Error ? err.message : 'Could not load metadata');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const selectedCategory = useMemo(
    () => (categories.length ? categories[categoryIndex % categories.length] : null),
    [categories, categoryIndex]
  );

  const selectedWard = useMemo(
    () => (wards.length ? wards[wardIndex % wards.length] : null),
    [wards, wardIndex]
  );

  const submit = async () => {
    if (!title.trim() && !description.trim()) {
      Alert.alert('Missing details', 'Please add title or description before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await ReportsAPI.create({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        category_id: selectedCategory?.id,
        ward_id: selectedWard?.id,
      });

      Alert.alert('Report submitted', `+${result.xp_awarded} XP awarded`);
      setTitle('');
      setDescription('');
    } catch (err) {
      Alert.alert('Submit failed', err instanceof Error ? err.message : 'Could not submit report');
    } finally {
      setSubmitting(false);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMetadata(); }} />}
      >
        <Text style={styles.title}>Report an Issue</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Short title (optional)"
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            disabled={!categories.length}
            onPress={() => setCategoryIndex((prev) => prev + 1)}
          >
            <Text style={styles.selectorText}>{selectedCategory?.name ?? 'No categories'}</Text>
            <Text style={styles.selectorHint}>Tap to change</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Ward</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            disabled={!wards.length}
            onPress={() => setWardIndex((prev) => prev + 1)}
          >
            <Text style={styles.selectorText}>{selectedWard?.name ?? 'No wards'}</Text>
            <Text style={styles.selectorHint}>Tap to change</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={submit} disabled={submitting}>
            <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a7a4a', marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  textarea: { minHeight: 110 },
  selectorBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: { color: '#111827', fontWeight: '600' },
  selectorHint: { color: '#6b7280', fontSize: 12 },
  submitBtn: { marginTop: 16, backgroundColor: '#1a7a4a', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
