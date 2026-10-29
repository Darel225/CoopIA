/**
 * CoopIA — ActionCard
 *
 * Carte d'action rapide. Icône colorée à gauche, titre + sous-titre, chevron droite.
 *
 * Props :
 *   iconName    {string}  — Nom Ionicons (ex: "scale-outline")
 *   iconBgColor {string}  — Fond du cercle d'icône (ex: Colors.primaryLight)
 *   iconColor   {string}  — Couleur de l'icône elle-même
 *   title       {string}  — Titre principal
 *   subtitle    {string}  — Description courte
 *   onPress     {func}    — Action au tap
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

export default function ActionCard({
  iconName,
  iconBgColor = Colors.primaryLight,
  iconColor   = Colors.primary,
  title,
  subtitle,
  onPress,
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      {/* Icône dans un cercle coloré */}
      <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName} size={24} color={iconColor} />
      </View>

      {/* Texte */}
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  textBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...Typography.h3,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.bodySmall,
    fontSize: 12,
  },
});
