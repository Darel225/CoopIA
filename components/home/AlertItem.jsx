/**
 * CoopIA — AlertItem
 *
 * Carte d'alerte ou d'activité agricole.
 * Cliquable pour ouvrir directement la session de diagnostic/chat correspondante.
 * Ligne du haut : icône + titre/sous-titre + timestamp.
 * Ligne du bas : pill de statut (optionnelle) + lien d'action.
 *
 * Props :
 *   iconName      {string}   — Ionicons icon
 *   iconBgColor   {string}   — Fond du badge icône
 *   iconColor     {string}   — Couleur de l'icône
 *   title         {string}   — Titre de l'alerte
 *   subtitle      {string}   — Description
 *   timestamp     {string}   — "Il y a 2h" | "Hier"
 *   statusLabel   {string}   — Texte du pill de statut (null = masqué)
 *   statusColor   {string}   — Couleur du texte du pill
 *   statusBg      {string}   — Fond du pill
 *   actionLabel   {string}   — Texte du lien d'action (null = masqué)
 *   onAction      {func}     — Callback d'ouverture de session
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

export default function AlertItem({
  iconName,
  iconBgColor = Colors.accentLight,
  iconColor   = Colors.accent,
  title,
  subtitle,
  timestamp,
  statusLabel = null,
  statusColor = Colors.error,
  statusBg    = `${Colors.error}18`,
  actionLabel = null,
  onAction,
}) {
  const hasFooter = statusLabel || actionLabel;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onAction}
      activeOpacity={onAction ? 0.85 : 1}
      disabled={!onAction}
    >
      {/* ── Ligne principale ────────────────────────────────────────── */}
      <View style={styles.mainRow}>
        {/* Badge icône */}
        <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>

        {/* Texte central */}
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        </View>

        {/* Timestamp */}
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>

      {/* ── Ligne de bas : statut + action ──────────────────────────── */}
      {hasFooter && (
        <>
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            {/* Pill de statut */}
            {statusLabel ? (
              <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
            ) : (
              <View />
            )}

            {/* Lien d'action */}
            {actionLabel ? (
              <View style={styles.actionContainer}>
                <Text style={styles.actionText}>{actionLabel} ›</Text>
              </View>
            ) : null}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },

  // ─── Ligne principale ────────────────────────────────────────────────────────
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.h3,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
    fontSize: 12,
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    flexShrink: 0,
  },

  // ─── Footer ──────────────────────────────────────────────────────────────────
  footerDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Pill de statut
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Lien texte vert
  actionContainer: {
    paddingVertical: 2,
    paddingLeft: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
