import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring, useSharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { LOAD_ZONE_COLORS } from '../../utils/sessionColors';
import { getLoadZone, type LoadZone } from '../../utils/loadCalculations';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface DayLoad {
  date: string;
  load: number;
  projected?: number; // Load if dragged session is dropped
}

interface WeeklyLoadEqualizerProps {
  weekLoads: DayLoad[];
  chronicLoad: number; // For threshold calculation
  hoveredDate?: string | null;
  projectedLoad?: number; // Additional load during drag hover
}

/**
 * A 7-bar equalizer chart showing weekly load distribution.
 * Updates in real-time during drag operations.
 */
export function WeeklyLoadEqualizer({
  weekLoads,
  chronicLoad,
  hoveredDate,
  projectedLoad = 0,
}: WeeklyLoadEqualizerProps) {
  // Calculate max for scaling
  const maxLoad = useMemo(() => {
    const loads = weekLoads.map((d) => d.load + (d.date === hoveredDate ? projectedLoad : 0));
    const overloadThreshold = chronicLoad > 0 ? chronicLoad * 1.5 : 15;
    return Math.max(...loads, overloadThreshold, 10);
  }, [weekLoads, hoveredDate, projectedLoad, chronicLoad]);

  // Threshold line position
  const overloadThreshold = chronicLoad > 0 ? chronicLoad * 1.5 : 15;
  const thresholdY = CHART_HEIGHT - (overloadThreshold / maxLoad) * CHART_HEIGHT;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Load</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: LOAD_ZONE_COLORS.optimal }]} />
            <Text style={styles.legendText}>Optimal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: LOAD_ZONE_COLORS.high }]} />
            <Text style={styles.legendText}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: LOAD_ZONE_COLORS.overload }]} />
            <Text style={styles.legendText}>Overload</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 20}>
          {/* Background grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <Line
              key={ratio}
              x1={0}
              y1={CHART_HEIGHT - ratio * CHART_HEIGHT}
              x2={CHART_WIDTH}
              y2={CHART_HEIGHT - ratio * CHART_HEIGHT}
              stroke="#232a36"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          ))}

          {/* Threshold line */}
          <Line
            x1={0}
            y1={thresholdY}
            x2={CHART_WIDTH}
            y2={thresholdY}
            stroke={LOAD_ZONE_COLORS.overload}
            strokeWidth={1.5}
            strokeDasharray="6,3"
            opacity={0.6}
          />

          {/* Bars */}
          {weekLoads.map((day, index) => {
            const isHovered = day.date === hoveredDate;
            const load = day.load + (isHovered ? projectedLoad : 0);
            const barHeight = (load / maxLoad) * CHART_HEIGHT;
            const acr = chronicLoad > 0 ? load / chronicLoad : 1;
            const zone = getLoadZone(acr);
            const color = load === 0 ? LOAD_ZONE_COLORS.empty : LOAD_ZONE_COLORS[zone];

            const x = index * BAR_TOTAL_WIDTH + BAR_GAP / 2;
            const y = CHART_HEIGHT - barHeight;

            return (
              <React.Fragment key={day.date}>
                {/* Background bar (shows capacity) */}
                <Rect
                  x={x}
                  y={0}
                  width={BAR_WIDTH}
                  height={CHART_HEIGHT}
                  fill="#1a2129"
                  rx={4}
                />
                {/* Actual load bar */}
                <LoadBar
                  x={x}
                  width={BAR_WIDTH}
                  height={barHeight}
                  color={color}
                  isHovered={isHovered}
                />
                {/* Day label */}
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={CHART_HEIGHT + 14}
                  fill="#64748b"
                  fontSize={10}
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {DAY_LABELS[index]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

interface LoadBarProps {
  x: number;
  width: number;
  height: number;
  color: string;
  isHovered: boolean;
}

/**
 * Animated bar that springs to new height.
 */
function LoadBar({ x, width, height, color, isHovered }: LoadBarProps) {
  const animatedHeight = useSharedValue(0);

  // Update height with spring animation
  useAnimatedReaction(
    () => height,
    (newHeight) => {
      animatedHeight.value = withSpring(newHeight, {
        damping: 15,
        stiffness: 120,
      });
    },
    [height]
  );

  const animatedProps = useAnimatedProps(() => ({
    y: CHART_HEIGHT - animatedHeight.value,
    height: Math.max(0, animatedHeight.value),
  }));

  return (
    <AnimatedRect
      x={x}
      width={width}
      fill={color}
      rx={4}
      animatedProps={animatedProps}
      opacity={isHovered ? 1 : 0.85}
    />
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 80;
const BAR_GAP = 8;
const BAR_TOTAL_WIDTH = (CHART_WIDTH - BAR_GAP) / 7;
const BAR_WIDTH = BAR_TOTAL_WIDTH - BAR_GAP;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141a1f',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#64748b',
    fontSize: 10,
  },
  chartContainer: {
    alignItems: 'center',
  },
});
