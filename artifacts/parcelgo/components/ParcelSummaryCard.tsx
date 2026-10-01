import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { ParcelOrderSummary } from '@/types/orders';

const SIZE_LABELS: Record<ParcelOrderSummary['package_size'], string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

const STATUS_LABELS: Record<ParcelOrderSummary['status'], string> = {
  pending: 'Finding a courier',
  accepted: 'Courier assigned',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function formatPrice(price: number | string) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return 'Offer unavailable';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function ParcelSummaryCard({
  order,
  photoUrl,
}: {
  order: ParcelOrderSummary;
  photoUrl: string | null;
}) {
  const colors = useColors();

  return (
    <View
      accessibilityLabel={`Your parcel, ${order.title}. Pickup: ${order.pickup_address}. Destination: ${order.destination_address}.`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.heading}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photoFallback, { backgroundColor: colors.secondary }]}>
            <Feather name="package" size={22} color={colors.primary} />
          </View>
        )}
        <View style={styles.titleCopy}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>YOUR PARCEL</Text>
          <Text numberOfLines={2} style={[styles.title, { color: colors.foreground }]}>
            {order.title}
          </Text>
        </View>
        <Feather name="check-circle" size={18} color={colors.primary} />
      </View>

      <View style={[styles.route, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <View style={styles.routeIcons}>
          <Feather name="circle" size={12} color={colors.primary} />
          <View style={[styles.routeConnector, { backgroundColor: colors.border }]} />
          <Feather name="map-pin" size={14} color={colors.accentForeground} />
        </View>
        <View style={styles.routeCopy}>
          <View style={styles.addressBlock}>
            <Text style={[styles.addressLabel, { color: colors.mutedForeground }]}>PICKUP</Text>
            <Text numberOfLines={2} style={[styles.address, { color: colors.foreground }]}>
              {order.pickup_address}
            </Text>
          </View>
          <View style={styles.addressBlock}>
            <Text style={[styles.addressLabel, { color: colors.mutedForeground }]}>DESTINATION</Text>
            <Text numberOfLines={2} style={[styles.address, { color: colors.foreground }]}>
              {order.destination_address}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={[styles.offer, { color: colors.foreground }]}>
            {formatPrice(order.offered_price)}
          </Text>
          <Text style={[styles.size, { color: colors.mutedForeground }]}>
            {SIZE_LABELS[order.package_size]} parcel
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 19, padding: 15, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  photo: { width: 54, height: 54, borderRadius: 14, backgroundColor: '#DDE9E2' },
  photoFallback: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleCopy: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 8, letterSpacing: 1.1, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 14, lineHeight: 18, fontFamily: 'Inter_700Bold' },
  route: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, flexDirection: 'row', gap: 12 },
  routeIcons: { alignItems: 'center', paddingTop: 3 },
  routeConnector: { width: 1, flex: 1, minHeight: 17, marginVertical: 3 },
  routeCopy: { flex: 1, gap: 10 },
  addressBlock: { gap: 3 },
  addressLabel: { fontSize: 8, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },
  address: { fontSize: 11, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  offer: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  size: { fontSize: 9, marginTop: 3, fontFamily: 'Inter_400Regular' },
  statusPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  statusText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
});