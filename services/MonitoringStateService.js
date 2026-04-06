import AsyncStorage from '@react-native-async-storage/async-storage';

const LINKED_TRACK_ID_KEY = 'linked-track-id';
const LAST_ACTIVITIES_SYNC_KEY = 'monitoring:last-activities-sync';

export async function setLinkedTrackId(trackId) {
  const normalized = String(trackId || '').trim();
  if (!normalized) return;
  await AsyncStorage.multiSet([
    ['trackid', normalized],
    [LINKED_TRACK_ID_KEY, normalized],
  ]);
}

export async function getLinkedTrackId() {
  const linked = await AsyncStorage.getItem(LINKED_TRACK_ID_KEY);
  if (linked && linked.trim()) return linked.trim();
  const fallback = await AsyncStorage.getItem('trackid');
  return fallback ? fallback.trim() : null;
}

export async function markActivitiesSyncSuccess(source = 'unknown') {
  const payload = {
    at: Date.now(),
    source,
  };
  await AsyncStorage.setItem(LAST_ACTIVITIES_SYNC_KEY, JSON.stringify(payload));
  return payload;
}

export async function getLastActivitiesSync() {
  const raw = await AsyncStorage.getItem(LAST_ACTIVITIES_SYNC_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.at === 'number') return parsed;
  } catch (e) {}
  return null;
}
