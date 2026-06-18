const {
  withAndroidManifest,
  AndroidConfig,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function apiHostFromEnv() {
  const url = (process.env.EXPO_PUBLIC_API_URL || process.env.MOBILE_API_URL || '').trim();
  if (!url) return '20.5.19.8';
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}

function buildNetworkXml(host, hasEmbeddedCert) {
  const certTrust = hasEmbeddedCert
    ? `<certificates src="@raw/pharma_server_cert"/>
      <certificates src="system"/>
      <certificates src="user"/>`
    : `<certificates src="system"/>
      <certificates src="user"/>`;

  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="false">${host}</domain>
    <trust-anchors>
      ${certTrust}
    </trust-anchors>
  </domain-config>
</network-security-config>
`;
}

function withAndroidNetworkSecurity(config) {
  const host = apiHostFromEnv();
  const certSource = path.join(__dirname, '..', 'certs', 'server.crt');
  const hasEmbeddedCert = fs.existsSync(certSource);

  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    app.$['android:usesCleartextTraffic'] = 'false';
    return cfg;
  });

  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const resRoot = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');
      const xmlDir = path.join(resRoot, 'xml');
      const rawDir = path.join(resRoot, 'raw');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(rawDir, { recursive: true });

      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        buildNetworkXml(host, hasEmbeddedCert)
      );

      if (hasEmbeddedCert) {
        fs.copyFileSync(certSource, path.join(rawDir, 'pharma_server_cert.crt'));
        console.log(`[withAndroidNetworkSecurity] Certificado embebido para ${host}`);
      } else {
        console.warn(
          `[withAndroidNetworkSecurity] Sin certs/server.crt — ejecute: bash scripts/fetch-server-cert.sh`
        );
      }

      return cfg;
    },
  ]);
}

module.exports = withAndroidNetworkSecurity;
