/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import ReactNativeForegroundService from '@supersami/rn-foreground-service';

// Register the headless task
ReactNativeForegroundService.register({
  config: {
    alert: true,
    onServiceErrorCallBack: () => {
      console.error('Foreground service error occurred');
    },
  },
});

AppRegistry.registerComponent(appName, () => App);
