import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  HealthInputOptions,
} from 'react-native-health';
import { HealthPayload } from '../api/types';

/**
 * HealthKit permissions required for Victus Sync.
 * Read-only access to step count, active energy, heart rate, sleep, weight, and body fat.
 */
const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.BodyMass,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
    ],
    write: [],
  },
};

/**
 * Gets the start of today in local timezone.
 */
function getStartOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Gets the end of today in local timezone.
 */
function getEndOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

/**
 * Initializes HealthKit and requests permissions.
 * Returns true if permissions were granted, false otherwise.
 */
export function initHealthKit(): Promise<boolean> {
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error: string) => {
      if (error) {
        console.log('HealthKit init error:', error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Gets step count for today (summed).
 * HealthKit Constant: HKQuantityTypeIdentifierStepCount
 */
function getSteps(): Promise<number | undefined> {
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      date: new Date().toISOString(),
      includeManuallyAdded: true,
    };

    AppleHealthKit.getStepCount(options, (err: string, results: HealthValue) => {
      if (err || !results) {
        resolve(undefined);
      } else {
        resolve(Math.round(results.value));
      }
    });
  });
}

/**
 * Gets active energy burned for today (summed).
 * HealthKit Constant: HKQuantityTypeIdentifierActiveEnergyBurned
 */
function getActiveEnergy(): Promise<number | undefined> {
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: getStartOfToday().toISOString(),
      endDate: getEndOfToday().toISOString(),
      includeManuallyAdded: true,
    };

    AppleHealthKit.getActiveEnergyBurned(options, (err: string, results: HealthValue[]) => {
      if (err || !results || results.length === 0) {
        resolve(undefined);
      } else {
        // Sum all active energy samples for today
        const total = results.reduce((sum, sample) => sum + sample.value, 0);
        resolve(Math.round(total));
      }
    });
  });
}

/**
 * Gets resting heart rate (most recent).
 * HealthKit Constant: HKQuantityTypeIdentifierRestingHeartRate
 */
function getRestingHeartRate(): Promise<number | undefined> {
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: getStartOfToday().toISOString(),
      endDate: getEndOfToday().toISOString(),
    };

    AppleHealthKit.getRestingHeartRateSamples(options, (err: string, results: HealthValue[]) => {
      if (err || !results || results.length === 0) {
        resolve(undefined);
      } else {
        // Get most recent (last in array)
        const mostRecent = results[results.length - 1];
        resolve(Math.round(mostRecent.value));
      }
    });
  });
}

/**
 * Gets sleep duration for last night (hours where value === ASLEEP).
 * HealthKit Constant: HKCategoryTypeIdentifierSleepAnalysis
 */
function getSleepHours(): Promise<number | undefined> {
  return new Promise((resolve) => {
    // Look back 24 hours to capture last night's sleep
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0); // Start from 6 PM yesterday

    const options: HealthInputOptions = {
      startDate: yesterday.toISOString(),
      endDate: new Date().toISOString(),
    };

    AppleHealthKit.getSleepSamples(options, (err: string, results: any[]) => {
      if (err || !results || results.length === 0) {
        resolve(undefined);
      } else {
        // Filter for ASLEEP samples and sum duration
        // Sleep values: INBED = 0, ASLEEP = 1, AWAKE = 2, CORE = 3, DEEP = 4, REM = 5
        let totalMinutes = 0;
        for (const sample of results) {
          // Accept ASLEEP (1), CORE (3), DEEP (4), REM (5) as sleep
          if (sample.value === 'ASLEEP' || sample.value === 'CORE' ||
            sample.value === 'DEEP' || sample.value === 'REM' ||
            sample.value === 1 || sample.value === 3 ||
            sample.value === 4 || sample.value === 5) {
            const start = new Date(sample.startDate);
            const end = new Date(sample.endDate);
            const durationMs = end.getTime() - start.getTime();
            totalMinutes += durationMs / (1000 * 60);
          }
        }
        const hours = totalMinutes / 60;
        resolve(hours > 0 ? Math.round(hours * 10) / 10 : undefined);
      }
    });
  });
}

/**
 * Gets most recent weight in kg.
 * HealthKit Constant: HKQuantityTypeIdentifierBodyMass
 */
function getWeight(): Promise<number | undefined> {
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      unit: 'kg',
    };

    AppleHealthKit.getLatestWeight(options, (err: string, results: HealthValue) => {
      if (err || !results) {
        resolve(undefined);
      } else {
        // Round to 1 decimal place
        resolve(Math.round(results.value * 10) / 10);
      }
    });
  });
}

/**
 * Gets most recent body fat percentage.
 * HealthKit Constant: HKQuantityTypeIdentifierBodyFatPercentage
 */
function getBodyFat(): Promise<number | undefined> {
  return new Promise((resolve) => {
    AppleHealthKit.getLatestBodyFatPercentage({}, (err: string, results: HealthValue) => {
      if (err || !results) {
        resolve(undefined);
      } else {
        // HealthKit returns as decimal (0.15 = 15%), convert to percentage
        const percentage = results.value * 100;
        resolve(Math.round(percentage * 10) / 10);
      }
    });
  });
}

/**
 * Fetches all available HealthKit metrics for today.
 * Returns a payload with only the available metrics.
 */
export async function getDailyMetrics(): Promise<HealthPayload> {
  // Fetch all metrics in parallel
  const [steps, activeKcal, rhr, sleepHours, weight, bodyFat] = await Promise.all([
    getSteps(),
    getActiveEnergy(),
    getRestingHeartRate(),
    getSleepHours(),
    getWeight(),
    getBodyFat(),
  ]);

  // Build payload with only defined values
  const payload: HealthPayload = {};

  if (steps !== undefined) payload.steps = steps;
  if (activeKcal !== undefined) payload.active_kcal = activeKcal;
  if (rhr !== undefined) payload.rhr = rhr;
  if (sleepHours !== undefined) payload.sleep_hours = sleepHours;
  if (weight !== undefined) payload.weight = weight;
  if (bodyFat !== undefined) payload.body_fat = bodyFat;

  return payload;
}
