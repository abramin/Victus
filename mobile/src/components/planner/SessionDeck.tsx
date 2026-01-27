import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { TrainingConfig } from '../../api/types';
import { DraggableSessionCard } from './DraggableSessionCard';
import { SESSION_CATEGORIES } from '../../utils/sessionColors';

interface SessionDeckProps {
  configs: TrainingConfig[];
  loading?: boolean;
}

/**
 * The "Deck" - a horizontal scrollable drawer containing all training type cards.
 * Cards are grouped by category: Strength, Cardio, Recovery, Mixed.
 */
export function SessionDeck({ configs, loading }: SessionDeckProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Library</Text>
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Group configs by category
  const strengthConfigs = configs.filter((c) =>
    SESSION_CATEGORIES.strength.types.includes(c.type)
  );
  const cardioConfigs = configs.filter((c) => SESSION_CATEGORIES.cardio.types.includes(c.type));
  const recoveryConfigs = configs.filter((c) =>
    SESSION_CATEGORIES.recovery.types.includes(c.type)
  );
  const mixedConfigs = configs.filter((c) => SESSION_CATEGORIES.mixed.types.includes(c.type));

  // Combine in display order: strength, cardio, recovery, mixed
  const sortedConfigs = [...strengthConfigs, ...cardioConfigs, ...recoveryConfigs, ...mixedConfigs];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Session Library</Text>
        <Text style={styles.subtitle}>Drag to calendar</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedConfigs.map((config) => (
          <DraggableSessionCard key={config.type} trainingConfig={config} />
        ))}
      </ScrollView>

      {/* Fade edge indicator */}
      <View style={styles.fadeRight} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141a1f',
    borderTopWidth: 1,
    borderTopColor: '#232a36',
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingRight: 32, // Extra space for fade
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 40,
    bottom: 0,
    width: 32,
    backgroundColor: 'transparent',
    // Gradient would be nice but RN doesn't support it natively
    // Could use expo-linear-gradient if desired
  },
});
