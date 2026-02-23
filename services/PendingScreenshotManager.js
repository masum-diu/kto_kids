/**
 * When parent sends SCREENSHOT via FCM while app is in background, we set a pending flag
 * and show a notification. When user opens the app, we capture and upload then clear the flag.
 */
let _pending = false;

export function setPending() {
  _pending = true;
}

export function clearPending() {
  _pending = false;
}

export function isPending() {
  return _pending;
}
