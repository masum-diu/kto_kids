import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeWebView from '../../components/SafeWebView';
import { isUrlSafe } from '../../services/SafeBrowsingService';

const DEFAULT_HOME = 'https://www.google.com';

export default function SafeBrowser({ navigation }) {
  const [url, setUrl] = useState(DEFAULT_HOME);
  const [currentLoadUrl, setCurrentLoadUrl] = useState(DEFAULT_HOME);
  const [checking, setChecking] = useState(false);
  const [trackId, setTrackId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('trackid').then((id) => setTrackId(id || null));
  }, []);

  const handleGo = async () => {
    let u = url.trim();
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u;
    }
    setChecking(true);
    try {
      const safe = await isUrlSafe(u, trackId);
      if (safe) {
        setUrl(u);
        setCurrentLoadUrl(u);
      } else {
        Alert.alert(
          'Site blocked',
          "This site isn't safe to open. Your parents have asked us to block it."
        );
      }
    } catch (e) {
      Alert.alert('Error', "Couldn't check this link. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inputWrap}
        >
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={handleGo}
            returnKeyType="go"
            placeholder="Enter website address"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity
            onPress={handleGo}
            style={styles.goButton}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#9b1fe8" />
            ) : (
              <Text style={styles.goText}>Go</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
      <View style={styles.webWrap}>
        <SafeWebView
          source={{ uri: currentLoadUrl }}
          trackId={trackId}
          onBlocked={() => {
            // Optional: could show in-app toast instead of default Alert
          }}
        />
      </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#9b1fe8',
    fontWeight: '600',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  goButton: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  goText: {
    fontSize: 16,
    color: '#9b1fe8',
    fontWeight: '600',
  },
  webWrap: {
    flex: 1,
  },
});
