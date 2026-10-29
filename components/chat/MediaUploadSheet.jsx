/**
 * CoopIA — MediaUploadSheet
 *
 * Bottom sheet modale pour le diagnostic par image.
 * Deux options : Caméra (recommandé) et Galerie.
 * Fond avec overlay sombre transparent derrière la feuille.
 *
 * Props :
 *   visible      {boolean}  — Contrôle l'affichage du sheet
 *   onClose      {func}     — Ferme le sheet
 *   onCamera     {func}     — Lance la caméra
 *   onGallery    {func}     — Ouvre la galerie
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

// Couleurs internes du sheet
const CAMERA_BG     = '#EAF3EC';   // Fond vert très clair de la card caméra
const CAMERA_BORDER = Colors.primary;
const CAMERA_ICON_BG = Colors.primaryDark;

const GALLERY_BG     = Colors.background;
const GALLERY_BORDER = Colors.border;
const GALLERY_ICON_BG = Colors.primaryLight;

export default function MediaUploadSheet({ visible, onClose, onCamera, onGallery }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* ── Overlay sombre — tap pour fermer ─────────────────────── */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* ── Feuille blanche ──────────────────────────────────────── */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        {/* Poignée de glissement */}
        <View style={styles.handle} />

        {/* ── En-tête ────────────────────────────────────────────── */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerTitleRow}>
            {/* Point vert actif */}
            <View style={styles.greenDot} />
            <Text style={styles.sheetTitle}>DIAGNOSTIC PAR IMAGE</Text>
          </View>
          {/* Bouton fermer */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Photographiez vos parcelles, fèves ou feuilles pour une analyse phytosanitaire instantanée par l'IA.
        </Text>

        {/* ── Card Caméra (Recommandé) ──────────────────────────── */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: CAMERA_BG, borderColor: CAMERA_BORDER }]}
          onPress={onCamera}
          activeOpacity={0.80}
        >
          {/* Icône dans carré sombre */}
          <View style={[styles.cardIconBox, { backgroundColor: CAMERA_ICON_BG }]}>
            <Ionicons name="camera-outline" size={24} color={Colors.white} />
          </View>
          {/* Texte */}
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Prendre une photo</Text>
            <Text style={styles.cardSubtitle}>Photographiez directement la feuille ou cabosse</Text>
          </View>
          {/* Badge Recommandé */}
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recommandé</Text>
          </View>
        </TouchableOpacity>

        {/* ── Card Galerie ──────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: GALLERY_BG, borderColor: GALLERY_BORDER }]}
          onPress={onGallery}
          activeOpacity={0.80}
        >
          <View style={[styles.cardIconBox, { backgroundColor: GALLERY_ICON_BG }]}>
            <Ionicons name="image-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Choisir une image</Text>
            <Text style={styles.cardSubtitle}>Importer depuis la galerie du téléphone</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Overlay sombre ────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },

  // ── Feuille blanche ───────────────────────────────────────────────────────
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    // Ombre portée vers le haut (iOS)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },

  // ── Poignée ───────────────────────────────────────────────────────────────
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // ── En-tête ───────────────────────────────────────────────────────────────
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },

  description: {
    ...Typography.bodySmall,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },

  cardIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    ...Typography.h3,
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...Typography.caption,
    fontSize: 12,
  },

  // Badge "Recommandé"
  recommendedBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
});
