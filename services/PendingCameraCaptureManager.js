/**
 * When CAPTURE_CAMERA is received but no camera handler is registered
 * (e.g. user is not on Permission screen), we store the requested camera type.
 * When Permission screen mounts, it checks and runs the pending capture.
 */
let _pending = null;

export function setPending(cameraType) {
  _pending = cameraType;
}

export function getPending() {
  return _pending;
}

export function clearPending() {
  _pending = null;
}

export function isPending() {
  return _pending != null;
}
