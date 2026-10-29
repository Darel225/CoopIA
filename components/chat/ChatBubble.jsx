import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import RecommendationCard from './RecommendationCard';

// ─── Composant bulle de chat CoopIA ────────────────────────────────────────
// Remplace l'ancien ChatBubble avec le nouveau style vert/blanc.
export default function ChatBubble({ msg, initials }) {
  const isUser = msg.isUser;

  const isImage = msg.text && typeof msg.text === 'string' && msg.text.startsWith('[IMAGE]');
  const imageUrl = isImage ? msg.text.replace('[IMAGE]', '').trim() : null;

  // Render agricultural recommendations if any
  const recommendations = (!isUser && Array.isArray(msg.recommendations) && msg.recommendations.length > 0)
    ? msg.recommendations : [];

  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
      {/* Avatar IA (gauche) */}
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Ionicons name="leaf" size={16} color={Colors.white} />
        </View>
      )}

      <View style={[styles.msgCol, isUser && { alignItems: 'flex-end' }]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          {isImage ? (
            <View style={{ overflow: 'hidden', borderRadius: 15, marginVertical: 5 }}>
              <Image 
                source={{ uri: imageUrl }} 
                style={{ width: 220, maxWidth: '100%', height: 260, aspectRatio: 0.85 }} 
                resizeMode="cover" 
              />
            </View>
          ) : isUser ? (
            <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{msg.text}</Text>
          ) : (
            <Text style={[styles.bubbleText, styles.bubbleTextAI]}>
              {msg.text}
            </Text>
          )}
        </View>

        {/* Recommendations display */}
        {!isUser && recommendations.map((rec, index) => {
          if (!rec || (typeof rec.titre !== 'string' && typeof rec.description !== 'string')) return null;
          return (
            <RecommendationCard 
              key={`${index}-${rec.titre || ''}`}
              titre={rec.titre}
              description={rec.description}
              is_diagnosis_badge={rec.is_diagnosis_badge}
            />
          );
        })}

        {/* Horodatage */}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{msg.time}</Text>
          {isUser && (
            <Ionicons name="checkmark" size={11} color={Colors.textMuted} style={{ marginLeft: 2 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    elevation: 3, // simplified platform select for web/android
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6,
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
});
