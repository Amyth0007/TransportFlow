const fs = require('fs');
const path = require('path');

/** Load mobile/.env so native config gets the Maps key even if Expo has not injected it yet. */
function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app.json');
const mapsKey = process.env.EXPO_PUBLIC_MAPS_API_KEY || '';

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      config: {
        googleMaps: {
          apiKey: mapsKey,
        },
      },
    },
    ios: {
      ...appJson.expo.ios,
      config: {
        googleMapsApiKey: mapsKey,
      },
    },
    plugins: [
      [
        'react-native-maps',
        {
          androidGoogleMapsApiKey: mapsKey,
          iosGoogleMapsApiKey: mapsKey,
        },
      ],
    ],
  },
};
