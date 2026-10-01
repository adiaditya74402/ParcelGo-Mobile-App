import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoleSelector } from '@/components/RoleSelector';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/providers/auth-provider';
import type { UserRole } from '@/types/profile';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, profile, updateRole, signOut, authError, clearAuthError } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(profile?.role ?? 'sender');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const changeRole = async (role: UserRole) => {
    setSelectedRole(role);
    setMessage(null);
    clearAuthError();
    if (!profile || role === profile.role) return;
    setSaving(true);
    try {
      await updateRole(role);
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      setMessage(`You’re now using ParcelGo as a ${role}.`);
    } catch {
      setSelectedRole(profile.role);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setMessage(null);
    clearAuthError();
    try {
      await signOut();
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 18, paddingBottom: Platform.OS === 'web' ? 110 : 36 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.kicker, { color: colors.mutedForeground }]}>YOUR ACCOUNT</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Your details and how you use ParcelGo.
      </Text>

      <View style={[styles.identityCard, { backgroundColor: colors.primary }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.accentForeground }]}>
            {(profile?.name?.trim()[0] ?? session?.user.email?.[0] ?? 'P').toUpperCase()}
          </Text>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{profile?.name ?? 'ParcelGo member'}</Text>
          <Text style={styles.email}>{session?.user.email ?? ''}</Text>
        </View>
        <Feather name="check-circle" size={18} color="#D5E3D8" />
      </View>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Using ParcelGo as</Text>
        {saving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>
      <Text style={[styles.helper, { color: colors.mutedForeground }]}>
        Change your role whenever you need. Your account stays the same.
      </Text>
      <RoleSelector
        value={selectedRole}
        onChange={(role) => void changeRole(role)}
        disabled={saving}
      />

      {profile?.phone ? (
        <View style={[styles.detailRow, { borderColor: colors.border }]}>
          <Feather name="phone" size={16} color={colors.mutedForeground} />
          <View style={styles.detailCopy}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Phone</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{profile.phone}</Text>
          </View>
          <Feather name="check" size={16} color={colors.primary} />
        </View>
      ) : null}

      {message || authError ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.message,
            { backgroundColor: authError ? colors.destructive + '18' : colors.secondary },
          ]}
        >
          <Feather
            name={authError ? 'alert-circle' : 'check-circle'}
            size={16}
            color={authError ? colors.destructive : colors.primary}
          />
          <Text
            style={[
              styles.messageText,
              { color: authError ? colors.destructive : colors.primary },
            ]}
          >
            {authError ?? message}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={signingOut}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [
          styles.signOut,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
            opacity: signingOut ? 0.7 : pressed ? 0.75 : 1,
          },
        ]}
        testID="sign-out"
      >
        {signingOut ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="log-out" size={17} color={colors.destructive} />
        )}
        <Text style={[styles.signOutText, { color: colors.destructive }]}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Text>
      </Pressable>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        ParcelGo · Account settings
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 21, gap: 12, maxWidth: 600, width: '100%', alignSelf: 'center' },
  kicker: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.4 },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.8, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, lineHeight: 18, marginBottom: 8, fontFamily: 'Inter_400Regular' },
  identityCard: { minHeight: 82, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  identityCopy: { flex: 1, gap: 4 },
  name: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  email: { color: '#D5E3D8', fontSize: 10, fontFamily: 'Inter_400Regular' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  helper: { fontSize: 11, lineHeight: 16, marginTop: -7, marginBottom: 2, fontFamily: 'Inter_400Regular' },
  detailRow: { minHeight: 62, borderBottomWidth: 1, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 5 },
  detailCopy: { flex: 1, gap: 3 },
  detailLabel: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  detailValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  message: { borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  messageText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  signOut: { minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 7 },
  signOutText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  footer: { textAlign: 'center', fontSize: 9, marginTop: 10, fontFamily: 'Inter_400Regular' },
});