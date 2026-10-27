// Adds the Android permissions Chatimall needs (mic, camera, notifications) after `npx cap add android`.
import fs from 'node:fs';
import path from 'node:path';

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
writeIfChanged(rootBuildFile, originalRootBuild, rootBuild);

const appBuildFile = path.join('android', 'app', 'build.gradle');
const originalAppBuild = fs.readFileSync(appBuildFile, 'utf8');
let appBuild = originalAppBuild;
if (!appBuild.includes('def tiktokClientKey')) {
  appBuild = replaceOrThrow(
    appBuild,
    /^apply plugin: ['"]com\.android\.application['"]\r?\n/m,
    (pluginLine) => `${pluginLine}\ndef tiktokClientKey = providers.gradleProperty("TIKTOK_CLIENT_KEY")\n    .orElse(providers.environmentVariable("TIKTOK_CLIENT_KEY"))\n    .getOrElse("")\n`,
    'TikTok client-key setting'
  );
}
if (!appBuild.includes('buildConfigField "String", "TIKTOK_CLIENT_KEY"')) {
  appBuild = replaceOrThrow(
    appBuild,
    /^(\s*versionName\s+['"][^'"]+['"])/m,
    (versionLine) => `${versionLine}\n        buildConfigField "String", "TIKTOK_CLIENT_KEY", "\\"${tiktokClientKey}\\""`,
    'TikTok client-key BuildConfig field'
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
writeIfChanged(appBuildFile, originalAppBuild, appBuild);

const activityFile = path.join('android', 'app', 'src', 'main', 'java', 'com', 'chatimall', 'app', 'MainActivity.java');
let activity = fs.readFileSync(activityFile, 'utf8');
for (const importName of ['android.content.Intent', 'android.os.Bundle', 'android.webkit.WebSettings', 'com.getcapacitor.PluginHandle']) {
  activity = ensureJavaImport(activity, importName);
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
    console.warn('\nNOTE: android/app/google-services.json is missing. The app will build, but push notifications');
    console.warn('will not work until you add it (see ANDROID.md, step 3).');
  }
}
