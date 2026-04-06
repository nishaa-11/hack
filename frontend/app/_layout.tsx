import 'react-native-url-polyfill/auto';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { session, loading, signOut } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/auth');
    } else {
      router.replace('/(tabs)');
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a7a4a" />
        <Text style={styles.loadingText}>Initializing CivicPulse...</Text>
        <TouchableOpacity style={styles.forceLogout} onPress={signOut}>
          <Text style={styles.forceLogoutText}>Stuck? Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="auth"    options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal"  options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  forceLogout: {
    marginTop: 40,
    padding: 10,
  },
  forceLogoutText: {
    color: '#1a7a4a',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
