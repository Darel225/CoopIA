/**
  Ce fichier construit la page Mon Profil.
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../../constants/Colors';
import { useUserStore } from '../../store/useUserStore';
import SettingsRow from '../../components/ui/SettingsRow';
import CropSelectorGrid from '../../components/ui/CropSelectorGrid';

// ─── affiche un titre de section ────────────────────────────────────────────────────────
const SectionTitle = ({ label }) => (
  <Text style={styles.sectionTitle}>{label}</Text>
);

// ─── met plusieurs lignes de réglages dans un même cadre ──────────────────────────────────────────────
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

  // Recharger les informations depuis le serveur
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

  // ─── Préparer les informations affichées ─────────────────────────────────────────────────────
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
    let local = digits.startsWith('225') ? digits.slice(3) : digits;
    // Si le numéro a 9 chiffres suite à un ancien découpage erroné, restaurer le 0 opérateur (ex: 07...)
    if (local.length === 9 && !local.startsWith('0')) {
      local = '0' + local;
    }
    // Format officiel ivoirien à 10 chiffres (+225 XX XX XX XX XX)
    if (local.length === 10) {
      return `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
    }
    return val.startsWith('+') ? val : `+225 ${val}`;
  };
  const phoneDisplay = formatPhone(rawPhone);
  const cropDisplay = crops && crops.length > 0
    ? crops[0].charAt(0).toUpperCase() + crops[0].slice(1) + ' (Filière Officielle)'
    : 'Cacao (Filière Officielle)';

  // ─── Ouvrir la fenêtre de Modification du profil ────────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleOpenEditModal = () => {
    setEditFullName(displayName !== 'Planteur' ? displayName : '');
    const cleanDigits = (rawPhone || '').replace(/\D/g, '');
    let local = cleanDigits.startsWith('225') ? cleanDigits.slice(3) : cleanDigits;
    if (local.length === 9 && !local.startsWith('0')) local = '0' + local;
    setEditPhone(local);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Nom requis', 'Veuillez saisir votre nom complet.');
      return;
    }

    const cleanDigits = editPhone.replace(/\D/g, '');
    let localPhone = cleanDigits.startsWith('225') ? cleanDigits.slice(3) : cleanDigits;
    if (localPhone.length === 9 && !localPhone.startsWith('0')) localPhone = '0' + localPhone;

    if (localPhone.length !== 10) {
      Alert.alert('Numéro invalide', 'Le numéro de téléphone doit comporter exactement 10 chiffres (ex: 05 56 25 54 95).');
      return;
    }

    const formattedE164 = `+225${localPhone}`;

    setSavingProfile(true);
    try {
      let token = null;
      if (Platform.OS !== 'web') {
        token = await SecureStore.getItemAsync('userToken');
      } else {
        token = localStorage.getItem('userToken');
      }

      if (!token) {
        Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
        return;
      }

      const parts = editFullName.trim().split(' ');
      const pName = parts[0];
      const lName = parts.slice(1).join(' ');

      const response = await fetch(`${BASE_URL}/profile/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: pName,
          last_name: lName,
          nom: lName,
          prenom: pName,
          phone_number: formattedE164,
          telephone: formattedE164,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = data?.user || {};
        setUserData({
          firstName: updatedUser.first_name || pName,
          prenom: updatedUser.first_name || pName,
          nom: updatedUser.last_name || lName,
          phone: updatedUser.phone_number || formattedE164,
          email: updatedUser.phone_number || formattedE164,
        });
        setEditModalVisible(false);
        Alert.alert('✅ Profil mis à jour', 'Vos informations ont été enregistrées avec succès.');
      } else {
        const errData = await response.json().catch(() => ({}));
        Alert.alert('Erreur', errData.detail || 'Impossible de mettre à jour votre profil.');
      }
    } catch (e) {
      if (__DEV__) console.log('[handleSaveProfile error]', e);
      Alert.alert('Erreur', 'Erreur de connexion lors de la mise à jour du profil.');
    } finally {
      setSavingProfile(false);
    }
  };

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
        base64: true,
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
          const safeName = localUri.split('/').pop() || 'avatar.jpg';
          const formData = new FormData();
          const base64Data = result.assets[0].base64;

          let fileAttached = false;
          if (base64Data) {
            try {
              const cleanBase64 = String(base64Data).replace(/[\r\n\t ]/g, '');
              const dataUrl = `data:image/jpeg;base64,${cleanBase64}`;
              const dataResponse = await fetch(dataUrl);
              const dataBlob = await dataResponse.blob();
              if (dataBlob && dataBlob.size > 0) {
                formData.append('file', dataBlob, safeName);
                fileAttached = true;
              }
            } catch (b64Err) {
              console.warn('Profile base64 err:', b64Err);
            }
          }

          if (!fileAttached) {
            try {
              const xhrBlob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = () => resolve(xhr.response);
                xhr.onerror = (e) => reject(new TypeError('XHR file read failed'));
                xhr.responseType = 'blob';
                xhr.open('GET', localUri, true);
                xhr.send(null);
              });
              if (xhrBlob && xhrBlob.size > 0) {
                formData.append('file', xhrBlob, safeName);
                fileAttached = true;
              }
            } catch (err) {
              console.warn('Avatar blob fallback:', err);
            }
          }

          if (!fileAttached) {
            formData.append('file', {
              uri: Platform.OS === 'ios' ? localUri.replace('file://', '') : localUri,
              name: safeName,
              type: 'image/jpeg',
            });
          }

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
              hideChevron
            />
            <SettingsRow
              icon="call-outline"
              iconBgColor={Colors.primaryLight}
              iconColor={Colors.primary}
              subtitle="Téléphone"
              title={phoneDisplay}
              hideChevron
            />
            <SettingsRow
              icon="leaf-outline"
              iconBgColor={Colors.primaryLight}
              iconColor={Colors.primary}
              subtitle="Culture Principale"
              title={cropDisplay}
              hideChevron
            />
            <SettingsRow
              icon="create-outline"
              iconBgColor={Colors.primaryLight}
              iconColor={Colors.primary}
              title="Modifier mes informations"
              subtitle="Nom, prénom et numéro de téléphone"
              onPress={handleOpenEditModal}
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
      {/* ════ MODALE MODIFICATION DU PROFIL ══════════════════════════════════ */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Barre de titre */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier mon profil</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Photo de profil rapide */}
              <TouchableOpacity
                style={styles.modalAvatarRow}
                onPress={handlePickAvatar}
                activeOpacity={0.8}
              >
                <View style={styles.modalAvatarCircle}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.modalAvatarImg} />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                  <View style={styles.modalCameraPill}>
                    <Ionicons name="camera" size={12} color={Colors.white} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalAvatarTitle}>Photo de profil</Text>
                  <Text style={styles.modalAvatarSubtitle}>Appuyez pour changer votre photo</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Champ Nom Complet */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOM ET PRÉNOM</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Ex: Estelle Kouame"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Champ Numéro de Téléphone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NUMÉRO DE TÉLÉPHONE (10 CHIFFRES)</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.ciFlagPrefix}>
                    <Text style={styles.flagText}>🇨🇮 +225</Text>
                  </View>
                  <TextInput
                    style={styles.phoneTextInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="05 56 25 54 95"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={14}
                  />
                </View>
                <Text style={styles.inputHelperText}>Format officiel national (ex: 05 56 25 54 95)</Text>
              </View>

              {/* Cadre Certifié CAPED (Village & Filière en lecture seule) */}
              <View style={styles.certifiedCard}>
                <View style={styles.certifiedHeader}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                  <Text style={styles.certifiedBadgeText}>DONNÉES CADASTRALES CERTIFIÉES</Text>
                </View>

                <View style={styles.certifiedRow}>
                  <View style={styles.certifiedIconBg}>
                    <Ionicons name="location" size={14} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certifiedSubLabel}>Localité / Village</Text>
                    <Text style={styles.certifiedValText}>{locationLabel}</Text>
                  </View>
                  <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                </View>

                <View style={styles.certifiedDivider} />

                <View style={styles.certifiedRow}>
                  <View style={styles.certifiedIconBg}>
                    <Ionicons name="leaf" size={14} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certifiedSubLabel}>Filière Officielle</Text>
                    <Text style={styles.certifiedValText}>{cropDisplay}</Text>
                  </View>
                  <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                </View>

                <Text style={styles.certifiedFooterNote}>
                  🔒 Les données parcellaires sont auditées par la coopérative. Pour toute modification de parcelle ou de filière, contactez l'assistance CAPED.
                </Text>
              </View>

              {/* Bouton de sauvegarde */}
              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && styles.saveBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.8}
              >
                {savingProfile ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // ─── Modale d'édition de profil ───────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  modalScroll: {
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    gap: 12,
  },
  modalAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  modalAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  modalCameraPill: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  modalAvatarSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  ciFlagPrefix: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  flagText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  phoneTextInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  inputHelperText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 5,
    marginLeft: 4,
  },
  certifiedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  certifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  certifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  certifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  certifiedIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certifiedSubLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  certifiedValText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
    marginTop: 1,
  },
  certifiedDivider: {
    height: 1,
    backgroundColor: '#DCFCE7',
    marginVertical: 4,
  },
  certifiedFooterNote: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 10,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});
