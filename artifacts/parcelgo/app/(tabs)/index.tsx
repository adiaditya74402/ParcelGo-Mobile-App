import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile, isLoading, isProfileLoading } = useAuth();

  if (!isLoading && session && !isProfileLoading && !profile) {
    return <Redirect href="/" />;
  }

  const isCourier = profile?.role === 'courier';
  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 14, paddingBottom: Platform.OS === 'web' ? 110 : 34 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
          <Text style={[styles.brandText, { color: colors.foreground }]}>ParcelGo</Text>
        </View>
        <View style={[styles.rolePill, { backgroundColor: colors.secondary }]}>
          <View style={[styles.roleDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.roleText, { color: colors.primary }]}>
            {isCourier ? 'COURIER' : 'SENDER'}
          </Text>
        </View>
      </View>

      <View style={styles.greeting}>
        <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
          YOUR LOCAL DELIVERY ACCOUNT
        </Text>
        <Text style={[styles.greetingTitle, { color: colors.foreground }]}>
          {profile?.name ? `Hey, ${profile.name.split(' ')[0]}.` : 'Welcome to ParcelGo.'}
        </Text>
        <Text style={[styles.greetingCopy, { color: colors.mutedForeground }]}>
          {isCourier
            ? 'Your courier profile is ready. You’ll see nearby delivery requests in the next step.'
            : 'Your sender profile is ready. Create a parcel request and choose where it needs to go.'}
        </Text>
      </View>

      <View style={[styles.mainCard, { backgroundColor: colors.primary }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardIcon}>
            <Feather
              name={isCourier ? 'navigation' : 'package'}
              size={21}
              color={colors.accentForeground}
            />
          </View>
          <Text style={styles.cardOverline}>
            {isCourier ? 'COURIER PROFILE' : 'SENDER PROFILE'}
          </Text>
        </View>
        <Text style={styles.cardTitle}>
          {isCourier ? 'Good deliveries start close to home.' : 'A little closer to getting it there.'}
        </Text>
        <Text style={styles.cardCopy}>
          {isCourier
            ? 'Next: set your availability and discover parcels picked up near you.'
            : 'Add pickup, destination, parcel details, and your offer.'}
        </Text>
        <View style={styles.cardBottom}>
          <View style={styles.cardRule} />
          <Text style={styles.cardFoot}>ACCOUNT SETUP COMPLETE</Text>
        </View>
        <View style={styles.decorCircle} />
      </View>

      {!isCourier ? (
        <Pressable
          accessibilityRole="button"
          testID="home-create-parcel"
          onPress={() => router.push('/create-order')}
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <View style={[styles.createButtonIcon, { backgroundColor: colors.primaryForeground }]}>
            <Feather name="plus" size={18} color={colors.primary} />
          </View>
          <View style={styles.createButtonCopy}>
            <Text style={[styles.createButtonTitle, { color: colors.primaryForeground }]}>
              Add a parcel
            </Text>
            <Text style={[styles.createButtonSubTitle, { color: colors.primaryForeground }]}>
              Set pickup, drop-off and delivery details
            </Text>
          </View>
          <Feather name="arrow-up-right" size={19} color={colors.primaryForeground} />
        </Pressable>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your account</Text>
        <Text style={[styles.sectionTag, { color: colors.mutedForeground }]}>02 / 04</Text>
      </View>
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: 'Account created', icon: 'check' as const, complete: true },
          { label: 'Role selected', icon: isCourier ? 'navigation' as const : 'package' as const, complete: true },
          { label: isCourier ? 'Go online' : 'Add a parcel', icon: 'circle' as const, complete: false },
          { label: 'Complete a delivery', icon: 'circle' as const, complete: false },
        ].map((item, index) => {
          const canCreateParcel = !isCourier && item.label === 'Add a parcel';
          return (
          <Pressable
            key={item.label}
            accessibilityRole={canCreateParcel ? 'button' : undefined}
            testID={canCreateParcel ? 'home-progress-add-parcel' : undefined}
            disabled={!canCreateParcel}
            onPress={() => router.push('/create-order')}
            style={({ pressed }) => [styles.progressRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              style={[
                styles.progressIcon,
                {
                  backgroundColor: item.complete ? colors.secondary : colors.background,
                  borderColor: item.complete ? colors.secondary : colors.border,
                },
              ]}
            >
              <Feather
                name={item.icon}
                size={13}
                color={item.complete ? colors.primary : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.progressLabel,
                { color: item.complete ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {item.label}
            </Text>
            {item.complete ? (
              <Text style={[styles.doneLabel, { color: colors.primary }]}>DONE</Text>
            ) : null}
            {index < 3 ? (
              <View style={[styles.connector, { backgroundColor: colors.border }]} />
            ) : null}
          </Pressable>
          );
        })}
      </View>

      <View style={[styles.tip, { backgroundColor: colors.accent }]}>
        <Feather name="refresh-cw" size={16} color={colors.accentForeground} />
        <Text style={[styles.tipText, { color: colors.accentForeground }]}>
          You can switch between sender and courier from your Profile at any time.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 21, gap: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 31, height: 31, borderRadius: 10 },
  brandText: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  rolePill: { borderRadius: 18, paddingVertical: 7, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleText: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 1.1 },
  greeting: { gap: 6, marginTop: 12 },
  kicker: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.3 },
  greetingTitle: { fontSize: 28, lineHeight: 35, letterSpacing: -0.8, fontFamily: 'Inter_700Bold' },
  greetingCopy: { fontSize: 12, lineHeight: 18, maxWidth: 330, fontFamily: 'Inter_400Regular' },
  mainCard: { borderRadius: 23, padding: 20, minHeight: 222, overflow: 'hidden', justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 1 },
  cardIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9A363' },
  cardOverline: { color: '#D5E3D8', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  cardTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 28, letterSpacing: -0.6, maxWidth: 320, marginTop: 18, fontFamily: 'Inter_700Bold', zIndex: 1 },
  cardCopy: { color: '#D5E3D8', fontSize: 11, lineHeight: 17, maxWidth: 325, marginTop: 7, fontFamily: 'Inter_400Regular', zIndex: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 19, zIndex: 1 },
  cardRule: { width: 18, height: 2, borderRadius: 2, backgroundColor: '#E9A363' },
  cardFoot: { color: '#D5E3D8', fontSize: 8, letterSpacing: 1.1, fontFamily: 'Inter_600SemiBold' },
  decorCircle: { position: 'absolute', width: 150, height: 150, borderRadius: 90, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', right: -69, top: 32 },
  createButton: { minHeight: 70, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  createButtonIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  createButtonCopy: { flex: 1, gap: 4 },
  createButtonTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  createButtonSubTitle: { fontSize: 10, opacity: 0.82, fontFamily: 'Inter_500Medium' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  sectionTag: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  progressCard: { borderWidth: 1, borderRadius: 17, padding: 14, gap: 0 },
  progressRow: { minHeight: 41, flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative' },
  progressIcon: { width: 25, height: 25, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  progressLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1 },
  doneLabel: { fontSize: 8, letterSpacing: 0.7, fontFamily: 'Inter_700Bold' },
  connector: { position: 'absolute', left: 12, top: 31, width: 1, height: 15 },
  tip: { borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  tipText: { flex: 1, fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium' },
});