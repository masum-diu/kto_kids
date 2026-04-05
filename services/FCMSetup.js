/**
 * FCM prerequisites: notification permission (Android 13+), iOS APNs registration,
 * and helpers to tell parent commands apart from CMS / broadcast pushes.
 */
import { Platform, PermissionsAndroid, Alert } from "react-native";
import {
  getMessaging,
  requestPermission,
  registerDeviceForRemoteMessages,
  onTokenRefresh,
} from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import instance from "../api/api_instance";

let fcmInitPromise = null;

export function ensureFcmReady() {
  if (!fcmInitPromise) {
    fcmInitPromise = (async () => {
      const messaging = getMessaging();
      try {
        if (Platform.OS === "ios") {
          await registerDeviceForRemoteMessages(messaging);
          await requestPermission(messaging);
        }
        if (Platform.OS === "android" && Platform.Version >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        }
      } catch (e) {
        console.warn("ensureFcmReady:", e);
      }
      return messaging;
    })();
  }
  return fcmInitPromise;
}

export function isCommandMessage(message) {
  const cmd = message?.data?.command;
  return cmd != null && String(cmd).trim().length > 0;
}

export function isUserBroadcastNotification(message) {
  if (isCommandMessage(message)) return false;
  const data = message?.data || {};
  if (data.type === "notification") return true;
  if (message?.notification?.title || message?.notification?.body) return true;
  return false;
}

export function notifyUserFromRemoteMessage(message) {
  const data = message?.data || {};
  const title =
    message?.notification?.title ||
    (typeof data.title === "string" ? data.title : null) ||
    "Notification";
  const body =
    message?.notification?.body ||
    (typeof data.message === "string" ? data.message : null) ||
    (typeof data.body === "string" ? data.body : null) ||
    "";
  if (Alert?.alert) {
    Alert.alert(title, body.length ? body : " ");
  }
}

export function subscribeFcmTokenRefresh() {
  const messaging = getMessaging();
  return onTokenRefresh(messaging, async (newToken) => {
    try {
      const childId = await AsyncStorage.getItem("childId");
      if (!childId || !newToken) return;
      await instance.patch(`/children/${childId}`, { deviceToken: newToken });
    } catch (err) {
      console.warn("FCM token refresh sync failed:", err?.message);
    }
  });
}
