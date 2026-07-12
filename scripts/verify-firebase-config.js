#!/usr/bin/env node
/**
 * Verify Firebase and native app identifiers match across Expo, native, and backend.
 * Run: npm run verify:firebase-config
 *
 * Offline only — does not contact Firebase or print secrets (API keys, private keys, etc.).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const BACKEND_FIREBASE_PATH = '/Users/client/vhr/firebase_service.json';

const EXPECTED = {
  appName: 'Veversal',
  appSlug: 'vhr-frontend',
  easProjectId: 'cde03e84-e27d-4ec0-9712-519a847ceb2d',
  androidPackage: 'com.mihailovv.vhrfrontend',
  iosBundleId: 'com.mihailovv.vhrfrontend',
  firebaseProjectId: 'veversal-app',
  legacyFirebaseProjectId: 'service-1001-beta',
  iosGoogleServicesRelative: './GoogleService-Info.plist',
  androidGoogleServicesRelative: './android/app/google-services.json',
};

const PATHS = {
  appConfig: path.join(FRONTEND_ROOT, 'app.config.js'),
  androidBuildGradle: path.join(FRONTEND_ROOT, 'android/app/build.gradle'),
  iosPbxproj: path.join(FRONTEND_ROOT, 'ios/vhrfrontend.xcodeproj/project.pbxproj'),
  androidGoogleServices: path.join(FRONTEND_ROOT, 'android/app/google-services.json'),
  iosGoogleServices: path.join(FRONTEND_ROOT, 'GoogleService-Info.plist'),
  backendFirebaseService: BACKEND_FIREBASE_PATH,
};

const CRITICAL_FILES = [
  { label: 'Android google-services.json', path: PATHS.androidGoogleServices, platform: 'android' },
  { label: 'iOS GoogleService-Info.plist', path: PATHS.iosGoogleServices, platform: 'ios' },
  { label: 'Backend firebase_service.json', path: PATHS.backendFirebaseService, platform: 'backend' },
];

const TRACKED_SECRET_ALLOWLIST = new Set(['android/app/debug.keystore']);

const TRACKED_SECRET_PATTERNS = [
  { label: 'APNs private key (.p8)', regex: /\.p8$/i },
  { label: 'Firebase service account (firebase_service.json)', regex: /firebase_service\.json$/i },
  { label: 'Generic service account JSON', regex: /service[-_.]?account.*\.json$/i },
  { label: 'Private key PEM', regex: /\.pem$/i },
  { label: 'Provisioning profile', regex: /\.mobileprovision$/i },
  { label: 'Release keystore', regex: /\.(jks|keystore)$/i },
];

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function pushCheck(results, { name, status, detail, action }) {
  results.push({ name, status, detail, action });
}

async function loadExpoConfig() {
  const previousCwd = process.cwd();
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.chdir(FRONTEND_ROOT);
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
    }
    const module = await import(pathToFileURL(PATHS.appConfig).href);
    const exported = module.default ?? module;
    const expo = exported.expo ?? exported;
    return {
      appName: expo?.name ?? null,
      appSlug: expo?.slug ?? null,
      easProjectId: expo?.extra?.eas?.projectId ?? null,
      androidPackage: expo?.android?.package ?? null,
      iosBundleId: expo?.ios?.bundleIdentifier ?? null,
      iosGoogleServicesFile: expo?.ios?.googleServicesFile ?? null,
      androidGoogleServicesFile: expo?.android?.googleServicesFile ?? null,
      firebaseMessagingEnabled: expo?.extra?.firebaseMessagingEnabled ?? null,
    };
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    process.chdir(previousCwd);
  }
}

function readGradleApplicationId(contents) {
  const match = contents.match(/applicationId\s+['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

function readGradleApplicationIdSuffix(contents) {
  const match = contents.match(/applicationIdSuffix\s+['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

function readPbxprojBundleIdentifiers(contents) {
  const matches = [...contents.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g)];
  const values = matches
    .map((match) => match[1].trim().replace(/^"(.*)"$/, '$1'))
    .filter(Boolean);
  return [...new Set(values)];
}

function countPbxprojGoogleServicesReferences(contents) {
  const matches = contents.match(/GoogleService-Info\.plist/g);
  return matches ? matches.length : 0;
}

function readAndroidGoogleServices(contents) {
  const parsed = JSON.parse(contents);
  const projectId = parsed?.project_info?.project_id ?? null;
  const projectNumber = parsed?.project_info?.project_number ?? null;
  const packageName =
    parsed?.client?.[0]?.client_info?.android_client_info?.package_name ?? null;
  return { projectId, projectNumber, packageName };
}

function readPlistValue(contents, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`, 'i');
  const match = contents.match(pattern);
  return match ? match[1].trim() : null;
}

function readBackendProjectId(contents) {
  const parsed = JSON.parse(contents);
  return parsed?.project_id ?? null;
}

function comparePair(label, left, right, results, { skipIfMissing = false } = {}) {
  const leftValue = left.value;
  const rightValue = right.value;

  if (skipIfMissing && (leftValue == null || rightValue == null)) {
    pushCheck(results, {
      name: label,
      status: 'SKIP',
      detail: 'Skipped — required file not present locally',
      action: leftValue == null && rightValue == null ? undefined : 'Download missing Firebase client config and re-run verify.',
    });
    return;
  }

  if (leftValue == null && rightValue == null) {
    pushCheck(results, {
      name: label,
      status: 'SKIP',
      detail: 'Both values missing',
    });
    return;
  }

  if (leftValue == null || rightValue == null) {
    pushCheck(results, {
      name: label,
      status: 'FAIL',
      detail: `${left.source}: ${leftValue ?? '(missing)'} | ${right.source}: ${rightValue ?? '(missing)'}`,
      action: 'Align both sides to the expected identifier or project ID.',
    });
    return;
  }

  const match = leftValue === rightValue;
  pushCheck(results, {
    name: label,
    status: match ? 'PASS' : 'FAIL',
    detail: match ? leftValue : `${leftValue} != ${rightValue}`,
    action: match ? undefined : `Expected both to be "${leftValue === EXPECTED.androidPackage || leftValue === EXPECTED.iosBundleId || leftValue === EXPECTED.firebaseProjectId ? leftValue : rightValue}".`,
  });
}

function checkExpectedValue(name, actual, expected, results) {
  if (actual == null) {
    pushCheck(results, {
      name,
      status: 'FAIL',
      detail: '(missing)',
      action: `Set value to "${expected}".`,
    });
    return;
  }
  pushCheck(results, {
    name,
    status: actual === expected ? 'PASS' : 'FAIL',
    detail: actual,
    action: actual === expected ? undefined : `Expected "${expected}".`,
  });
}

function checkNotLegacyProjectId(name, actual, results) {
  if (actual == null) {
    return;
  }
  const isLegacy = actual === EXPECTED.legacyFirebaseProjectId;
  pushCheck(results, {
    name,
    status: isLegacy ? 'FAIL' : 'PASS',
    detail: isLegacy
      ? `Legacy project "${EXPECTED.legacyFirebaseProjectId}" — use "${EXPECTED.firebaseProjectId}"`
      : actual,
    action: isLegacy
      ? `Download client/Admin configs from Firebase project "${EXPECTED.firebaseProjectId}" and replace local files.`
      : undefined,
  });
}

function listTrackedFrontendFiles() {
  try {
    return execSync('git ls-files', { cwd: FRONTEND_ROOT, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function checkTrackedSecrets(results) {
  const tracked = listTrackedFrontendFiles();
  for (const file of tracked) {
    if (TRACKED_SECRET_ALLOWLIST.has(file)) {
      continue;
    }
    for (const pattern of TRACKED_SECRET_PATTERNS) {
      if (pattern.regex.test(file)) {
        pushCheck(results, {
          name: `No tracked secret: ${pattern.label}`,
          status: 'FAIL',
          detail: `Tracked file matches secret pattern: ${file}`,
          action: 'Remove from git tracking and add to .gitignore.',
        });
      }
    }
  }
  if (!results.some((r) => r.name.startsWith('No tracked secret:') && r.status === 'FAIL')) {
    pushCheck(results, {
      name: 'No tracked server secrets in frontend git',
      status: 'PASS',
      detail: `Scanned ${tracked.length} tracked file(s) for .p8, service accounts, keystores, and profiles.`,
    });
  }
}

function countGradlePluginApplications(contents, pluginId) {
  if (!contents) {
    return 0;
  }
  const pattern = new RegExp(`apply\\s+plugin:\\s*['"]${pluginId.replace(/\./g, '\\.')}['"]`, 'g');
  const matches = contents.match(pattern);
  return matches ? matches.length : 0;
}

function checkGoogleServicesGradlePlugin(results) {
  const rootGradle = readFileIfExists(path.join(FRONTEND_ROOT, 'android/build.gradle'));
  const appGradle = readFileIfExists(PATHS.androidBuildGradle);
  const classpathMatches = rootGradle?.match(/com\.google\.gms:google-services/g) ?? [];
  const pluginApplications = countGradlePluginApplications(appGradle, 'com.google.gms.google-services');

  pushCheck(results, {
    name: 'Android Google Services Gradle classpath',
    status: classpathMatches.length === 1 ? 'PASS' : 'FAIL',
    detail:
      classpathMatches.length === 1
        ? 'Exactly one com.google.gms:google-services classpath in android/build.gradle'
        : `Found ${classpathMatches.length} Google Services classpath entries (expected 1)`,
    action:
      classpathMatches.length === 1
        ? undefined
        : 'Keep a single com.google.gms:google-services dependency in android/build.gradle.',
  });
  pushCheck(results, {
    name: 'Android Google Services plugin applied once',
    status: pluginApplications === 1 ? 'PASS' : 'FAIL',
    detail:
      pluginApplications === 1
        ? 'com.google.gms.google-services applied once in android/app/build.gradle'
        : `Found ${pluginApplications} plugin applications (expected 1)`,
    action:
      pluginApplications === 1
        ? undefined
        : 'Apply com.google.gms.google-services exactly once in android/app/build.gradle.',
  });
}

function decodeGoogleServicesBase64(base64Value) {
  const jsonText = Buffer.from(base64Value, 'base64').toString('utf8');
  const parsed = JSON.parse(jsonText);
  const projectId = parsed?.project_info?.project_id ?? null;
  const packageName =
    parsed?.client?.[0]?.client_info?.android_client_info?.package_name ?? null;
  return { projectId, packageName, parsed };
}

function checkEasGoogleServicesBase64(results) {
  const base64Value = process.env.GOOGLE_SERVICES_JSON_BASE64;
  if (!base64Value) {
    pushCheck(results, {
      name: 'GOOGLE_SERVICES_JSON_BASE64 decodes to veversal-app',
      status: 'SKIP',
      detail: 'GOOGLE_SERVICES_JSON_BASE64 not set in local shell — validate on EAS dashboard or export before verify',
      action:
        'Update EAS development env GOOGLE_SERVICES_JSON_BASE64 to veversal-app google-services.json (see report).',
    });
    pushCheck(results, {
      name: 'GOOGLE_SERVICES_JSON_BASE64 is valid JSON',
      status: 'SKIP',
      detail: 'GOOGLE_SERVICES_JSON_BASE64 not set locally',
    });
    pushCheck(results, {
      name: 'GOOGLE_SERVICES_JSON_BASE64 is not legacy service-1001-beta',
      status: 'SKIP',
      detail: 'GOOGLE_SERVICES_JSON_BASE64 not set locally',
    });
    return;
  }

  let decoded;
  try {
    decoded = decodeGoogleServicesBase64(base64Value);
  } catch (error) {
    pushCheck(results, {
      name: 'GOOGLE_SERVICES_JSON_BASE64 is valid JSON',
      status: 'FAIL',
      detail: `Decode/parse failed: ${error.message}`,
      action: 'Re-encode android/app/google-services.json with base64 and update EAS env.',
    });
    return;
  }

  pushCheck(results, {
    name: 'GOOGLE_SERVICES_JSON_BASE64 is valid JSON',
    status: 'PASS',
    detail: 'Base64 decodes to valid google-services.json',
  });

  checkExpectedValue(
    'GOOGLE_SERVICES_JSON_BASE64 decodes to veversal-app',
    decoded.projectId,
    EXPECTED.firebaseProjectId,
    results
  );
  checkNotLegacyProjectId(
    'GOOGLE_SERVICES_JSON_BASE64 is not legacy service-1001-beta',
    decoded.projectId,
    results
  );
  checkExpectedValue(
    'GOOGLE_SERVICES_JSON_BASE64 package matches Android app',
    decoded.packageName,
    EXPECTED.androidPackage,
    results
  );
}

function checkEasPreInstallHook(results) {
  const packageJsonPath = path.join(FRONTEND_ROOT, 'package.json');
  const hookScript = path.join(FRONTEND_ROOT, 'eas-build-pre-install.sh');
  const packageJson = JSON.parse(readFileIfExists(packageJsonPath) ?? '{}');
  const hookCommand = packageJson?.scripts?.['eas-build-pre-install'] ?? null;
  const hookExists = fs.existsSync(hookScript);

  pushCheck(results, {
    name: 'package.json eas-build-pre-install hook wired',
    status: hookCommand ? 'PASS' : 'FAIL',
    detail: hookCommand ?? 'Missing scripts.eas-build-pre-install in package.json',
    action: hookCommand ? undefined : 'Add "eas-build-pre-install": "./eas-build-pre-install.sh" to package.json scripts.',
  });
  pushCheck(results, {
    name: 'eas-build-pre-install.sh present',
    status: hookExists ? 'PASS' : 'FAIL',
    detail: hookExists ? 'eas-build-pre-install.sh exists at repo root' : 'Hook script missing',
    action: hookExists ? undefined : 'Restore eas-build-pre-install.sh at repo root.',
  });
}

function checkEasDevelopmentApkProfile(results) {
  const easJsonPath = path.join(FRONTEND_ROOT, 'eas.json');
  const easJson = JSON.parse(readFileIfExists(easJsonPath) ?? '{}');
  const buildType = easJson?.build?.development?.android?.buildType ?? null;

  pushCheck(results, {
    name: 'EAS development profile builds APK',
    status: buildType === 'apk' ? 'PASS' : 'FAIL',
    detail: buildType ?? '(missing android.buildType)',
    action:
      buildType === 'apk'
        ? undefined
        : 'Set build.development.android.buildType to "apk" in eas.json.',
  });
}

async function checkPublicExpoConfigNoSecrets(results) {
  const previousCwd = process.cwd();
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.chdir(FRONTEND_ROOT);
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
    }
    const output = execSync('npx expo config --type public --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const publicConfig = JSON.parse(output);
    const extra = publicConfig?.expo?.extra ?? publicConfig?.extra ?? {};
    const serialized = JSON.stringify(extra);
    const forbiddenKeys = ['googleClientSecret', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_SERVICES_JSON_BASE64'];
    const leaked = forbiddenKeys.filter((key) => Object.prototype.hasOwnProperty.call(extra, key));

    pushCheck(results, {
      name: 'Public Expo config excludes GOOGLE_CLIENT_SECRET',
      status: leaked.length === 0 ? 'PASS' : 'FAIL',
      detail:
        leaked.length === 0
          ? 'extra.googleClientSecret not present in public config'
          : `Public extra exposes: ${leaked.join(', ')}`,
      action:
        leaked.length === 0
          ? undefined
          : 'Remove server-only secrets from app.config.js expo.extra (never use EXPO_PUBLIC_ for secrets).',
    });

    if (serialized.includes('GOCSPX-')) {
      pushCheck(results, {
        name: 'Public Expo config contains no OAuth secret patterns',
        status: 'FAIL',
        detail: 'Public config appears to embed an OAuth client secret pattern',
        action: 'Remove GOOGLE_CLIENT_SECRET from app.config.js and mobile env usage.',
      });
    } else {
      pushCheck(results, {
        name: 'Public Expo config contains no OAuth secret patterns',
        status: 'PASS',
        detail: 'No OAuth secret patterns detected in public config extra',
      });
    }
  } catch (error) {
    pushCheck(results, {
      name: 'Public Expo config excludes GOOGLE_CLIENT_SECRET',
      status: 'FAIL',
      detail: `Failed to load public Expo config: ${error.message}`,
      action: 'Run "npx expo config --type public" locally and fix app.config.js.',
    });
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    process.chdir(previousCwd);
  }
}

function checkAndroidDebugSuffix(appGradleContents, results) {
  const suffix = appGradleContents ? readGradleApplicationIdSuffix(appGradleContents) : null;
  if (suffix) {
    pushCheck(results, {
      name: 'Android debug applicationIdSuffix',
      status: 'WARN',
      detail: `applicationIdSuffix "${suffix}" will change the effective debug package ID`,
      action: 'Ensure google-services.json includes the debug package or remove the suffix for FCM testing.',
    });
  } else {
    pushCheck(results, {
      name: 'Android debug applicationIdSuffix',
      status: 'PASS',
      detail: 'No applicationIdSuffix — debug and release share com.mihailovv.vhrfrontend',
    });
  }
}

function printResults(title, results) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  for (const result of results) {
    console.log(`[${result.status}] ${result.name}`);
    if (result.detail) {
      console.log(`  detail: ${result.detail}`);
    }
    if (result.action) {
      console.log(`  action: ${result.action}`);
    }
  }
}

async function main() {
  const checks = [];
  const failures = [];

  console.log('Firebase config verification');
  console.log(`Frontend root: ${FRONTEND_ROOT}`);
  console.log(`Expected app name:        ${EXPECTED.appName}`);
  console.log(`Expected app slug:        ${EXPECTED.appSlug}`);
  console.log(`Expected EAS project ID:  ${EXPECTED.easProjectId}`);
  console.log(`Expected Android package: ${EXPECTED.androidPackage}`);
  console.log(`Expected iOS bundle ID:   ${EXPECTED.iosBundleId}`);
  console.log(`Expected Firebase project:  ${EXPECTED.firebaseProjectId}`);

  const missingCritical = CRITICAL_FILES.filter(({ path: filePath }) => !fs.existsSync(filePath));
  if (missingCritical.length > 0) {
    console.log('\nMissing critical files:');
    for (const item of missingCritical) {
      console.log(`  - ${item.label}: ${item.path}`);
      if (item.platform === 'ios') {
        failures.push(`Missing iOS GoogleService-Info.plist — download from Firebase Console (see docs/firebase-native-setup.md)`);
      } else if (item.platform === 'android') {
        failures.push(`Missing Android google-services.json — download from Firebase Console`);
      } else if (item.platform === 'backend') {
        failures.push(`Missing backend firebase_service.json at ${item.path}`);
      }
    }
  } else {
    console.log('\nAll critical Firebase files are present locally.');
  }

  let expoConfig;
  try {
    expoConfig = await loadExpoConfig();
  } catch (error) {
    console.error(`\nFailed to load app.config.js: ${error.message}`);
    process.exit(1);
  }

  console.log('\nLoaded values:');
  console.log(`  Expo name:                         ${expoConfig.appName ?? '(missing)'}`);
  console.log(`  Expo slug:                         ${expoConfig.appSlug ?? '(missing)'}`);
  console.log(`  Expo extra.eas.projectId:          ${expoConfig.easProjectId ?? '(missing)'}`);
  console.log(`  Expo android.package:              ${expoConfig.androidPackage ?? '(missing)'}`);
  console.log(`  Expo ios.bundleIdentifier:         ${expoConfig.iosBundleId ?? '(missing)'}`);
  console.log(`  Expo ios.googleServicesFile:       ${expoConfig.iosGoogleServicesFile ?? '(not set — plist missing locally)'}`);
  console.log(`  Expo android.googleServicesFile:   ${expoConfig.androidGoogleServicesFile ?? '(not set)'}`);
  console.log(
    `  Expo extra.firebaseMessagingEnabled: ${JSON.stringify(expoConfig.firebaseMessagingEnabled ?? null)}`
  );

  checkExpectedValue('Expo name matches target', expoConfig.appName, EXPECTED.appName, checks);
  checkExpectedValue('Expo slug matches target', expoConfig.appSlug, EXPECTED.appSlug, checks);
  checkExpectedValue('Expo extra.eas.projectId matches target', expoConfig.easProjectId, EXPECTED.easProjectId, checks);
  checkExpectedValue('Expo android.package matches target', expoConfig.androidPackage, EXPECTED.androidPackage, checks);
  checkExpectedValue('Expo ios.bundleIdentifier matches target', expoConfig.iosBundleId, EXPECTED.iosBundleId, checks);

  const plistExists = fs.existsSync(PATHS.iosGoogleServices);
  if (plistExists) {
    if (expoConfig.iosGoogleServicesFile === EXPECTED.iosGoogleServicesRelative) {
      pushCheck(checks, {
        name: 'app.config.js ios.googleServicesFile path',
        status: 'PASS',
        detail: EXPECTED.iosGoogleServicesRelative,
      });
    } else {
      pushCheck(checks, {
        name: 'app.config.js ios.googleServicesFile path',
        status: 'FAIL',
        detail: `Expected ${EXPECTED.iosGoogleServicesRelative}, got ${expoConfig.iosGoogleServicesFile ?? '(missing)'}`,
        action: 'Ensure GoogleService-Info.plist is at repo root and app.config.js references it.',
      });
    }
  } else {
    pushCheck(checks, {
      name: 'app.config.js ios.googleServicesFile path',
      status: 'SKIP',
      detail: 'GoogleService-Info.plist not present locally — ios.googleServicesFile correctly omitted until download',
      action: 'Download plist from Firebase Console, place at repo root, re-run verify.',
    });
  }

  const gradleContents = readFileIfExists(PATHS.androidBuildGradle);
  const gradleApplicationId = gradleContents ? readGradleApplicationId(gradleContents) : null;
  console.log(`  Gradle applicationId:              ${gradleApplicationId ?? '(missing file or value)'}`);

  const pbxprojContents = readFileIfExists(PATHS.iosPbxproj);
  const pbxprojBundleIds = pbxprojContents ? readPbxprojBundleIdentifiers(pbxprojContents) : [];
  console.log(
    `  Xcode PRODUCT_BUNDLE_IDENTIFIER:     ${
      pbxprojBundleIds.length > 0 ? pbxprojBundleIds.join(', ') : '(missing file or value)'
    }`
  );

  const androidGoogleContents = readFileIfExists(PATHS.androidGoogleServices);
  const androidGoogle = androidGoogleContents
    ? readAndroidGoogleServices(androidGoogleContents)
    : { projectId: null, projectNumber: null, packageName: null };
  console.log(`  google-services project_id:        ${androidGoogle.projectId ?? '(missing file or value)'}`);
  console.log(`  google-services project_number:    ${androidGoogle.projectNumber ?? '(missing file or value)'}`);
  console.log(`  google-services package_name:      ${androidGoogle.packageName ?? '(missing file or value)'}`);

  const plistContents = readFileIfExists(PATHS.iosGoogleServices);
  const plistProjectId = plistContents ? readPlistValue(plistContents, 'PROJECT_ID') : null;
  const plistBundleId = plistContents ? readPlistValue(plistContents, 'BUNDLE_ID') : null;
  const plistGcmSenderId = plistContents ? readPlistValue(plistContents, 'GCM_SENDER_ID') : null;
  console.log(`  plist PROJECT_ID:                  ${plistProjectId ?? '(missing file or value)'}`);
  console.log(`  plist BUNDLE_ID:                   ${plistBundleId ?? '(missing file or value)'}`);
  console.log(`  plist GCM_SENDER_ID:               ${plistGcmSenderId ?? '(missing file or value)'}`);

  const backendContents = readFileIfExists(PATHS.backendFirebaseService);
  const backendProjectId = backendContents ? readBackendProjectId(backendContents) : null;
  console.log(`  backend project_id:                ${backendProjectId ?? '(missing file or value)'}`);

  comparePair(
    'Expo android.package vs Gradle applicationId',
    { source: 'app.config.js', value: expoConfig.androidPackage },
    { source: 'android/app/build.gradle', value: gradleApplicationId },
    checks
  );

  comparePair(
    'Expo ios.bundleIdentifier vs Xcode PRODUCT_BUNDLE_IDENTIFIER',
    { source: 'app.config.js', value: expoConfig.iosBundleId },
    {
      source: 'project.pbxproj',
      value: pbxprojBundleIds.length === 1 ? pbxprojBundleIds[0] : null,
    },
    checks
  );

  if (pbxprojBundleIds.length > 1) {
    pushCheck(checks, {
      name: 'Xcode PRODUCT_BUNDLE_IDENTIFIER consistency',
      status: 'FAIL',
      detail: `Multiple bundle identifiers: ${pbxprojBundleIds.join(', ')}`,
      action: 'Set all targets (Debug, Release, extensions) to com.mihailovv.vhrfrontend.',
    });
  } else if (pbxprojBundleIds.length === 1) {
    checkExpectedValue(
      'Xcode PRODUCT_BUNDLE_IDENTIFIER matches target',
      pbxprojBundleIds[0],
      EXPECTED.iosBundleId,
      checks
    );
  }

  comparePair(
    'Expo android.package vs google-services package_name',
    { source: 'app.config.js', value: expoConfig.androidPackage },
    { source: 'google-services.json', value: androidGoogle.packageName },
    checks
  );

  comparePair(
    'Expo ios.bundleIdentifier vs GoogleService-Info.plist BUNDLE_ID',
    { source: 'app.config.js', value: expoConfig.iosBundleId },
    { source: 'GoogleService-Info.plist', value: plistBundleId },
    checks,
    { skipIfMissing: !plistExists }
  );

  comparePair(
    'google-services.json project_id vs backend firebase_service.json project_id',
    { source: 'google-services.json', value: androidGoogle.projectId },
    { source: 'backend firebase_service.json', value: backendProjectId },
    checks
  );

  comparePair(
    'GoogleService-Info.plist PROJECT_ID vs backend firebase_service.json project_id',
    { source: 'GoogleService-Info.plist', value: plistProjectId },
    { source: 'backend firebase_service.json', value: backendProjectId },
    checks,
    { skipIfMissing: !plistExists }
  );

  comparePair(
    'google-services.json project_id vs GoogleService-Info.plist PROJECT_ID',
    { source: 'google-services.json', value: androidGoogle.projectId },
    { source: 'GoogleService-Info.plist', value: plistProjectId },
    checks,
    { skipIfMissing: !plistExists }
  );

  checkExpectedValue(
    'google-services.json project_id matches target',
    androidGoogle.projectId,
    EXPECTED.firebaseProjectId,
    checks
  );

  if (plistExists) {
    checkExpectedValue(
      'GoogleService-Info.plist PROJECT_ID matches target',
      plistProjectId,
      EXPECTED.firebaseProjectId,
      checks
    );
    checkNotLegacyProjectId('GoogleService-Info.plist PROJECT_ID is not legacy', plistProjectId, checks);
  }

  if (backendProjectId != null) {
    checkExpectedValue(
      'backend firebase_service.json project_id matches target',
      backendProjectId,
      EXPECTED.firebaseProjectId,
      checks
    );
    checkNotLegacyProjectId('backend firebase_service.json project_id is not legacy', backendProjectId, checks);
  }

  checkNotLegacyProjectId('google-services.json project_id is not legacy', androidGoogle.projectId, checks);

  if (plistExists && androidGoogle.projectNumber != null && plistGcmSenderId != null) {
    const senderMatch = String(plistGcmSenderId) === String(androidGoogle.projectNumber);
    pushCheck(checks, {
      name: 'iOS GCM_SENDER_ID matches Android project_number',
      status: senderMatch ? 'PASS' : 'FAIL',
      detail: senderMatch
        ? plistGcmSenderId
        : `plist GCM_SENDER_ID ${plistGcmSenderId} != google-services project_number ${androidGoogle.projectNumber}`,
      action: senderMatch
        ? undefined
        : 'Re-download both client configs from the same Firebase project (veversal-app).',
    });
  } else if (plistExists || androidGoogle.projectNumber != null) {
    pushCheck(checks, {
      name: 'iOS GCM_SENDER_ID matches Android project_number',
      status: 'SKIP',
      detail: 'Missing plist or Android project_number',
      action: 'Ensure both google-services.json and GoogleService-Info.plist are present locally.',
    });
  }

  if (plistExists && pbxprojContents) {
    const plistRefs = countPbxprojGoogleServicesReferences(pbxprojContents);
    if (plistRefs === 0) {
      pushCheck(checks, {
        name: 'Xcode includes GoogleService-Info.plist in project',
        status: 'FAIL',
        detail: 'Plist exists locally but project.pbxproj has no GoogleService-Info.plist reference',
        action:
          'Add GoogleService-Info.plist to the vhrfrontend target Copy Bundle Resources once (or run expo prebuild --platform ios).',
      });
    } else if (plistRefs === 1) {
      pushCheck(checks, {
        name: 'Xcode includes GoogleService-Info.plist in project',
        status: 'PASS',
        detail: 'Exactly one GoogleService-Info.plist reference in project.pbxproj',
      });
    } else {
      pushCheck(checks, {
        name: 'Xcode includes GoogleService-Info.plist in project',
        status: 'FAIL',
        detail: `${plistRefs} GoogleService-Info.plist references found — expected exactly one`,
        action: 'Remove duplicate plist build-phase entries.',
      });
    }
  } else if (!plistExists) {
    pushCheck(checks, {
      name: 'Xcode includes GoogleService-Info.plist in project',
      status: 'SKIP',
      detail: 'Plist not present locally',
      action: 'After downloading plist, add it to Copy Bundle Resources once.',
    });
  }

  checkGoogleServicesGradlePlugin(checks);
  checkAndroidDebugSuffix(gradleContents, checks);
  checkTrackedSecrets(checks);
  checkEasPreInstallHook(checks);
  checkEasGoogleServicesBase64(checks);
  checkEasDevelopmentApkProfile(checks);
  await checkPublicExpoConfigNoSecrets(checks);

  printResults('Check results', checks);

  const checkFailures = checks.filter((result) => result.status === 'FAIL');
  if (checkFailures.length > 0) {
    failures.push(`${checkFailures.length} configuration check(s) failed`);
  }

  console.log('\nSummary');
  console.log('-------');
  if (failures.length === 0) {
    console.log('All Firebase config checks passed.');
    process.exit(0);
  }

  console.log('Firebase config verification failed:');
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
