import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthScreen } from '@/components/AuthScreen';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/providers/auth-provider';

export default function EntryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, profile, isLoading, isProfileLoading, isConfigured } = useAuth();

  if (isLoading || (session && isProfileLoading)) {
    return (
      <View
        style={[
          styles.loading,
          {
            backgroundColor: colors.background,
            paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Restoring your account…
        </Text>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <View style={[styles.config, { backgroundColor: colors.background }]}>
        <Text style={[styles.configTitle, { color: colors.foreground }]}>
          Supabase setup needed
        </Text>
        <Text style={[styles.configCopy, { color: colors.mutedForeground }]}>
          Add SUPABASE_URL and SUPABASE_ANON_KEY in Replit Secrets, then restart ParcelGo.
        </Text>
      </View>
    );
  }

  if (session && profile) return <Redirect href="/(tabs)" />;

  return <AuthScreen completeProfile={Boolean(session && !profile)} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  config: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 9 },
  configTitle: { fontSize: 23, fontFamily: 'Inter_700Bold' },
  configCopy: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
});