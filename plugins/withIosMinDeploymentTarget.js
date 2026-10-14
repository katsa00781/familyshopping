const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Some pods (e.g. the RNCAsyncStorage_resources bundle target) hardcode an
// older IPHONEOS_DEPLOYMENT_TARGET from their podspec instead of inheriting
// the Podfile's platform version. Xcode 15.0.x SDKs reject deployment
// targets below 15.0, so every prebuild we force all pod targets up to the
// Podfile's own deployment target.
const ANCHOR = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end`;

const FIX_SNIPPET = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        deployment_target = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && deployment_target.to_f < 15.1
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
  end`;

function withIosMinDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = fs.readFileSync(podfilePath, 'utf-8');

      if (contents.includes(ANCHOR)) {
        fs.writeFileSync(podfilePath, contents.replace(ANCHOR, FIX_SNIPPET));
      }

      return config;
    },
  ]);
}

module.exports = withIosMinDeploymentTarget;
