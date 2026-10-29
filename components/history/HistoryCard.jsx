/**
 * CoopIA — HistoryCard
 *
 * Carte d'item de liste pour l'historique des activites agricoles.
 * Pas d'ombre propre — la separation visuelle vient du padding et du fond global.
 *
 * Props :
 *   item         {object}  — Donnees de la conversation/activite
 *   onPress      {func}    — Navigation vers le detail
 *   formatTime   {func}    — Utilitaire de formatage de date
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

// ─── Mapping icone/couleur selon le type d'activite ──────────────────────────
function getIconConfig(titre = '') {
  const t = String(titre || '').toLowerCase();
  if (t.includes('diagnos') || t.includes('maladie') || t.includes('alerte') || t.includes('cabosse') || t.includes('pourriture') || t.includes('shoot') || t.includes('phytophthora')) {
    return { name: 'warning-outline', color: Colors.accent, bg: Colors.accentLight };
  }
  if (t.includes('récolte') || t.includes('recolte') || t.includes('pesée') || t.includes('pesee') || t.includes('déclaration') || t.includes('declaration') || t.includes('sac') || t.includes('kg') || t.includes('cacao') || t.includes('bdr') || t.includes('bordereau')) {
    return { name: 'scale-outline', color: Colors.primary, bg: Colors.primaryLight };
  }
  if (t.includes('météo') || t.includes('meteo') || t.includes('conseil') || t.includes('épandage') || t.includes('epandage') || t.includes('pluie')) {
    return { name: 'sunny-outline', color: '#CA8A04', bg: '#FEF9C3' };
  }
  return { name: 'chatbubble-ellipses-outline', color: Colors.primary, bg: Colors.primaryLight };
}

// ─── Mapping statut -> couleur/dot ────────────────────────────────────────────
function getStatusConfig(statut = '') {
  const s = String(statut || '').toLowerCase();
  if (s.includes('requise') || s.includes('alerte') || s.includes('action')) {
    return { color: Colors.accent, dot: Colors.accent, label: statut || 'Action requise' };
  }
  if (s.includes('valid') || s.includes('termin')) {
    return { color: Colors.success, dot: Colors.success, label: statut || 'Validé' };
  }
  if (s.includes('appliqu') || s.includes('en cours')) {
    return { color: Colors.textMuted, dot: Colors.textMuted, label: statut || 'Appliqué' };
  }
  return { color: Colors.textMuted, dot: Colors.textMuted, label: statut || 'Actif' };
}

export default function HistoryCard({ item, onPress, formatTime }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.975, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,     useNativeDriver: true }).start();

  const title    = item.titre || item.title || 'Activité';
  const subtitle = item.sous_titre || item.subtitle || '';
  const statut   = item.statut || item.status || 'Actif';

  const icon   = getIconConfig(title);
  const status = getStatusConfig(statut);
  const time   = formatTime ? formatTime(item.created_at) : (item.time || '');

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        {/* ── Icone circulaire coloree ── */}
        <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>

        {/* ── Contenu central ── */}
        <View style={styles.body}>
          {/* Ligne titre + horodatage */}
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.time}>{time}</Text>
          </View>

          {/* Sous-titre */}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          ) : null}

          {/* Statut avec dot colore */}
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: status.dot }]} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={16} color={Colors.border} style={{ marginLeft: 4 }} />
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

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  body: { flex: 1, gap: 3 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...Typography.h3,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.textMuted,
    flexShrink: 0,
  },

  subtitle: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.textLight,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
