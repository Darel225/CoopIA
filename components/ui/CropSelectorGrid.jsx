/**
 * CoopIA - CropSelectorGrid
 *
 * Selecteur des 3 filieres officielles de la cooperative :
 * - Cacao (CCC)
 * - Cafe (Robusta / Arabica)
 * - Anacarde (CCA)
 *
 * Disposition optimisee en 3 colonnes equilibrees (1 rangee de 3 cartes).
 *
 * Props :
 *   selected     {string[]}   - IDs des cultures selectionnees (ex: ['cacao'])
 *   onToggle     {func}       - Callback(id) appele au tap sur une carte
 *   multiSelect  {boolean}    - Autorise plusieurs selections (defaut: false)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

// Catalogue officiel des 3 cultures gerees par CoopIA
const CROPS = [
  {
    id: 'cacao',
    title: 'Cacao',
    subtitle: 'Fèves & cabosses',
    IconComponent: MaterialCommunityIcons,
    iconName: 'fruit-grapes-outline',
  },
  {
    id: 'cafe',
    title: 'Café',
    subtitle: 'Robusta / Arabica',
    IconComponent: Ionicons,
    iconName: 'cafe-outline',
  },
  {
    id: 'anacarde',
    title: 'Anacarde',
    subtitle: 'Noix de cajou (CCA)',
    IconComponent: MaterialCommunityIcons,
    iconName: 'seed-outline',
  },
];

export default function CropSelectorGrid({ selected = [], onToggle, multiSelect = false }) {
  const handlePress = (id) => {
    if (!multiSelect) {
      // Mono-selection : on deselectionne si deja actif
      onToggle(selected.includes(id) ? [] : [id]);
    } else {
      // Multi-selection : toggle
      const next = selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id];
      onToggle(next);
    }
  };

  return (
    <View style={styles.grid}>
      {CROPS.map((crop) => {
        const isSelected = selected.includes(crop.id);
        const { IconComponent } = crop;

        return (
          <TouchableOpacity
            key={crop.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => handlePress(crop.id)}
            activeOpacity={0.75}
          >
            {/* Rangee du haut : Icone culture + Checkmark */}
            <View style={styles.cardTop}>
              <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                <IconComponent
                  name={crop.iconName}
                  size={22}
                  color={isSelected ? Colors.primary : Colors.textMuted}
                />
              </View>

              {/* Checkmark */}
              <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                )}
              </View>
            </View>

            {/* Corps : Titre et sous-titre */}
            <View style={styles.cardBody}>
              <Text
                style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}
                numberOfLines={1}
              >
                {crop.title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {crop.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Grille 3 colonnes equilibrees
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 8,
  },

  // Carte culture
  card: {
    flex: 1,
    minHeight: 114,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    padding: 10,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },

  // Etat selectionne : fond vert clair + bordure verte marquee
  cardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },

  // Haut de carte : icone + checkmark
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  // Boite arrondie pour l'icone
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSelected: {
    backgroundColor: Colors.white,
  },

  // Cercle de validation
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // Corps de la carte
  cardBody: {
    gap: 2,
  },
  cardTitle: {
    ...Typography.h3,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  cardTitleSelected: {
    color: Colors.primaryDark,
  },
  cardSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 10.5,
    lineHeight: 14,
  },
});
