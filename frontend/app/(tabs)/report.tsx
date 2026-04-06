import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { CategoriesAPI, LocationsAPI, ReportsAPI, type Category, type Ward } from '@/lib/api';

export default function ReportScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Dropdown states
  const [categoryModal, setCategoryModal] = useState(false);
  const [wardModal, setWardModal] = useState(false);

  const loadMetadata = useCallback(async () => {
    try {
      const [cats, wardRes] = await Promise.all([
        CategoriesAPI.list(),
        LocationsAPI.wards(),
      ]);
      setCategories(cats.categories);
      setWards(wardRes.wards);
      
      if (cats.categories.length > 0) setSelectedCategory(prev => prev || cats.categories[0]);
      if (wardRes.wards.length > 0) setSelectedWard(prev => prev || wardRes.wards[0]);
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert('Missing details', 'Please add a description before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await ReportsAPI.create({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        category_id: selectedCategory?.id,
        ward_id: selectedWard?.id,
        // Optional: you can extend this to upload the image URI to your backend storage using supabase storage
      });

      Alert.alert('Report submitted', `+${result.xp_awarded} XP awarded`);
      setTitle('');
      setDescription('');
      setImageUri(null);
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
        {imageUri ? (
          <>
            <View style={styles.uploadZoneOuter}>
              <ImageBackground 
                source={{ uri: imageUri }} 
                style={styles.uploadZoneFilled}
                imageStyle={{ borderRadius: 14 }}
              >
                <View style={styles.uploadOverlay} />
                
                <TouchableOpacity style={styles.dismissBtn} onPress={() => setImageUri(null)}>
                  <X size={16} color="#000" />
                </TouchableOpacity>

                <View style={styles.photoAddedPill}>
                  <Camera size={14} color="#fff" />
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

          {/* Category Dropdown */}
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            disabled={!categories.length}
            onPress={() => setCategoryModal(true)}
          >
            <Text style={styles.selectorText}>{selectedCategory?.name ?? 'Select a category'}</Text>
            <ChevronDown size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Ward Dropdown */}
          <Text style={styles.label}>Ward</Text>
          <TouchableOpacity
            style={styles.selectorBtn}
            disabled={!wards.length}
            onPress={() => setWardModal(true)}
          >
            <Text style={styles.selectorText}>{selectedWard?.name ?? 'Select a ward'}</Text>
            <ChevronDown size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={submit} disabled={submitting}>
            <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <BottomModal visible={categoryModal} onClose={() => setCategoryModal(false)} title="Select Category">
        <FlatList
          data={categories}
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
              onPress={() => { setSelectedWard(item); setWardModal(false); }}
            >
              <Text style={styles.listItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  photoAddedText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
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
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 8 },
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
  submitBtn: { marginTop: 24, backgroundColor: '#1a7a4a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
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
