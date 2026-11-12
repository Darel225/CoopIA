/**
 Ce composant dessine une ligne dans la page Profil pour un réglage ou une action.
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

export default function SettingsRow({
  icon,
  iconBgColor    = Colors.primaryLight,
  iconColor      = Colors.primary,
  subtitle       = null,
  title,
  onPress,
  isDestructive  = false,
  hideDivider    = false,
  hideChevron    = false,
  rightNode      = null,
}) {
  //Le petit effet au toucher
  const scale    = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.975, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,     useNativeDriver: true }).start();
  //Le style des actions sensibles
  const resolvedIconColor  = isDestructive ? Colors.error : iconColor;
  const resolvedIconBg     = isDestructive ? '#FFF0EE'    : iconBgColor;
  const resolvedTitleColor = isDestructive ? Colors.error : Colors.text;
  const resolvedChevronClr = isDestructive ? Colors.error : Colors.textMuted;

  return (
    <Animated.View style={{ transform: [{ scale: onPress ? scale : 1 }] }}>
      <TouchableOpacity
        style={[styles.row, !hideDivider && styles.rowBorder]}
        onPress={onPress}
        disabled={!onPress}
        onPressIn={onPress ? pressIn : undefined}
        onPressOut={onPress ? pressOut : undefined}
        activeOpacity={onPress ? 0.8 : 1}
      >
        {/* ── Icône arrondie ── */}
        <View style={[styles.iconBox, { backgroundColor: resolvedIconBg }]}>
          <Ionicons name={icon} size={20} color={resolvedIconColor} />
        </View>

        {/* ── Texte empilé : subtitle (gris) + title (bold) ── */}
        <View style={styles.body}>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
          <Text
            style={[styles.title, { color: resolvedTitleColor }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* ── Droite ── */}
        {rightNode ? rightNode : !hideChevron && onPress ? (
          <Ionicons name="chevron-forward" size={16} color={resolvedChevronClr} />
        ) : !hideChevron && !onPress ? (
          null
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  // Bordure basse — masquée sur le dernier item via hideDivider
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  body: { flex: 1, gap: 1 },

  subtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textMuted,
    lineHeight: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
