import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SyncStatus } from '../hooks/useSyncState';

interface StatusRingProps {
  status: SyncStatus;
  lastSyncTime?: Date;
  errorMessage?: string;
}

const STATUS_CONFIG = {
  idle: {
    color: '#6b7280', // gray-500
    text: 'Ready to Sync',
  },
  syncing: {
    color: '#3b82f6', // blue-500
    text: 'Reading HealthKit...',
  },
  success: {
    color: '#22c55e', // green-500
    text: 'Synced!',
  },
  error: {
    color: '#ef4444', // red-500
    text: 'Connection Failed',
  },
};

export function StatusRing({ status, lastSyncTime, errorMessage }: StatusRingProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  // Spinning animation for syncing state
  useEffect(() => {
    if (status === 'syncing') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [status, spinValue]);

  // Pulse animation for idle state
  useEffect(() => {
    if (status === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseValue.setValue(1);
    }
  }, [status, pulseValue]);

  const config = STATUS_CONFIG[status];
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          { borderColor: config.color },
          status === 'syncing' && { transform: [{ rotate: spin }] },
          status === 'idle' && { transform: [{ scale: pulseValue }] },
        ]}
      >
        <View style={[styles.ringInner, { backgroundColor: config.color + '20' }]} />
      </Animated.View>

      <Text style={[styles.statusText, { color: config.color }]}>
        {errorMessage || config.text}
      </Text>

      {status === 'success' && lastSyncTime && (
        <Text style={styles.timestampText}>{formatTime(lastSyncTime)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  ring: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  timestampText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});
