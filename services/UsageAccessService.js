import { NativeModules, Platform } from 'react-native';

const { UsageStatsModule } = NativeModules;

export async function hasUsageAccessPermission() {
  if (Platform.OS !== 'android' || !UsageStatsModule?.hasUsageStatsPermission) {
    return false;
  }

  try {
    return await UsageStatsModule.hasUsageStatsPermission();
  } catch (error) {
    console.warn('UsageAccessService: permission check failed', error?.message);
    return false;
  }
}

export async function openUsageAccessSettings() {
  if (Platform.OS !== 'android' || !UsageStatsModule?.openUsageAccessSettings) {
    return;
  }

  try {
    await UsageStatsModule.openUsageAccessSettings();
  } catch (error) {
    console.warn('UsageAccessService: could not open settings', error?.message);
  }
}

export async function getUsageStatsBetween(startTime, endTime) {
  if (Platform.OS !== 'android' || !UsageStatsModule?.getUsageStats) {
    return [];
  }

  try {
    const result = await UsageStatsModule.getUsageStats(startTime, endTime);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    if (error?.code !== 'E_USAGE_PERMISSION') {
      console.warn('UsageAccessService: stats fetch failed', error?.message);
    }
    return [];
  }
}

export function getStartOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}
