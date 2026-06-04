import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo()) {
    return;
  }

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.post('/api/notifications/push-token', { token });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'A-AS Delivery',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  } catch {
    // Push no disponible (Expo Go, emulador sin Google Play, etc.)
  }
}
