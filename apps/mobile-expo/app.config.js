/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');

const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.MOBILE_API_URL ||
  ''
).replace(/\/$/, '');

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
