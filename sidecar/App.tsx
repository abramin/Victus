import React, { useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { StatusRing, PayloadPreview, ServerUrlInput, SyncButton } from './src/components';
import { useServerUrl, useSyncState, useHealthKit } from './src/hooks';
import { syncHealthData, validateServerUrl } from './src/api/client';

export default function App() {
  const { serverUrl, setServerUrl, isLoading: isLoadingUrl } = useServerUrl();
  const syncState = useSyncState();
  const healthKit = useHealthKit();

  // Update sync state payload when HealthKit metrics change
  useEffect(() => {
    if (healthKit.metrics) {
      syncState.setPayload(healthKit.metrics);
    }
  }, [healthKit.metrics]);

  // Handle sync button press
  const handleSync = useCallback(async () => {
    // Validate server URL
    const urlError = validateServerUrl(serverUrl);
    if (urlError) {
      syncState.setError(urlError);
      return;
    }

    // Check HealthKit permissions
    if (healthKit.status === 'denied') {
      healthKit.promptForPermissions();
      return;
    }

    if (healthKit.status !== 'authorized') {
      syncState.setError('HealthKit not available');
      return;
    }

    // Refresh metrics and sync
    await healthKit.refreshMetrics();
    const payload = healthKit.metrics;

    if (!payload || Object.keys(payload).length === 0) {
      syncState.setError('No HealthKit data available');
      return;
    }

    syncState.setSyncing(payload);

    try {
      await syncHealthData(serverUrl, payload);
      syncState.setSuccess();
    } catch (error) {
      syncState.setError(
        error instanceof Error ? error.message : 'Sync failed'
      );
    }
  }, [serverUrl, healthKit, syncState]);

  // Determine if sync is disabled
  const isSyncDisabled =
    isLoadingUrl ||
    healthKit.status === 'loading' ||
    healthKit.status === 'unavailable';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Victus Sync</Text>
            <Text style={styles.subtitle}>HealthKit to Victus</Text>
          </View>

          {/* Status Ring */}
          <StatusRing
            status={syncState.status}
            lastSyncTime={syncState.lastSyncTime}
            errorMessage={syncState.errorMessage}
          />

          {/* HealthKit Status Warning */}
          {healthKit.status === 'denied' && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                HealthKit access denied. Tap to open Settings.
              </Text>
            </View>
          )}

          {healthKit.status === 'unavailable' && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                HealthKit is only available on iOS devices.
              </Text>
            </View>
          )}

          {/* Payload Preview */}
          <PayloadPreview
            payload={syncState.payload || healthKit.metrics}
            isLoading={healthKit.status === 'loading' || healthKit.isRefreshing}
          />

          {/* Server URL Input */}
          <ServerUrlInput
            value={serverUrl}
            onChange={setServerUrl}
            disabled={syncState.status === 'syncing'}
          />

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Sync Button */}
          <SyncButton
            status={syncState.status}
            onPress={handleSync}
            disabled={isSyncDisabled}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  warningBanner: {
    backgroundColor: '#7c2d12',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    color: '#fed7aa',
    fontSize: 14,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
});
