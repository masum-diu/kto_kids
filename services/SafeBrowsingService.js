import instance from '../api/api_instance';

/**
 * Check one or more URLs with the backend (Google Safe Browsing).
 * @param {string} [url] - Single URL to check
 * @param {string[]} [urls] - Multiple URLs to check (max 500)
 * @returns {Promise<{ results: Array<{ safe: boolean, url: string, matches?: Array }> }>}
 */
export async function checkUrls(urlOrUrls) {
  const body = typeof urlOrUrls === 'string' ? { url: urlOrUrls } : { urls: urlOrUrls };
  const { data } = await instance.post('/safe-browsing/check', body);
  return data?.data ?? data;
}

/**
 * Check a single URL. Returns true if safe, false if unsafe or on error.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function isUrlSafe(url) {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim();
  if (!normalized) return false;
  try {
    const { results } = await checkUrls(normalized);
    const first = results?.[0];
    return first ? first.safe === true : false;
  } catch (e) {
    console.warn('Safe Browsing check failed:', e?.message || e);
    return false;
  }
}
