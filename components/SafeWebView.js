import React, { useState, useCallback, useEffect } from 'react';
import { Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { isUrlSafe } from '../services/SafeBrowsingService';

const BLOCKED_MESSAGE = "This site isn't safe to open. Your parents have asked us to block it.";

/**
 * If the URL is a search-engine redirect (e.g. Google search result link),
 * return the real destination URL. Otherwise return null.
 * Google: https://www.google.com/url?q=https://example.com&sa=...
 */
function getRedirectTargetUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./i, '');
    if (host === 'google.com' || host === 'google.co.uk' || host === 'google.de' || host.endsWith('.google.com')) {
      const q = u.searchParams.get('q');
      if (q && (q.startsWith('http://') || q.startsWith('https://'))) return q;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * WebView that checks each URL with Safe Browsing before allowing load.
 * Use source={{ uri: initialUrl }} for the first page.
 * When trackId is set, parent block list (policy.blockedWebsites) is also applied.
 * Google search result links (redirect URLs) are unwrapped and the real URL is checked against the block list.
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

      // Google (and similar) search result links are redirects: check the real destination URL against block list
      const redirectTarget = getRedirectTargetUrl(url);
      const urlToCheck = redirectTarget || url;

      setChecking(true);
      isUrlSafe(urlToCheck, trackId)
        .then((safe) => {
          if (safe) {
            // Navigate to the real URL so we skip the redirect and block list applies to the actual destination
            setCurrentUri(redirectTarget || url);
          } else {
            Alert.alert('Site blocked', BLOCKED_MESSAGE);
            if (onBlocked) onBlocked(urlToCheck);
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
