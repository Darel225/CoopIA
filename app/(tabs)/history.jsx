/**
 * CoopIA — History Screen (tabs/history.jsx)
 *
 * Layout : En-tête vert plein → Conteneur blanc chevauchant (borderRadius 28px).
 * LOGIQUE BACK-END INTÉGRALEMENT PRÉSERVÉE :
 *   - fetch /history/get-history
 *   - groupBySection, getSectionLabel, formatTime, getStatusStyle
 *   - useFocusEffect pour le rechargement
 */

import React, { useState, useCallback } from 'react';
import { BASE_URL } from '../../constants/api';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';
import { useUserStore } from '../../store/useUserStore';
import HistoryCard from '../../components/history/HistoryCard';
import * as SecureStore from 'expo-secure-store';
import { chatService } from '../../services/chatService';

async function getToken() {
  if (Platform.OS !== 'web') {
    return await SecureStore.getItemAsync('userToken');
  } else {
    try { return localStorage.getItem('userToken'); } catch (e) { return null; }
  }
}

// ─── Utilitaires (LOGIQUE PRÉSERVÉE) ─────────────────────────────────────────
function getSectionLabel(createdAt) {
  const now  = new Date();
  const date = new Date(createdAt);
  const diff = Math.floor((now - date) / 86_400_000);
  if (diff === 0)  return "Aujourd'hui";
  if (diff === 1)  return 'Hier';
  if (diff <= 6)   return 'Cette semaine';
  if (diff <= 13)  return 'La semaine dernière';
  if (diff <= 30)  return 'Ce mois-ci';
  return 'Plus anciennes';
}

function formatTime(createdAt) {
  const now  = new Date();
  const date = new Date(createdAt);
  const diff = Math.floor((now - date) / 86_400_000);
  if (diff === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff <= 6)  return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function groupBySection(items) {
  const order = [];
  const map   = {};
  for (const item of items) {
    const label = getSectionLabel(item.created_at);
    if (!map[label]) { map[label] = []; order.push(label); }
    map[label].push(item);
  }
  return order.map(label => ({ label, items: map[label] }));
}

// ─── État vide ────────────────────────────────────────────────────────────────
function EmptyState({ onGoToChat }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="leaf-outline" size={36} color={Colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Aucune activité trouvée</Text>
      <Text style={styles.emptyText}>
        Lancez une conversation avec l'IA ou déclarez une récolte pour voir vos activités ici.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onGoToChat}>
        <Ionicons name="sparkles" size={14} color={Colors.white} />
        <Text style={styles.emptyBtnText}>Ouvrir l'Assistant IA</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { avatar, firstName, prenom, nom, email } = useUserStore();

  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [query,         setQuery]         = useState('');

  const displayName = firstName || prenom || (nom ? nom.split(' ')[0] : 'Planteur');
  const initials    = ((prenom || '')[0] || (firstName || 'K')[0]).toUpperCase();

  // ─── Fetch historique (LOGIQUE PRÉSERVÉE) ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      async function fetchHistory() {
        setLoading(true);
        try {
          const token = await getToken();
          if (!token) {
            router.replace('/(auth)/login');
            return;
          }
          const rows = await chatService.getSessions(token);
          setConversations(rows || []);
        } catch (error) {
          if (__DEV__) { console.error('[HistoryScreen]', error); }
          if (error.message && error.message.includes('401')) {
            router.replace('/(auth)/login');
          } else {
            setConversations([]);
          }
        } finally {
          setLoading(false);
        }
      }
      fetchHistory();
    }, [])
  );

  // ─── Filtrage par recherche ────────────────────────────────────────────────
  const filtered = query.trim()
    ? conversations.filter(c =>
        c.title?.toLowerCase().includes(query.toLowerCase())
      )
    : conversations;

  const sections  = groupBySection(filtered);
  const totalCount = filtered.length;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* ══ EN-TÊTE VERT ═══════════════════════════════════════════════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {/* Ligne avatar + titre */}
        <View style={styles.headerTop}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Historique 👋</Text>
            <Text style={styles.headerSubtitle}>Retrouvez vos diagnostics et récoltes</Text>
          </View>
        </View>

        {/* Barre de recherche effet verre */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.60)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une parcelle ou action..."
            placeholderTextColor="rgba(255,255,255,0.50)"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.60)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══ CONTENEUR BLANC CHEVAUCHANT ════════════════════════════════════ */}
      <View style={styles.sheet}>
        {/* Poignée */}
        <View style={styles.handle} />

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ACTIVITÉS RÉCENTES</Text>
          {totalCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{totalCount}</Text>
            </View>
          )}
        </View>

        {/* Liste défilable */}
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : sections.length === 0 ? (
            <EmptyState onGoToChat={() => router.push('/(tabs)/ai-chat')} />
          ) : (
            sections.map((section) => (
              <View key={section.label}>
                {/* Date de section */}
                <Text style={styles.dateSeparator}>{section.label.toUpperCase()}</Text>

                {/* Cartes */}
                {section.items.map((item, idx) => (
                  <View key={String(item.id)}>
                    <HistoryCard
                      item={{ ...item, titre: item.title }}
                      formatTime={formatTime}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/ai-chat',
                          params: {
                            sessionId: String(item.id),
                            titre:     item.title,
                          },
                        })
                      }
                    />
                    {idx < section.items.length - 1 && <View style={styles.separator} />}
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },

  // ─── En-tête vert ─────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.white },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 2,
  },

  // Barre de recherche effet verre
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.white,
    paddingVertical: 0,
  },

  // ─── Conteneur blanc chevauchant ──────────────────────────────────────────
  sheet: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    // Remonte de 20px pour chevaucher le header
    marginTop: -20,
    paddingTop: 12,
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.8,
  },
  countBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center', alignItems: 'center',
  },
  countText: { fontSize: 12, fontWeight: '800', color: Colors.white },

  // ─── Liste ────────────────────────────────────────────────────────────────
  list: { flex: 1 },

  dateSeparator: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 4,
  },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
    marginLeft: 78,  // Aligné après l'icône
  },

  // ─── Chargement ───────────────────────────────────────────────────────────
  loadingState: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 60, gap: 14,
  },
  loadingText: { ...Typography.bodySmall, color: Colors.textLight },

  // ─── État vide ────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { ...Typography.h2, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText:  { ...Typography.body, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
