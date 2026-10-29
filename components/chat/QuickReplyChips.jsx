/**
 * CoopIA — QuickReplyChips
 *
 * Suggestions rapides horizontales défilables au-dessus de l'input.
 * Chaque chip envoie son texte dans l'input au tap.
 *
 * Props :
 *   onSelect  {func}    — Callback(text) appelé quand l'utilisateur tap un chip
 *   disabled  {boolean} — Désactive les chips pendant le chargement de l'IA
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

const CHIPS = [
  { id: '1', label: '🚜 J\'ai fini ma récolte' },
  { id: '2', label: '🍂 Ma plante est malade' },
  { id: '3', label: '🤝 Demander un prix' },
  { id: '4', label: '🌿 Conseil fertilisation' },
  { id: '5', label: '📦 Stock disponible' },
];

export default function QuickReplyChips({ onSelect, disabled = false }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {CHIPS.map((chip) => (
        <TouchableOpacity
          key={chip.id}
          style={[styles.chip, disabled && styles.chipDisabled]}
          onPress={() => !disabled && onSelect(chip.label)}
          activeOpacity={0.70}
        >
          <Text style={styles.chipText} numberOfLines={1}>
            {chip.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
});
