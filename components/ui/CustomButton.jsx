/**
 * CoopIA — CustomButton
 *
 * Bouton premium ultra-clean. 3 variantes :
 *   - "primary"  : Fond Forest Green, texte blanc, ombre colorée
 *   - "outline"  : Bordure Forest Green, fond transparent, texte vert
 *   - "ghost"    : Aucune bordure, fond transparent — pour actions secondaires discrètes
 *
 * PRINCIPE : Minimum 56px de hauteur, bords arrondis généreux (16px),
 * aucune marge verticale imposée par défaut — le parent gère l'espacement.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Typography, Shadows } from '../../constants/Styles';

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',   // 'primary' | 'outline' | 'ghost'
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,                  // Composant optionnel — icône à gauche du texte
}) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  // 'ghost' : ni fond, ni bordure

  const containerStyle = [
    styles.button,
    isPrimary && styles.buttonPrimary,
    isOutline && styles.buttonOutline,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const labelStyle = [
    styles.text,
    isPrimary && styles.textPrimary,
    isOutline && styles.textOutline,
    !isPrimary && !isOutline && styles.textGhost,
    textStyle,
  ];

  const indicatorColor = isPrimary ? Colors.white : Colors.primary;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={labelStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ─── Structure de base ───────────────────────────────────────────────────
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    // Aucune marginVertical imposée — le parent gère l'espacement
  },

  // ─── Variante Primary (Forest Green) ─────────────────────────────────────
  buttonPrimary: {
    backgroundColor: Colors.primary,
    ...Shadows.primaryButton,
  },

  // ─── Variante Outline ─────────────────────────────────────────────────────
  buttonOutline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },

  // ─── État désactivé ───────────────────────────────────────────────────────
  buttonDisabled: {
    opacity: 0.45,
  },

  // ─── Contenu (icône + texte) ──────────────────────────────────────────────
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    // Assure l'alignement vertical parfait de l'icône avec le texte
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Typographie des variantes ────────────────────────────────────────────
  text: {
    ...Typography.button,
  },
  textPrimary: {
    color: Colors.white,
  },
  textOutline: {
    color: Colors.primary,
  },
  textGhost: {
    color: Colors.primary,
  },
});
