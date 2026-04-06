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
  Platform,
  Image
} from 'react-native';
import {
  Leaf,
  ChevronDown,
  Bell,
  Crosshair,
  Search,
  X,
  MapPin,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import MapView, { Marker, UrlTile, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  ChallengesAPI,
  NotificationsAPI,
  NearbyReportsAPI,
  ProfilesAPI,
  type Challenge,
  type Notification,
  type NearbyReport,
  type NeighborhoodImpact,
} from '@/lib/api';

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad",
  "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
  "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara"
].sort();

// Map issue category colors to a UI color (fallback to green)
function categoryColor(cat?: NearbyReport['issue_categories']): string {
  return cat?.color ?? '#1a7a4a';
}

export default function HomeScreen() {
  const { profile, localAvatarUri, signOut } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Bengaluru");
  const [searchQuery, setSearchQuery] = useState("");

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  // Real data states
  const [nearbyReports, setNearbyReports] = useState<NearbyReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [topChallenges, setTopChallenges] = useState<Challenge[]>([]);
  const [impact, setImpact] = useState<NeighborhoodImpact | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Single coordinated load: wait up to 4s for GPS, then fetch everything once ──
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      let loc: Location.LocationObject | null = null;
      if (status === 'granted') {
        try {
          // Race: real GPS vs 4-second fallback to Bengaluru center
          loc = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
          ]) as Location.LocationObject | null;
        } catch {
          loc = null;
        }
      }

      if (!cancelled) {
        setLocation(loc);
        setMapLoading(false);
      }

      // Now fetch all dashboard data with best-available coordinates
      const lat = loc?.coords.latitude ?? 12.9716;
      const lng = loc?.coords.longitude ?? 77.5946;

      if (cancelled) return;
      setDataLoading(true);
      try {
        const [nearbyRes, notifRes, challengeRes, impactRes] = await Promise.allSettled([
          NearbyReportsAPI.get(lat, lng, 5),
          NotificationsAPI.list(),
          ChallengesAPI.list(),
          ProfilesAPI.impact(),
        ]);

        if (cancelled) return;
        if (nearbyRes.status === 'fulfilled') setNearbyReports(nearbyRes.value.reports ?? []);
        if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.notifications ?? []);
        if (challengeRes.status === 'fulfilled') setTopChallenges((challengeRes.value.challenges ?? []).slice(0, 3));
        if (impactRes.status === 'fulfilled') setImpact(impactRes.value.impact ?? null);
      } catch (err) {
        console.warn('[HomeScreen] Dashboard data error:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!profile?.name) return '?';
    return profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [profile]);

  const filteredCities = INDIAN_CITIES.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = notifications.filter(n => n.unread).length;

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
          <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <LogOut size={20} color="#E8593C" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellIcon} onPress={() => setNotifModalVisible(true)}>
            <Bell size={24} color="#333" />
            {unreadCount > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profile')}>
            {localAvatarUri ? (
              <Image source={{ uri: localAvatarUri }} style={{ width: 34, height: 34, borderRadius: 17 }} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>

        {/* COMMUNITY IMPACT CARD */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <View style={styles.impactTextContainer}>
              <Text style={styles.impactSubtitle}>COMMUNITY IMPACT</Text>
              <Text style={styles.impactTitle}>
                Neighborhood Score: {impact?.impact_score ?? 0}/100
              </Text>
            </View>
            <View style={styles.scoreCircle}>
              <View style={[styles.scoreProgress, { transform: [{ rotate: `${(impact?.impact_score ?? 0) * 3.6}deg` }] }]} />
              <Text style={styles.scorePercent}>{impact?.impact_score ?? 0}%</Text>
            </View>
          </View>

          <View style={styles.impactStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{dataLoading ? '—' : String(impact?.total_reports ?? 0)}</Text>
              <Text style={styles.statLabel}>REPORTS FILED</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{dataLoading ? '—' : String(impact?.resolved_reports ?? 0)}</Text>
              <Text style={styles.statLabel}>RESOLVED</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{dataLoading ? '—' : String(impact?.streak_days ?? profile?.streak_days ?? 0)}</Text>
              <Text style={styles.statLabel}>DAY STREAK</Text>
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
                followsUserLocation={false}
                showsMyLocationButton={false}
              >
                {/* OpenStreetMap tiles */}
                <UrlTile
                  urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  shouldReplaceMapContent={true}
                  maximumZ={19}
                  flipY={false}
                />
                {/* Real report markers */}
                {nearbyReports.map(report => (
                  <Marker
                    key={report.id}
                    coordinate={{ latitude: report.lat, longitude: report.lng }}
                    title={report.title ?? report.issue_categories?.name ?? 'Issue'}
                  >
                    <View style={[styles.mapDot, { backgroundColor: categoryColor(report.issue_categories) }]} />
                    <Callout tooltip>
                      <View style={styles.calloutBubble}>
                        <Text style={styles.calloutText} numberOfLines={2}>
                          {report.title ?? report.issue_categories?.name ?? 'Issue'}
                        </Text>
                        <Text style={styles.calloutStatus}>{report.status.replace('_', ' ')}</Text>
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
            <Text style={styles.mapOverlayText}>
              {dataLoading ? 'Loading...' : `${nearbyReports.length} active issue${nearbyReports.length !== 1 ? 's' : ''} near you`}
            </Text>
          </View>
        </View>

        {/* SECTION HEADER CHALLENGES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Challenges</Text>
          <TouchableOpacity onPress={() => router.push('/challenges')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {dataLoading ? (
          <ActivityIndicator color="#1a7a4a" style={{ marginVertical: 20 }} />
        ) : topChallenges.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {topChallenges.map(ch => (
              <ChallengeCard
                key={ch.id}
                title={ch.title}
                xp={`+${ch.xp_reward}`}
                type={ch.type}
                onPress={() => router.push('/challenges')}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No challenges available right now.</Text>
        )}

        {/* RECENT ACTIVITY FEED */}
        <Text style={[styles.sectionTitle, { marginLeft: 16, marginTop: 24, marginBottom: 12 }]}>Recent Activity</Text>
        <View style={styles.activityList}>
          {dataLoading ? (
            <ActivityIndicator color="#1a7a4a" />
          ) : notifications.length > 0 ? (
            notifications.slice(0, 3).map((notif, idx) => (
              <View key={notif.id}>
                <TouchableOpacity
                  style={styles.activityRow}
                  onPress={() => notif.report_id && router.push({ pathname: '/report/[id]', params: { id: notif.report_id } })}
                >
                  <View style={[styles.activityIcon, { backgroundColor: notif.type === 'status_change' ? '#E8F5EE' : notif.type === 'xp_award' ? '#FFF7ED' : '#EFF6FF' }]}>
                    <Text style={{ fontSize: 18 }}>
                      {notif.type === 'status_change' ? '📋' : notif.type === 'xp_award' ? '⭐' : '🏆'}
                    </Text>
                  </View>
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityTitle} numberOfLines={1}>{notif.body}</Text>
                    <Text style={styles.activityTime}>{formatRelativeTime(notif.time)}</Text>
                  </View>
                  {notif.unread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
                {idx < Math.min(notifications.length, 3) - 1 && <View style={styles.divider} />}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent activity yet.</Text>
          )}
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
            <TextInput style={styles.searchInput} placeholder="Search cities..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <FlatList
            data={filteredCities}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.cityItem} onPress={() => { setSelectedCity(item); setCityModalVisible(false); setSearchQuery(""); }}>
                <MapPin size={18} color="#666" />
                <Text style={styles.cityItemText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.cityList}
          />
        </SafeAreaView>
      </Modal>

      {/* NOTIFICATIONS MODAL */}
      <Modal animationType="fade" transparent visible={notifModalVisible} onRequestClose={() => setNotifModalVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setNotifModalVisible(false)}>
          <View style={styles.notifDropdown}>
            <Text style={styles.notifTitle}>Notifications</Text>
            {dataLoading ? (
              <ActivityIndicator color="#1a7a4a" />
            ) : notifications.length === 0 ? (
              <Text style={{ color: '#6B7280', fontSize: 13 }}>No notifications yet.</Text>
            ) : (
              notifications.slice(0, 5).map(notif => (
                <View key={notif.id} style={styles.notifItem}>
                  <View style={[styles.notifDot, !notif.unread && { backgroundColor: 'transparent' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifItemTitle}>{notif.title}</Text>
                    <Text style={styles.notifItemBody}>{notif.body}</Text>
                    <Text style={styles.notifItemTime}>{formatRelativeTime(notif.time)}</Text>
                  </View>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.notifClose} onPress={() => setNotifModalVisible(false)}>
              <Text style={styles.notifCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ── Helper: Human-readable relative time ────────────────────
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Challenge type → color mapping ───────────────────────────
const CHALLENGE_COLORS: Record<string, string> = {
  daily: '#F59E0B',
  weekly: '#7F77DD',
  community: '#1a7a4a',
};

function ChallengeCard({ title, xp, type, onPress }: { title: string; xp: string; type: string; onPress: () => void }) {
  const color = CHALLENGE_COLORS[type] ?? '#1a7a4a';
  return (
    <TouchableOpacity style={styles.challengeCard} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 16 }}>
          {type === 'daily' ? '🌤️' : type === 'weekly' ? '📅' : '🌍'}
        </Text>
      </View>
      <Text style={styles.challengeTitle} numberOfLines={2}>{title}</Text>
      <View style={[styles.xpPill, { backgroundColor: color + '20' }]}>
        <Text style={[styles.xpPillText, { color }]}>{xp} XP</Text>
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
  rightHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoutBtn: { padding: 4 },
  bellIcon: { position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 2, width: 8, height: 8, backgroundColor: '#E8593C', borderRadius: 4, borderWidth: 1, borderColor: '#FFF' },
  avatar: { width: 32, height: 32, backgroundColor: '#1a7a4a', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  impactCard: {
    marginHorizontal: 16, backgroundColor: '#065F46', borderRadius: 28, padding: 24,
    marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  impactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  impactTextContainer: { flex: 1, marginRight: 12 },
  impactSubtitle: { color: '#D1FAE5', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6, opacity: 0.8 },
  impactTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', lineHeight: 28 },
  scoreCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 5, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  scoreProgress: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 5, borderColor: 'transparent', borderTopColor: '#34D399', borderRightColor: '#34D399' },
  scorePercent: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  impactStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { width: (Dimensions.get('window').width - 80) / 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  statNumber: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: '#A7F3D0', fontSize: 8.5, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  mapCard: { marginHorizontal: 16, height: 220, backgroundColor: '#E5E7EB', borderRadius: 24, overflow: 'hidden', position: 'relative', marginVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  mapCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 4 },
  calloutBubble: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB', minWidth: 80, maxWidth: 160, alignItems: 'center' },
  calloutText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  calloutStatus: { fontSize: 10, color: '#6B7280', textTransform: 'capitalize', marginTop: 2 },
  mapOverlayPill: { position: 'absolute', bottom: 16, left: 16, backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  mapOverlayText: { color: '#111827', fontSize: 14, fontWeight: '700' },
  recenterBtn: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, backgroundColor: '#FFF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#1a7a4a' },
  challengeCard: { width: 140, backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  challengeTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6 },
  xpPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  xpPillText: { fontSize: 11, fontWeight: '800' },
  emptyText: { color: '#9CA3AF', fontSize: 13, marginLeft: 16, marginBottom: 12 },
  activityList: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  activityRow: { flexDirection: 'row', alignItems: 'center' },
  activityIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityDetails: { flex: 1 },
  activityTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  activityTime: { fontSize: 12, color: '#888' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a7a4a', marginLeft: 8 },
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
  notifItemBody: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  notifItemTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  notifClose: { alignItems: 'center', paddingTop: 10 },
  notifCloseText: { color: '#1a7a4a', fontWeight: '800' },
});