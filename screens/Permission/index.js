import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  PermissionsAndroid,
  Linking,
  AppState,
  NativeModules,
  Alert,
} from 'react-native'
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions'
import messaging from '@react-native-firebase/messaging'

const { ScreenLock } = NativeModules

const Permission = ({ navigation }) => {

  /* ================= STATE ================= */

  const [permissions, setPermissions] = useState({
    usageLimits: false,
    displayOverApps: false,
    remoteCamera: false,
    oneWayAudio: false,
    liveLocation: false,
    usageReport: false,
    keepBackground: false,
    superBattery: false,
  })

  /* ================= HELPERS ================= */

  const updatePermission = (key, value) => {
    setPermissions(prev => ({ ...prev, [key]: value }))
  }

  /* ================= FCM COMMAND HANDLER ================= */

  const handleCommand = (data) => {
    if (!data?.command) return

    console.log("HANDLE COMMAND:", data)

    switch (data.command) {
      case "LOCK":
        handleLockCommand(data)
        break

      case "TAKE_PHOTO":
        // next step later
        break
      case "SCREENSHOT":
        screenShort(data)
        // next step later
        break

      default:
        console.log("Unknown command:", data.command)
    }
  }

  const screenShort = (data) => {
    console.log(data, "screenshot command data")
    let message = "Screenshot taken by parent"
    try {
      if (data.options) {
        const parsed = JSON.parse(data.options)
        if (parsed?.message) message = parsed.message
      }
    } catch (e) { }
    Alert.alert("Notice", message)

    
  }

  const handleLockCommand = (data) => {
    let message = "Device locked by parent"

    try {
      if (data.options) {
        const parsed = JSON.parse(data.options)
        if (parsed?.message) message = parsed.message
      }
    } catch (e) { }

    Alert.alert("Notice", message)

    if (ScreenLock?.lock) {
      ScreenLock.lock()
    } else {
      console.log("❌ ScreenLock native module not found")
    }
  }
  // const takePhoto = async () => {
  //   if (!permissions.remoteCamera) {
  //     Alert.alert("Camera not allowed");
  //     return;
  //   }

  //   if (cameraRef.current) {
  //     const options = { quality: 0.7, base64: true };
  //     const photoData = await cameraRef.current.takePictureAsync(options);

  //     console.log("Photo captured:", photoData.uri);

  //     // Upload to server
  //     try {
  //       await axios.post('https://yourserver.com/upload', {
  //         childId: 'child_123',
  //         image: photoData.base64
  //       });
  //       console.log("Photo sent to server");
  //     } catch (e) {
  //       console.log("Upload failed:", e);
  //     }
  //   }
  // };
  /* ================= REAL PERMISSION HANDLER ================= */

  const handlePermission = async (key) => {
    switch (key) {

      case "remoteCamera": {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        )
        updatePermission(key, res === PermissionsAndroid.RESULTS.GRANTED)
        break
      }

      case "oneWayAudio": {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        )
        updatePermission(key, res === PermissionsAndroid.RESULTS.GRANTED)
        break
      }

      case "liveLocation": {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        )
        updatePermission(key, res === PermissionsAndroid.RESULTS.GRANTED)
        break
      }

      case "usageLimits":
      case "usageReport":
        Linking.openSettings()
        break

      case "displayOverApps":
        Linking.openSettings()
        break

      case "keepBackground":
      case "superBattery":
        Linking.openSettings()
        break

      default:
        break
    }
  }

  /* ================= RECHECK PERMISSIONS ================= */

  const recheckPermissions = async () => {
    const camera = await check(PERMISSIONS.ANDROID.CAMERA)
    const audio = await check(PERMISSIONS.ANDROID.RECORD_AUDIO)
    const location = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)

    updatePermission("remoteCamera", camera === RESULTS.GRANTED)
    updatePermission("oneWayAudio", audio === RESULTS.GRANTED)
    updatePermission("liveLocation", location === RESULTS.GRANTED)
  }

  /* ================= EFFECTS ================= */

  useEffect(() => {
    recheckPermissions()

    // FCM foreground listener
    const unsubscribe = messaging().onMessage(async message => {
      console.log("📩 FCM RECEIVED:", message.data)
      handleCommand(message.data)
    })

    // AppState listener (user back from settings)
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") recheckPermissions()
    })

    return () => {
      unsubscribe()
      sub.remove()
    }
  }, [])

  const allAllowed = Object.values(permissions).every(v => v === true)

  /* ================= UI ITEM ================= */

  const PermissionItem = ({ title, subtitle, permissionKey, icon }) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionLeft}>
        <Text style={styles.permissionIcon}>{icon}</Text>
        <View style={styles.permissionText}>
          <Text style={styles.permissionTitle}>{title}</Text>
          <Text style={styles.permissionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={permissions[permissionKey]}
        onValueChange={() => handlePermission(permissionKey)}
        trackColor={{ false: '#E0E0E0', true: '#9B1FE8' }}
        thumbColor="#FFFFFF"
      />
    </View>
  )

  /* ================= RENDER ================= */

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={require("../../assets/angle-small-left.png")} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Intro */}
      <View style={styles.headerSection}>
        <Text style={styles.headerIcon}>🔒</Text>
        <Text style={styles.headerText}>App Permissions</Text>
        <Text style={styles.headerSubtext}>
          All permissions must be enabled to continue
        </Text>
      </View>

      <ScrollView>
        <View style={styles.permissionsList}>
          <PermissionItem title="Usage Limits" subtitle="Control screen & app time" permissionKey="usageLimits" icon="⏱️" />
          <PermissionItem title="Display Over Apps" subtitle="Show alerts over apps" permissionKey="displayOverApps" icon="💬" />
          <PermissionItem title="Remote Camera" subtitle="Allow photo capture" permissionKey="remoteCamera" icon="📷" />
          <PermissionItem title="One-Way Audio" subtitle="Allow microphone access" permissionKey="oneWayAudio" icon="🔊" />
          <PermissionItem title="Live Location" subtitle="Track device location" permissionKey="liveLocation" icon="📍" />
          <PermissionItem title="Usage Report" subtitle="View app usage" permissionKey="usageReport" icon="📊" />
          <PermissionItem title="Run in Background" subtitle="Keep monitoring active" permissionKey="keepBackground" icon="🔄" />
          <PermissionItem title="Battery Optimization" subtitle="Prevent system kill" permissionKey="superBattery" icon="🔋" />
        </View>
      </ScrollView>

      {/* Confirm */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          disabled={!allAllowed}
          style={[styles.confirmButton, { opacity: allAllowed ? 1 : 0.5 }]}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.confirmButtonText}>✓ Confirm all permissions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    height: 56, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 16,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB"
  },
  backIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },

  headerSection: {
    alignItems: "center", paddingVertical: 24, backgroundColor: "#FFF", marginBottom: 8
  },
  headerIcon: { fontSize: 40 },
  headerText: { fontSize: 20, fontWeight: "700" },
  headerSubtext: { fontSize: 14, color: "#6B7280" },

  permissionsList: { padding: 16, paddingBottom: 120 },
  permissionItem: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#FFF", padding: 14, borderRadius: 12, marginBottom: 12
  },
  permissionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  permissionIcon: { fontSize: 24, marginRight: 12 },
  permissionText: { flex: 1 },
  permissionTitle: { fontSize: 16, fontWeight: "600" },
  permissionSubtitle: { fontSize: 13, color: "#6B7280" },

  buttonContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E7EB"
  },
  confirmButton: {
    backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 12, alignItems: "center"
  },
  confirmButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
})

export default Permission
