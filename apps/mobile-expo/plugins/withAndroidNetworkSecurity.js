const { withAndroidManifest, AndroidConfig, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

function withAndroidNetworkSecurity(config) {
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    app.$['android:usesCleartextTraffic'] = 'false';
    return cfg;
  });

  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlPath = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/xml/network_security_config.xml'
      );
      fs.mkdirSync(path.dirname(xmlPath), { recursive: true });
      fs.writeFileSync(xmlPath, NETWORK_XML);
      return cfg;
    },
  ]);
}

module.exports = withAndroidNetworkSecurity;
