import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { ChevronDown, X, Camera, MapPin, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { CategoriesAPI, LocationsAPI, ReportsAPI, type Category, type Ward } from '@/lib/api';

import { useAuth } from '@/context/AuthContext';

const MUNICIPAL_CATEGORY_OPTIONS: Category[] = [
  { id: 'pothole', name: 'Pothole', icon: null, color: null, default_authority: null, base_xp: 10 },
  { id: 'streetlight-fault', name: 'Streetlight Fault', icon: null, color: null, default_authority: null, base_xp: 10 },
  { id: 'garbage-dumping', name: 'Garbage Dumping', icon: null, color: null, default_authority: null, base_xp: 10 },
  { id: 'sewage-overflow', name: 'Sewage Overflow', icon: null, color: null, default_authority: null, base_xp: 10 },
  { id: 'water-leakage', name: 'Water Leakage', icon: null, color: null, default_authority: null, base_xp: 10 },
];

export default function ReportScreen() {
  const { refreshProfile, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [image, setImage] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [location, setLocation] = useState('Detecting location…');
  const [aiResult, setAiResult] = useState<null | {
    category: string;
    severity: 'Low' | 'Medium' | 'High';
    confidence: number;
    authority: string;
    description: string;
  }>(null);
  const [classifying, setClassifying] = useState(false);
  const [showAiCard, setShowAiCard] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  // Dropdown states
  const [categoryModal, setCategoryModal] = useState(false);
  const [wardModal, setWardModal] = useState(false);
  const [locationModal, setLocationModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const submitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://192.168.1.3:3001/api/v1';

  const loadMetadata = useCallback(async () => {
    try {
      const [cats, wardRes] = await Promise.all([
        CategoriesAPI.list(),
        LocationsAPI.wards(),
      ]);
      const categoryList = Array.isArray(cats.categories) ? cats.categories : [];
      const wardList = Array.isArray(wardRes.wards) ? wardRes.wards : [];
      const resolvedCategories = categoryList.length > 0 ? categoryList : MUNICIPAL_CATEGORY_OPTIONS;

      setCategories(resolvedCategories);
      setWards(wardList);
      
      if (resolvedCategories.length > 0) setSelectedCategory(prev => prev || resolvedCategories[0]);
      if (wardList.length > 0) setSelectedWard(prev => prev || wardList[0]);
    } catch (err) {
      setCategories(MUNICIPAL_CATEGORY_OPTIONS);
      setSelectedCategory(prev => prev || MUNICIPAL_CATEGORY_OPTIONS[0]);
      Alert.alert('Load failed', err instanceof Error ? err.message : 'Could not load metadata');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const classifyImage = useCallback(async (selectedImage: { uri: string; base64: string; mimeType: string }) => {
    if (!selectedImage.base64) {
      Alert.alert('Image Error', 'The image could not be processed.');
      return;
    }

    try {
      setClassifying(true);
      setAiResult(null);
      setShowAiCard(false);
      fadeAnim.setValue(0);
      const payload = await ReportsAPI.classifyImage({
        imageBase64: selectedImage.base64,
        mimeType: selectedImage.mimeType,
      });

      const parsed = payload.classification as {
        category: string;
        severity: 'Low' | 'Medium' | 'High';
        confidence: number;
        authority: string;
        description: string;
      };

      setAiResult(parsed);
      const matchedCategory = categories.find((category) => category.name.toLowerCase() === parsed.category.toLowerCase());
      if (matchedCategory) {
        setSelectedCategory(matchedCategory);
      }

      setShowAiCard(true);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      Alert.alert('Classification failed', err instanceof Error ? err.message : 'Could not classify the image');
    } finally {
      setClassifying(false);
    }
  }, [categories, fadeAnim]);

  const handleImageSelection = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert('Permission Denied', 'Camera access is required to take photos.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          base64: true,
          quality: 0.7,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        const nextImage = {
          uri: asset.uri,
          base64: asset.base64 || '',
          mimeType: asset.mimeType || 'image/jpeg',
        };

        setImage(nextImage);
        setAiResult(null);
        setShowAiCard(false);
        fadeAnim.setValue(0);
        await classifyImage(nextImage);
        return;
      }

      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libraryPermission.granted) {
        Alert.alert('Permission Denied', 'Photo library access is required to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const nextImage = {
        uri: asset.uri,
        base64: asset.base64 || '',
        mimeType: asset.mimeType || 'image/jpeg',
      };

      setImage(nextImage);
      setAiResult(null);
      setShowAiCard(false);
      fadeAnim.setValue(0);
      await classifyImage(nextImage);
    } catch (err) {
      Alert.alert('Image Error', err instanceof Error ? err.message : 'Could not process the selected image');
    }
  }, [classifyImage, fadeAnim]);

  const pickImage = async () => {
    await handleImageSelection('gallery');
  };

  const takePhoto = async () => {
    await handleImageSelection('camera');
  };

  const detectCurrentLocation = useCallback(async () => {
    try {
      setDetectingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to detect your ward.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const detectedAddress = [place.name, place.street, place.subregion, place.city, place.region]
          .filter(Boolean)
          .slice(0, 4)
          .join(', ');

        setLocation(detectedAddress || 'Location detected');
      } else {
        setLocation('Location detected');
      }
    } catch (err) {
      Alert.alert('Detection failed', 'Could not determine your location. Please select your ward manually.');
    } finally {
      setDetectingLocation(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (session) {
      loadMetadata();
    } else {
      setLoading(false);
    }

    detectCurrentLocation();
  }, [authLoading, detectCurrentLocation, loadMetadata, session]);

  const applyCustomLocation = () => {
    if (customLocation.trim()) {
      setLocation(customLocation.trim());
      setLocationModal(false);
      return;
    }

    Alert.alert('Location required', 'Enter a custom location or choose a ward.');
  };

  const submit = async () => {
    if (!image) {
      Alert.alert('Image required', 'Please capture or upload a photo before submitting.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Category required', 'Please select a category for this issue.');
      return;
    }

    if (!location || location === 'Detecting location…') {
      Alert.alert('Location required', 'Please detect or set a location before submitting.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        category_id: selectedCategory?.category_id || selectedCategory?.id,
        subcategory_id: selectedCategory?.subcategory_id || selectedCategory?.id,
        ward_id: selectedWard?.id,
        address: location,
        imageBase64: image.base64,
        mimeType: image.mimeType,
        location,
        category: selectedCategory?.name,
        severity: aiResult?.severity || 'Medium',
        authority: aiResult?.authority || selectedCategory?.name,
        confidence: aiResult?.confidence ?? 0,
        priority: (aiResult?.severity || 'Medium').toLowerCase(),
        ai_classified: Boolean(aiResult),
        ai_confidence: aiResult?.confidence ?? null,
        authority_routed_to: aiResult?.authority || selectedCategory?.name || null,
      } as Record<string, unknown>;

      const response = await fetch(`${submitApiBaseUrl}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const payloadError = await response.json().catch(() => ({}));
        throw new Error(payloadError?.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      await refreshProfile();

      Alert.alert('Report Submitted! ✅', `+${result.xp_awarded ?? 0} XP awarded`);
      setTitle('');
      setDescription('');
      setImage(null);
      setAiResult(null);
      setShowAiCard(false);
      fadeAnim.setValue(0);
      router.back();
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Report an Issue</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMetadata(); }} />}
      >
        {/* Upload Zone */}
        {image?.uri ? (
          <>
            <View style={styles.uploadZoneOuter}>
              <ImageBackground 
                source={{ uri: image.uri }} 
                style={styles.uploadZoneFilled}
                imageStyle={{ borderRadius: 14 }}
              >
                <View style={styles.uploadOverlay} />
                
                {classifying && (
                  <View style={styles.classifyingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.classifyingText}>Analysing…</Text>
                  </View>
                )}
                
                <TouchableOpacity style={styles.dismissBtn} onPress={() => {
                  setImage(null);
                  setAiResult(null);
                  setShowAiCard(false);
                  fadeAnim.setValue(0);
                }}>
                  <X size={16} color="#000" />
                </TouchableOpacity>

                <View style={styles.photoAddedPill}>
                  <Image source={{ uri: image.uri }} style={styles.thumbnailMini} />
                  <Text style={styles.photoAddedText}>Photo added</Text>
                </View>
              </ImageBackground>
            </View>

            {/* Action Pills below image */}
            <View style={styles.imageActionsRow}>
              <TouchableOpacity style={styles.actionPill} onPress={takePhoto}>
                <Camera size={16} color="#1a7a4a" />
                <Text style={styles.actionPillText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} onPress={pickImage}>
                <ImageIcon size={16} color="#1a7a4a" />
                <Text style={styles.actionPillText}>Change</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.uploadZoneEmpty}>
            <Camera size={32} color="#1a7a4a" style={styles.uploadIcon} />
            <Text style={styles.uploadTitle}>Take a photo or upload</Text>
            <Text style={styles.uploadSubtitle}>Clear photos get classified faster</Text>
            
            <View style={styles.uploadButtonsRow}>
              <TouchableOpacity style={styles.uploadBtnPlaceholder} onPress={pickImage}>
                <ImageIcon size={20} color="#1a7a4a" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.uploadBtnPrimary} onPress={takePhoto}>
                <Text style={styles.uploadBtnPrimaryText}>Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.uploadBtnSecondary} onPress={pickImage}>
                <Text style={styles.uploadBtnSecondaryText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Form Fields */}
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
          <View style={[styles.input, styles.textareaContainer]}>
            <TextInput
              style={styles.textInputArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you see... (optional)"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={styles.charCount}>{description.length} / 200</Text>
          </View>

          <View style={styles.locationSummaryCard}>
            <View style={styles.locationSummaryLeft}>
              <MapPin size={16} color="#1a7a4a" />
              <Text style={styles.locationSummaryText} numberOfLines={1}>{location}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              setCustomLocation(location === 'Detecting location…' ? '' : location);
              setLocationModal(true);
            }}>
              <Text style={styles.locationChangeText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Category Dropdown */}
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            disabled={!categories.length || loading}
            onPress={() => setCategoryModal(true)}
          >
            <Text style={styles.selectorText}>{selectedCategory?.name ?? 'Select a category'}</Text>
            <ChevronDown size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Ward Dropdown */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Ward</Text>
            <TouchableOpacity 
              style={styles.detectBtn} 
              onPress={detectCurrentLocation}
              disabled={detectingLocation}
            >
              <MapPin size={12} color="#1a7a4a" />
              <Text style={styles.detectBtnText}>
                {detectingLocation ? 'Detecting...' : 'Detect'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.selectorBtn}
            disabled={!wards.length}
            onPress={() => setWardModal(true)}
          >
            <Text style={styles.selectorText}>{selectedWard?.name ?? 'Select a ward'}</Text>
            <ChevronDown size={20} color="#6b7280" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.aiCard,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
                display: showAiCard ? 'flex' : 'none',
              },
            ]}
          >
            <View style={styles.aiCardHeader}>
              <View>
                <Text style={styles.aiCardTitle}>AI Classification</Text>
                <Text style={styles.aiCardSubtitle}>Auto-detected from the photo</Text>
              </View>
              <View style={[styles.severityPill, aiResult?.severity === 'High' ? styles.severityHigh : aiResult?.severity === 'Medium' ? styles.severityMedium : styles.severityLow]}>
                <Text style={[styles.severityPillText, aiResult?.severity === 'High' ? styles.severityHighText : aiResult?.severity === 'Medium' ? styles.severityMediumText : styles.severityLowText]}>
                  {aiResult?.severity || 'Medium'}
                </Text>
              </View>
            </View>

            <View style={styles.aiSummaryRow}>
              <Text style={styles.aiCategoryText}>{aiResult?.category || 'Category detected'}</Text>
              <Text style={styles.aiConfidenceText}>{Math.round(aiResult?.confidence || 0)}% confidence</Text>
            </View>

            <Text style={styles.aiAuthorityText}>{aiResult?.authority || 'Authority'} • {aiResult?.description || 'Issue classified automatically.'}</Text>

            <TouchableOpacity onPress={() => setCategoryModal(true)} style={styles.aiOverrideBtn}>
              <Text style={styles.aiOverrideText}>Wrong category?</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={submit} disabled={submitting}>
            {submitting ? (
              <View style={styles.submitInner}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitText}>Submitting...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <BottomModal visible={categoryModal} onClose={() => setCategoryModal(false)} title="Select Category">
        <FlatList
          data={categories.length > 0 ? categories : MUNICIPAL_CATEGORY_OPTIONS}
          keyExtractor={c => c.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.listItem, selectedCategory?.id === item.id && styles.listItemSelected]}
              onPress={() => { setSelectedCategory(item); setCategoryModal(false); }}
            >
              <Text style={styles.listItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </BottomModal>

      {/* Ward Selection Modal */}
      <BottomModal visible={wardModal} onClose={() => setWardModal(false)} title="Select Ward">
        <FlatList
          data={wards}
          keyExtractor={w => w.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.listItem, selectedWard?.id === item.id && styles.listItemSelected]}
              onPress={() => { setSelectedWard(item); setLocation(item.name); setWardModal(false); }}
            >
              <Text style={styles.listItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </BottomModal>

      <BottomModal visible={locationModal} onClose={() => setLocationModal(false)} title="Set Location">
        <View style={styles.locationModalContent}>
          <TextInput
            style={styles.locationInput}
            value={customLocation}
            onChangeText={setCustomLocation}
            placeholder="Type a custom location"
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity style={styles.locationApplyBtn} onPress={() => {
            setLocation(customLocation.trim() || location);
            setLocationModal(false);
          }}>
            <Text style={styles.locationApplyText}>Use custom location</Text>
          </TouchableOpacity>

          <Text style={styles.locationSectionTitle}>Nearby wards</Text>
          <FlatList
            data={wards}
            keyExtractor={(ward) => ward.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listItem, selectedWard?.id === item.id && styles.listItemSelected]}
                onPress={() => {
                  setSelectedWard(item);
                  setLocation(item.name);
                  setLocationModal(false);
                }}
              >
                <Text style={styles.listItemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </BottomModal>
    </SafeAreaView>
  );
}

// Reusable Bottom Sheet Modal for Dropdowns
function BottomModal({ visible, onClose, title, children }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fbfaf0' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  scrollContent: { padding: 16, paddingBottom: 30 },

  // Upload Zone (Empty)
  uploadZoneEmpty: {
    width: '100%',
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1a7a4a',
    borderStyle: 'dashed',
    backgroundColor: '#ebf4f1',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIcon: { marginBottom: 10 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: '#1a7a4a', marginBottom: 4 },
  uploadSubtitle: { fontSize: 13, color: '#4b6e5e', marginBottom: 16 },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadBtnPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#d8ebe2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnPrimary: {
    paddingHorizontal: 24,
    height: 44,
    justifyContent: 'center',
    backgroundColor: '#1a7a4a',
    borderRadius: 8,
  },
  uploadBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  uploadBtnSecondary: {
    paddingHorizontal: 24,
    height: 44,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1a7a4a',
    borderRadius: 8,
  },
  uploadBtnSecondaryText: { color: '#1a7a4a', fontWeight: '700', fontSize: 14 },

  // Upload Zone (Filled)
  uploadZoneOuter: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1a7a4a',
    borderStyle: 'dashed',
    backgroundColor: '#E8F5EE',
    padding: 3,
  },
  uploadZoneFilled: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dismissBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddedPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    maxWidth: '70%',
  },
  thumbnailMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  photoAddedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  classifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    gap: 8,
  },
  classifyingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  
  // Actions below image
  imageActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a7a4a',
    backgroundColor: '#fff',
    gap: 6,
  },
  actionPillText: { color: '#1a7a4a', fontSize: 13, fontWeight: '600' },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 0, marginTop: 0 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ebf4f1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  detectBtnText: { fontSize: 11, fontWeight: '700', color: '#1a7a4a' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, color: '#111827', fontSize: 15 },
  textareaContainer: { minHeight: 110, padding: 12 },
  textInputArea: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  charCount: { textAlign: 'right', fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  selectorBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectorText: { color: '#111827', fontSize: 15 },
  locationSummaryCard: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationSummaryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationSummaryText: {
    flex: 1,
    color: '#14532d',
    fontSize: 13,
    fontWeight: '700',
  },
  locationChangeText: {
    color: '#1a7a4a',
    fontSize: 12,
    fontWeight: '800',
  },
  aiCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1fae5',
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  aiCardSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  severityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityHigh: {
    backgroundColor: '#fee2e2',
  },
  severityMedium: {
    backgroundColor: '#ffedd5',
  },
  severityLow: {
    backgroundColor: '#dcfce7',
  },
  severityPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  severityHighText: {
    color: '#b91c1c',
  },
  severityMediumText: {
    color: '#c2410c',
  },
  severityLowText: {
    color: '#166534',
  },
  aiSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiCategoryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  aiConfidenceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1a7a4a',
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiAuthorityText: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 10,
  },
  aiOverrideBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1a7a4a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f0fdf4',
  },
  aiOverrideText: {
    color: '#1a7a4a',
    fontSize: 11,
    fontWeight: '800',
  },
  submitBtn: { marginTop: 24, backgroundColor: '#1a7a4a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '30%',
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { padding: 4 },
  locationModalContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  locationApplyBtn: {
    backgroundColor: '#1a7a4a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  locationApplyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  locationSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listItemSelected: {
    backgroundColor: '#e8f5ee',
  },
  listItemText: {
    fontSize: 16,
    color: '#374151',
  },
});
