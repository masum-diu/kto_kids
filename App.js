import React, { useRef, useEffect } from "react";
import { AppState } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import { getMessaging, onMessage } from "@react-native-firebase/messaging";
import Onboarding from "./screens/onboarding";
import WhoseDevices from "./screens/WhoseDevices";
import QRCodeScreen from "./screens/qrcode";
import Permission from "./screens/Permission";
import ConnectedScreen from "./screens/connected";
import { register as registerCapture, unregister as unregisterCapture, getViewShotCapture } from "./services/ScreenshotCaptureRegistry";
import { isPending, clearPending } from "./services/PendingScreenshotManager";
import { restorePendingFromStorage } from "./services/PendingCameraCaptureManager";
import { uploadScreenshot } from "./services/ScreenshotService";
import { handleFCMCommand } from "./services/FCMCommandHandler";
import { initForegroundServiceManager } from "./services/ForegroundServiceManager";

const Stack = createNativeStackNavigator();

export default function App() {
  const viewShotRef = useRef(null);

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
    restorePendingFromStorage();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") restorePendingFromStorage();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const messaging = getMessaging();
    const unsubscribe = onMessage(messaging, (message) => {
      handleFCMCommand(message, { isBackground: false });
    });
    return () => unsubscribe();
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
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding" component={Onboarding} />
            <Stack.Screen name="WhoseDevices" component={WhoseDevices} />
            <Stack.Screen name="QRCodeScreen" component={QRCodeScreen} />
            <Stack.Screen name="ConnectedScreen" component={ConnectedScreen} />
            <Stack.Screen name="Permission" component={Permission} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </ViewShot>
  );
}
