import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Draggable, DraggableState } from 'react-native-reanimated-dnd';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import type { TrainingConfig, TrainingType } from '../../api/types';
import {
  getSessionCategory,
  TRAINING_TYPE_EMOJIS,
  TRAINING_TYPE_LABELS,
} from '../../utils/sessionColors';
import type { SessionDragData } from '../../context/PlannerContext';

interface DraggableSessionCardProps {
  trainingConfig: TrainingConfig;
  disabled?: boolean;
}

/**
 * A draggable "trading card" representing a training type.
 * Features a glowing border colored by category (strength/cardio/recovery/mixed).
 */
export function DraggableSessionCard({ trainingConfig, disabled }: DraggableSessionCardProps) {
  const { type, loadScore } = trainingConfig;
  const category = getSessionCategory(type);
  const emoji = TRAINING_TYPE_EMOJIS[type];
  const label = TRAINING_TYPE_LABELS[type];

  // Animation values
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.2);

  const handleStateChange = useCallback(
    (state: DraggableState) => {
      if (state === DraggableState.DRAGGING) {
        scale.value = withSpring(1.05, { damping: 15, stiffness: 150 });
        shadowOpacity.value = withSpring(0.5);
      } else {
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        shadowOpacity.value = withSpring(0.2);
      }
    },
    [scale, shadowOpacity]
  );

  // Card animation style
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Glow animation style
  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: shadowOpacity.value,
    shadowColor: category.color,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  }));

  const dragData: SessionDragData = {
    trainingType: type,
    config: trainingConfig,
  };

  // Load indicator bars (0-5 scale)
  const loadBars = Math.min(5, Math.round(loadScore));

  return (
    <Draggable<SessionDragData>
      data={dragData}
      draggableId={`training-${type}`}
      dragDisabled={disabled}
      onStateChange={handleStateChange}
      style={styles.draggableContainer}
    >
      <Animated.View style={[styles.card, cardAnimatedStyle, glowAnimatedStyle]}>
        {/* Glowing border */}
        <View style={[styles.borderGlow, { borderColor: category.borderColor }]}>
          {/* Card content */}
          <View style={styles.cardInner}>
            {/* Emoji icon (large, semi-transparent background) */}
            <Text style={styles.backgroundEmoji}>{emoji}</Text>

            {/* Type label */}
            <Text style={styles.typeLabel}>{label}</Text>

            {/* Load indicator */}
            <View style={styles.loadRow}>
              <Text style={styles.loadLabel}>Load</Text>
              <View style={styles.loadBars}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.loadBar,
                      i <= loadBars
                        ? { backgroundColor: category.color }
                        : { backgroundColor: '#334155' },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Drag handle indicator */}
            <View style={styles.handleIndicator}>
              <Text style={styles.handleDots}>⋮⋮</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Draggable>
  );
}

const styles = StyleSheet.create({
  draggableContainer: {
    marginRight: 12,
  },
  card: {
    width: 110,
    height: 120,
    borderRadius: 12,
    overflow: 'visible',
  },
  borderGlow: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    backgroundColor: '#1a2129',
    padding: 10,
    position: 'relative',
  },
  backgroundEmoji: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 32,
    opacity: 0.15,
  },
  typeLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadRow: {
    marginTop: 'auto',
  },
  loadLabel: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  loadBars: {
    flexDirection: 'row',
    gap: 3,
  },
  loadBar: {
    width: 14,
    height: 6,
    borderRadius: 2,
  },
  handleIndicator: {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  handleDots: {
    color: '#64748b',
    fontSize: 12,
    letterSpacing: -2,
  },
});
