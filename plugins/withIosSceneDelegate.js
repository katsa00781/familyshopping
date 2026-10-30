const { withDangerousMod, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// iOS 27 asserts at launch unless the app adopts the scene-based life cycle.
// The SDK 57 prebuild template still generates the window-based AppDelegate,
// even though `expo` already ships `ExpoAppSceneDelegate` (objc name
// `EXExpoAppSceneDelegate`). This plugin applies the same change as the SDK 58
// template: the scene delegate creates the window and starts React Native,
// the AppDelegate only builds the factory and exposes it through
// `ExpoReactNativeFactoryProvider`.
// Remove this plugin once the project is on an SDK whose template does this.

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';

const START_REACT_NATIVE_BLOCK = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

const SCENE_COMMENT = `    // The window is created and React Native is started by the scene delegate
    // under the scene-based life cycle (required by the iOS 27 SDK).
`;

// Under the scene life cycle UIKit no longer calls these, and the scene
// delegate forwards link events to React Native on its own.
const LINKING_OVERRIDES_PATTERN =
  /\n  \/\/ Linking API\n[\s\S]*?\n  \/\/ Universal Links\n[\s\S]*?\n  }\n(?=}\n)/;

function replaceOnce(contents, search, replacement, label) {
  if (!contents.includes(search)) {
    throw new Error(
      `withIosSceneDelegate: could not find ${label} in AppDelegate.swift. ` +
        'The prebuild template changed; update plugins/withIosSceneDelegate.js.'
    );
  }
  return contents.replace(search, replacement);
}

function patchAppDelegate(contents) {
  if (contents.includes('ExpoReactNativeFactoryProvider')) {
    return contents;
  }

  let next = replaceOnce(
    contents,
    'class AppDelegate: ExpoAppDelegate {',
    'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    'the AppDelegate class declaration'
  );
  next = replaceOnce(next, START_REACT_NATIVE_BLOCK, SCENE_COMMENT, 'the window/startReactNative block');
  if (!LINKING_OVERRIDES_PATTERN.test(next)) {
    throw new Error(
      'withIosSceneDelegate: could not find the Linking/Universal Links overrides in AppDelegate.swift. ' +
        'The prebuild template changed; update plugins/withIosSceneDelegate.js.'
    );
  }
  return next.replace(LINKING_OVERRIDES_PATTERN, '');
}

function withIosSceneDelegate(config) {
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const { platformProjectRoot, projectName } = config.modRequest;
      const appDelegatePath = path.join(platformProjectRoot, projectName, 'AppDelegate.swift');
      const contents = fs.readFileSync(appDelegatePath, 'utf-8');
      fs.writeFileSync(appDelegatePath, patchAppDelegate(contents));
      return config;
    },
  ]);

  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest ??= {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return config;
  });
}

module.exports = withIosSceneDelegate;
