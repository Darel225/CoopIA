/**
 * CoopIA — AI Chat Screen (tabs/ai-chat.jsx)
 *
 * Interface de chat avec l'IA agricole.
 * LOGIQUE MÉTIER INTÉGRALEMENT PRÉSERVÉE (chatService, historique, sessionId).
 * Nouveautés UI : header CoopIA, bulles repensées, QuickReplyChips, MediaUploadSheet.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BASE_URL } from '../../constants/api';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';
import { useUserStore } from '../../store/useUserStore';
import { chatService } from '../../services/chatService';
import TypingIndicator from '../../components/chat/TypingIndicator';
import QuickReplyChips from '../../components/chat/QuickReplyChips';
import MediaUploadSheet from '../../components/chat/MediaUploadSheet';

import ChatBubble from '../../components/chat/ChatBubble';

function mapApiMessage(msg) {
  if (!msg) return null;
  return {
    id: msg.id?.toString() || Date.now().toString(),
    text: msg.text,
    isUser: msg.is_user,
    time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
    recommendations: msg.recommendations || []
  };
}

async function getToken() {
  if (Platform.OS !== 'web') {
    return await SecureStore.getItemAsync('userToken');
  } else {
    try { return localStorage.getItem('userToken'); } catch (e) { return null; }
  }
}

function isValidUuid(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}


// ─── Écran principal ────────────────────────────────────────────────────────
export default function AiChatScreen() {
  const { avatar, firstName, prenom, sessionId: storeSessionId, setUserData } = useUserStore();
  const { prefill, sessionId: historySessionId, titre } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const router = useRouter();

  const validHistoryId = (historySessionId && isValidUuid(historySessionId)) ? historySessionId : null;
  const validStoreId = (storeSessionId && isValidUuid(storeSessionId)) ? storeSessionId : null;
  const [activeSessionId, setActiveSessionId] = useState(validHistoryId || validStoreId || null);

  useEffect(() => {
    if (storeSessionId && !isValidUuid(storeSessionId)) {
      setUserData({ sessionId: null });
    }
  }, [storeSessionId, setUserData]);

  useEffect(() => {
    const validH = (historySessionId && isValidUuid(historySessionId)) ? historySessionId : null;
    const validS = (storeSessionId && isValidUuid(storeSessionId)) ? storeSessionId : null;
    setActiveSessionId(validH || validS || null);
  }, [historySessionId, storeSessionId]);


  const [message,        setMessage]        = useState(prefill || '');
  const [loading,        setLoading]        = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [messages,       setMessages]       = useState([]);
  const [sheetOpen,      setSheetOpen]      = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isPreparingRecord, setIsPreparingRecord] = useState(false);
  const [isRecording,    setIsRecording]    = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationTimerRef = useRef(null);

  // Pré-chauffer le mode audio dès l'ouverture de l'écran pour éliminer tout temps d'initialisation
  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch (e) {}
    })();
  }, []);

  const displayName = firstName || prenom || 'Planteur';
  const initials    = ((prenom || '')[0] || (firstName || 'A')[0]).toUpperCase();

  // Prefill depuis l'historique
  useEffect(() => { if (prefill) setMessage(prefill); }, [prefill]);

  // Réinitialisation au focus sans historySessionId
  useFocusEffect(
    useCallback(() => {
      if (!historySessionId) { 
        setMessages([]); 
        setLoadingHistory(false); 
        setActiveSessionId(null);
      }
    }, [historySessionId])
  );

  // Chargement de l'historique de conversation
  useEffect(() => {
    if (!historySessionId) return;
    async function loadConversation() {
      setLoadingHistory(true);
      try {
        const token = await getToken();
        if (!token) {
          router.replace('/(auth)/login');
          return;
        }
        const rows = await chatService.getSessionMessages(historySessionId, token);
        if (rows?.length > 0) {
          setMessages(rows.map(mapApiMessage));
          setActiveSessionId(historySessionId);
        } else {
          setMessages([]);
        }
      } catch (error) {
        if (__DEV__) { console.error('[AiChat] Historique:', error); }
        if (error.message && error.message.includes('401')) {
          router.replace('/(auth)/login');
        } else if (error.message && error.message.includes('404')) {
          setMessages([]);
          setActiveSessionId(null);
        }
      } finally {
        setLoadingHistory(false);
      }
    }
    loadConversation();
  }, [historySessionId]);

  // Scroll automatique vers le bas
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages, loading]);

  const now = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // ─── Envoi message texte ──────────────────────────────────────────────────
  const handleSend = async () => {
    const text = message.trim();
    if (!text || text.length > 1000) return;
    setMessage('');
    setSheetOpen(false);
    const userMsg = { id: Date.now().toString(), text, isUser: true, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }
      const response = await chatService.sendMessage(text, activeSessionId, token);
      if (response.session_id) {
        setActiveSessionId(response.session_id);
        setUserData({ sessionId: response.session_id });
      }
      const botMsg = mapApiMessage(response.message || response.agent_message);
      if (botMsg) {
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (e) {
      if (__DEV__) { console.error(e); }
      if (e.message && e.message.includes('401')) {
        router.replace('/(auth)/login');
      } else {
        setMessage(text); // Keep text recoverable
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: "Désolé, une erreur est survenue lors de la communication avec le serveur.", isUser: false, time: now() }]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Envoi image (caméra ou galerie) ─────────────────────────────────────
  const handleImageSend = async (source) => {
    setSheetOpen(false);
    const { status } = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès dans les paramètres.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const asset = result.assets[0];
      const uri = asset.uri;

      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        Alert.alert("Fichier trop volumineux", "L'image dépasse la taille maximale de 10 Mo.");
        return;
      }

      const fileExt = uri.split('.').pop()?.toLowerCase();
      let derivedMime = 'image/jpeg';
      if (fileExt === 'png') derivedMime = 'image/png';
      else if (fileExt === 'webp') derivedMime = 'image/webp';
      else if (fileExt === 'heic') derivedMime = 'image/heic';
      else if (fileExt === 'heif') derivedMime = 'image/heif';

      const mimeType = asset.mimeType || derivedMime;
      const fileName = asset.fileName || `diagnostic-${Date.now()}.${fileExt || 'jpg'}`;

      const photoMsgText = `[IMAGE]${uri}`;
      setMessage('');
      const userMsg = { id: Date.now().toString(), text: photoMsgText, isUser: true, time: now() };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);

      try {
        const token = await getToken();
        if (!token) {
          router.replace('/(auth)/login');
          return;
        }

        const response = await chatService.sendDiagnosisImage(uri, mimeType, fileName, activeSessionId, token);
        if (response?.session_id) {
          setActiveSessionId(response.session_id);
          setUserData({ sessionId: response.session_id });
        }
        
        const botMsg = mapApiMessage(response.agent_message);
        if (botMsg) {
          botMsg.id = Date.now().toString();
          botMsg.time = now();
          setMessages(prev => [...prev, botMsg]);
        }
      } catch (e) {
        let errorMsg = "Une erreur est survenue.";
        if (e.status === 401) {
          router.replace('/(auth)/login');
          return;
        } else if (e.status === 413) {
          errorMsg = "Image trop volumineuse (10 Mo maximum).";
        } else if (e.status === 415 || e.status === 422) {
          errorMsg = "Format d'image non pris en charge, essayez une autre photo.";
        } else if (e.status === 503) {
          errorMsg = "Le diagnostic est momentanément indisponible, réessayez plus tard.";
        } else if (e.status === 'TIMEOUT' || (e.message && e.message.toLowerCase().includes('network'))) {
          errorMsg = "Connexion impossible ou trop lente, réessayez.";
        } else if (e.message) {
          errorMsg = e.message;
        }

        const errorBubble = {
          id: Date.now().toString(),
          text: errorMsg,
          isUser: false,
          time: now(),
          recommendations: []
        };
        setMessages(prev => [...prev, errorBubble]);
      } finally {
        setLoading(false);
      }
    }
  };


  // ─── Nettoyage de l'enregistrement au démontage ─────────────────────────
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  // ─── Démarrage de l'enregistrement vocal ─────────────────────────────────
  const startRecording = async () => {
    try {
      setIsPreparingRecord(true);
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        setIsPreparingRecord(false);
        Alert.alert(
          'Permission requise',
          'CoopIA a besoin de votre permission pour utiliser le microphone et transcrire votre message vocal.'
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsPreparingRecord(false);
      setIsRecording(true);
      setRecordingDuration(0);

      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      durationTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setIsPreparingRecord(false);
      setIsRecording(false);
      if (__DEV__) console.log('[startRecording error]', err);
      Alert.alert('Erreur', "Impossible de démarrer l'enregistrement vocal.");
    }
  };

  // ─── Annuler l'enregistrement en cours ────────────────────────────────────
  const cancelRecording = async () => {
    setIsPreparingRecord(false);
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);

    try {
      await audioRecorder.stop();
    } catch (e) {}
  };

  // ─── Arrêter et envoyer pour transcription ──────────────────────────────
  const stopRecordingAndTranscribe = async () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      // Temporisation de 250ms pour capturer la résonance du dernier mot sans coupure
      await new Promise(resolve => setTimeout(resolve, 250));
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) {
        setIsTranscribing(false);
        return;
      }

      const token = await getToken();
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const res = await chatService.transcribeAudio(uri, token);
      if (res && res.text && res.text.trim()) {
        const transcribedText = res.text.trim();
        setMessage(prev => (prev ? `${prev} ${transcribedText}` : transcribedText));
      } else {
        Alert.alert(
          'Message inaudible',
          "Aucune voix distincte n'a été détectée. Veuillez parler plus près du micro et réessayer."
        );
      }
    } catch (err) {
      if (__DEV__) console.log('[transcribeAudio error]', err);
      Alert.alert('Erreur de transcription', err.message || 'Impossible de transcrire le message vocal.');
    } finally {
      setIsTranscribing(false);
      setRecordingDuration(0);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="dark" />
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerLeft}>
          {/* Avatar IA */}
          <View style={styles.aiHeaderAvatar}>
            <Ionicons name="leaf" size={20} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Conseiller CoopIA</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>En ligne • Intelligence Agricole</Text>
            </View>
          </View>
        </View>
        {/* Avatar utilisateur avec initiales */}
        <View style={styles.userAvatar}>
          <Text style={styles.userInitials}>{initials}</Text>
        </View>
      </View>

      {/* ── Liste des messages ────────────────────────────────────── */}
      {loadingHistory ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingStateText}>Chargement de la conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble msg={item} initials={initials} />}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.dateChip}>
              <Text style={styles.dateText}>
                {historySessionId ? (titre || 'Conversation précédente') : "Aujourd'hui, 10:45"}
              </Text>
            </View>
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.typingRow}>
                <View style={styles.aiAvatar}>
                  <Ionicons name="leaf" size={16} color={Colors.white} />
                </View>
                <View style={[styles.bubble, styles.bubbleAI, { paddingVertical: 14 }]}>
                  <TypingIndicator />
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* ── QuickReplyChips ───────────────────────────────────────── */}
      <View style={styles.chipsWrapper}>
        <QuickReplyChips
          onSelect={(text) => setMessage(text)}
          disabled={loading}
        />
      </View>

      {/* ── Barre de saisie ──────────────────────────────────────── */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {/* Bouton + / X (toggle sheet) */}
        <TouchableOpacity
          style={[styles.attachBtn, sheetOpen && styles.attachBtnActive]}
          onPress={() => setSheetOpen(prev => !prev)}
          disabled={loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={sheetOpen ? 'close' : 'add'}
            size={22}
            color={sheetOpen ? Colors.white : Colors.textLight}
          />
        </TouchableOpacity>

        {/* Zone de texte ou Enregistrement vocal */}
        {isPreparingRecord ? (
          <View style={[styles.inputWrap, styles.inputWrapRecording, { borderColor: '#EAB308', backgroundColor: '#FEFCE8' }]}>
            <ActivityIndicator size="small" color="#CA8A04" />
            <Text style={[styles.recordingText, { color: '#CA8A04' }]}>
              Connexion au micro...
            </Text>
          </View>
        ) : isRecording ? (
          <View style={[styles.inputWrap, styles.inputWrapRecording]}>
            <View style={styles.recordingRow}>
              <View style={styles.recordingPulseDot} />
              <Text style={styles.recordingText}>
                🔴 Parlez maintenant ({recordingDuration}s)...
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cancelRecBtn}
              onPress={cancelRecording}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color="#DC2626" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stopRecBtn}
              onPress={stopRecordingAndTranscribe}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ) : isTranscribing ? (
          <View style={[styles.inputWrap, styles.inputWrapTranscribing]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.transcribingText}>Transcription en cours...</Text>
          </View>
        ) : (
          <View style={[styles.inputWrap, message.length > 0 && styles.inputWrapActive]}>
            <TextInput
              style={styles.input}
              placeholder="Décrivez le problème ou posez une question..."
              placeholderTextColor={Colors.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
              returnKeyType="default"
              blurOnSubmit={false}
              editable={!loading}
            />
            {/* Bouton micro fonctionnel */}
            <TouchableOpacity
              onPress={startRecording}
              disabled={loading}
              style={styles.micBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="mic-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bouton envoyer */}
        <TouchableOpacity
          style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || loading}
        >
          <Ionicons name="send" size={16} color={Colors.white} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* ── Bottom Sheet Diagnostic ───────────────────────────────── */}
      <MediaUploadSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCamera={() => handleImageSend('camera')}
        onGallery={() => handleImageSend('gallery')}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },

  // ─── En-tête ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { fontSize: 11, color: Colors.textLight },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: { fontSize: 14, fontWeight: '800', color: Colors.white },

  // ─── État chargement ──────────────────────────────────────────────────────
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingStateText: { ...Typography.bodySmall, color: Colors.textLight },

  // ─── Chat ─────────────────────────────────────────────────────────────────
  chatContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  dateChip: { alignSelf: 'center', backgroundColor: `${Colors.border}CC`, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 20 },
  dateText: { fontSize: 11, color: Colors.textLight, fontWeight: '500', letterSpacing: 0.3 },

  // Ligne de message
  msgRow: { flexDirection: 'row', marginBottom: 18, alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI:   { justifyContent: 'flex-start' },
  msgCol: { maxWidth: '82%' },

  // Avatar IA
  aiAvatar: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },

  // Bulles
  bubble: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 20 },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 5,
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  bubbleAI: {
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: Colors.white },
  bubbleTextAI:   { color: Colors.text },

  // Horodatage

  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginHorizontal: 4 },
  timeText: { fontSize: 10, color: Colors.textMuted },

  // Typing row
  typingRow: { flexDirection: 'row', marginBottom: 18, alignItems: 'flex-end', gap: 8 },

  // ─── Barre de saisie ──────────────────────────────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 6,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },

  // Bouton + / X
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.gray,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 1,
  },
  attachBtnActive: {
    backgroundColor: Colors.primaryDark,
  },

  // Input
  inputWrapRecording: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  inputWrapTranscribing: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  recordingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  transcribingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  cancelRecBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  stopRecBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.gray,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 9, maxHeight: 120,
    gap: 6,
  },
  inputWrapActive: { borderColor: Colors.primary, backgroundColor: Colors.white },
  input: { flex: 1, fontSize: 15, color: Colors.text, maxHeight: 100, lineHeight: 20, paddingTop: 0, paddingBottom: 0 },

  // Bouton envoyer
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginBottom: 1,
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  sendBtnDisabled: { backgroundColor: Colors.border, ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }) },
});


