/**
 * CoopIA — Onboarding Screen (auth/onboarding.jsx)
 *
 * Premier écran de bienvenue après le Splash.
 * Layout : Image hero dans un conteneur arrondi avec marges, titre,
 * sous-titre, indicateurs de pagination, puis bouton CTA "Commencer" épinglé en bas.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import CustomButton from '../../components/ui/CustomButton';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

// Asset local généré pour le projet CoopIA
const HERO_IMAGE = require('../../assets/images/onboarding_hero.jpg');

export default function OnboardingScreen() {
  const router = useRouter();

  const handleStart = () => {
    router.replace('/(auth)/login');
  };

  return (
    <ScreenWrapper noPadding backgroundColor={Colors.background}>
      <View style={styles.root}>

        {/* ─── Zone supérieure : Image Hero ─────────────────────────────── */}
        <View style={styles.heroContainer}>
          <Image
            source={HERO_IMAGE}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* ─── Zone centrale : Titre + Sous-titre + Pagination ──────────── */}
        <View style={styles.contentArea}>
          {/* Titre principal */}
          <Text style={styles.title}>Cultivez avec l'IA</Text>

          {/* Sous-titre */}
          <Text style={styles.subtitle}>
            Prenez en photo vos cultures, déclarez vos récoltes et recevez des
            conseils d'experts instantanément.
          </Text>

          {/* Indicateurs de pagination */}
          <View style={styles.paginationRow}>
            {/* Indicateur actif — pilule allongée Forest Green */}
            <View style={[styles.dot, styles.dotActive]} />
            {/* Indicateurs inactifs — petits cercles gris clair */}
            <View style={[styles.dot, styles.dotInactive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>
        </View>

        {/* ─── Zone basse : CTA épinglé ──────────────────────────────────── */}
        <View style={styles.footer}>
          <CustomButton
            title="Commencer"
            onPress={handleStart}
            variant="primary"
            style={styles.ctaButton}
          />
        </View>

      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ─── Root : distribue les 3 zones verticalement ───────────────────────────
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },

  // ─── Conteneur image hero ──────────────────────────────────────────────────
  // Le conteneur a des marges et coins arrondis — l'image ne saigne pas sur les bords
  heroContainer: {
    alignSelf: 'center',
    width: '90%',
    maxWidth: 340,
    aspectRatio: 1,
    maxHeight: 310,
    marginTop: 16,
    borderRadius: 36,
    overflow: 'hidden',          // Masque les coins de l'image
    backgroundColor: '#F5EFE7',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  // ─── Zone de contenu textuel ──────────────────────────────────────────────
  contentArea: {
    paddingHorizontal: 28,
    alignItems: 'center',
    paddingTop: 8,
  },

  title: {
    ...Typography.h1,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.text,
    marginBottom: 14,
    letterSpacing: -0.4,
  },

  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textLight,
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  // ─── Indicateurs de pagination ────────────────────────────────────────────
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Pilule active allongée — Forest Green
  dotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },

  // Points inactifs — cercles gris clair
  dotInactive: {
    width: 8,
    backgroundColor: Colors.border,
  },

  // ─── Pied de page avec le CTA ─────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
  },

  // Override style du bouton pour le rendre pleinement arrondi (pill shape)
  ctaButton: {
    borderRadius: 18,
    height: 58,
  },
});
