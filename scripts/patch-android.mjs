// Adds the Android permissions Chatimall needs (mic, camera, notifications) after `npx cap add android`.
import fs from 'node:fs';
import path from 'node:path';

// Load .env manually so ADMOB_ANDROID_APP_ID (a non-VITE_ var) is available when this
// script runs as plain `node` (Vite only auto-loads .env for Vite-managed processes).
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function replaceOrThrow(source, pattern, replacement, description) {
  const updated = source.replace(pattern, replacement);
  if (updated === source) {
    throw new Error(`Could not patch Android ${description}.`);
  }
  return updated;
}

function writeIfChanged(file, original, updated) {
  if (original !== updated) fs.writeFileSync(file, updated);
}

function insertBeforeClassEnd(source, marker, code, description) {
  if (source.includes(marker)) return source;
  const classStart = source.indexOf('public class MainActivity');
  const classEnd = source.lastIndexOf('}');
  if (classStart < 0 || classEnd <= classStart) {
    throw new Error(`Could not patch Android ${description}.`);
  }
  return `${source.slice(0, classEnd)}\n${code}\n${source.slice(classEnd)}`;
}

function ensureJavaImport(source, importName) {
  const importLine = `import ${importName};`;
  const lines = source.split(/\r?\n/);
  const importIndexes = lines.flatMap((line, index) => (/^import\s+[^;]+;$/.test(line) ? [index] : []));
  const imports = importIndexes.map((index) => lines[index]);
  if (!imports.includes(importLine)) imports.push(importLine);
  if (importIndexes.length === 0) {
    const packageIndex = lines.findIndex((line) => /^package\s+[^;]+;$/.test(line));
    if (packageIndex < 0) throw new Error('Could not locate the MainActivity package declaration.');
    lines.splice(packageIndex + 1, 0, '', ...imports);
    return lines.join('\n');
  }

  const rank = (line) => {
    const name = line.slice('import '.length, -1);
    if (name.startsWith('android.')) return 0;
    if (name.startsWith('androidx.')) return 1;
    if (name.startsWith('com.')) return 2;
    if (name.startsWith('java.')) return 3;
    if (name.startsWith('javax.')) return 4;
    if (name.startsWith('org.')) return 5;
    return 6;
  };
  imports.sort((left, right) => rank(left) - rank(right) || left.localeCompare(right));
  const blocks = [];
  let currentRank = -1;
  for (const line of imports) {
    const lineRank = rank(line);
    if (lineRank !== currentRank) blocks.push([]);
    blocks[blocks.length - 1].push(line);
    currentRank = lineRank;
  }
  lines.splice(importIndexes[0], importIndexes.at(-1) - importIndexes[0] + 1, blocks.map((block) => block.join('\n')).join('\n\n'));
  return lines.join('\n');
}

const manifest = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifest)) {
  console.error('android/ folder not found. Run: npx cap add android');
  process.exit(1);
}
const originalManifest = fs.readFileSync(manifest, 'utf8');
let xml = originalManifest;
if (!xml.includes('com.zhiliaoapp.musically')) {
  xml = replaceOrThrow(
    xml,
    /<manifest\b[^>]*>/,
    (manifestTag) => `${manifestTag}\n\n    <queries>\n        <package android:name="com.zhiliaoapp.musically" />\n        <package android:name="com.ss.android.ugc.trill" />\n    </queries>`,
    'TikTok package visibility'
  );
}
const perms = [
  'android.permission.INTERNET',
  'android.permission.RECORD_AUDIO',
  'android.permission.CAMERA',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.POST_NOTIFICATIONS',
];
let added = 0;
for (const p of perms) {
  if (!xml.includes(`"${p}"`)) {
    xml = xml.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
    added++;
  }
}
if (!xml.includes('android.hardware.camera"')) {
  xml = xml.replace('</manifest>', '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>');
  added++;
}
// AdMob refuses to start without an APPLICATION_ID <meta-data> inside <application>.
// Use the real id when provided, otherwise Google's official test app id so debug builds still work.
const admobAppId = process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
if (!xml.includes('com.google.android.gms.ads.APPLICATION_ID')) {
  if (!xml.includes('</application>')) {
    throw new Error('Could not patch Android AdMob application id: no </application> element found.');
  }
  xml = xml.replace(
    '</application>',
    `        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${admobAppId}" />\n    </application>`
  );
  added++;
  console.log(
    process.env.ADMOB_ANDROID_APP_ID
      ? `AdMob APPLICATION_ID set to ${admobAppId}.`
      : 'AdMob APPLICATION_ID set to the Google TEST app id (set ADMOB_ANDROID_APP_ID for real ads).'
  );
}
writeIfChanged(manifest, originalManifest, xml);
console.log(`AndroidManifest.xml patched (${added} entries added).`);

