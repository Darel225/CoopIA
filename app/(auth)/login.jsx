/**
 * CoopIA — Login Screen (auth/login.jsx)
 *
 * Écran de connexion avec saisie du numéro de téléphone ivoirien (+225).
 * L'identifiant envoyé au backend reste sous forme normalisée (phone comme email-équivalent).
 * Aucun changement côté authService — mapping UI → payload géré ici.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import CustomButton from '../../components/ui/CustomButton';
import PhoneInput from '../../components/ui/PhoneInput';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';
import { BASE_URL } from '../../constants/api';
import { useUserStore } from '../../store/useUserStore';

// Numéro valide = au moins 8 chiffres
const isValidPhone = (n) => n.replace(/\D/g, '').length >= 8;

// Normalise le numéro au format E.164
const normalizePhone = (input) => {
  let cleaned = input.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    cleaned = '+225' + cleaned;
  }
  return cleaned;
};

// Formate le numéro pour l'affichage (masque partiel dans le sous-titre de l'OTP)
export const formatPhoneForDisplay = (n) =>
  n.length >= 4 ? `+225 ${n.slice(0, 2)} ${n.slice(2, 4)} ••••` : `+225 ${n}`;

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUserData } = useUserStore();

  const handleContinue = async () => {
    if (loading) return;
    
    if (!isValidPhone(phone)) {
      Alert.alert('Numéro invalide', 'Veuillez entrer un numéro valide.');
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    
    // Validation stricte E.164 backend ^\+[1-9]\d{7,14}$
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      Alert.alert('Numéro invalide', 'Le format du numéro est incorrect.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: normalizedPhone })
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

      setUserData({ phone: normalizedPhone }); // Sauvegarde temporaire
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone_number: normalizedPhone, auto_code: data.code },
      });
    } catch (error) {
      Alert.alert('Erreur de connexion', "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper withKeyboard noPadding backgroundColor={Colors.background}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ─── En-tête Logo CoopIA ─────────────────────────────────────── */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Ionicons name="leaf" size={28} color={Colors.white} />
          </View>
          <Text style={styles.logoTitle}>
            <Text style={styles.logoTitleDark}>Coop</Text>
            <Text style={styles.logoTitleGreen}>IA</Text>
          </Text>
          <Text style={styles.logoTagline}>L'INTELLIGENCE AGRICOLE</Text>
        </View>

        {/* ─── Titre & Sous-titre ───────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Connexion Planteur</Text>
          <Text style={styles.subtitle}>
            Entrez votre numéro de téléphone pour recevoir votre code d'accès sécurisé.
          </Text>
        </View>

        {/* ─── Formulaire ───────────────────────────────────────────────── */}
        <View style={styles.formSection}>
          <PhoneInput
            label="Numéro mobile"
            value={phone}
            onChangeText={setPhone}
          />

          {/* Badge de sécurité */}
          <View style={styles.securityBadge}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.primary} />
            <Text style={styles.securityText}>
              Vos données agricoles sont sécurisées et chiffrées
            </Text>
          </View>

          {/* CTA */}
          <CustomButton
            title="Continuer"
            onPress={handleContinue}
            loading={loading}
            disabled={!isValidPhone(phone) || loading}
            style={styles.ctaButton}
          />
        </View>
      </ScrollView>

      {/* ─── Pied de page légal épinglé en bas ───────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.legalText}>
          En continuant, vous acceptez nos{' '}
          <Text style={styles.legalLink}>Conditions d'utilisation</Text>
          {' '}et notre{' '}
          <Text style={styles.legalLink}>Politique de confidentialité</Text>.
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },

  // ─── Logo section ─────────────────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  logoTitleDark: { color: Colors.text },
  logoTitleGreen: { color: Colors.primary },
  logoTagline: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // ─── Header textuel ───────────────────────────────────────────────────────
  headerSection: {
    alignItems: 'center',
    marginBottom: 36,
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
    lineHeight: 23,
    paddingHorizontal: 8,
  },

  // ─── Formulaire ───────────────────────────────────────────────────────────
  formSection: {
    flex: 1,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 28,
    marginLeft: 2,
  },
  securityText: {
    ...Typography.caption,
    color: Colors.textLight,
    fontSize: 12,
    flex: 1,
  },
  ctaButton: {
    borderRadius: 18,
    height: 58,
  },

  // ─── Footer légal ─────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    paddingTop: 12,
  },
  legalText: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    color: Colors.textLight,
  },
  legalLink: {
    color: Colors.text,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
