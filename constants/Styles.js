/**
 * CoopIA — Global Style System
 * Styles partagés, shadows premium et tokens de typographie.
 *
 * RÈGLE D'OR : Les ombres doivent être imperceptibles au premier regard
 * mais ressenties comme une profondeur naturelle. Jamais de drop-shadow agressif.
 */

import { Platform, StyleSheet } from 'react-native';
import Colors from './Colors';

// ─── Typographie ─────────────────────────────────────────────────────────────
// Hiérarchie typographique cohérente inspirée du système Apple HIG.
// Utilise la police système (SF Pro / Roboto) par défaut.
// Pour intégrer DM Sans ou Inter : chargez via expo-font et ajoutez fontFamily ici.
export const Typography = {
  /** Grand titre d'écran — ex: "Bonjour, Kouamé" */
  displayLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  /** Titre de section principale */
  h1: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  /** Titre de carte ou sous-section */
  h2: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  /** Label de section */
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  /** Corps de texte standard */
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text,
    lineHeight: 22,
  },
  /** Texte secondaire, descriptions */
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textLight,
    lineHeight: 19,
  },
  /** Labels de champs, catégories */
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  /** Métadonnées, timestamps, info tertiaire */
  caption: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textMuted,
    lineHeight: 16,
  },
  /** Texte de bouton */
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
};

// ─── Shadows Premium ─────────────────────────────────────────────────────────
// Philosophie : Ombres quasi-imperceptibles. On "sent" la profondeur,
// on ne la "voit" pas. Jamais d'élévation sur les inputs (bug Android focus).
export const Shadows = {
  /** Ombre très subtile — Cartes de contenu */
  card: Platform.select({
    ios: {
      shadowColor: Colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
  }),

  /** Ombre moyenne — Cartes d'action principales */
  cardMedium: Platform.select({
    ios: {
      shadowColor: Colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
  }),

  /** Ombre colorée — Bouton primaire Forest Green */
  primaryButton: Platform.select({
    ios: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
  }),

  /** Ombre pour les bottom-sheets et modals */
  modal: Platform.select({
    ios: {
      shadowColor: Colors.text,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.10,
      shadowRadius: 20,
    },
    android: {
      elevation: 12,
    },
  }),
};

// ─── Styles Globaux ───────────────────────────────────────────────────────────
export const GlobalStyles = StyleSheet.create({
  /** Conteneur de base — flex 1, fond blanc */
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /** Centrage absolu — pour les écrans de chargement */
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /** Padding horizontal standard (80% whitespace principle) */
  screenPadding: {
    paddingHorizontal: 24,
  },

  /** Séparateur horizontal */
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },

  /** Carte standard avec ombre et bordure subtile */
  card: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },

  /** Section label au-dessus d'une liste */
  sectionHeader: {
    ...Typography.label,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 28,
  },
});
