#!/usr/bin/env node
/**
 * Verify Firebase and native app identifiers match across Expo, native, and backend.
 * Run: node scripts/verify-firebase-config.js
 *
 * Does not contact Firebase or print secrets (API keys, private keys, etc.).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const BACKEND_FIREBASE_PATH = '/Users/client/vhr/firebase_service.json';

const PATHS = {
  appConfig: path.join(FRONTEND_ROOT, 'app.config.js'),
  androidBuildGradle: path.join(FRONTEND_ROOT, 'android/app/build.gradle'),
  iosPbxproj: path.join(FRONTEND_ROOT, 'ios/vhrfrontend.xcodeproj/project.pbxproj'),
  androidGoogleServices: path.join(FRONTEND_ROOT, 'android/app/google-services.json'),
  iosGoogleServices: path.join(FRONTEND_ROOT, 'GoogleService-Info.plist'),
  backendFirebaseService: BACKEND_FIREBASE_PATH,
};

const CRITICAL_FILES = [
  { label: 'Android google-services.json', path: PATHS.androidGoogleServices },
  { label: 'iOS GoogleService-Info.plist', path: PATHS.iosGoogleServices },
  { label: 'Backend firebase_service.json', path: PATHS.backendFirebaseService },
];

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
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
      androidPackage: expo?.android?.package ?? null,
      iosBundleId: expo?.ios?.bundleIdentifier ?? null,
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

function readPbxprojBundleIdentifiers(contents) {
  const matches = [...contents.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g)];
  const values = matches
    .map((match) => match[1].trim().replace(/^"(.*)"$/, '$1'))
    .filter(Boolean);
  return [...new Set(values)];
}

function readAndroidGoogleServices(contents) {
  const parsed = JSON.parse(contents);
  const projectId = parsed?.project_info?.project_id ?? null;
  const packageName =
    parsed?.client?.[0]?.client_info?.android_client_info?.package_name ?? null;
  return { projectId, packageName };
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

function comparePair(label, left, right, results) {
  const leftValue = left.value;
  const rightValue = right.value;

  if (leftValue == null && rightValue == null) {
    results.push({
      label,
      status: 'SKIP',
      detail: 'Both values missing',
      left: left.source,
      right: right.source,
    });
    return;
  }

  if (leftValue == null || rightValue == null) {
    results.push({
      label,
      status: 'MISMATCH',
      detail: 'One side is missing',
      left: `${left.source}: ${leftValue ?? '(missing)'}`,
      right: `${right.source}: ${rightValue ?? '(missing)'}`,
    });
    return;
  }

  const match = leftValue === rightValue;
  results.push({
    label,
    status: match ? 'MATCH' : 'MISMATCH',
    detail: match ? leftValue : `${leftValue} != ${rightValue}`,
    left: `${left.source}: ${leftValue}`,
    right: `${right.source}: ${rightValue}`,
  });
}

function printResults(title, results) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  for (const result of results) {
    console.log(`[${result.status}] ${result.label}`);
    if (result.left || result.right) {
      console.log(`  left:  ${result.left ?? '(none)'}`);
      console.log(`  right: ${result.right ?? '(none)'}`);
    }
    if (result.detail) {
      console.log(`  note:  ${result.detail}`);
    }
  }
}

async function main() {
  const failures = [];
  const comparisons = [];

  console.log('Firebase config verification');
  console.log(`Frontend root: ${FRONTEND_ROOT}`);

  const missingCritical = CRITICAL_FILES.filter(({ path: filePath }) => !fs.existsSync(filePath));
  if (missingCritical.length > 0) {
    console.log('\nMissing critical files:');
    for (const item of missingCritical) {
      console.log(`  - ${item.label}: ${item.path}`);
      failures.push(`Missing critical file: ${item.label}`);
    }
  } else {
    console.log('\nAll critical Firebase files are present.');
  }

  let expoConfig;
  try {
    expoConfig = await loadExpoConfig();
  } catch (error) {
    console.error(`\nFailed to load app.config.js: ${error.message}`);
    process.exit(1);
  }

  console.log('\nLoaded values:');
  console.log(`  Expo android.package:        ${expoConfig.androidPackage ?? '(missing)'}`);
  console.log(`  Expo ios.bundleIdentifier:   ${expoConfig.iosBundleId ?? '(missing)'}`);

  const gradleContents = readFileIfExists(PATHS.androidBuildGradle);
  const gradleApplicationId = gradleContents
    ? readGradleApplicationId(gradleContents)
    : null;
  console.log(`  Gradle applicationId:        ${gradleApplicationId ?? '(missing file or value)'}`);

  const pbxprojContents = readFileIfExists(PATHS.iosPbxproj);
  const pbxprojBundleIds = pbxprojContents ? readPbxprojBundleIdentifiers(pbxprojContents) : [];
  console.log(
    `  Xcode PRODUCT_BUNDLE_IDENTIFIER: ${
      pbxprojBundleIds.length > 0 ? pbxprojBundleIds.join(', ') : '(missing file or value)'
    }`
  );

  const androidGoogleContents = readFileIfExists(PATHS.androidGoogleServices);
  const androidGoogle = androidGoogleContents
    ? readAndroidGoogleServices(androidGoogleContents)
    : { projectId: null, packageName: null };
  console.log(`  google-services project_id:  ${androidGoogle.projectId ?? '(missing file or value)'}`);
  console.log(
    `  google-services package_name:  ${androidGoogle.packageName ?? '(missing file or value)'}`
  );

  const plistContents = readFileIfExists(PATHS.iosGoogleServices);
  const plistProjectId = plistContents ? readPlistValue(plistContents, 'PROJECT_ID') : null;
  const plistBundleId = plistContents ? readPlistValue(plistContents, 'BUNDLE_ID') : null;
  console.log(`  plist PROJECT_ID:            ${plistProjectId ?? '(missing file or value)'}`);
  console.log(`  plist BUNDLE_ID:             ${plistBundleId ?? '(missing file or value)'}`);

  const backendContents = readFileIfExists(PATHS.backendFirebaseService);
  const backendProjectId = backendContents ? readBackendProjectId(backendContents) : null;
  console.log(`  backend project_id:          ${backendProjectId ?? '(missing file or value)'}`);

  comparePair(
    'Expo android.package vs Gradle applicationId',
    { source: 'app.config.js android.package', value: expoConfig.androidPackage },
    { source: 'android/app/build.gradle applicationId', value: gradleApplicationId },
    comparisons
  );

  comparePair(
    'Expo ios.bundleIdentifier vs Xcode PRODUCT_BUNDLE_IDENTIFIER',
    { source: 'app.config.js ios.bundleIdentifier', value: expoConfig.iosBundleId },
    {
      source: 'ios/vhrfrontend.xcodeproj/project.pbxproj PRODUCT_BUNDLE_IDENTIFIER',
      value: pbxprojBundleIds.length === 1 ? pbxprojBundleIds[0] : null,
    },
    comparisons
  );

  if (pbxprojBundleIds.length > 1) {
    comparisons.push({
      label: 'Xcode PRODUCT_BUNDLE_IDENTIFIER consistency',
      status: 'MISMATCH',
      detail: `Multiple bundle identifiers found: ${pbxprojBundleIds.join(', ')}`,
      left: 'project.pbxproj',
      right: pbxprojBundleIds.join(', '),
    });
  }

  comparePair(
    'Expo android.package vs google-services package_name',
    { source: 'app.config.js android.package', value: expoConfig.androidPackage },
    {
      source: 'android/app/google-services.json package_name',
      value: androidGoogle.packageName,
    },
    comparisons
  );

  comparePair(
    'Expo ios.bundleIdentifier vs GoogleService-Info.plist BUNDLE_ID',
    { source: 'app.config.js ios.bundleIdentifier', value: expoConfig.iosBundleId },
    { source: 'GoogleService-Info.plist BUNDLE_ID', value: plistBundleId },
    comparisons
  );

  comparePair(
    'google-services.json project_id vs backend firebase_service.json project_id',
    { source: 'android/app/google-services.json project_id', value: androidGoogle.projectId },
    { source: 'backend firebase_service.json project_id', value: backendProjectId },
    comparisons
  );

  comparePair(
    'GoogleService-Info.plist PROJECT_ID vs backend firebase_service.json project_id',
    { source: 'GoogleService-Info.plist PROJECT_ID', value: plistProjectId },
    { source: 'backend firebase_service.json project_id', value: backendProjectId },
    comparisons
  );

  comparePair(
    'google-services.json project_id vs GoogleService-Info.plist PROJECT_ID',
    { source: 'android/app/google-services.json project_id', value: androidGoogle.projectId },
    { source: 'GoogleService-Info.plist PROJECT_ID', value: plistProjectId },
    comparisons
  );

  printResults('Comparison results', comparisons);

  const comparisonFailures = comparisons.filter((result) => result.status === 'MISMATCH');
  if (comparisonFailures.length > 0) {
    failures.push(`${comparisonFailures.length} identifier/project mismatch(es)`);
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
