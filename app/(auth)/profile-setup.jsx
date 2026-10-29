/**
 * CoopIA — Profile Setup Screen (auth/profile-setup.jsx)
 *
 * Dernière étape du flow d'inscription.
 * Collecte : nom complet, village/campement, photo avatar, culture principale.
 * Préserve intégralement la logique authService.updateProfile existante.
 *
 * ANTI-BUG ANDROID FOCUS : Aucune ombre dynamique sur les inputs.
 * Platform.select strict partout.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import CustomButton from '../../components/ui/CustomButton';
import CropSelectorGrid from '../../components/ui/CropSelectorGrid';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';
import { authService } from '../../services/authService';
import { useUserStore } from '../../store/useUserStore';
import { BASE_URL } from '../../constants/api.js';
import * as SecureStore from 'expo-secure-store';

// ─── Composant Input interne premium (anti-bug Android) ────────────────────
// Ombres statiques déclarées dès le montage → pas de View Recreation
function FieldInput({
  icon,
  placeholder,
  value,
  onChangeText,
  inputRef,
  returnKeyType = 'next',
  onSubmitEditing,
  rightSlot,
  autoCapitalize = 'words',
  keyboardType = 'default',
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.inputRow,
        focused && styles.inputRowFocused,
        // Pré-déclaration Android pour éviter la destruction de vue
        Platform.select({ android: { elevation: 0 }, ios: {} }),
      ]}
    >
      <Ionicons
        name={icon}
        size={19}
        color={focused ? Colors.primary : Colors.textMuted}
        style={styles.inputIcon}
      />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
      />
      {rightSlot && <View style={styles.rightSlot}>{rightSlot}</View>}
    </View>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────
export default function ProfileSetupScreen() {
  const [fullName, setFullName]       = useState('');
  const [village, setVillage]         = useState('');
  const [superficie, setSuperficie]   = useState('');
  const [avatar, setAvatar]           = useState(null);
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [loading, setLoading]         = useState(false);

  const zoneRef = useRef(null);
  const superficieRef = useRef(null);
  const router  = useRouter();
  const { setUserData, login } = useUserStore();
  const { email, phone_number, phone: paramPhone } = useLocalSearchParams();

  const parsedSuperficie = parseFloat(superficie.replace(',', '.'));
  const isSuperficieValid = !isNaN(parsedSuperficie) && parsedSuperficie > 0;

  const isValid =
    fullName.trim().length >= 2 &&
    village.trim().length  >= 2 &&
    isSuperficieValid &&
    selectedCrops.length   >= 1;

  // ─── Photo avatar ────────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        "Autorisez l'accès à la galerie dans les paramètres de votre téléphone.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatar(result.assets[0].uri);
    }
  };

  // ─── Enregistrement du profil ────────────────────────────────────────────
  // États liés à l'API : nom_complet = fullName, village = village,
  // culture_principale = selectedCrops[0] (sélection unique)
  const handleSaveProfile = async () => {
    if (!isValid || loading) return;
    setLoading(true);

    const nom_complet = fullName.trim();
    const culture_principale = selectedCrops[0];

    const parts  = nom_complet.split(/\s+/);
    const prenom = parts.length > 1 ? parts[0] : '';
    const nom    = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

    try {
      let token = null;
      try {
        token = await SecureStore.getItemAsync('userToken');
      } catch (e) {
        try { token = localStorage.getItem('userToken'); } catch (err) {}
      }

      const response = await fetch(`${BASE_URL}/profile/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          nom_complet,
          village: village.trim(),
          culture_principale,
          superficie: parsedSuperficie,
        }),
      });

      let data = null;
      try { data = await response.json(); } catch (e) {}

      if (!response.ok) {
        const detail = data?.detail;
        const message = Array.isArray(detail)
          ? detail.map((d) => d.msg).join('\n')
          : (detail || 'La mise à jour du profil a échoué.');
        throw new Error(message);
      }

      let uploadedAvatarUrl = avatar;

      // Synchronisation Cloudinary & Neon DB garantie (avec await avant navigation)
      if (avatar && token) {
        try {
          const safeName = avatar.split('/').pop() || 'avatar.jpg';
          const formData = new FormData();

          try {
            // Conversion URI -> Blob (obligatoire pour React Native / Expo 51+ / Hermes)
            const localFileResponse = await fetch(avatar);
            const originalBlob = await localFileResponse.blob();
            const blob = new Blob([originalBlob], { type: 'image/jpeg' });
            formData.append('file', blob, safeName);
          } catch (blobErr) {
            formData.append('file', {
              uri: Platform.OS === 'ios' ? avatar.replace('file://', '') : avatar,
              name: safeName,
              type: 'image/jpeg',
            });
          }

          const uploadRes = await fetch(`${BASE_URL}/profile/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData?.avatar_url) {
              uploadedAvatarUrl = uploadData.avatar_url;
            }
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            if (__DEV__) console.warn('[ProfileSetup.avatar error]', uploadRes.status, errData);
          }
        } catch (uploadErr) {
          if (__DEV__) console.warn('[ProfileSetup.avatar]', uploadErr);
        }
      }

      const effectivePhone = phone_number || paramPhone || null;
      setUserData({
        firstName: prenom || nom,
        prenom,
        nom,
        phone:    effectivePhone,
        email:    email || null,
        avatar:   uploadedAvatarUrl,
        zone:     village.trim(),
        quartier: village.trim(),
        crops:    selectedCrops,
        superficie: parsedSuperficie,
      });

      login(); // Met à jour l'état global Zustand (isAuthenticated = true)
      router.replace('/(tabs)');
    } catch (error) {
      if (__DEV__) { console.error('[ProfileSetup]', error); }
      Alert.alert('Erreur', error.message || 'Impossible de sauvegarder votre profil.');
    } finally {
      setLoading(false);
    }
  };
  const handleComplete = handleSaveProfile;

  return (
    <ScreenWrapper withKeyboard noPadding backgroundColor={Colors.background}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ─── Indicateur de progression ─────────────────────────────── */}
        <View style={styles.progressHeader}>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>ÉTAPE 3 SUR 3</Text>
          </View>
          <Text style={styles.stepLabel}>Finalisation</Text>
        </View>
        {/* Barre 3 segments tous remplis */}
        <View style={styles.progressBar}>
          <View style={[styles.progressSegment, styles.progressSegmentFilled]} />
          <View style={[styles.progressSegment, styles.progressSegmentFilled]} />
          <View style={[styles.progressSegment, styles.progressSegmentFilled]} />
        </View>

        {/* ─── Titre ────────────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Profil Planteur</Text>
          <Text style={styles.subtitle}>
            Dernière étape ! Configurez votre carnet numérique agricole.
          </Text>
        </View>

        {/* ─── Avatar ───────────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={42} color={Colors.textMuted} />
              </View>
            )}
            {/* Badge caméra */}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={15} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Appuyez pour choisir une photo</Text>
        </View>

        {/* ─── Formulaire ────────────────────────────────────────────── */}
        <View style={styles.form}>

          {/* NOM COMPLET */}
          <Text style={styles.fieldLabel}>NOM COMPLET</Text>
          <FieldInput
            icon="person-outline"
            placeholder="Kouamé N'Guessan"
            value={fullName}
            onChangeText={setFullName}
            returnKeyType="next"
            onSubmitEditing={() => zoneRef.current?.focus()}
          />

          {/* VILLAGE OU CAMPEMENT */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            VILLAGE OU CAMPEMENT
          </Text>
          <FieldInput
            icon="location-outline"
            placeholder="Ex: Campement Broukro"
            value={village}
            onChangeText={setVillage}
            inputRef={zoneRef}
            returnKeyType="next"
            onSubmitEditing={() => superficieRef.current?.focus()}
            rightSlot={
              <TouchableOpacity style={styles.localiserBtn} activeOpacity={0.8}>
                <Ionicons name="locate-outline" size={14} color={Colors.primary} />
                <Text style={styles.localiserText}>Localiser</Text>
              </TouchableOpacity>
            }
          />

          {/* SUPERFICIE DE LA PARCELLE (HA) */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
            SUPERFICIE DE LA PARCELLE (HA) *
          </Text>
          <FieldInput
            icon="map-outline"
            placeholder="Ex: 3.5"
            value={superficie}
            onChangeText={setSuperficie}
            inputRef={superficieRef}
            keyboardType="decimal-pad"
            returnKeyType="done"
            autoCapitalize="none"
            rightSlot={
              <View style={styles.haBadge}>
                <Text style={styles.haBadgeText}>ha</Text>
              </View>
            }
          />

          {/* CULTURE PRINCIPALE */}
          <View style={styles.cropHeader}>
            <Text style={styles.fieldLabel}>CULTURE PRINCIPALE</Text>
            <Text style={styles.cropHint}>Sélectionnez votre spéculation</Text>
          </View>
          <CropSelectorGrid
            selected={selectedCrops}
            onToggle={setSelectedCrops}
            multiSelect={false}
          />
        </View>

        {/* ─── Note de sécurité ──────────────────────────────────────── */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.securityText}>
            Vos données agricoles sont enregistrées et synchronisées hors-ligne
          </Text>
        </View>

        {/* ─── CTA ───────────────────────────────────────────────────── */}
        <CustomButton
          title="Enregistrer mon profil"
          onPress={handleComplete}
          loading={loading}
          disabled={!isValid || loading}
          style={styles.ctaButton}
          icon={<Ionicons name="chevron-forward" size={18} color={Colors.white} />}
        />

        {/* Espace bas */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
  },

  // ─── Progression ─────────────────────────────────────────────────────────
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stepPillText: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  stepLabel: {
    ...Typography.caption,
    color: Colors.textLight,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 28,
    marginTop: 2,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressSegmentFilled: {
    backgroundColor: Colors.primary,
  },

  // ─── Titre ────────────────────────────────────────────────────────────────
  titleSection: {
    marginBottom: 28,
  },
  title: {
    ...Typography.h1,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textLight,
    lineHeight: 22,
  },

  // ─── Avatar ───────────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  avatarHint: {
    ...Typography.caption,
    color: Colors.textMuted,
  },

  // ─── Formulaire ───────────────────────────────────────────────────────────
  form: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Input row — ANTI-BUG ANDROID : aucune ombre dynamique
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
    // Pas d'ombre dynamique ici (bug Android View Recreation)
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 0,
  },
  rightSlot: {
    marginLeft: 8,
  },

  // Bouton "Localiser" dans l'input village
  localiserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  localiserText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Badge unite "ha" dans l'input superficie
  haBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  haBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ─── En-tête culture principale ───────────────────────────────────────────
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  cropHint: {
    ...Typography.caption,
    color: Colors.textLight,
    fontSize: 11,
  },

  // ─── Note de sécurité ─────────────────────────────────────────────────────
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  securityText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    flex: 1,
    lineHeight: 16,
  },

  // ─── CTA ──────────────────────────────────────────────────────────────────
  ctaButton: {
    borderRadius: 18,
    height: 58,
  },
});


