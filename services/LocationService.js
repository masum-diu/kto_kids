/**
 * Sends the device's location to the backend in real time when latitude/longitude update.
 * Uses watchPosition so the callback fires whenever the position changes; each update is sent
 * to POST /locations (with a short throttle to avoid flooding). Backend triggers Pusher
 * location-update for the family.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from 'react-native-geolocation-service';
import instance from '../api/api_instance';

const LOCATIONS_ENDPOINT = '/locations';
/** Minimum ms between two sends (throttle) so we don't flood the backend */
const MIN_SEND_INTERVAL_MS = 5000;
/** Watch options: update when moved this many meters, or at least every interval ms */
const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  distanceFilter: 5,
  interval: 5000,
  fastestInterval: 2000,
};

let watchId = null;
let lastSendTime = 0;

/**
 * Build payload from position and send to backend. No-op if no trackId or throttle says skip.
 */
async function sendPositionToBackend(position, trackId) {
  if (!trackId || !trackId.trim()) return;

  const now = Date.now();
  if (now - lastSendTime < MIN_SEND_INTERVAL_MS) return;
  lastSendTime = now;

  const { latitude, longitude, altitude, speed, accuracy } = position.coords || position;
  const timestamp = position.timestamp
    ? new Date(position.timestamp).toISOString()
    : new Date().toISOString();

  const payload = {
    trackId: trackId.trim(),
    latitude,
    longitude,
    ...(altitude != null && !isNaN(altitude) && { altitude }),
    ...(speed != null && !isNaN(speed) && { speed }),
    ...(accuracy != null && !isNaN(accuracy) && { accuracy }),
    timestamp,
  };

  try {
    await instance.post(LOCATIONS_ENDPOINT, payload);
    if (__DEV__) console.log('LocationService: location sent', trackId.trim());
  } catch (err) {
    console.warn('LocationService: send failed', err?.response?.status, err?.message);
  }
}

/**
 * Called on every position update from watchPosition. Sends to backend when lat/long change (throttled).
 */
async function onPositionUpdate(position) {
  try {
    const geo = Geolocation;
    if (!geo) return;
    const trackId = await AsyncStorage.getItem('trackid');
    await sendPositionToBackend(position, trackId);
  } catch (e) {
    console.warn('LocationService: onPositionUpdate error', e?.message);
  }
}

function onPositionError(err) {
  console.warn('LocationService: watchPosition error', err?.message);
}

/**
 * Start real-time location updates: send to backend whenever latitude/longitude are updated.
 * Uses watchPosition so the native layer pushes updates when the device moves (or on interval).
 * Stops when you call stopPeriodicLocationUpdates().
 */
export function startPeriodicLocationUpdates() {
  stopPeriodicLocationUpdates();

  try {
    const geo = Geolocation;
    if (!geo || typeof (geo && geo.watchPosition) !== 'function') {
      console.warn('LocationService: watchPosition not available');
      return;
    }

    watchId = geo.watchPosition(onPositionUpdate, onPositionError, WATCH_OPTIONS);
    if (__DEV__) console.log('LocationService: watching position (real-time updates)');
  } catch (e) {
    console.warn('LocationService: start failed', e?.message);
  }
}

export function stopPeriodicLocationUpdates() {
  if (watchId != null) {
    try {
      const geo = Geolocation;
      if (geo && typeof (geo && geo.clearWatch) === 'function') {
        geo.clearWatch(watchId);
      }
    } catch (e) {
      console.warn('LocationService: clearWatch error', e?.message);
    }
    watchId = null;
  }
}

/**
 * Send one location update immediately (e.g. on demand). No-op if no trackId or Geolocation unavailable.
 */
export async function sendCurrentLocation() {
  const trackId = await AsyncStorage.getItem('trackid');
  if (!trackId || !trackId.trim()) return;

  return new Promise((resolve) => {
    try {
      const geo = Geolocation;
      if (!geo || typeof (geo && geo.getCurrentPosition) !== 'function') {
        resolve();
        return;
      }
      geo.getCurrentPosition(
        async (position) => {
          await sendPositionToBackend(position, trackId);
          resolve();
        },
        (err) => {
          console.warn('LocationService: getCurrentPosition failed', err?.message);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } catch (e) {
      console.warn('LocationService: Geolocation unavailable', e?.message);
      resolve();
    }
  });
}
