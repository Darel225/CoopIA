/**
 * CoopIA — PhoneInput
 *
 * Champ de saisie téléphonique premium, spécialisé pour la Côte d'Ivoire.
 * Affiche le drapeau 🇨🇮 et le préfixe +225 en préfixe fixe non-modifiable.
 *
 * ANTI-BUG ANDROID : Aucune propriété d'ombre dynamique n'est injectée
 * au focus (cf. bug View Recreation). On utilise uniquement borderColor
 * et backgroundColor comme différenciateurs d'état.
 *
 * Props :
 *   value          {string}   — Valeur du numéro (chiffres uniquement, sans +225)
 *   onChangeText   {func}     — Callback de mise à jour
 *   error          {string}   — Message d'erreur à afficher sous le champ
 *   label          {string}   — Label au-dessus du champ (optionnel)
 *   ...rest        {}         — Toutes les props TextInput standard (returnKeyType, etc.)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

// Numéro ivoirien : 10 chiffres (ex: 0700000000)
const CI_MAX_LENGTH = 10;

export default function PhoneInput({
  value,
  onChangeText,
  error,
  label = 'Numéro de téléphone',
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);

  // Filtre : n'accepte que les chiffres, limite à 10 caractères
  const handleChange = (text) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, CI_MAX_LENGTH);
    onChangeText(digitsOnly);
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* Champ principal */}
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          error   && styles.inputRowError,
        ]}
      >
        {/* ─── Préfixe fixe : Drapeau + Indicatif ─────────────────────── */}
        <View style={styles.prefix}>
          <Text style={styles.flag}>🇨🇮</Text>
          <View style={styles.prefixDivider} />
          <Text style={styles.dialCode}>+225</Text>
        </View>

        {/* ─── Séparateur vertical ─────────────────────────────────────── */}
        <View style={styles.separator} />

        {/* ─── Zone de saisie ──────────────────────────────────────────── */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="07 00 00 00 00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          maxLength={CI_MAX_LENGTH}
          returnKeyType="done"
          textContentType="telephoneNumber"
          autoComplete="tel"
          {...rest}
        />

        {/* ─── Indicateur de complétion ─────────────────────────────────── */}
        {value?.length === CI_MAX_LENGTH && !error && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>

      {/* Message d'erreur */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Hint de format */}
      {!error && (
        <Text style={styles.hint}>Format : 07 00 00 00 00 (10 chiffres)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Conteneur global ─────────────────────────────────────────────────────
  container: {
    width: '100%',
  },

  // ─── Label ────────────────────────────────────────────────────────────────
  label: {
    ...Typography.label,
    marginBottom: 10,
  },

  // ─── Ligne du champ ───────────────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.gray,
    paddingHorizontal: 16,
    // Pré-déclaration des propriétés de rendu Android pour éviter
    // la destruction de vue au focus (bug View Recreation)
    ...Platform.select({
      android: { elevation: 0 },
      ios: {},
    }),
  },

  // État focalisé — UNIQUEMENT borderColor et backgroundColor
  // (pas d'ombre dynamique = pas de bug Android)
  inputRowFocused: {
    borderColor: Colors.borderFocus,
    backgroundColor: Colors.white,
  },

  // État erreur
  inputRowError: {
    borderColor: Colors.error,
    backgroundColor: Colors.white,
  },

  // ─── Préfixe pays ─────────────────────────────────────────────────────────
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
    gap: 8,
  },

  flag: {
    fontSize: 22,
    // Légère correction de hauteur pour l'alignement cross-platform
    lineHeight: Platform.OS === 'android' ? 26 : 28,
  },

  prefixDivider: {
    // Séparateur invisible — l'espacement est géré par `gap`
  },

  dialCode: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },

  // ─── Séparateur vertical entre préfixe et input ───────────────────────────
  separator: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },

  // ─── Zone de saisie ───────────────────────────────────────────────────────
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    // Supprime le padding natif Android pour un alignement parfait
    paddingVertical: 0,
  },

  // ─── Checkmark de complétion ──────────────────────────────────────────────
  checkmark: {
    fontSize: 18,
    color: Colors.success,
    marginLeft: 8,
    fontWeight: '600',
  },

  // ─── Messages de feedback ─────────────────────────────────────────────────
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 4,
  },

  hint: {
    ...Typography.caption,
    marginTop: 6,
    marginLeft: 4,
  },
});
