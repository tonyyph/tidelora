#!/usr/bin/env node
/**
 * Prints the App Store Connect app id (the numeric "Apple ID" that eas submit calls ascAppId) for
 * this project's bundle id, using the same API key as tools/eas.sh. Run with `pnpm asc:app-id`.
 *
 * The app record itself has to be created by hand in App Store Connect: Apple's API does not allow
 * creating apps with an API key.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const loadEnv = () => {
  const file = path.join(root, '.env.eas');
  if (!fs.existsSync(file)) throw new Error('.env.eas is missing; see .env.eas.example');
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
};

const base64url = (input) => Buffer.from(input).toString('base64url');

/** App Store Connect wants an ES256 JWT, valid for at most 20 minutes. */
const makeToken = () => {
  const { EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID } = process.env;
  const key = fs.readFileSync(path.resolve(root, EXPO_ASC_API_KEY_PATH), 'utf8');
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: EXPO_ASC_KEY_ID, typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: EXPO_ASC_ISSUER_ID,
      iat: now,
      exp: now + 600,
      aud: 'appstoreconnect-v1',
    }),
  );
  const signature = crypto
    .sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${header}.${payload}.${signature}`;
};

const main = async () => {
  loadEnv();
  const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const bundleId = appJson.expo.ios.bundleIdentifier;
  const url = `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=name,bundleId`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${makeToken()}` } });
  if (!response.ok)
    throw new Error(`App Store Connect answered ${response.status}: ${await response.text()}`);
  const { data } = await response.json();
  const app = data.find((entry) => entry.attributes.bundleId === bundleId);
  if (!app) {
    console.error(
      `No App Store Connect app for ${bundleId} yet. Create it under Apps → + → New App.`,
    );
    process.exit(2);
  }
  console.log(`${app.id}\t${app.attributes.name}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
