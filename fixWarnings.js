/**
 * Must be imported first in index.js so LogBox ignores run before Firebase/native modules load.
 */
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'NativeEventEmitter',
  'addListener',
  'removeListeners',
  'SafeAreaView has been deprecated',
  'getApp',
  'onMessage',
  'This method is deprecated',
  'no background event handler',
]);
