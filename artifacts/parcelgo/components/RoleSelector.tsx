import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { UserRole } from '@/types/profile';

const options: {
  value: UserRole;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  {
    value: 'sender',
    title: 'Send a parcel',
    description: 'Book a nearby courier for a delivery.',
    icon: 'package',
  },
  {
    value: 'courier',
    title: 'Deliver parcels',
    description: 'Pick up local deliveries and earn.',
    icon: 'navigation',
  },
];

export function RoleSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}) {
  const colors = useColors();

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? colors.secondary : colors.card,
                borderColor: selected ? colors.primary : colors.border,
                opacity: pressed && !disabled ? 0.78 : 1,
              },
            ]}
            testID={`role-${option.value}`}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: selected ? colors.primary : colors.muted,
                },
              ]}
            >
              <Feather
                name={option.icon}
                size={18}
                color={selected ? colors.primaryForeground : colors.mutedForeground}
              />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {option.title}
              </Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {option.description}
              </Text>
            </View>
            <View
              style={[
                styles.radio,
                { borderColor: selected ? colors.primary : colors.border },
              ]}
            >
              {selected ? (
                <View
                  style={[styles.radioDot, { backgroundColor: colors.primary }]}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  option: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  description: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
});