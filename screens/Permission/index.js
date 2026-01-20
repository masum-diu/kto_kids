import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Image } from 'react-native'
import React, { useState } from 'react'

const Permission = ({ navigation }) => {
  const [permissions, setPermissions] = useState({
    usageLimits: false,
    displayOverApps: true,
    remoteCamera: false,
    oneWayAudio: false,
    liveLocation: true,
    usageReport: true,
    keepBackground: true,
    superBattery: false,
  })

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleConfirmAll = () => {
    console.log('All permissions confirmed:', permissions)
    // Add navigation or API call here
    navigation?.navigate('Home') // Example navigation
  }

  const PermissionItem = ({ title, subtitle, permissionKey, icon }) => (
    <View style={styles.permissionItem}>
      <View style={styles.permissionLeft}>
        <Text style={styles.permissionIcon}>{icon}</Text>
        <View style={styles.permissionText}>
          <Text style={styles.permissionTitle}>{title}</Text>
          {subtitle && <Text style={styles.permissionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        style={styles.switch}
        trackColor={{ false: '#E0E0E0', true: '#9B1FE8' }}
        thumbColor={permissions[permissionKey] ? '#FFFFFF' : '#999999'}
        value={permissions[permissionKey]}
        onValueChange={() => togglePermission(permissionKey)}
      />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <Image
            source={require("../../assets/angle-small-left.png")}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Permissions</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerIcon}>🔒</Text>
        <Text style={styles.headerText}>App Permissions</Text>
        <Text style={styles.headerSubtext}>Grant necessary permissions to connect your device</Text>
      </View>

      {/* Permissions List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.permissionsList}>
          
          <PermissionItem 
            title="Usage Limits"
            subtitle="Limit the screen and app usage time for this device"
            permissionKey="usageLimits"
            icon="⏱️"
          />

          <PermissionItem 
            title="Allow Display Over Other Apps"
            subtitle="Show notifications above other applications"
            permissionKey="displayOverApps"
            icon="💬"
          />

          <PermissionItem 
            title="Remote Camera"
            subtitle="View the surroundings remotely via the camera of this device"
            permissionKey="remoteCamera"
            icon="📷"
          />

          <PermissionItem 
            title="One-Way Audio"
            subtitle="Listen to audio from the device"
            permissionKey="oneWayAudio"
            icon="🔊"
          />

          <PermissionItem 
            title="Live Location"
            subtitle="Track the real-time location of the device"
            permissionKey="liveLocation"
            icon="📍"
          />

          <PermissionItem 
            title="Usage Report"
            subtitle="View the screen usage time and app usage for this device"
            permissionKey="usageReport"
            icon="📊"
          />

          <PermissionItem 
            title="Keep running in the background"
            subtitle="To ensure the device operation of KTO is the background, you need to grant the following permission"
            permissionKey="keepBackground"
            icon="🔄"
          />

          <PermissionItem 
            title="Super Battery Optimization"
            subtitle="Prevent the device from aggressive battery optimization"
            permissionKey="superBattery"
            icon="🔋"
          />

        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmAll}
        >
          <Text style={styles.confirmButtonText}>✓ Confirm all permissions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 24,
  },

  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },

  scrollView: {
    flex: 1,
  },
  permissionsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#9B1FE8',
  },
  permissionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionIcon: {
    fontSize: 28,
    marginRight: 12,
    minWidth: 36,
    textAlign: 'center',
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  permissionSubtitle: {
    fontSize: 12,
    color: '#999999',
    lineHeight: 16,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  confirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: '#9B1FE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})

export default Permission