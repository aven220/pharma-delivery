const {
  withAndroidManifest,
  AndroidConfig,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function isPrivateOrLocalHost(host) {
  return (
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

function apiUrlFromEnv() {
  return (process.env.EXPO_PUBLIC_API_URL || process.env.MOBILE_API_URL || '').trim();
}

function apiHostFromEnv() {
  const url = apiUrlFromEnv();
  if (!url) return '192.168.20.26';
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
}

function isCleartextDevUrl() {
  const url = apiUrlFromEnv();
  if (!url.startsWith('http://')) return false;
  try {
    return isPrivateOrLocalHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

function buildNetworkXml(host, hasEmbeddedCert, allowCleartext) {
  const certTrust = hasEmbeddedCert
    ? `<certificates src="@raw/pharma_server_cert"/>
      <certificates src="system"/>
      <certificates src="user"/>`
    : `<certificates src="system"/>
      <certificates src="user"/>`;

  const domainCleartext = allowCleartext ? 'true' : 'false';

  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="${allowCleartext ? 'true' : 'false'}">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="${domainCleartext}">
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
  const allowCleartext = isCleartextDevUrl();
  const certSource = path.join(__dirname, '..', 'certs', 'server.crt');
  const hasEmbeddedCert = fs.existsSync(certSource);

  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    app.$['android:usesCleartextTraffic'] = allowCleartext ? 'true' : 'false';
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
        buildNetworkXml(host, hasEmbeddedCert, allowCleartext)
      );

      if (hasEmbeddedCert) {
        fs.copyFileSync(certSource, path.join(rawDir, 'pharma_server_cert.crt'));
        console.log(`[withAndroidNetworkSecurity] Certificado embebido para ${host}`);
      } else if (!allowCleartext) {
        console.warn(
          `[withAndroidNetworkSecurity] Sin certs/server.crt — ejecute: bash scripts/fetch-server-cert.sh`
        );
      }

      if (allowCleartext) {
        console.log(`[withAndroidNetworkSecurity] HTTP permitido para desarrollo local (${host})`);
      }

      return cfg;
    },
  ]);
}

module.exports = withAndroidNetworkSecurity;
