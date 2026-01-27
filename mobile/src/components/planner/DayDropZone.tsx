import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Droppable } from 'react-native-reanimated-dnd';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import type { DayType } from '../../api/types';
import {
  usePlannerContext,
  type SessionDragData,
  type PlannedSessionDraft,
} from '../../context/PlannerContext';
import {
  getSessionCategory,
  DAY_TYPE_CONFIG,
  TRAINING_TYPE_EMOJIS,
  TRAINING_TYPE_LABELS,
} from '../../utils/sessionColors';
import { formatLoad } from '../../utils/loadCalculations';

interface DayDropZoneProps {
  date: string;
  dayName: string; // "Mon", "Tue", etc.
  dayNumber: number; // 12, 13, etc.
  sessions: PlannedSessionDraft[];
  dayType: DayType | null;
  totalLoad: number;
  onDrop: (data: SessionDragData) => void;
  onRemoveSession: (sessionId: string) => void;
}

/**
 * A droppable zone representing a single day on the calendar.
 * Shows planned sessions and lights up when a card is dragged over it.
 */
export function DayDropZone({
  date,
  dayName,
  dayNumber,
  sessions,
  dayType,
  totalLoad,
  onDrop,
  onRemoveSession,
}: DayDropZoneProps) {
  const { isDragging, activeDragData } = usePlannerContext();

  // Animation for active state
  const borderOpacity = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleActiveChange = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        borderOpacity.value = withSpring(1);
        scale.value = withSpring(1.02, { damping: 15 });
      } else {
        borderOpacity.value = withSpring(0);
        scale.value = withSpring(1, { damping: 15 });
      }
    },
    [borderOpacity, scale]
  );

  const handleDrop = useCallback(
    (data: SessionDragData) => {
      onDrop(data);
    },
    [onDrop]
  );

  // Border glow style when active
  const activeCategory = activeDragData ? getSessionCategory(activeDragData.trainingType) : null;
  const glowBorderStyle = useAnimatedStyle(() => ({
    borderColor: activeCategory?.color ?? '#2563eb',
    borderWidth: 2,
    opacity: borderOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Day type badge
  const dayTypeConfig = dayType ? DAY_TYPE_CONFIG[dayType] : null;

  // Check if today
  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <Droppable<SessionDragData>
      onDrop={handleDrop}
      droppableId={`day-${date}`}
      onActiveChange={handleActiveChange}
      style={styles.droppableOuter}
    >
      <Animated.View style={[styles.container, containerStyle]}>
        {/* Glow border overlay */}
        <Animated.View style={[styles.glowBorder, glowBorderStyle]} pointerEvents="none" />

        {/* Day header */}
        <View style={styles.header}>
          <View style={styles.dateInfo}>
            <Text style={[styles.dayName, isToday && styles.todayText]}>{dayName}</Text>
            <Text style={[styles.dayNumber, isToday && styles.todayText]}>{dayNumber}</Text>
          </View>
          {dayTypeConfig && (
            <View style={[styles.dayTypeBadge, { backgroundColor: dayTypeConfig.bgColor }]}>
              <Text style={[styles.dayTypeText, { color: dayTypeConfig.color }]}>
                {dayTypeConfig.emoji} {dayTypeConfig.label}
              </Text>
            </View>
          )}
        </View>

        {/* Sessions list */}
        <View style={styles.sessionsContainer}>
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{isDragging ? 'Drop here' : 'No sessions'}</Text>
            </View>
          ) : (
            sessions.map((session) => (
              <SessionChip
                key={session.id}
                session={session}
                onRemove={() => onRemoveSession(session.id)}
              />
            ))
          )}
        </View>

        {/* Load indicator */}
        {totalLoad > 0 && (
          <View style={styles.loadIndicator}>
            <Text style={styles.loadText}>Load: {formatLoad(totalLoad)}</Text>
          </View>
        )}

        {/* Drop preview when dragging */}
        {isDragging && activeDragData && (
          <View style={[styles.dropPreview, { borderColor: activeCategory?.color }]}>
            <Text style={styles.dropPreviewText}>
              + {TRAINING_TYPE_LABELS[activeDragData.trainingType]}
            </Text>
          </View>
        )}
      </Animated.View>
    </Droppable>
  );
}

interface SessionChipProps {
  session: PlannedSessionDraft;
  onRemove: () => void;
}

function SessionChip({ session, onRemove }: SessionChipProps) {
  const category = getSessionCategory(session.trainingType);
  const emoji = TRAINING_TYPE_EMOJIS[session.trainingType];
  const label = TRAINING_TYPE_LABELS[session.trainingType];

  return (
    <View style={[styles.sessionChip, { borderLeftColor: category.color }]}>
      <View style={styles.sessionChipContent}>
        <Text style={styles.sessionEmoji}>{emoji}</Text>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionLabel}>{label}</Text>
          <Text style={styles.sessionDuration}>{session.durationMin}m</Text>
        </View>
      </View>
      <Pressable onPress={onRemove} style={styles.removeButton} hitSlop={8}>
        <Trash2 size={14} color="#64748b" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  droppableOuter: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a2129',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#232a36',
    minHeight: 140,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBorder: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#232a36',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dayName: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  dayNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  todayText: {
    color: '#2563eb',
  },
  dayTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dayTypeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sessionsContainer: {
    flex: 1,
    padding: 6,
    gap: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 12,
  },
  sessionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#232a36',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderLeftWidth: 3,
  },
  sessionChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionEmoji: {
    fontSize: 14,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  sessionDuration: {
    color: '#64748b',
    fontSize: 11,
  },
  removeButton: {
    padding: 4,
  },
  loadIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 6,
  },
  loadText: {
    color: '#64748b',
    fontSize: 10,
  },
  dropPreview: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  dropPreviewText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
});
