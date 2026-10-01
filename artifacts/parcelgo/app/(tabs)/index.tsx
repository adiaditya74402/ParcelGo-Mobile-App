import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParcelSummaryCard } from '@/components/ParcelSummaryCard';
import { useColors } from '@/hooks/useColors';
import { getSenderParcel } from '@/lib/orders';
import { useAuth } from '@/providers/auth-provider';
import type { SenderParcelDashboard } from '@/types/orders';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, profile, isLoading, isProfileLoading } = useAuth();
  const [parcel, setParcel] = useState<SenderParcelDashboard | null>(null);
  const [parcelLoading, setParcelLoading] = useState(true);
  const [parcelError, setParcelError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (isLoading || isProfileLoading) return;
      if (!session || profile?.role !== 'sender') {
        setParcel(null);
        setParcelLoading(false);
        setParcelError(null);
        return;
      }

      let active = true;
      setParcelLoading(true);
      setParcelError(null);
      void getSenderParcel(session.user.id)
        .then((result) => {
          if (active) setParcel(result);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setParcel(null);
          setParcelError(
            error instanceof Error
              ? error.message
              : 'Could not load your parcel. Please try again.',
          );
        })
        .finally(() => {
          if (active) setParcelLoading(false);
        });

      return () => {
        active = false;
      };
    }, [isLoading, isProfileLoading, profile?.role, reloadKey, session?.user.id]),
  );

  if (!isLoading && session && !isProfileLoading && !profile) {
    return <Redirect href="/" />;
  }

  const isCourier = profile?.role === 'courier';
  const firstName = profile?.name?.split(' ')[0];
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
          LOCAL DELIVERY
        </Text>
        <Text style={[styles.greetingTitle, { color: colors.foreground }]}>
          {isCourier ? 'Your courier home.' : firstName ? `Hey, ${firstName}.` : 'Your parcels.'}
        </Text>
        <Text style={[styles.greetingCopy, { color: colors.mutedForeground }]}>
          {isCourier
            ? 'Courier availability and nearby delivery requests will appear here.'
            : parcel?.order
              ? 'Here are the details of your parcel request.'
              : 'Create one parcel request for this account.'}
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
            {isCourier ? 'COURIER ACCOUNT' : 'PARCELGO SENDER'}
          </Text>
        </View>
        <Text style={styles.cardTitle}>
          {isCourier
            ? 'Good deliveries start close to home.'
            : parcel?.order
              ? 'Your parcel request'
              : 'Send something across town.'}
        </Text>
        <Text style={styles.cardCopy}>
          {isCourier
            ? 'Courier tools will be available here in a later update.'
            : parcel?.order
              ? 'Pickup, destination, offer, and current status are below.'
              : 'Add pickup, destination, and delivery details to get started.'}
        </Text>
        <View style={styles.cardBottom}>
          <View style={styles.cardRule} />
          <Text style={styles.cardFoot}>
            {isCourier ? 'COURIER' : 'ONE PARCEL PER ACCOUNT'}
          </Text>
        </View>
        <View style={styles.decorCircle} />
      </View>

      {!isCourier ? (
        parcelLoading ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>
              Loading your parcel…
            </Text>
          </View>
        ) : parcelError ? (
          <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-circle" size={18} color={colors.destructive} />
            <Text style={[styles.stateText, styles.errorCopy, { color: colors.destructive }]}>
              Could not load your parcel. Check your connection and try again.
            </Text>
            <Pressable
              accessibilityRole="button"
              testID="home-retry-parcel"
              onPress={() => setReloadKey((key) => key + 1)}
              style={[styles.retryButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </Pressable>
          </View>
        ) : parcel?.order ? (
          <ParcelSummaryCard order={parcel.order} photoUrl={parcel.photoUrl} />
        ) : (
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
                One parcel request per account
              </Text>
            </View>
            <Feather name="arrow-up-right" size={19} color={colors.primaryForeground} />
          </Pressable>
        )
      ) : null}
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
  stateCard: { minHeight: 70, borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stateText: { flex: 1, fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  errorCopy: { flex: 1 },
  retryButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  retryText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
});