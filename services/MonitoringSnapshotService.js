import instance from '../api/api_instance';
import {
  getStartOfToday,
  getUsageStatsBetween,
  hasUsageAccessPermission,
} from './UsageAccessService';
import { getLinkedTrackId, markActivitiesSyncSuccess } from './MonitoringStateService';

const IGNORED_PACKAGES = new Set([
  'android',
  'com.android.systemui',
  'com.google.android.permissioncontroller',
  'com.kto_kids',
]);

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

export async function uploadUsageSnapshot(reason = 'manual') {
  const trackId = await getLinkedTrackId();
  if (!trackId) return { ok: false, reason: 'no-track-id' };

  const hasPermission = await hasUsageAccessPermission();
  if (!hasPermission) return { ok: false, reason: 'no-usage-permission' };

  const entries = sanitizeUsageEntries(await getUsageStatsBetween(getStartOfToday(), Date.now()));
  if (!entries.length) return { ok: false, reason: 'empty-usage' };

  const todayKey = getTodayKey();
  await Promise.all(
    entries.map((entry) =>
      instance.post('/activities', {
        trackId,
        appName: entry.appName,
        packageName: entry.packageName,
        durationMinutes: entry.totalTimeMinutes,
        activityDate: todayKey,
      })
    )
  );
  await markActivitiesSyncSuccess(`snapshot:${reason}`);
  return { ok: true, count: entries.length };
}

export async function uploadHealthSnapshot(reason = 'manual') {
  const trackId = await getLinkedTrackId();
  if (!trackId) return { ok: false, reason: 'no-track-id' };

  const todayKey = getTodayKey();
  // Stored as a lightweight synthetic activity record for now.
  await instance.post('/activities', {
    trackId,
    appName: `monitoring.health.${reason}`,
    packageName: 'com.kto_kids.health',
    durationMinutes: 1,
    activityDate: todayKey,
  });
  await markActivitiesSyncSuccess(`health:${reason}`);
  return { ok: true };
}
