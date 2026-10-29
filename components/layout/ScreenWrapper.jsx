/**
 * CoopIA — ScreenWrapper
 *
 * Conteneur universel pour tous les écrans.
 * Gère : SafeAreaView + KeyboardAvoidingView + fond de couleur cohérent.
 *
 * Props :
 *   children         {ReactNode}  — Contenu de l'écran
 *   style            {object}     — Styles supplémentaires sur le conteneur interne
 *   withKeyboard     {boolean}    — Active le KeyboardAvoidingView (défaut: false)
 *   noPadding        {boolean}    — Mode edge-to-edge, supprime le padding horizontal (défaut: false)
 *   backgroundColor  {string}    — Couleur de fond (défaut: Colors.background)
 */

import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Colors from '../../constants/Colors';

export default function ScreenWrapper({
  children,
  style,
  withKeyboard = false,
  noPadding = false,
  backgroundColor = Colors.background,
  statusBarStyle = 'dark',
}) {
  const inner = (
    <View
      style={[
        styles.inner,
        !noPadding && styles.paddingH,
        { backgroundColor },
        style,
      ]}
    >
      {children}
    </View>
  );

  const safeContent = (
    <SafeAreaView style={[styles.safe, { backgroundColor }]}>
      <StatusBar style={statusBarStyle} />
      {withKeyboard ? (
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );

  return safeContent;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  paddingH: {
    paddingHorizontal: 24,
  },
});
