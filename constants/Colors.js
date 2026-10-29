/**
 * CoopIA — Design System Tokens
 * Palette officielle de la plateforme Agritech nationale.
 *
 * PHILOSOPHIE : Ultra-premium, minimaliste (Apple/Stripe).
 * 80% d'espace blanc, accents Forest Green, jamais de surcharge visuelle.
 */

const Colors = {
  // ─── Couleurs Primaires ────────────────────────────────────────────────────
  /** Vert Forêt profond — identité CoopIA, CTAs, accents actifs */
  primary:      '#164E27',
  /** Vert Forêt sombre — hover states, textes sur fond vert */
  primaryDark:  '#0D3318',
  /** Vert Forêt léger — fonds de cartes, chips, badges */
  primaryLight: '#E8F5EC',

  // ─── Neutres (80% de l'UI) ────────────────────────────────────────────────
  /** Fond global de l'application — pur blanc premium */
  background:   '#FFFFFF',
  /** Fond alternatif — blanc cassé chaud pour les écrans de contenu */
  surface:      '#F9FAF9',
  /** Fond des cartes et inputs — off-white légèrement verdâtre */
  gray:         '#F4F7F5',

  // ─── Typographie ──────────────────────────────────────────────────────────
  /** Texte principal — near-black avec une légère teinte verte (premium) */
  text:         '#0D1B12',
  /** Texte secondaire — gris sauge pour les sous-titres et labels */
  textLight:    '#6B7C72',
  /** Texte tertiaire — pour les placeholders et métadonnées */
  textMuted:    '#A3B5AB',

  // ─── Bordures ─────────────────────────────────────────────────────────────
  /** Bordure standard — très subtile, presque invisible (anti-bruit visuel) */
  border:       '#E8EDEA',
  /** Bordure focalisée — pour les champs actifs */
  borderFocus:  '#164E27',

  // ─── Sémantique ───────────────────────────────────────────────────────────
  /** Succès / validation — vert standard iOS */
  success:      '#34C759',
  /** Erreur / alerte critique */
  error:        '#FF3B30',
  /** Avertissement / alerte agronomique — Jaune Harvest */
  accent:       '#F5A623',
  /** Fond badge alerte — version lumineuse du jaune */
  accentLight:  '#FEF3E2',

  // ─── Overlay & Utilitaires ────────────────────────────────────────────────
  /** Overlay de modal et bottom-sheet */
  overlay:      'rgba(13, 27, 18, 0.55)',
  /** Blanc pur — texte sur fond coloré */
  white:        '#FFFFFF',
  /** Transparent */
  transparent:  'transparent',
};

export default Colors;
