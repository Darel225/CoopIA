/**
 * CoopIA — Profile Screen (tabs/profile.jsx)
 *
 * Layout : Header vert avec "Mon Profil" + avatar modifiable + pill lieu
 *          Conteneur off-white chevauchant (Colors.surface, borderTopRadius 32).
 * Sections :
 *   - INFORMATIONS (Zone, Téléphone, Culture)
 *   - PARAMÈTRES (Assistance CAPED, Vider l'historique, À propos, Déconnexion)
 */

import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../../constants/api';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../constants/Colors';
import { useUserStore } from '../../store/useUserStore';
import SettingsRow from '../../components/ui/SettingsRow';

// ─── Titre de section ────────────────────────────────────────────────────────
const SectionTitle = ({ label }) => (
  <Text style={styles.sectionTitle}>{label}</Text>
);

// ─── Carte groupée (iOS-style) ──────────────────────────────────────────────
const SettingsCard = ({ children }) => (
  <View style={styles.card}>{children}</View>
);

// ─── Écran Principal ─────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    firstName,
    prenom,
    nom,
    avatar,
    zone,
    quartier,
    email,
    phone,
    crops,
    logout,
    setUserData,
  } = useUserStore();

  const [clearing, setClearing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Synchronise automatiquement les infos complètes de l'utilisateur au montage
  useEffect(() => {
    (async () => {
      try {
        let token = null;
        if (Platform.OS !== 'web') {
          token = await SecureStore.getItemAsync('userToken');
        } else {
          token = localStorage.getItem('userToken');
        }
        if (token) {
          const res = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              setUserData({
                avatar: data.user.avatar_url || avatar,
                phone: data.user.phone_number || phone,
                userId: data.user.id || null,
                firstName: data.user.first_name || firstName,
                prenom: data.user.first_name || prenom,
                nom: data.user.last_name || nom,
                cooperative_id: data.user.cooperative_id || null,
                cooperative_name: data.user.cooperative_name || 'Coopérative CAPED',
                zone: data.user.village || zone || null,
                quartier: data.user.village || quartier || null,
                crops: data.user.culture ? [data.user.culture] : (crops || []),
              });
            }
          }
        }
      } catch (e) {
        if (__DEV__) { console.log('[ProfileScreen.fetchMe]', e); }
      }
    })();
  }, []);

  // ─── Données affichées ─────────────────────────────────────────────────────
  const displayName = `${prenom || firstName || ''} ${nom || ''}`.trim() || 'Planteur';
  const initials = (
    ((prenom || firstName || 'P')[0]).toUpperCase() +
    ((nom || '')[0] || '').toUpperCase()
  ).trim();
  const locationLabel = quartier || zone || 'Coopérative CAPED';

  // Formatage élégant du téléphone ivoirien (+225 XX XX XX XX XX)
  const rawPhone = phone || (email && !email.includes('@') ? email : (email ? email.split('@')[0] : ''));
  const formatPhone = (val) => {
    if (!val) return '—';
    const digits = val.replace(/\D/g, '');
    const local = digits.startsWith('225') ? digits.slice(3) : digits;
    if (local.length >= 8) {
      return `+225 ${local.replace(/(\d{2})(?=\d)/g, '$1 ')}`;
    }
    return val.startsWith('+') ? val : `+225 ${val}`;
  };
  const phoneDisplay = formatPhone(rawPhone);
  const cropDisplay = crops && crops.length > 0
    ? crops[0].charAt(0).toUpperCase() + crops[0].slice(1) + ' (Fèves Ivoiriennes)'
    : 'Cacao (Fèves Ivoiriennes)';

  // ─── Changer la photo de profil (Avatar) ───────────────────────────────────
  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès aux photos pour choisir votre photo de profil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const localUri = result.assets[0].uri;
      // 1. Mise à jour immédiate du store local (persisté dans Zustand / AsyncStorage)
      setUserData({ avatar: localUri });

      // 2. Synchronisation vers le backend Cloudinary & Neon DB
      setUploadingAvatar(true);
      let token = null;
      if (Platform.OS !== 'web') {
        token = await SecureStore.getItemAsync('userToken');
      } else {
        token = localStorage.getItem('userToken');
      }

      if (token) {
        try {
          // Conversion URI -> Blob (obligatoire pour Expo 51+ / Hermes)
          const localFileResponse = await fetch(localUri);
          const originalBlob = await localFileResponse.blob();
          const safeName = localUri.split('/').pop() || 'avatar.jpg';
          const blob = new Blob([originalBlob], { type: 'image/jpeg' });

          const formData = new FormData();
          formData.append('file', blob, safeName);

          const uploadRes = await fetch(`${BASE_URL}/profile/avatar`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (uploadRes.ok) {
            const data = await uploadRes.json();
            if (data?.avatar_url) {
              setUserData({ avatar: data.avatar_url });
              Alert.alert('✅ Photo enregistrée', 'Votre photo de profil est maintenant enregistrée sur la base de données.');
            }
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            if (__DEV__) console.log('[ProfileScreen.uploadAvatar error]', uploadRes.status, errData);
          }
        } catch (uploadErr) {
          if (__DEV__) console.log('[ProfileScreen.uploadAvatar]', uploadErr);
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[ProfileScreen.handlePickAvatar]', e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Assistance Coopérative CAPED ──────────────────────────────────────────
  const handleSupport = () => {
    Alert.alert(
      'Assistance Coopérative CAPED',
      'Contactez le service d\'assistance agronomique et technique CAPED (+225 05 65 69 72 63) :',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '📞 Appel direct',
          onPress: () => Linking.openURL('tel:+2250565697263'),
        },
        {
          text: '💬 WhatsApp',
          onPress: () => Linking.openURL('https://wa.me/2250565697263'),
        },
      ]
    );
  };

  // ─── Vider l'historique ───────────────────────────────────────────────────
  const clearHistory = () => {
    Alert.alert(
      'Supprimer l\'historique',
      'Toutes vos conversations avec l\'assistant IA seront définitivement supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              let token = null;
              if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('userToken');
              } else {
                token = localStorage.getItem('userToken');
              }

              if (token) {
                let success = false;
                try {
                  const delRes = await fetch(`${BASE_URL}/chat/sessions`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (delRes.ok) success = true;
                } catch (e) {}

                if (!success) {
                  try {
                    await fetch(`${BASE_URL}/history/clear-history`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ email }),
                    });
                  } catch (e) {}
                }
              }
              Alert.alert('✅ Historique supprimé', 'Toutes vos conversations ont été effacées.');
            } catch (error) {
              if (__DEV__) { console.error('[ProfileScreen.clearHistory]', error); }
              Alert.alert('Erreur', 'Impossible de contacter le serveur.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  // ─── À propos de CoopIA ────────────────────────────────────────────────────
  const handleAbout = () => {
    Alert.alert(
      'À propos de CoopIA',
      'Version : CoopIA Mobile v1.0.0\n\nOrganisation : Coopérative CAPED\n\nConseils agronomiques basés sur les normes officielles ANADER et Conseil Café-Cacao Côte d\'Ivoire.\n\nPlateforme d\'intelligence artificielle au service des producteurs de café et cacao.'
    );
  };

  // ─── Déconnexion ───────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              if (Platform.OS !== 'web') {
                await SecureStore.deleteItemAsync('userToken');
              } else {
                localStorage.removeItem('userToken');
              }
            } catch (e) {}
            logout();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ════ EN-TÊTE VERT ════════════════════════════════════════════════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>

        {/* "Mon Profil" — top left */}
        <Text style={styles.headerPageTitle}>Mon Profil</Text>

        {/* Avatar centré avec anneau et bouton d'édition */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
          >
            <View style={styles.avatarRing}>
              {uploadingAvatar ? (
                <View style={styles.avatarCircle}>
                  <ActivityIndicator size="small" color={Colors.white} />
                </View>
              ) : avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>

            {/* Badge caméra discret */}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color={Colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Nom */}
          <Text style={styles.userName}>{displayName}</Text>

          {/* Pill location glassmorphisme */}
          <View style={styles.locationPill}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locationPillText}>{locationLabel}</Text>
          </View>
        </View>
      </View>

      {/* ════ CONTENEUR OFF-WHITE CHEVAUCHANT ══════════════════════════════════ */}
      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        >

          {/* ── SECTION INFORMATIONS ────────────────────────────────────── */}
          <SectionTitle label="INFORMATIONS" />
          <SettingsCard>
            <SettingsRow
              icon="location-outline"
              iconBgColor={Colors.primaryLight}
              iconColor={Colors.primary}
              subtitle="Zone géographique"
              title={locationLabel}
            />
            <SettingsRow
              icon="call-outline"
              iconBgColor={Colors.primaryLight}
              iconColor={Colors.primary}
              subtitle="Téléphone"
              title={phoneDisplay}
            />
            <SettingsRow
              icon="leaf-outline"
              iconBgColor={Colors.primaryLight}
              iconColor={Colors.primary}
              subtitle="Culture Principale"
              title={cropDisplay}
              hideDivider
            />
          </SettingsCard>

          {/* ── SECTION PARAMÈTRES ───────────────────────────────────────── */}
          <SectionTitle label="PARAMÈTRES" />
          <SettingsCard>
            <SettingsRow
              icon="headset-outline"
              iconBgColor="#FEF3E2"
              iconColor={Colors.accent}
              title="Assistance Coopérative CAPED"
              subtitle="+225 05 65 69 72 63"
              onPress={handleSupport}
            />
            <SettingsRow
              icon="trash-outline"
              iconBgColor="#FEE2E2"
              iconColor={Colors.error}
              title="Vider l'historique"
              subtitle="Supprimer toutes les conversations"
              onPress={clearHistory}
              isDestructive
            />
            <SettingsRow
              icon="information-circle-outline"
              iconBgColor={Colors.primaryLight}
              iconColor={Colors.primary}
              title="À propos de CoopIA"
              subtitle="Version 1.0.0 • CAPED"
              onPress={handleAbout}
            />
            <SettingsRow
              icon="exit-outline"
              title="Déconnexion"
              onPress={handleLogout}
              isDestructive
              hideDivider
            />
          </SettingsCard>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },

  // ─── En-tête vert ──────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 22,
    paddingBottom: 44,
  },

  headerPageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
    marginBottom: 20,
  },

  avatarSection: {
    alignItems: 'center',
    gap: 10,
  },

  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Anneau translucide autour de l'avatar
  avatarRing: {
    padding: 5,
    borderRadius: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.30)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Cercle sombre avec l'initiale
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },

  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    backgroundColor: Colors.white,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: { elevation: 4 },
    }),
  },

  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  // Pill lieu effet verre
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  locationPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.90)',
  },

  // ─── Conteneur off-white chevauchant ──────────────────────────────────────
  sheet: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    overflow: 'hidden',
  },

  scroll: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },

  // ─── Titre de section ──────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },

  // ─── Card groupée ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
});
