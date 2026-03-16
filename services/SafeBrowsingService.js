import AsyncStorage from '@react-native-async-storage/async-storage';
import instance from '../api/api_instance';

const TRACK_ID_KEY = 'trackid';

/**
 * Check one or more URLs with the backend (Google Safe Browsing + parent block list when trackId is set).
 * Always sends trackId in body when available (from argument or AsyncStorage).
 * @param {string|string[]} urlOrUrls - Single URL or array of URLs (max 500)
 * @param {string} [trackId] - Child track ID; when set, parent block list (policy.blockedWebsites) is also applied. If omitted, read from AsyncStorage.
 * @returns {Promise<{ results: Array<{ safe: boolean, url: string, matches?: Array, blockedBy?: 'google'|'parent' }> }>}
 */
export async function checkUrls(urlOrUrls, trackId) {
  let tid = trackId;
  if (tid == null || tid === '') {
    try {
      tid = (await AsyncStorage.getItem(TRACK_ID_KEY)) || undefined;
    } catch (e) {
      // ignore
    }
  }
  const body =
    typeof urlOrUrls === 'string'
      ? { url: urlOrUrls, ...(tid && { trackId: tid }) }
      : { urls: urlOrUrls, ...(tid && { trackId: tid }) };
  const { data } = await instance.post('/safe-browsing/check', body);
  return data?.data ?? data;
}

/**
 * Check a single URL. Returns true if safe, false if unsafe or on error.
 * @param {string} url
 * @param {string} [trackId] - When set, parent block list is also applied
 * @returns {Promise<boolean>}
 */
export async function isUrlSafe(url, trackId) {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim();
  if (!normalized) return false;
  try {
    const { results } = await checkUrls(normalized, trackId);
    const first = results?.[0];
    return first ? first.safe === true : false;
  } catch (e) {
    console.warn('Safe Browsing check failed:', e?.message || e);
    return false;
  }
}
