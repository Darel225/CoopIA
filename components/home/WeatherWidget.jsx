/**
 * CoopIA — WeatherWidget
 *
 * Widget météo agricole dynamique avec fond Forest Green plein.
 * Affiche température, condition, icône dynamique, et alerte pluie avec conseil agronomique.
 *
 * Props :
 *   temperature  {string}  — "29°C"
 *   condition    {string}  — "Ensoleillé voilé"
 *   alert        {string}  — Texte d'alerte pluie (partie 1, normale)
 *   advice       {string}  — Conseil agricole (partie 2, surlignée/blanche)
 *   iconName     {string}  — Ionicons icon name
 *   locality     {string}  — Nom du village ou de la parcelle
 *   loading      {boolean} — Indicateur de chargement
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

// Teintes internes dérivées du vert primaire
const ICON_BOX_BG  = 'rgba(255,255,255,0.15)'; // Fond carré icône
const DIVIDER_CLR  = 'rgba(255,255,255,0.15)'; // Ligne séparatrice subtile
const TEXT_MUTED   = 'rgba(255,255,255,0.70)'; // Texte secondaire sur fond vert

export default function WeatherWidget({
  temperature = '29°C',
  condition   = 'Ensoleillé voilé',
  alert       = 'Temps sec et stable •',
  advice      = "Conditions favorables pour les récoltes et soins",
  iconName    = 'partly-sunny-outline',
  locality    = null,
  loading     = false,
}) {
  return (
    <View style={styles.card}>
      {/* ── Ligne 1 : Label ──────────────────────────────────── */}
      <View style={styles.labelRow}>
        <Text style={styles.widgetLabel}>
          MÉTÉO AGRICOLE{locality ? ` • ${locality.toUpperCase()}` : ''}
        </Text>
        {loading && (
          <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={styles.loader} />
        )}
      </View>

      {/* ── Ligne 2 : Temp + Condition + Icône ───────────────── */}
      <View style={styles.mainRow}>
        <View style={styles.tempBlock}>
          <Text style={styles.temperature}>{temperature}</Text>
          <Text style={styles.condition}>{condition}</Text>
        </View>
        <View style={styles.iconBox}>
          <Ionicons name={iconName || 'partly-sunny-outline'} size={28} color={Colors.white} />
        </View>
      </View>

      {/* ── Séparateur ───────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Ligne 3 : Alerte pluie ───────────────────────────── */}
      <View style={styles.alertRow}>
        <View style={styles.dropIcon}>
          <Ionicons
            name={
              alert && (alert.includes('Ensoleill') || alert.includes('chaud') || alert.includes('sec'))
                ? 'sunny'
                : alert && alert.includes('Vent')
                ? 'speedometer-outline'
                : iconName && iconName.includes('rain')
                ? 'rainy'
                : iconName && iconName.includes('thunder')
                ? 'thunderstorm'
                : 'leaf-outline'
            }
            size={14}
            color={Colors.white}
          />
        </View>
        <Text style={styles.alertText} numberOfLines={3}>
          <Text style={styles.alertNormal}>{alert} </Text>
          <Text style={styles.alertAdvice}>{advice}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 18,
    paddingTop: 16,
  },

  // ─── Label MÉTÉO AGRICOLE ─────────────────────────────────────────────────
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  widgetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  loader: {
    transform: [{ scale: 0.8 }],
  },

  // ─── Ligne principale ─────────────────────────────────────────────────────
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tempBlock: {
    flex: 1,
  },
  temperature: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1,
    lineHeight: 54,
  },
  condition: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Carré icône soleil
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ICON_BOX_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Séparateur ─────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: DIVIDER_CLR,
    marginBottom: 12,
  },

  // ─── Ligne alerte ─────────────────────────────────────────
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dropIcon: {
    marginTop: 1,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  alertNormal: {
    color: TEXT_MUTED,
    fontWeight: '400',
  },
  alertAdvice: {
    color: Colors.white,
    fontWeight: '700',
  },
});