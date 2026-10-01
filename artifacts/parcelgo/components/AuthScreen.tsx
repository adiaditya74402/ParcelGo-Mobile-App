import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { RoleSelector } from '@/components/RoleSelector';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/providers/auth-provider';
import type { UserRole } from '@/types/profile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthMode = 'sign-in' | 'sign-up';

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  ...props
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'name' | 'tel' | 'email' | 'current-password' | 'new-password';
  textContentType?: 'name' | 'telephoneNumber' | 'emailAddress' | 'password' | 'newPassword';
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Feather name={icon} size={17} color={colors.mutedForeground} />
        <TextInput
          accessibilityLabel={label}
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="next"
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.foreground }]}
          testID={`input-${label.toLowerCase().replaceAll(' ', '-')}`}
          value={value}
          {...props}
        />
      </View>
    </View>
  );
}

export function AuthScreen({ completeProfile = false }: { completeProfile?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    session,
    profileIssue,
    authError,
    signIn,
    signUp,
    saveProfile,
    retryProfile,
    clearAuthError,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('sender');
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'sign-up' && !completeProfile;

  const setModeAndClear = (nextMode: AuthMode) => {
    setMode(nextMode);
    setNotice(null);
    clearAuthError();
  };

  const submit = async () => {
    clearAuthError();
    setNotice(null);
    if (isSignUp || completeProfile) {
      if (name.trim().length < 2) {
        setNotice('Enter your name to continue.');
        return;
      }
      if (!completeProfile && phone.trim().length < 7) {
        setNotice('Enter a valid phone number.');
        return;
      }
    }
    if (!completeProfile && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNotice('Enter a valid email address.');
      return;
    }
    if (!completeProfile && password.length < 8) {
      setNotice('Your password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (completeProfile && session) {
        await saveProfile({ name, phone, role });
      } else if (isSignUp) {
        const hasSession = await signUp({ name, phone, role }, email, password);
        if (!hasSession) {
          setNotice('Your account is ready. Confirm your email, then sign in.');
          setMode('sign-in');
          setPassword('');
        }
      } else {
        await signIn(email, password);
      }
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom + 20;
  const title = completeProfile
    ? 'One last step'
    : isSignUp
      ? 'Create your account'
      : 'Welcome back';

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 12, paddingBottom: bottomPadding },
      ]}
      bottomOffset={26}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <Image source={require('../assets/images/icon.png')} style={styles.brandIcon} />
        <Text style={[styles.brandName, { color: colors.foreground }]}>ParcelGo</Text>
        <View style={styles.brandPill}>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.brandPillText, { color: colors.primary }]}>LOCAL DELIVERY</Text>
        </View>
      </View>

      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroArt} pointerEvents="none">
          <View style={[styles.orbit, { borderColor: 'rgba(255,255,255,0.16)' }]} />
          <View style={[styles.orbitInner, { borderColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={[styles.heroPin, { backgroundColor: colors.accent }]}>
            <Feather name="map-pin" size={22} color={colors.accentForeground} />
          </View>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>DELIVERY, AROUND YOU</Text>
          <Text style={styles.heroTitle}>Good things{'\n'}are on the way.</Text>
          <Text style={styles.heroDescription}>
            Send something across town, or be the person who gets it there.
          </Text>
        </View>
        <View style={styles.heroFoot}>
          <View style={styles.heroLine} />
          <Text style={styles.heroFootText}>NEARBY PEOPLE. REAL DELIVERIES.</Text>
        </View>
      </View>

      <View style={styles.formHeader}>
        <View style={styles.formHeading}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.formSubtitle, { color: colors.mutedForeground }]}>
            {completeProfile
              ? 'Add your details and choose how you want to use ParcelGo.'
              : isSignUp
                ? 'Choose your path. You can switch roles anytime.'
                : 'Sign in to pick up where you left off.'}
          </Text>
        </View>
        {!completeProfile ? (
          <View style={[styles.modeSwitch, { backgroundColor: colors.muted }]}>
            {(['sign-in', 'sign-up'] as const).map((item) => {
              const selected = mode === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setModeAndClear(item)}
                  style={[
                    styles.modeButton,
                    selected && { backgroundColor: colors.card },
                  ]}
                  testID={`auth-mode-${item}`}
                >
                  <Text
                    style={[
                      styles.modeText,
                      { color: selected ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {item === 'sign-in' ? 'Sign in' : 'Join'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {profileIssue && completeProfile ? (
        <View style={[styles.issueBox, { backgroundColor: colors.accent }]}>
          <Feather name="alert-circle" size={16} color={colors.accentForeground} />
          <Text style={[styles.issueText, { color: colors.accentForeground }]}>
            {profileIssue.includes('profiles') || profileIssue.includes('schema')
              ? 'Your profile table is not ready yet. Run the SQL migration in README.md.'
              : profileIssue}
          </Text>
          <Pressable onPress={() => void retryProfile()} hitSlop={8}>
            <Text style={[styles.retryText, { color: colors.accentForeground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {(isSignUp || completeProfile) ? (
        <FormField
          label="Full name"
          icon="user"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
        />
      ) : null}
      {(isSignUp || completeProfile) ? (
        <FormField
          label="Phone number"
          icon="phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      ) : null}
      {!completeProfile ? (
        <FormField
          label="Email"
          icon="mail"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
      ) : null}
      {!completeProfile ? (
        <FormField
          label="Password"
          icon="lock"
          value={password}
          onChangeText={setPassword}
          placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          textContentType={isSignUp ? 'newPassword' : 'password'}
        />
      ) : null}

      {(isSignUp || completeProfile) ? (
        <View style={styles.roleBlock}>
          <View style={styles.roleHeading}>
            <Text style={[styles.label, { color: colors.foreground }]}>I want to</Text>
            <Text style={[styles.optional, { color: colors.mutedForeground }]}>
              CHANGE LATER
            </Text>
          </View>
          <RoleSelector value={role} onChange={setRole} disabled={submitting} />
        </View>
      ) : null}

      {authError || notice ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.messageBox,
            {
              backgroundColor: authError
                ? colors.destructive + '18'
                : colors.secondary,
            },
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
            {authError ?? notice}
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => void submit()}
        style={({ pressed }) => [
          styles.submitButton,
          {
            backgroundColor: colors.primary,
            opacity: submitting ? 0.68 : pressed ? 0.88 : 1,
          },
        ]}
        testID="auth-submit"
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
              {completeProfile
                ? 'Save my profile'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </>
        )}
      </Pressable>

      {!completeProfile ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setModeAndClear(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          style={styles.modeHint}
        >
          <Text style={[styles.modeHintText, { color: colors.mutedForeground }]}>
            {isSignUp ? 'Already have an account?' : 'New to ParcelGo?'}
          </Text>
          <Text style={[styles.modeHintLink, { color: colors.primary }]}>
            {isSignUp ? 'Sign in' : 'Create an account'}
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.legal, { color: colors.mutedForeground }]}>
        By continuing, you agree to use ParcelGo responsibly and keep delivery details accurate.
      </Text>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    gap: 16,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: { width: 30, height: 30, borderRadius: 9 },
  brandName: { fontSize: 17, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  brandPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(30,96,75,0.08)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  brandPillText: { fontSize: 8, letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  hero: {
    minHeight: 221,
    borderRadius: 23,
    overflow: 'hidden',
    padding: 22,
    justifyContent: 'space-between',
  },
  heroCopy: { maxWidth: 255, zIndex: 1 },
  eyebrow: {
    color: '#C3D4C9',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 35,
    letterSpacing: -1.1,
    fontFamily: 'Inter_700Bold',
  },
  heroDescription: {
    color: '#D6E3DA',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 230,
    fontFamily: 'Inter_400Regular',
  },
  heroArt: {
    position: 'absolute',
    width: 170,
    height: 170,
    right: -28,
    top: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    position: 'absolute',
    width: 151,
    height: 151,
    borderWidth: 1,
    borderRadius: 90,
  },
  orbitInner: {
    position: 'absolute',
    width: 111,
    height: 111,
    borderWidth: 1,
    borderRadius: 60,
  },
  heroPin: {
    width: 54,
    height: 54,
    borderRadius: 20,
    transform: [{ rotate: '-8deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16 },
  heroLine: { width: 20, height: 2, backgroundColor: '#E9A363', borderRadius: 1 },
  heroFootText: {
    color: '#CAD8CE',
    fontSize: 8,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
  },
  formHeader: { gap: 12, marginTop: 2 },
  formHeading: { gap: 4 },
  formTitle: { fontSize: 24, lineHeight: 29, letterSpacing: -0.6, fontFamily: 'Inter_700Bold' },
  formSubtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  modeSwitch: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 2,
  },
  modeButton: { minWidth: 76, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9 },
  modeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  field: { gap: 6 },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  inputShell: {
    minHeight: 49,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    minHeight: 46,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 9,
  },
  roleBlock: { gap: 9 },
  roleHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optional: { fontSize: 8, letterSpacing: 0.9, fontFamily: 'Inter_600SemiBold' },
  messageBox: {
    borderRadius: 12,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  messageText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  issueBox: {
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueText: { flex: 1, fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  retryText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  submitButton: {
    minHeight: 51,
    borderRadius: 15,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  submitText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  modeHint: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 4 },
  modeHintText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  modeHintLink: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  legal: {
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 'auto',
    paddingTop: 4,
    fontFamily: 'Inter_400Regular',
  },
});