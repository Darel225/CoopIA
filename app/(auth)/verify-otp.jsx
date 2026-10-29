/**
 * CoopIA — OTP Verification Screen (auth/verify-otp.jsx)
 *
 * 6 cases de saisie premium, clavier natif.
 * ANTI-BUG ANDROID : Aucune ombre dynamique sur les cases (Platform.select strict).
 * Logique de brute-force (5 essais max) et countdown de renvoi préservés.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import CustomButton from '../../components/ui/CustomButton';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';
import { BASE_URL } from '../../constants/api';
import { useUserStore } from '../../store/useUserStore';

const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const RESEND_DELAY = 60; // secondes

export default function VerifyOtpScreen() {
  const { phone_number, auto_code } = useLocalSearchParams();
  const router = useRouter();
  const { login, setUserData } = useUserStore();

  // ─── État du code OTP ────────────────────────────────────────────────────
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [attempts, setAttempts] = useState(0);

  // ─── Countdown de renvoi ──────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(RESEND_DELAY);
  const [resending, setResending] = useState(false);
  const timerRef = useRef(null);

  // Références vers les inputs pour le passage automatique de focus
  const inputRefs = useRef(Array(OTP_LENGTH).fill(null).map(() => React.createRef()));

  useEffect(() => {
    if (!phone_number) {
      router.replace('/(auth)/login');
      return;
    }
    startTimer();
    setTimeout(() => inputRefs.current[0]?.current?.focus(), 300);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (auto_code) {
      const codeArray = auto_code.split('');
      setDigits(codeArray); // Visually fill
      setTimeout(async () => {
        await handleVerify(auto_code);
      }, 500); // 500ms delay for UX (shows the filled boxes before redirect)
    }
  }, [auto_code]);


  const maskedPhone = phone_number
    ? `${phone_number.slice(0, 4)} ${phone_number.slice(4, 6)} •••• ${phone_number.slice(-2)}`
    : '••••';

  const startTimer = () => {
    clearInterval(timerRef.current);
    setCountdown(RESEND_DELAY);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // ─── Gestion de la saisie dans chaque case ───────────────────────────────
  const handleDigitChange = useCallback((text, index) => {
    const char = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg('');

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.current?.focus();
    }
    if (char && index === OTP_LENGTH - 1) {
      inputRefs.current[index]?.current?.blur();
    }
  }, [digits]);

  const handleKeyPress = useCallback((e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.current?.focus();
    }
  }, [digits]);

  // ─── Validation du code ───────────────────────────────────────────────────
  const handleVerify = async (autoCodeOverride = null) => {
    if (loading) return;
    
    const code = autoCodeOverride || digits.join('');
    if (code.length < OTP_LENGTH) {
      setErrorMsg('Veuillez entrer les 6 chiffres du code.');
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      setErrorMsg('Trop de tentatives. Renvoyez un nouveau code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number, code })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = 'La vérification a échoué. Réessayez.';
        if (data && data.detail) {
          errorMsg = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        }
        
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (response.status === 400) {
          setErrorMsg(errorMsg);
          setDigits(Array(OTP_LENGTH).fill('')); // Nettoyage sur code invalide
          setTimeout(() => inputRefs.current[0]?.current?.focus(), 100);
        } else if (response.status === 429) {
          setErrorMsg(errorMsg); // Ne pas vider la grille sur too many attempts
        } else {
          setErrorMsg(errorMsg);
        }
        return;
      }
      
      // Stockage sécurisé du JWT
      if (data.access_token) {
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync('userToken', data.access_token);
        } else {
          try { localStorage.setItem('userToken', data.access_token); } catch(e) {}
        }
      }
      
      // Extraction et vérification des informations utilisateur
      const user = data.user || {};
      const firstName = user.first_name ? String(user.first_name).trim() : '';
      const lastName = user.last_name ? String(user.last_name).trim() : '';

      // Critère strict : un utilisateur est complet s'il a un prénom non vide ET requires_profile_setup est false
      const isProfileComplete = Boolean(firstName.length > 0 && !data.requires_profile_setup);

      // Nettoyage prealable de l'etat pour eviter toute fuite de cache de l'ancien utilisateur
      useUserStore.getState().logout();

      // Mise à jour de l'état global Zustand avec les données réelles du profil
      setUserData({
        userId: user.id || null,
        firstName: firstName || null,
        prenom: firstName || null,
        nom: lastName || null,
        phone: user.phone_number || phone_number,
        cooperative_id: user.cooperative_id || null,
        cooperative_name: user.cooperative_name || 'Coopérative CAPED',
        role: user.role || 'PLANTER',
        zone: user.village || null,
        quartier: user.village || null,
        crops: user.culture ? [user.culture] : [],
      });

      if (isProfileComplete) {
        // Utilisateur existant (profil complété) -> interface principale
        login(); // Met à jour l'état global Zustand (isAuthenticated = true)
        router.replace('/(tabs)');
      } else {
        // Nouvel utilisateur ou profil incomplet -> écran de complétion de profil
        router.replace({
          pathname: '/(auth)/profile-setup',
          params: { phone_number, userId: user.id },
        });
      }
      
    } catch (error) {
      setErrorMsg("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Renvoi du code ───────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setErrorMsg('');
    setAttempts(0);
    setDigits(Array(OTP_LENGTH).fill(''));
    try {
      const response = await fetch(`${BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = "Impossible d'envoyer le code.";
        if (data && data.detail) {
          errorMsg = Array.isArray(data.detail) ? data.detail[0].msg : data.detail;
        }
        Alert.alert('Erreur', errorMsg);
        return;
      }

      startTimer();
      Alert.alert('Code envoyé', 'Un nouveau code a été envoyé.');
    } catch (error) {
      Alert.alert('Erreur de connexion', "Erreur de connexion au serveur.");
    } finally {
      setResending(false);
    }
  };

  const codeComplete = digits.every(Boolean);

  return (
    <ScreenWrapper withKeyboard noPadding backgroundColor={Colors.background}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Bouton retour ────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        {/* ─── Titre & Sous-titre ───────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark-outline" size={30} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.subtitle}>
            Veuillez entrer le code à 6 chiffres{'\n'}envoyé au{' '}
            <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          </Text>
        </View>

        {/* ─── Cases OTP ────────────────────────────────────────────────── */}
        <View style={styles.otpSection}>
          <View style={styles.otpRow}>
            {digits.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.otpBox,
                  focusedIndex === index && styles.otpBoxFocused,
                  digit && styles.otpBoxFilled,
                  !!errorMsg && styles.otpBoxError,
                ]}
              >
                <TextInput
                  ref={inputRefs.current[index]}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(t) => handleDigitChange(t, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                  caretHidden
                  textAlign="center"
                />
                {/* Affichage visuel : point masqué si rempli, tiret si vide */}
                {digit ? (
                  <View style={styles.filledDot} />
                ) : (
                  <Text style={styles.emptyDash}>-</Text>
                )}
              </View>
            ))}
          </View>

          {/* Message d'erreur */}
          {!!errorMsg && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Renvoyer le code */}
          <TouchableOpacity
            style={styles.resendRow}
            onPress={handleResend}
            disabled={countdown > 0 || resending}
          >
            {countdown > 0 ? (
              <Text style={styles.countdown}>
                Renvoyer le code dans{' '}
                <Text style={styles.countdownNum}>{countdown}s</Text>
              </Text>
            ) : (
              <Text style={[styles.resendText, resending && styles.resendDisabled]}>
                {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── CTA épinglé en bas ───────────────────────────────────────── */}
      <View style={styles.footer}>
        <CustomButton
          title="Valider"
          onPress={handleVerify}
          loading={loading}
          disabled={!codeComplete || attempts >= MAX_ATTEMPTS || loading}
          style={styles.ctaButton}
        />
      </View>
    </ScreenWrapper>
  );
}

