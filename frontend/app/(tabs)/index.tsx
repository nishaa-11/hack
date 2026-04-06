import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import {
  Leaf,
  ChevronDown,
  Bell,
  Zap,
  Crosshair,
  Bus,
  Droplets,
  Users,
  Trash2,
  Search,
  X,
  MapPin
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import MapView, { Marker, UrlTile, Callout } from 'react-native-maps';
import * as Location from 'expo-location';

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad",
  "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
  "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara"
].sort();

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Issue Resolved', body: 'The garbage dump in Koramangala has been cleared!', time: '10m ago', unread: true },
  { id: '2', title: 'New Challenge', body: 'Join the "Clean HSR Layout" weekend drive now.', time: '2h ago', unread: true },
  { id: '3', title: 'XP Awarded', body: 'You earned +50 XP for reporting a water leak.', time: '5h ago', unread: false },
];

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Bengaluru");
  const [searchQuery, setSearchQuery] = useState("");

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  // Generate mock nearby issues relative to user's location
  const nearbyIssues = useMemo(() => {
    if (!location) return [];
    const { latitude, longitude } = location.coords;
    return [
      { id: 'm1', lat: latitude + 0.002, lng: longitude + 0.003, color: '#E8593C', type: 'Waste' },
      { id: 'm2', lat: latitude - 0.001, lng: longitude + 0.004, color: '#378ADD', type: 'Water' },
      { id: 'm3', lat: latitude + 0.004, lng: longitude - 0.002, color: '#7F77DD', type: 'Community' },
      { id: 'm4', lat: latitude - 0.003, lng: longitude - 0.001, color: '#EF9F27', type: 'Road' },
      { id: 'm5', lat: latitude + 0.005, lng: longitude + 0.001, color: '#1a7a4a', type: 'Green' },
    ];
  }, [location]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMapLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      setMapLoading(false);
    })();
  }, []);

  const recenter = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const initials = useMemo(() => {
    if (!profile?.name) return 'NB';
    return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [profile]);

  const filteredCities = INDIAN_CITIES.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Leaf size={24} color="#1a7a4a" />
          <Text style={styles.logoText}>CivicPulse</Text>
        </View>

        <TouchableOpacity style={styles.citySelector} onPress={() => setCityModalVisible(true)}>
          <Text style={styles.cityText}>{selectedCity}</Text>
          <ChevronDown size={14} color="#333" />
        </TouchableOpacity>

        <View style={styles.rightHeader}>
          <TouchableOpacity style={styles.bellIcon} onPress={() => setNotifModalVisible(true)}>
            <Bell size={24} color="#333" />
            <View style={styles.badge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        {/* COMMUNITY IMPACT CARD (MATCHING REFERENCE UI) */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <View style={styles.impactTextContainer}>
              <Text style={styles.impactSubtitle}>COMMUNITY IMPACT</Text>
              <Text style={styles.impactTitle}>Neighborhood Score: 74/100</Text>
            </View>
            <View style={styles.scoreCircle}>
              <View style={[styles.scoreProgress, { transform: [{ rotate: '45deg' }] }]} />
              <Text style={styles.scorePercent}>74%</Text>
            </View>
          </View>

          <View style={styles.impactStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>REPORTS FILED</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>RESOLVED</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>ECO ACTIONS</Text>
            </View>
          </View>
        </View>

        {/* MAP CARD */}
        <View style={styles.mapCard}>
          {mapLoading ? (
            <View style={styles.mapCentered}><ActivityIndicator color="#1a7a4a" /></View>
          ) : (
            <>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: location?.coords.latitude ?? 12.9716,
                  longitude: location?.coords.longitude ?? 77.5946,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
                userInterfaceStyle="light"
                showsUserLocation={true}
                followsUserLocation={true}
                showsMyLocationButton={false}
              >
                <UrlTile
                  urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  shouldReplaceMapContent={true}
                />
                {nearbyIssues.map(issue => (
                  <Marker
                    key={issue.id}
                    coordinate={{ latitude: issue.lat, longitude: issue.lng }}
                    title={issue.type}
                  >
                    <View style={[styles.mapDot, { backgroundColor: issue.color }]} />
                    <Callout tooltip>
                      <View style={styles.calloutBubble}>
                        <Text style={styles.calloutText}>{issue.type}</Text>
                      </View>
                    </Callout>
                  </Marker>
                ))}
              </MapView>
              <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
                <Crosshair size={20} color="#333" />
              </TouchableOpacity>
            </>
          )}
          <View style={styles.mapOverlayPill}>
            <Text style={styles.mapOverlayText}>12 active issues near you</Text>
          </View>
        </View>

        {/* SECTION HEADER CHALENGES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Challenges</Text>
          <TouchableOpacity onPress={() => router.push('/challenges')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <ChallengeCard
            icon={<Bus size={18} color="#7F77DD" />}
            title="Public Transport"
            xp="+30"
            color="#7F77DD"
            onPress={() => router.push('/challenges')}
          />
          <ChallengeCard
            icon={<Droplets size={18} color="#378ADD" />}
            title="Save Water"
            xp="+20"
            color="#378ADD"
            onPress={() => router.push('/challenges')}
          />
          <ChallengeCard
            icon={<Users size={18} color="#1a7a4a" />}
            title="Neighborhood Clean"
            xp="+50"
            color="#1a7a4a"
            onPress={() => router.push('/challenges')}
          />
        </ScrollView>

        {/* RECENT ACTIVITY FEED */}
        <Text style={[styles.sectionTitle, { marginLeft: 16, marginTop: 24, marginBottom: 12 }]}>Recent activity</Text>
        <View style={styles.activityList}>
          <ActivityRow id="1" icon={<Trash2 size={20} color="#E8593C" />} title="Garbage dump — Koramangala" time="2 hrs ago" status="Resolved" onPress={(id: string) => router.push({ pathname: '/report/[id]', params: { id } })} />
          <View style={styles.divider} />
          <ActivityRow id="2" icon={<Droplets size={20} color="#378ADD" />} title="Water leak — Indiranagar" time="5 hrs ago" status="In Review" onPress={(id: string) => router.push({ pathname: '/report/[id]', params: { id } })} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* CITY SELECTION MODAL */}
      <Modal animationType="slide" visible={cityModalVisible} onRequestClose={() => setCityModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select City</Text>
            <TouchableOpacity onPress={() => setCityModalVisible(false)}><X size={24} color="#333" /></TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <Search size={20} color="#888" />
            <TextInput style={styles.searchInput} placeholder="Search major cities..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <FlatList data={filteredCities} keyExtractor={item => item} renderItem={({ item }) => (
            <TouchableOpacity style={styles.cityItem} onPress={() => { setSelectedCity(item); setCityModalVisible(false); setSearchQuery(""); }}>
              <MapPin size={18} color="#666" />
              <Text style={styles.cityItemText}>{item}</Text>
            </TouchableOpacity>
          )} contentContainerStyle={styles.cityList} />
        </SafeAreaView>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal animationType="fade" transparent visible={notifModalVisible} onRequestClose={() => setNotifModalVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setNotifModalVisible(false)}>
          <View style={styles.notifDropdown}>
            <Text style={styles.notifTitle}>Notifications</Text>
            {MOCK_NOTIFICATIONS.map(notif => (
              <View key={notif.id} style={styles.notifItem}>
                <View style={[styles.notifDot, !notif.unread && { backgroundColor: 'transparent' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifItemTitle}>{notif.title}</Text>
                  <Text style={styles.notifItemBody}>{notif.body}</Text>
                  <Text style={styles.notifItemTime}>{notif.time}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.notifClose} onPress={() => setNotifModalVisible(false)}><Text style={styles.notifCloseText}>Close</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

function ChallengeCard({ icon, title, xp, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.challengeCard} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>{icon}</View>
      <Text style={styles.challengeTitle}>{title}</Text>
      <View style={[styles.xpPill, { backgroundColor: color + '20' }]}>
        <Text style={[styles.xpPillText, { color: color }]}>{xp} XP</Text>
      </View>
    </TouchableOpacity>
  );
}

function ActivityRow({ id, icon, title, time, status, onPress }: any) {
  return (
    <TouchableOpacity style={styles.activityRow} onPress={() => onPress(id)}>
      <View style={[styles.activityIcon, { backgroundColor: '#F0F2F5' }]}>{icon}</View>
      <View style={styles.activityDetails}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: status === 'Resolved' ? '#E8F5EE' : '#FDF2E2' }]}>
        <Text style={[styles.statusChipText, { color: status === 'Resolved' ? '#1a7a4a' : '#EF9F27' }]}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  contentContainer: { paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoText: { fontSize: 18, fontWeight: '800', color: '#1a7a4a' },
  citySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  cityText: { fontSize: 13, fontWeight: '600', color: '#333' },
  rightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellIcon: { position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 2, width: 8, height: 8, backgroundColor: '#E8593C', borderRadius: 4, borderWidth: 1, borderColor: '#FFF' },
  avatar: { width: 32, height: 32, backgroundColor: '#1a7a4a', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  impactCard: {
    marginHorizontal: 16,
    backgroundColor: '#065F46', // Deep emerald green from reference
    borderRadius: 28, // More rounded for premium feel
    padding: 24,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  impactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  impactTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  impactSubtitle: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
    opacity: 0.8,
  },
  impactTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  scoreCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scoreProgress: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: 'transparent',
    borderTopColor: '#34D399',
    borderRightColor: '#34D399',
  },
  scorePercent: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    width: (Dimensions.get('window').width - 80) / 3, // Precise calculation for alignment
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    color: '#A7F3D0',
    fontSize: 8.5,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  mapCard: { marginHorizontal: 16, height: 220, backgroundColor: '#E5E7EB', borderRadius: 24, overflow: 'hidden', position: 'relative', marginVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  mapCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  calloutBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  calloutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  mapOverlayPill: { position: 'absolute', bottom: 16, left: 16, backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapOverlayText: { color: '#111827', fontSize: 14, fontWeight: '700' },
  recenterBtn: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, backgroundColor: '#FFF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#1a7a4a' },
  challengeCard: { width: 140, backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  challengeTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6 },
  xpPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  xpPillText: { fontSize: 11, fontWeight: '800' },
  activityList: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  activityRow: { flexDirection: 'row', alignItems: 'center' },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityDetails: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  activityTime: { fontSize: 12, color: '#888' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#F3F4F6', margin: 16, borderRadius: 12 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  cityList: { paddingHorizontal: 16 },
  cityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cityItemText: { fontSize: 16, marginLeft: 12, color: '#333' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 10 },
  notifDropdown: { width: 300, backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  notifTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  notifItem: { flexDirection: 'row', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a7a4a', marginTop: 6, marginRight: 10 },
  notifItemTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  notifItemBody: { fontSize: 13, color: '#4B5563', marginTop: 2 },
  notifItemTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  notifClose: { alignItems: 'center', paddingTop: 10 },
  notifCloseText: { color: '#1a7a4a', fontWeight: '800' },
});
