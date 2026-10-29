/**
 * CoopIA — Home Dashboard (tabs/index.jsx)
 *
 * RÈGLE CRITIQUE ScrollView :
 *   → Les enfants directs d'un ScrollView ne doivent JAMAIS avoir flex:1.
 *
 * PATTERN RETENU :
 *   contentContainerStyle={{ flexGrow:1, justifyContent:'space-between' }}
 *   → Données 100% dynamiques :
 *     - Météo agricole connectée en temps réel (/weather/current)
 *     - Dernière activité connectée avec rechargement au focus (/activities/latest)
 *     - Pull-to-refresh natif (RefreshControl)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUserStore } from '../../store/useUserStore';
import WeatherWidget from '../../components/home/WeatherWidget';
import ActionCard from '../../components/home/ActionCard';
import AlertItem from '../../components/home/AlertItem';
import * as SecureStore from 'expo-secure-store';
import { chatService } from '../../services/chatService';
import { BASE_URL } from '../../constants/api';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

// ─── Actions rapides ──────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: 'harvest',
    iconName:    'scale-outline',
    iconBgColor: Colors.primaryLight,
    iconColor:   Colors.primary,
    title:       'Déclarer une récolte',
    subtitle:    'Pesée, bordereau et sacs de fèves',
    route:       '/(tabs)/ai-chat',
  },
  {
    id: 'diagnose',
    iconName:    'camera-outline',
    iconBgColor: '#FEF3E2',
    iconColor:   Colors.accent,
    title:       'Signaler une maladie',
    subtitle:    'Diagnostic IA instantané par photo',
    route:       '/(tabs)/ai-chat',
  },
];

// Helper pour formater les temps relatifs en français
function formatRelativeTime(dateString) {
  if (!dateString) return 'Récemment';
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch (e) {
    return 'Récemment';
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cooperative_name, firstName, prenom, nom, quartier, ville, userId } = useUserStore();

  const displayName =
    firstName || prenom || (nom ? nom.split(' ')[0] : null) || 'Planteur';

  const initials = (() => {
    const p = prenom || '';
    const n = nom   || '';
    if (p && n) return `${p[0]}${n[0]}`.toUpperCase();
    if (p)      return p.substring(0, 2).toUpperCase();
    if (n)      return n.substring(0, 2).toUpperCase();
    return 'AG';
  })();

  const [latestActivity, setLatestActivity] = useState(null);

  // Rinitialiser l'activit ds que l'utilisateur change
  useEffect(() => {
    setLatestActivity(null);
  }, [userId]);
  const [weather, setWeather] = useState({
    temperature: '28°C',
    condition: 'Ensoleillé voilé',
    icon: 'partly-sunny-outline',
    alert: 'Temps sec et stable •',
    advice: "Conditions favorables pour les récoltes et soins",
    locality: ville || quartier || null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Fonction centrale de synchronisation temps réel
  const fetchDashboardData = useCallback(async () => {
    try {
      let token = null;
      if (Platform.OS !== 'web') {
        token = await SecureStore.getItemAsync('userToken');
      } else {
        token = localStorage.getItem('userToken');
      }

      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      // 1. Météo agricole connectée
      setLoadingWeather(true);
      fetch(`${BASE_URL}/weather/current`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((wData) => {
          if (wData && wData.temperature) {
            setWeather({
              temperature: wData.temperature,
              condition: wData.condition,
              icon: wData.icon,
              alert: wData.alert,
              advice: wData.advice,
              locality: wData.locality || ville || quartier,
            });
          }
        })
        .catch((e) => {
          if (__DEV__) console.log('[HomeScreen.fetchWeather]', e);
        })
        .finally(() => {
          setLoadingWeather(false);
        });

      // 2. Dernière activité connectée
      fetch(`${BASE_URL}/activities/latest`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((aData) => {
          if (aData && aData.title) {
            setLatestActivity(aData);
          } else {
            setLatestActivity(null);
          }
        })
        .catch((e) => {
          if (__DEV__) console.log('[HomeScreen.fetchActivity]', e);
          setLatestActivity(null);
        });
    } catch (e) {
      if (__DEV__) console.log('[HomeScreen.fetchDashboardData]', e);
    }
  }, [ville, quartier]);

  // Rechargement automatique dès que l'écran reprend le focus (ex: retour du chat ou des photos)
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // Pull-to-refresh utilisateur
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  const location = quartier
    ? `${quartier}${ville ? ` • ${ville}` : ` • ${cooperative_name || 'Coopérative CAPED'}`}`
    : (cooperative_name || 'Coopérative CAPED');

  // Détermination visuelle dynamique de la carte d'activité
  const activityConfig = (() => {
    if (!latestActivity) {
      return {
        iconName: 'leaf-outline',
        iconBgColor: Colors.primaryLight,
        iconColor: Colors.primary,
        title: 'Bienvenue sur CoopIA',
        subtitle: `${cooperative_name || 'Coopérative CAPED'} • Prêt pour vos déclarations`,
        timestamp: "À l'instant",
        statusLabel: 'Prêt',
        statusColor: Colors.primary,
        statusBg: `${Colors.primary}18`,
        actionLabel: 'Démarrer',
        onAction: () => router.push('/(tabs)/ai-chat'),
      };
    }

    const titleLower = String(latestActivity.title || '').toLowerCase();
    const isDisease = latestActivity.type === 'DISEASE_WARNING' || titleLower.includes('maladie') || titleLower.includes('diagnos') || titleLower.includes('cabosse') || titleLower.includes('pourriture');
    const isHarvest = latestActivity.type === 'HARVEST_LOG' || titleLower.includes('récolte') || titleLower.includes('recolte') || titleLower.includes('sac') || titleLower.includes('kg') || titleLower.includes('bordereau') || titleLower.includes('bdr');
    const isDanger = latestActivity.ui_color_tag === 'danger';

    let iconName = 'chatbubble-ellipses-outline';
    let iconBgColor = Colors.primaryLight;
    let iconColor = Colors.primary;
    let statusLabel = 'Validé';
    let statusColor = Colors.primary;
    let statusBg = `${Colors.primary}18`;
    let actionLabel = 'Voir détails';

    if (isDisease) {
      iconName = isDanger ? 'alert-circle-outline' : 'warning-outline';
      iconBgColor = isDanger ? `${Colors.error}18` : Colors.accentLight;
      iconColor = isDanger ? Colors.error : Colors.accent;
      statusLabel = isDanger ? 'Alerte critique' : 'Action requise';
      statusColor = isDanger ? Colors.error : Colors.accent;
      statusBg = isDanger ? `${Colors.error}18` : `${Colors.accent}18`;
      actionLabel = 'Consulter le guide';
    } else if (isHarvest) {
      iconName = 'scale-outline';
      iconBgColor = Colors.primaryLight;
      iconColor = Colors.primary;
      statusLabel = 'Validé';
      statusColor = Colors.primary;
      statusBg = `${Colors.primary}18`;
      actionLabel = 'Voir détails';
    } else {
      iconName = 'chatbubble-ellipses-outline';
      iconBgColor = Colors.primaryLight;
      iconColor = Colors.primary;
      statusLabel = 'Validé';
      statusColor = Colors.primary;
      statusBg = `${Colors.primary}18`;
      actionLabel = 'Voir détails';
    }

    return {
      iconName,
      iconBgColor,
      iconColor,
      title: latestActivity.title,
      subtitle: latestActivity.subtitle || 'Activité enregistrée',
      timestamp: formatRelativeTime(latestActivity.created_at),
      statusLabel,
      statusColor,
      statusBg,
      actionLabel,
      onAction: async () => {
        try {
          const targetSessionId = latestActivity?.session_id || (latestActivity?.type === 'CHAT_CONVERSATION' ? latestActivity?.id : null);
          if (targetSessionId) {
            router.push({
              pathname: '/(tabs)/ai-chat',
              params: {
                sessionId: String(targetSessionId),
                titre: latestActivity.title,
              },
            });
            return;
          }

          let token = null;
          if (Platform.OS !== 'web') {
            token = await SecureStore.getItemAsync('userToken');
          } else {
            token = localStorage.getItem('userToken');
          }

          if (token) {
            const sessions = await chatService.getSessions(token);
            if (sessions && sessions.length > 0) {
              const targetSession = sessions[0];
              router.push({
                pathname: '/(tabs)/ai-chat',
                params: {
                  sessionId: String(targetSession.id),
                  titre: targetSession.title || latestActivity.title,
                },
              });
              return;
            }
          }

          router.push('/(tabs)/ai-chat');
        } catch (e) {
          router.push('/(tabs)/ai-chat');
        }
      },
    };
  })();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop:    insets.top + 16,
          paddingBottom: insets.bottom + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {/* ── Groupe supérieur — tout ce qui est "fixe" visuellement ── */}
      <View>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Bonjour, {displayName} 👋</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* Widget Météo Dynamique */}
        <View style={styles.block}>
          <WeatherWidget
            temperature={weather.temperature}
            condition={weather.condition}
            alert={weather.alert}
            advice={weather.advice}
            iconName={weather.icon}
            locality={weather.locality}
            loading={loadingWeather}
          />
        </View>

        {/* Actions Rapides */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Actions Rapides</Text>
          <View style={styles.cardStack}>
            {QUICK_ACTIONS.map((action) => (
              <ActionCard
                key={action.id}
                iconName={action.iconName}
                iconBgColor={action.iconBgColor}
                iconColor={action.iconColor}
                title={action.title}
                subtitle={action.subtitle}
                onPress={() => router.push(action.route)}
              />
            ))}
          </View>
        </View>
      </View>

      {/* ── Groupe inférieur — poussé en bas par justifyContent:'space-between' ── */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dernière Activité</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/history')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAll}>Voir tout →</Text>
          </TouchableOpacity>
        </View>

        <AlertItem
          iconName={activityConfig.iconName}
          iconBgColor={activityConfig.iconBgColor}
          iconColor={activityConfig.iconColor}
          title={activityConfig.title}
          subtitle={activityConfig.subtitle}
          timestamp={activityConfig.timestamp}
          statusLabel={activityConfig.statusLabel}
          statusColor={activityConfig.statusColor}
          statusBg={activityConfig.statusBg}
          actionLabel={activityConfig.actionLabel}
          onAction={activityConfig.onAction}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  // ── En-tête ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerText: { flex: 1, gap: 6 },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },

  // ── Blocs internes (hauteur naturelle, jamais de flex) ─────────────────────
  block: {
    marginBottom: 20,
  },
  cardStack: {
    gap: 10,
    marginTop: 12,
  },

  // ── Section Dernière Activité ──────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
});