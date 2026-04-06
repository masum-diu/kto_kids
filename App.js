import React, { useRef, useEffect } from "react";
import { AppState, PermissionsAndroid, Platform, Alert } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import {
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";
import Onboarding from "./screens/onboarding";
import WhoseDevices from "./screens/WhoseDevices";
import QRCodeScreen from "./screens/qrcode";
import Permission from "./screens/Permission";
import ConnectedScreen from "./screens/connected";
import SafeBrowser from "./screens/SafeBrowser";
import AppUsage from "./screens/AppUsage";
import { register as registerCapture, unregister as unregisterCapture, getViewShotCapture } from "./services/ScreenshotCaptureRegistry";
import { isPending, clearPending } from "./services/PendingScreenshotManager";
import { restorePendingFromStorage } from "./services/PendingCameraCaptureManager";
import { uploadScreenshot } from "./services/ScreenshotService";
import { handleFCMCommand } from "./services/FCMCommandHandler";
import {
  ensureFcmReady,
  isCommandMessage,
  isUserBroadcastNotification,
  notifyUserFromRemoteMessage,
  subscribeFcmTokenRefresh,
} from "./services/FCMSetup";
import { initForegroundServiceManager } from "./services/ForegroundServiceManager";
import { startDeviceTelemetrySync, stopDeviceTelemetrySync } from "./services/DeviceTelemetryService";
const Stack = createNativeStackNavigator();

export default function App() {
  const viewShotRef = useRef(null);
  const navigationRef = useRef(null);
  const navReadyRef = useRef(false);
  // Location permission only — location is sent only when parent sends REQUEST_LOCATION command
  useEffect(() => {
    const requestLocationPermission = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission Denied", "Location permission is required when your parent requests your location.");
          return;
        }
      }
    };
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (AppState.currentState === "active") {
      startDeviceTelemetrySync();
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        startDeviceTelemetrySync();
      } else {
        stopDeviceTelemetrySync();
      }
    });

    return () => {
      sub.remove();
      stopDeviceTelemetrySync();
    };
  }, []);
  useEffect(() => {
    const captureFn = () => viewShotRef.current?.capture?.();
    registerCapture(captureFn);
    const cleanup = initForegroundServiceManager();
    return () => {
      unregisterCapture();
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        restorePendingFromStorage().then((pending) => {
          if (pending && navReadyRef.current && navigationRef.current) {
            navigationRef.current.navigate("Permission");
          }
        });
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let unsubMessage;
    let unsubToken;
    let unsubOpened;

    (async () => {
      const messaging = await ensureFcmReady();

      unsubMessage = onMessage(messaging, (message) => {
        if (isCommandMessage(message)) {
          handleFCMCommand(message, { isBackground: false }).catch((err) => {
            console.warn('FCM foreground command failed', err?.message);
          });
          return;
        }
        if (isUserBroadcastNotification(message)) {
          notifyUserFromRemoteMessage(message);
        }
      });

      unsubToken = subscribeFcmTokenRefresh();

      const initial = await getInitialNotification(messaging);
      if (initial && isUserBroadcastNotification(initial)) {
        notifyUserFromRemoteMessage(initial);
      }

      unsubOpened = onNotificationOpenedApp(messaging, (remoteMessage) => {
        if (remoteMessage && isUserBroadcastNotification(remoteMessage)) {
          notifyUserFromRemoteMessage(remoteMessage);
        }
      });
    })();

    return () => {
      unsubMessage?.();
      unsubToken?.();
      unsubOpened?.();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (!isPending()) return;
      const capture = getViewShotCapture();
      if (!capture) return;
      (async () => {
        try {
          const uri = await capture();
          const u = typeof uri === "string" ? uri : uri?.uri ?? uri?.path;
          if (u) {
            await uploadScreenshot(u);
          }
        } catch (e) {
          console.warn("Pending screenshot capture/upload failed:", e);
        } finally {
          clearPending();
        }
      })();
    });
    return () => sub.remove();
  }, []);

  return (
    <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            navReadyRef.current = true;
            restorePendingFromStorage().then((pending) => {
              if (pending && navigationRef.current) {
                navigationRef.current.navigate("Permission");
              }
            });
          }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding" component={Onboarding} />
            <Stack.Screen name="WhoseDevices" component={WhoseDevices} />
            <Stack.Screen name="QRCodeScreen" component={QRCodeScreen} />
            <Stack.Screen name="ConnectedScreen" component={ConnectedScreen} />
            <Stack.Screen name="Permission" component={Permission} />
            <Stack.Screen name="SafeBrowser" component={SafeBrowser} />
            <Stack.Screen name="AppUsage" component={AppUsage} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ViewShot>
  );
}
