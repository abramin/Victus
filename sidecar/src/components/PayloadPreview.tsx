import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { HealthPayload } from '../api/types';

interface PayloadPreviewProps {
  payload?: HealthPayload | null;
  isLoading?: boolean;
}

const METRIC_LABELS: Record<keyof HealthPayload, string> = {
  steps: 'Steps',
  active_kcal: 'Active kcal',
  rhr: 'Resting HR',
  sleep_hours: 'Sleep',
  weight: 'Weight',
  body_fat: 'Body Fat',
};

const METRIC_UNITS: Record<keyof HealthPayload, string> = {
  steps: '',
  active_kcal: 'kcal',
  rhr: 'bpm',
  sleep_hours: 'hrs',
  weight: 'kg',
  body_fat: '%',
};

export function PayloadPreview({ payload, isLoading }: PayloadPreviewProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Payload Preview</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.loadingText}>Loading HealthKit data...</Text>
        </View>
      </View>
    );
  }

  if (!payload || Object.keys(payload).length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Payload Preview</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.emptyText}>No HealthKit data available</Text>
          <Text style={styles.hintText}>Check HealthKit permissions</Text>
        </View>
      </View>
    );
  }

  // Format as JSON for display
  const jsonStr = JSON.stringify(payload, null, 2);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payload Preview</Text>

      {/* Metric summary cards */}
      <View style={styles.metricsGrid}>
        {(Object.keys(payload) as (keyof HealthPayload)[]).map((key) => {
          const value = payload[key];
          if (value === undefined) return null;
          return (
            <View key={key} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{METRIC_LABELS[key]}</Text>
              <Text style={styles.metricValue}>
                {typeof value === 'number' ? value.toLocaleString() : value}
                {METRIC_UNITS[key] && (
                  <Text style={styles.metricUnit}> {METRIC_UNITS[key]}</Text>
                )}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Raw JSON preview */}
      <ScrollView style={styles.codeContainer} horizontal>
        <Text style={styles.codeText}>{jsonStr}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: '30%',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9ca3af',
  },
  codeContainer: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    maxHeight: 120,
  },
  codeText: {
    fontFamily: 'Menlo',
    fontSize: 12,
    color: '#d1d5db',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  hintText: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
});
