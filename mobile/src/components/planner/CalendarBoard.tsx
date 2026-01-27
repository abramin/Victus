import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { usePlannerContext, type SessionDragData } from '../../context/PlannerContext';
import { DayDropZone } from './DayDropZone';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarBoardProps {
  onSessionDrop: (date: string, data: SessionDragData) => void;
}

/**
 * The "Board" - a 7-day horizontal calendar grid where sessions can be dropped.
 */
export function CalendarBoard({ onSessionDrop }: CalendarBoardProps) {
  const { getWeekDates, draftDays, getDayLoad, removeSession } = usePlannerContext();

  const weekDates = getWeekDates();

  const handleDrop = useCallback(
    (date: string) => (data: SessionDragData) => {
      onSessionDrop(date, data);
    },
    [onSessionDrop]
  );

  const handleRemoveSession = useCallback(
    (date: string) => (sessionId: string) => {
      removeSession(date, sessionId);
    },
    [removeSession]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      snapToInterval={CARD_WIDTH + CARD_GAP}
      decelerationRate="fast"
    >
      {weekDates.map((date, index) => {
        const dayData = draftDays.get(date);
        const sessions = dayData?.sessions ?? [];
        const dayType = dayData?.dayType ?? null;
        const totalLoad = getDayLoad(date);

        // Parse date for display
        const dateObj = new Date(date + 'T00:00:00');
        const dayNumber = dateObj.getDate();

        return (
          <View key={date} style={styles.dayColumn}>
            <DayDropZone
              date={date}
              dayName={DAY_NAMES[index]}
              dayNumber={dayNumber}
              sessions={sessions}
              dayType={dayType}
              totalLoad={totalLoad}
              onDrop={handleDrop(date)}
              onRemoveSession={handleRemoveSession(date)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(140, (SCREEN_WIDTH - 48) / 3); // Fit ~2.5 cards on screen
const CARD_GAP = 10;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: CARD_GAP,
  },
  dayColumn: {
    width: CARD_WIDTH,
  },
});
