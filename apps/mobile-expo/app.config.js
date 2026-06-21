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
        ...(appJson.expo.extra?.eas || {}),
        projectId: '928a09e9-3ae5-47a9-8282-5da13bdd4f25',
      },
    },
  },
};