// Taille des cases calculée pour tenir sur tous les écrans (6 cases + 5 gaps)
const BOX_SIZE = 46;

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },

  // ─── Bouton retour ────────────────────────────────────────────────────────
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...Typography.h1,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textLight,
    lineHeight: 24,
  },
  phoneHighlight: {
    color: Colors.text,
    fontWeight: '700',
  },

  // ─── Zone OTP ─────────────────────────────────────────────────────────────
  otpSection: {
    alignItems: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 360,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  // Case OTP — CRITIQUE Android : aucune ombre dynamique au focus
  otpBox: {
    flex: 1,
    maxWidth: 48,
    aspectRatio: 0.85,
    marginHorizontal: 3,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    // Pré-déclare elevation à 0 pour éviter le bug View Recreation sur Android
    ...Platform.select({ android: { elevation: 0 }, ios: {} }),
  },

  // Focalisé — uniquement borderColor + backgroundColor (pas d'ombre dynamique)
  otpBoxFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.white,
  },

  // Rempli
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  // Erreur
  otpBoxError: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}10`,
  },

  // L'input est masqué — on affiche notre propre dot/dash
  otpInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    color: 'transparent',
  },

  // Dot plein vert quand rempli
  filledDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  // Tiret quand vide
  emptyDash: {
    fontSize: 20,
    color: Colors.border,
    fontWeight: '300',
    lineHeight: 24,
  },

  // ─── Erreur ───────────────────────────────────────────────────────────────
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },

  // ─── Renvoi ───────────────────────────────────────────────────────────────
  resendRow: {
    paddingVertical: 8,
  },
  resendText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.primary,
  },
  resendDisabled: {
    color: Colors.textMuted,
  },
  countdown: {
    ...Typography.bodySmall,
    color: Colors.textLight,
  },
  countdownNum: {
    fontWeight: '700',
    color: Colors.text,
  },

  // ─── Footer CTA ───────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
  },
  ctaButton: {
    borderRadius: 18,
    height: 58,
  },
});
