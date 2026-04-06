import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import instance from '../api/api_instance';
import {
  getStartOfToday,
  getUsageStatsBetween,
  hasUsageAccessPermission,
} from './UsageAccessService';
import { getLinkedTrackId, markActivitiesSyncSuccess } from './MonitoringStateService';

const DEVICE_STATUS_ENDPOINT = '/device-status/update';
const ACTIVITIES_ENDPOINT = '/activities';
const SYNC_INTERVAL_MS = 1 * 60 * 1000;
const LAST_USAGE_SYNC_KEY = 'usage-last-synced';
const IGNORED_PACKAGES = new Set([
  'android',
  'com.android.systemui',
  'com.google.android.permissioncontroller',
  'com.kto_kids',
]);

let telemetryInterval = null;
let syncInFlight = false;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeUsageEntries(entries = []) {
  return entries
    .filter((entry) => entry?.packageName && !IGNORED_PACKAGES.has(entry.packageName))
    .map((entry) => ({
      appName: entry?.appName || entry.packageName,
      packageName: entry.packageName,
      totalTimeMinutes: Math.max(0, Math.floor(Number(entry?.totalTimeMinutes || 0))),
    }))
    .filter((entry) => entry.totalTimeMinutes > 0);
}

async function readLastUsageSnapshot(trackId) {
  try {
    const rawValue = await AsyncStorage.getItem(`${LAST_USAGE_SYNC_KEY}:${trackId}`);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('DeviceTelemetryService: could not read usage snapshot', error?.message);
    return {};
  }
}

async function writeLastUsageSnapshot(trackId, snapshot) {
  try {
    await AsyncStorage.setItem(`${LAST_USAGE_SYNC_KEY}:${trackId}`, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('DeviceTelemetryService: could not persist usage snapshot', error?.message);
  }
}

async function syncDeviceStatus(trackId) {
  try {
    const batteryFraction = await DeviceInfo.getBatteryLevel();
    const isCharging = await DeviceInfo.isBatteryCharging();

    await instance.post(DEVICE_STATUS_ENDPOINT, {
      trackId,
      batteryLevel: Math.round(Math.max(0, Math.min(1, batteryFraction)) * 100),
      isCharging,
      isOnline: true,
      appVersion: DeviceInfo.getVersion(),
    });
  } catch (error) {
    console.warn('DeviceTelemetryService: status sync failed', error?.response?.status, error?.message);
  }
}

async function syncUsageDelta(trackId) {
  const hasPermission = await hasUsageAccessPermission();
  if (!hasPermission) {
    return;
  }

  const todayKey = getTodayKey();
  const snapshotKey = `${trackId}:${todayKey}`;
  const currentStats = sanitizeUsageEntries(
    await getUsageStatsBetween(getStartOfToday(), Date.now())
  );

  if (!currentStats.length) {
    return;
  }

  const previousSnapshots = await readLastUsageSnapshot(trackId);
  const previousSnapshot = previousSnapshots[snapshotKey] || {};
  const nextSnapshot = { ...previousSnapshots, [snapshotKey]: {} };

  for (const entry of currentStats) {
    const previousMinutes = Number(previousSnapshot[entry.packageName] || 0);
    const currentMinutes = entry.totalTimeMinutes;
    const deltaMinutes = currentMinutes - previousMinutes;

    if (deltaMinutes <= 0) {
      nextSnapshot[snapshotKey][entry.packageName] = currentMinutes;
      continue;
    }

    try {
      await instance.post(ACTIVITIES_ENDPOINT, {
        trackId,
        appName: entry.appName,
        packageName: entry.packageName,
        durationMinutes: deltaMinutes,
        activityDate: todayKey,
      });
      await markActivitiesSyncSuccess('telemetry');
      nextSnapshot[snapshotKey][entry.packageName] = currentMinutes;
    } catch (error) {
      console.warn('DeviceTelemetryService: activity sync failed', error?.response?.status, error?.message);
      nextSnapshot[snapshotKey][entry.packageName] = previousMinutes;
    }
  }

  await writeLastUsageSnapshot(trackId, nextSnapshot);
}

export async function syncDeviceTelemetry() {
  if (syncInFlight) {
    return;
  }

  syncInFlight = true;

  try {
    const trackId = await getLinkedTrackId();
    if (!trackId || !trackId.trim()) {
      return;
    }

    await Promise.all([
      syncDeviceStatus(trackId.trim()),
      syncUsageDelta(trackId.trim()),
    ]);
  } finally {
    syncInFlight = false;
  }
}

export function startDeviceTelemetrySync() {
  stopDeviceTelemetrySync();
  syncDeviceTelemetry();
  telemetryInterval = setInterval(syncDeviceTelemetry, SYNC_INTERVAL_MS);
}

export function stopDeviceTelemetrySync() {
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
  }
}