const rootBuildFile = path.join('android', 'build.gradle');
const originalRootBuild = fs.readFileSync(rootBuildFile, 'utf8');
const repository = 'maven { url "https://artifact.bytedance.com/repository/AwemeOpenSDK" }';
let rootBuild = originalRootBuild;
if (!rootBuild.includes(repository)) {
  rootBuild = replaceOrThrow(
    rootBuild,
    /allprojects\s*\{\s*repositories\s*\{/,
    (repositoriesBlock) => `${repositoriesBlock}\n        ${repository}`,
    'TikTok Maven repository'
  );
}
// The @capacitor-firebase/* plugins (Analytics, Remote Config) and push need the Google Services
// Gradle plugin on the classpath. Capacitor usually ships this already — add it only if missing.
if (!rootBuild.includes('com.google.gms:google-services')) {
  rootBuild = replaceOrThrow(
    rootBuild,
    /(classpath\s+['"]com\.android\.tools\.build:gradle:[^'"]+['"])/,
    (classpathLine) => `${classpathLine}\n        classpath 'com.google.gms:google-services:4.4.2'`,
    'Google Services Gradle plugin classpath'
  );
}
writeIfChanged(rootBuildFile, originalRootBuild, rootBuild);

const appBuildFile = path.join('android', 'app', 'build.gradle');
const originalAppBuild = fs.readFileSync(appBuildFile, 'utf8');
let appBuild = originalAppBuild;
const androidVersionCode = process.env.ANDROID_VERSION_CODE || '1';
const androidVersionName = process.env.ANDROID_VERSION_NAME || '1.0';
const releaseBuild = process.env.RELEASE_BUILD === 'true';
const signingValues = [
  process.env.ANDROID_KEYSTORE_FILE,
  process.env.ANDROID_KEY_ALIAS,
  process.env.ANDROID_STORE_PASSWORD,
  process.env.ANDROID_KEY_PASSWORD,
];
if (!/^[1-9]\d*$/.test(androidVersionCode) || Number(androidVersionCode) > 2100000000) {
  throw new Error('ANDROID_VERSION_CODE must be an integer between 1 and 2100000000.');
}
if (!/^\d+\.\d+(?:\.\d+)?$/.test(androidVersionName)) {
  throw new Error('ANDROID_VERSION_NAME must use numeric major.minor[.patch] format.');
}
if (releaseBuild && signingValues.some((value) => !value)) {
  throw new Error('A production APK requires ANDROID_KEYSTORE_FILE, ANDROID_KEY_ALIAS, ANDROID_STORE_PASSWORD, and ANDROID_KEY_PASSWORD.');
}
if (!appBuild.includes('def tiktokClientKey')) {
  appBuild = replaceOrThrow(
    appBuild,
    /^apply plugin: ['"]com\.android\.application['"]\r?\n/m,
    (pluginLine) => `${pluginLine}\ndef tiktokClientKey = providers.gradleProperty("TIKTOK_CLIENT_KEY")\n    .orElse(providers.environmentVariable("TIKTOK_CLIENT_KEY"))\n    .getOrElse("")\n`,
    'TikTok client-key setting'
  );
}
if (!appBuild.includes('def chatimallReleaseBuild')) {
  appBuild = replaceOrThrow(
    appBuild,
    /^apply plugin: ['"]com\.android\.application['"]\r?\n/m,
    (pluginLine) =>
      `${pluginLine}` +
      `def chatimallReleaseBuild = providers.environmentVariable("RELEASE_BUILD").orElse("false").get() == "true"\n` +
      `def chatimallKeyStoreFile = providers.environmentVariable("ANDROID_KEYSTORE_FILE").orElse("").get()\n` +
      `def chatimallKeyAlias = providers.environmentVariable("ANDROID_KEY_ALIAS").orElse("").get()\n` +
      `def chatimallStorePassword = providers.environmentVariable("ANDROID_STORE_PASSWORD").orElse("").get()\n` +
      `def chatimallKeyPassword = providers.environmentVariable("ANDROID_KEY_PASSWORD").orElse("").get()\n` +
      `if (chatimallReleaseBuild && [chatimallKeyStoreFile, chatimallKeyAlias, chatimallStorePassword, chatimallKeyPassword].any { !it }) {\n` +
      `    throw new GradleException("Production APK signing secrets are incomplete.")\n` +
      `}\n`,
    'production APK signing settings'
  );
}
const versionCodePattern = /^([ \t]*)versionCode\s+\d+\s*$/m;
const versionNamePattern = /^([ \t]*)versionName\s+['"][^'"]+['"]\s*$/m;
if (!versionCodePattern.test(appBuild) || !versionNamePattern.test(appBuild)) {
  throw new Error('Could not locate Android versionCode/versionName in the generated app build file.');
}
appBuild = appBuild.replace(versionCodePattern, (_, indent) => `${indent}versionCode ${androidVersionCode}`);
appBuild = appBuild.replace(versionNamePattern, (_, indent) => `${indent}versionName "${androidVersionName}"`);
if (!appBuild.includes('buildConfigField "String", "TIKTOK_CLIENT_KEY"')) {
  appBuild = replaceOrThrow(
    appBuild,
    /^(\s*versionName\s+['"][^'"]+['"])/m,
    (versionLine) =>
      `${versionLine}\n        buildConfigField "String", "TIKTOK_CLIENT_KEY", "\\\"` +
      '${tiktokClientKey}' +
      `\\\""`,
    'TikTok client-key BuildConfig field'
  );
}
if (!appBuild.includes('storeFile file(chatimallKeyStoreFile)')) {
  appBuild = replaceOrThrow(
    appBuild,
    /^    buildTypes\s*\{/m,
    (buildTypesBlock) =>
      `    signingConfigs {\n` +
      `        release {\n` +
      `            if (chatimallReleaseBuild) {\n` +
      `                storeFile file(chatimallKeyStoreFile)\n` +
      `                storePassword chatimallStorePassword\n` +
      `                keyAlias chatimallKeyAlias\n` +
      `                keyPassword chatimallKeyPassword\n` +
      `            }\n` +
      `        }\n` +
      `    }\n\n` +
      `${buildTypesBlock}`,
    'production APK signing configuration'
  );
}
if (!appBuild.includes('signingConfig signingConfigs.release')) {
  appBuild = replaceOrThrow(
    appBuild,
    /^        release \{\r?\n/m,
    (releaseBlock) => `${releaseBlock}            if (chatimallReleaseBuild) signingConfig signingConfigs.release\n`,
    'production APK signing assignment'
  );
}
appBuild = appBuild.replace(/^        buildFeatures\s*\{\r?\n            buildConfig true\r?\n        \}\r?\n/m, '');
const buildFeaturesBlock = appBuild.match(/^    buildFeatures\s*\{([\s\S]*?)^    \}/m);
if (buildFeaturesBlock) {
  if (!buildFeaturesBlock[1].includes('buildConfig true')) {
    appBuild = appBuild.replace(buildFeaturesBlock[0], buildFeaturesBlock[0].replace(/^    \}/m, '        buildConfig true\n    }'));
  }
} else {
  appBuild = replaceOrThrow(
    appBuild,
    /^    buildTypes\s*\{/m,
    (buildTypesBlock) => `    buildFeatures {\n        buildConfig true\n    }\n\n${buildTypesBlock}`,
    'BuildConfig feature'
  );
}
for (const dependency of [
  "implementation 'com.tiktok.open.sdk:tiktok-open-sdk-core:2.2.0'",
  "implementation 'com.tiktok.open.sdk:tiktok-open-sdk-share:2.2.0'",
]) {
  if (!appBuild.includes(dependency)) {
    appBuild = replaceOrThrow(
      appBuild,
      /^dependencies\s*\{/m,
      (dependenciesBlock) => `${dependenciesBlock}\n    ${dependency}`,
      'TikTok Share Kit dependency'
    );
  }
}
// Apply the Google Services plugin only when google-services.json is present, so a checkout
// without it still builds (Analytics/Remote Config/push simply stay inert).
if (!appBuild.includes('com.google.gms.google-services')) {
  appBuild += `\n// Added by scripts/patch-android.mjs — process google-services.json when it exists.\nif (file('google-services.json').exists()) {\n    apply plugin: 'com.google.gms.google-services'\n}\n`;
}
writeIfChanged(appBuildFile, originalAppBuild, appBuild);

const activityFile = path.join('android', 'app', 'src', 'main', 'java', 'com', 'chatimall', 'app', 'MainActivity.java');
let activity = fs.readFileSync(activityFile, 'utf8');
for (const importName of [
  'android.content.Intent',
  'android.os.Bundle',
  'android.webkit.WebSettings',
  'androidx.core.splashscreen.SplashScreen',
  'com.getcapacitor.PluginHandle',
  'ee.forgr.capacitor.social.login.GoogleProvider',
  'ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin',
  'ee.forgr.capacitor.social.login.SocialLoginPlugin',
]) {
  activity = ensureJavaImport(activity, importName);
}
if (!activity.includes('implements ModifiedMainActivityForSocialLoginPlugin')) {
  activity = replaceOrThrow(
    activity,
    /public\s+class\s+MainActivity\s+extends\s+BridgeActivity(?:\s+implements\s+[^{]+)?\s*\{/,
    (classDeclaration) => {
      const declaration = classDeclaration.slice(0, classDeclaration.lastIndexOf('{')).trim();
      const existing = declaration.match(/\bimplements\s+(.+)$/);
      const base = existing ? declaration.slice(0, existing.index).trim() : declaration;
      const interfaces = existing ? `${existing[1].trim()}, ModifiedMainActivityForSocialLoginPlugin` : 'ModifiedMainActivityForSocialLoginPlugin';
      return `${base} implements ${interfaces} {`;
    },
    'Google sign-in activity interface'
  );
}
if (!activity.includes('handleGoogleLoginIntent')) {
  if (/\bonActivityResult\s*\(/.test(activity)) {
    throw new Error('MainActivity already defines onActivityResult; merge the Google sign-in result handler manually.');
  }
  activity = insertBeforeClassEnd(
    activity,
    'handleGoogleLoginIntent',
    `    @Override\n    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}\n\n    @Override\n    public void onActivityResult(int requestCode, int resultCode, Intent data) {\n        super.onActivityResult(requestCode, resultCode, data);\n        if (requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN || requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) return;\n\n        PluginHandle handle = getBridge() == null ? null : getBridge().getPlugin(\"SocialLogin\");\n        if (handle == null || !(handle.getInstance() instanceof SocialLoginPlugin)) return;\n        ((SocialLoginPlugin) handle.getInstance()).handleGoogleLoginIntent(requestCode, data);\n    }`,
    'Google sign-in activity-result handler'
  );
}
if (!activity.includes('SplashScreen.installSplashScreen(this)')) {
  const onCreate = /public\s+void\s+onCreate\s*\(\s*Bundle\s+savedInstanceState\s*\)\s*\{/;
  if (onCreate.test(activity)) {
    activity = replaceOrThrow(
      activity,
      onCreate,
      (methodStart) => `${methodStart}\n        SplashScreen.installSplashScreen(this);`,
      'Chatimall splash-screen installation'
    );
  } else {
    activity = insertBeforeClassEnd(
      activity,
      'SplashScreen.installSplashScreen(this)',
      `    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        SplashScreen.installSplashScreen(this);\n        super.onCreate(savedInstanceState);\n    }`,
      'Chatimall splash-screen installation'
    );
  }
}
if (!activity.includes('registerPlugin(TikTokSharePlugin.class)')) {
  const onCreate = /public\s+void\s+onCreate\s*\(\s*Bundle\s+savedInstanceState\s*\)\s*\{/;
  if (onCreate.test(activity)) {
    activity = replaceOrThrow(
      activity,
      onCreate,
      (methodStart) => `${methodStart}\n        registerPlugin(TikTokSharePlugin.class);`,
      'TikTok plugin registration'
    );
  } else {
    activity = insertBeforeClassEnd(
      activity,
      'registerPlugin(TikTokSharePlugin.class)',
      `    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(TikTokSharePlugin.class);\n        super.onCreate(savedInstanceState);\n    }`,
      'TikTok plugin registration'
    );
  }
}
if (!activity.includes('WebSettings.MIXED_CONTENT_ALWAYS_ALLOW')) {
  activity = replaceOrThrow(
    activity,
    /super\.onCreate\(savedInstanceState\);/,
    (superCall) => `${superCall}\n        if (BuildConfig.DEBUG && getBridge() != null) {\n            getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);\n        }`,
    'debug localhost API access'
  );
}
if (!activity.includes('handleShareResult(intent)')) {
  if (activity.includes('onNewIntent(')) {
    throw new Error('MainActivity already defines onNewIntent; merge the TikTok share-result handler manually.');
  }
  activity = insertBeforeClassEnd(
    activity,
    'handleShareResult(intent)',
    `    @Override\n    public void onNewIntent(Intent intent) {\n        super.onNewIntent(intent);\n        setIntent(intent);\n        if (getBridge() == null) return;\n\n        PluginHandle handle = getBridge().getPlugin("TikTokShare");\n        if (handle != null && handle.getInstance() instanceof TikTokSharePlugin) {\n            ((TikTokSharePlugin) handle.getInstance()).handleShareResult(intent);\n        }\n    }`,
    'TikTok share-result handler'
  );
}
writeIfChanged(activityFile, fs.readFileSync(activityFile, 'utf8'), activity);

const pluginTemplate = path.join('android-templates', 'TikTokSharePlugin.java');
const pluginFile = path.join('android', 'app', 'src', 'main', 'java', 'com', 'chatimall', 'app', 'TikTokSharePlugin.java');
fs.copyFileSync(pluginTemplate, pluginFile);
console.log('TikTok Android Share Kit plugin patched.');

const gs = path.join('android', 'app', 'google-services.json');
if (!fs.existsSync(gs)) {
  if (fs.existsSync('google-services.json')) {
    fs.copyFileSync('google-services.json', gs);
    console.log('Copied google-services.json into android/app/google-services.json.');
  } else if (fs.existsSync('../google-services.json')) {
    fs.copyFileSync('../google-services.json', gs);
    console.log('Copied ../google-services.json into android/app/google-services.json.');
  } else {
    console.warn('\nNOTE: android/app/google-services.json is missing. The app will still build, but push');
    console.warn('notifications, Firebase Analytics and Remote Config will not work until you add it');
    console.warn('(see ANDROID.md, sections 4 and 8).');
  }
}
