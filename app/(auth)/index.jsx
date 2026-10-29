/**
 * CoopIA — Splash Screen (auth/index.jsx)
 *
 * Écran de lancement minimaliste premium.
 * Fond blanc pur, logo carré arrondi Forest Green avec icône feuille blanche,
 * titre bicolore "Coop" + "IA", baseline uppercase espacée,
 * barre de progression animée en bas.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

// Durée totale de l'animation de chargement avant navigation
const SPLASH_DURATION = 2600;

export default function SplashScreen() {
  const router = useRouter();

  // ─── Animations ────────────────────────────────────────────────────────────
  // Progression de la barre (0 → 1)
  const progressAnim = useRef(new Animated.Value(0)).current;
  // Fade-in global du contenu logo
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Légère montée du logo (translateY)
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    // Entrée : fade + slide du logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Barre de progression — NON nativeDriver car on anime une valeur de layout (width %)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SPLASH_DURATION,
      useNativeDriver: false,
    }).start();

    // Navigation vers l'onboarding à la fin du chargement
    const timer = setTimeout(() => {
      router.replace('/(auth)/onboarding');
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  // Interpolation : largeur de la barre de 0% à 100%
  const barWidthInterpolated = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScreenWrapper noPadding backgroundColor={Colors.background}>
      <View style={styles.root}>

        {/* ─── Zone centrale : Logo + Titre ─────────────────────────────── */}
        <Animated.View
          style={[
            styles.center,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Carré arrondi Forest Green avec icône plante */}
          <View style={styles.logoBox}>
            <Ionicons name="leaf" size={52} color={Colors.white} />
          </View>

          {/* Titre bicolore "Coop" + "IA" */}
          <Text style={styles.appName}>
            <Text style={styles.appNameDark}>Coop</Text>
            <Text style={styles.appNameGreen}>IA</Text>
          </Text>

          {/* Baseline uppercase espacée */}
          <Text style={styles.tagline}>L'INTELLIGENCE AGRICOLE</Text>
        </Animated.View>

        {/* ─── Zone basse : Barre de progression ─────────────────────────── */}
        <View style={styles.loaderArea}>
          {/* Track de la barre */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: barWidthInterpolated },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>

      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ─── Layout racine : space-between pour pousser le loader en bas ──────────
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  // ─── Zone centrale (logo + titre) ─────────────────────────────────────────
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Logo carré arrondi ───────────────────────────────────────────────────
  logoBox: {
    width: 110,
    height: 110,
    borderRadius: 26,
    // Dégradé simulé : fond principal Forest Green
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    // Ombre douce et colorée — Platform.select pour éviter bug Android
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },

  // ─── Titre bicolore ───────────────────────────────────────────────────────
  appName: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  appNameDark: {
    color: Colors.text,       // Near-black premium
  },
  appNameGreen: {
    color: Colors.primary,    // Forest Green
  },

  // ─── Tagline uppercase ────────────────────────────────────────────────────
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textLight,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
  },

  // ─── Zone chargement (bas de l'écran) ────────────────────────────────────
  loaderArea: {
    width: '75%',
    alignItems: 'center',
    gap: 12,
  },

  // Track gris clair
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },

  // Fill Forest Green animé
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  // Texte "Chargement..."
  loadingText: {
    ...Typography.caption,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
