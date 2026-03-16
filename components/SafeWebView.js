import React, { useState, useCallback, useEffect } from 'react';
import { Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { isUrlSafe } from '../services/SafeBrowsingService';

const BLOCKED_MESSAGE = "This site isn't safe to open. Your parents have asked us to block it.";

/**
 * WebView that checks each URL with Safe Browsing before allowing load.
 * Use source={{ uri: initialUrl }} for the first page.
 * When trackId is set, parent block list (policy.blockedWebsites) is also applied.
 */
export default function SafeWebView({ source, onBlocked, trackId, ...rest }) {
  const initialUri = source?.uri || '';
  const [currentUri, setCurrentUri] = useState(initialUri);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (initialUri && initialUri !== currentUri) {
      setCurrentUri(initialUri);
    }
  }, [initialUri]);

  const handleShouldStartLoadWithRequest = useCallback(
    (request) => {
      const url = request.url?.trim() || '';
      if (!url) return true;
      // Allow same URL (e.g. fragments, same page)
      if (url === currentUri) return true;
      // Allow initial load
      if (url === initialUri && currentUri === initialUri) return true;

      // New navigation: block and check
      setChecking(true);
      isUrlSafe(url, trackId)
        .then((safe) => {
          if (safe) {
            setCurrentUri(url);
          } else {
            if (onBlocked) onBlocked(url);
            else Alert.alert('Site blocked', BLOCKED_MESSAGE);
          }
        })
        .catch(() => {
          Alert.alert('Error', "Couldn't check this link. Try again.");
        })
        .finally(() => {
          setChecking(false);
        });

      return false;
    },
    [currentUri, initialUri, onBlocked, trackId]
  );

  const uri = currentUri || initialUri;
  if (!uri) return null;

  return (
    <View style={styles.container}>
      {checking && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#9b1fe8" />
        </View>
      )}
      <WebView
        source={{ uri }}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        startInLoadingState
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 1,
  },
});
