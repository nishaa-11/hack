import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Clock, Info, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react-native';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Mock data for the demonstration - in a real app, this would be fetched from the API using the id
  const isResolved = id === '1';
  const mockReport = {
    id,
    title: isResolved ? 'Garbage dump — Koramangala' : 'Water leak — Indiranagar',
    description: isResolved 
      ? 'A large pile of construction waste and household garbage has been dumped on the corner of 4th cross. It has been there for 3 days and is attracting pests.'
      : 'Significant water leakage from a main pipe under the pavement. Causing flooding on the road.',
    location: isResolved ? '4th Cross, Koramangala 3rd Block, Bengaluru' : '12th Main, Indiranagar, Bengaluru',
    status: isResolved ? 'Resolved' : 'In Progress',
    time: isResolved ? '2 hours ago' : '5 hours ago',
    category: isResolved ? 'Waste Management' : 'Water Supply',
    priority: 'High',
    updates: isResolved ? [
      { status: 'Resolved', time: 'Just now', note: 'Municipal truck has cleared the area.' },
      { status: 'In Progress', time: '1 hour ago', note: 'Assigned to Ward 151 Waste Management team.' },
      { status: 'Reported', time: '2 hours ago', note: 'Initial report received.' },
    ] : [
      { status: 'In Progress', time: '1 hour ago', note: 'Technicians dispatched to site.' },
      { status: 'Reported', time: '5 hours ago', note: 'Leak reported by multiple residents.' },
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return '#1a7a4a';
      case 'in progress': return '#378ADD';
      default: return '#EF9F27';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(mockReport.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(mockReport.status) }]}>{mockReport.status.toUpperCase()}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{mockReport.title}</Text>
          <View style={styles.metaRow}>
            <Clock size={16} color="#888" />
            <Text style={styles.metaText}>{mockReport.time}</Text>
            <View style={styles.dot} />
            <Text style={styles.categoryText}>{mockReport.category}</Text>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={18} color="#E8593C" />
            <Text style={styles.locationText}>{mockReport.location}</Text>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{mockReport.description}</Text>
        </View>

        {/* Timeline */}
        <Text style={styles.sectionTitleOutside}>Resolution Timeline</Text>
        <View style={styles.timelineCard}>
          {mockReport.updates.map((update, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(update.status) }]} />
                {index < mockReport.updates.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineRight}>
                <View style={styles.updateHeader}>
                  <Text style={styles.updateStatus}>{update.status}</Text>
                  <Text style={styles.updateTime}>{update.time}</Text>
                </View>
                <Text style={styles.updateNote}>{update.note}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16 },
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  statusText: { fontSize: 12, fontWeight: '800' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  metaText: { fontSize: 13, color: '#888', marginLeft: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CCC', marginHorizontal: 8 },
  categoryText: { fontSize: 13, color: '#1a7a4a', fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12 },
  locationText: { flex: 1, fontSize: 14, color: '#4B5563', marginLeft: 8, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sectionTitleOutside: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16, marginLeft: 4 },
  description: { fontSize: 15, color: '#4B5563', lineHeight: 24 },
  timelineCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  timelineItem: { flexDirection: 'row', minHeight: 70 },
  timelineLeft: { alignItems: 'center', width: 20, marginRight: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  timelineRight: { flex: 1, paddingBottom: 24 },
  updateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  updateStatus: { fontSize: 15, fontWeight: '700', color: '#111827' },
  updateTime: { fontSize: 12, color: '#9CA3AF' },
  updateNote: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#1a7a4a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 10,
    shadowColor: '#1a7a4a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
