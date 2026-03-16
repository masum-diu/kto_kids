import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getStartOfToday,
  getUsageStatsFromEventsBetween,
  hasUsageAccessPermission,
  openUsageAccessSettings,
} from '../../services/UsageAccessService';

const IGNORED_PACKAGES = new Set([
  'android',
  'com.android.systemui',
  'com.google.android.permissioncontroller',
  'com.kto_kids',
]);

function sanitizeAndCompute(entries = []) {
  const list = entries
    .filter((e) => e?.packageName && !IGNORED_PACKAGES.has(e.packageName))
    .map((e) => ({
      appName: e?.appName || e.packageName,
      packageName: e.packageName,
      totalTimeMinutes: Math.max(0, Math.floor(Number(e?.totalTimeMinutes || 0))),
    }))
    .filter((e) => e.totalTimeMinutes > 0);

  const totalMinutes = list.reduce((sum, e) => sum + e.totalTimeMinutes, 0);
  const withRatio = list.map((e) => ({
    ...e,
    ratioPercent: totalMinutes > 0 ? (e.totalTimeMinutes / totalMinutes) * 100 : 0,
  }));

  return { totalMinutes, apps: withRatio };
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function AppUsage({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [apps, setApps] = useState([]);
  const [error, setError] = useState(null);

  const loadUsage = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    const permission = await hasUsageAccessPermission();
    setHasPermission(permission);

    if (!permission) {
      setTotalMinutes(0);
      setApps([]);
      setLoading(false);
      setError(null);
      return;
    }

    setError(null);
    try {
      const start = getStartOfToday();
      const end = Date.now();
      // Event-based aggregation returns all apps with usage (no bucket limit)
      const raw = await getUsageStatsFromEventsBetween(start, end);
      const { totalMinutes: total, apps: list } = sanitizeAndCompute(raw);
      setTotalMinutes(total);
      setApps(list);
    } catch (e) {
      setError(e?.message || 'Could not load usage');
      setTotalMinutes(0);
      setApps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsage();
  };

  const openPermissions = () => {
    navigation.navigate('Permission');
  };

  if (Platform.OS !== 'android') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>App usage</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.subtitle}>App usage report is available on Android only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My app usage today</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9b1fe8" />
          <Text style={styles.loadingText}>Loading usage…</Text>
        </View>
      ) : !hasPermission ? (
        <ScrollView
          contentContainerStyle={styles.permissionContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9b1fe8']} />
          }
        >
          <Text style={styles.permissionTitle}>Usage report is off</Text>
          <Text style={styles.permissionSubtitle}>
            Turn on "Usage Report" in Permissions so we can show your app usage here and share it
            with your parents.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={openPermissions}>
            <Text style={styles.primaryButtonText}>Open Permissions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={openUsageAccessSettings}>
            <Text style={styles.secondaryButtonText}>Open usage access in Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9b1fe8']} />
          }
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total screen time today</Text>
            <Text style={styles.totalValue}>{formatDuration(totalMinutes)}</Text>
          </View>

          {apps.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No app usage recorded for today yet.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              <Text style={styles.listTitle}>By app</Text>
              {apps.map((app) => (
                <View key={app.packageName} style={styles.appRow}>
                  <View style={styles.appRowTop}>
                    <Text style={styles.appName} numberOfLines={1}>
                      {app.appName}
                    </Text>
                    <Text style={styles.appMeta}>
                      {formatDuration(app.totalTimeMinutes)} · {app.ratioPercent.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.ratioBarBg}>
                    <View
                      style={[styles.ratioBarFill, { width: `${Math.min(100, app.ratioPercent)}%` }]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    fontSize: 16,
    color: '#9b1fe8',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  scrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  permissionContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#9b1fe8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9b1fe8',
  },
  secondaryButtonText: {
    color: '#9b1fe8',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  list: {
    marginTop: 24,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  appRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  appRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  appMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  ratioBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  ratioBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#9b1fe8',
  },
});
