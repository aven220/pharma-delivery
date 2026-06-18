/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.MOBILE_API_URL ||
  ''
).replace(/\/$/, '');

if (process.env.EAS_BUILD === 'true' && !apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL requerida en EAS Build. Ejecute: npm run build:apk con la URL HTTPS o defínala en eas.json env.'
  );
}

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiUrl,
      eas: {
        projectId: 'f573097e-f783-4763-bba7-3423bf00cacd',
      },
    },
  },
};
