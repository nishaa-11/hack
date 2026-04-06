import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Leaf, Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]           = useState<Mode>('signin');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { Alert.alert('Please fill in all fields'); return; }
    if (mode === 'signup' && !name) { Alert.alert('Please enter your name'); return; }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim());
        Alert.alert('Account created!', 'Check your email to confirm your account.');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#a8d5ba', '#e6f4ea', '#f4f9f6']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIconWrap}>
            <Leaf size={36} color="#1a7a4a" />
          </View>
          <Text style={styles.logoText}>CivicPulse</Text>
          <Text style={styles.tagline}>Gamified civic action for Bengaluru</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tab Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signin' && styles.modeBtnActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.modeBtnText, mode === 'signin' && styles.modeBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.modeBtnText, mode === 'signup' && styles.modeBtnTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Name (signup only) */}
          {mode === 'signup' && (
            <View style={styles.inputWrap}>
              <User size={18} color="#1a7a4a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#A0A0A0"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.inputWrap}>
            <Mail size={18} color="#1a7a4a" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Lock size={18} color="#1a7a4a" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{ padding: 4 }}>
              {showPass
                ? <EyeOff size={18} color="#888" />
                : <Eye size={18} color="#888" />}
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <LinearGradient
              colors={['#1a7a4a', '#22a05a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.submitText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.footerLink} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1a7a4a', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#1a7a4a', marginBottom: 4 },
  tagline: { fontSize: 14, color: '#666', textAlign: 'center' },
  card: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  modeToggle: {
    flexDirection: 'row', backgroundColor: '#F0F8F4',
    borderRadius: 12, padding: 4, marginBottom: 24,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: '#1a7a4a' },
  modeBtnText: { fontSize: 14, fontWeight: 'bold', color: '#1a7a4a' },
  modeBtnTextActive: { color: '#FFF' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FA', borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E0E0',
    paddingHorizontal: 12, marginBottom: 12, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  submitBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  submitGradient: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  footerText: { textAlign: 'center', fontSize: 13, color: '#666' },
  footerLink: { color: '#1a7a4a', fontWeight: 'bold' },
});
