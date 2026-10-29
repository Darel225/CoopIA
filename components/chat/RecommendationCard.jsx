import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { Typography } from '../../constants/Styles';

export default function RecommendationCard({ titre, description, is_diagnosis_badge }) {
  if (!titre && !description) return null;
  if (typeof titre !== 'string' && typeof description !== 'string') return null;

  const isConfidenceBadge = is_diagnosis_badge || (typeof titre === 'string' && (titre.includes('🎯') || titre.includes('🌿') || titre.toLowerCase().includes('confiance') || titre.toLowerCase().includes('certitude')));

  if (isConfidenceBadge) {
    const isHealthy = titre.includes('🌿') || titre.toLowerCase().includes('saine');
    const badgeColor = isHealthy ? '#059669' : '#047857';
    const badgeBg = isHealthy ? '#ECFDF5' : '#F0FDF4';
    const borderColor = isHealthy ? '#10B981' : '#34D399';

    return (
      <View style={[styles.card, styles.badgeCard, { backgroundColor: badgeBg, borderColor }]}>
        <View style={[styles.iconCircle, { backgroundColor: isHealthy ? '#D1FAE5' : '#DCFCE7' }]}>
          <Ionicons name={isHealthy ? 'shield-checkmark' : 'shield-checkmark'} size={20} color={badgeColor} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.badgeHeaderRow}>
            <Text style={[styles.title, styles.badgeTitle, { color: badgeColor }]}>{titre}</Text>
          </View>
          {typeof description === 'string' && !!description.trim() && (
            <Text style={[styles.description, styles.badgeDescription]}>{description}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Ionicons name="leaf-outline" size={18} color={Colors.primary} style={styles.icon} accessible={false} />
      <View style={styles.textContainer}>
        {typeof titre === 'string' && !!titre.trim() && (
          <Text style={styles.title}>{titre}</Text>
        )}
        {typeof description === 'string' && !!description.trim() && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    marginTop: 8,
  },
  badgeCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    flexShrink: 1,
  },
  title: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.text,
  },
  badgeDescription: {
    color: '#064E3B',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
});
