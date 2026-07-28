/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

function isPrivateLanHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.MOBILE_API_URL ||
  ''
).replace(/\/$/, '');

if (process.env.EAS_BUILD === 'true' && !apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL requerida en EAS Build. Use: npm run build:apk:lan (LAN) o npm run build:apk (HTTPS).'
  );
}

let allowCleartext = false;
if (apiUrl.startsWith('http://')) {
  try {
    allowCleartext = isPrivateLanHost(new URL(apiUrl).hostname);
  } catch {
    allowCleartext = false;
  }
}

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      // HTTP LAN en APK de pruebas; HTTPS prod deja cleartext en false
      usesCleartextTraffic: allowCleartext || appJson.expo.android?.usesCleartextTraffic === true,
    },
    extra: {
      ...appJson.expo.extra,
      apiUrl,
      eas: {
        ...(appJson.expo.extra?.eas || {}),
        projectId: '928a09e9-3ae5-47a9-8282-5da13bdd4f25',
      },
    },
  },
};
