import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Onboarding from "./screens/onboarding";
import WhoseDevices from "./screens/WhoseDevices";
import QRCodeScreen from "./screens/qrcode";
import Permission from "./screens/Permission";
import ConnectedScreen from "./screens/connected";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Stack = createNativeStackNavigator();
export default function App() {
  const get = AsyncStorage.getItem('connectedDevice')
  console.log(get._j
    , "app js")
  return (
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
  );
}
