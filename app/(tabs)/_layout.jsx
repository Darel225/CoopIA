/**
 * CoopIA — Tab Navigator Layout
 *
 * Fix safe area : le tab bar s'adapte dynamiquement aux insets système
 * (Android soft keys, iOS home indicator) via useSafeAreaInsets.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';

const TAB_ICON_SIZE  = 24;
const TAB_BAR_HEIGHT = 60; // Hauteur visible (hors inset)

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // Padding bas dynamique :
  //   - Appareils avec home indicator / soft keys → insets.bottom (16-34 px)
  //   - Appareils sans (vieilles tablettes, émulateur) → fallback 10 px
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth:  1,
          borderTopColor:  Colors.border,
          // Hauteur totale = zone visible + inset système
          height:          TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom:   bottomPadding,
          // Padding haut fixe pour garder l'icône centrée verticalement
          paddingTop:      8,
        },
        tabBarLabelStyle: {
          fontSize:     11,
          fontWeight:   '600',
          letterSpacing: 0.1,
          // Pas de marginBottom supplémentaire — le paddingBottom du bar suffit
        },
        // Désactive l'animation de position par défaut pour éviter le saut visuel
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'star' : 'star-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
