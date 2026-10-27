// One command: build web app -> sync into Android project -> patch permissions -> build debug APK.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv } from 'vite';

const win = process.platform === 'win32';
const run = (cmd, args, opts = {}) => {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) {
    console.error(`\nStep failed: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
};

if (!fs.existsSync('.env')) {
  console.error('Missing .env file. Copy .env.example to .env and set VITE_API_URL to your deployed server (https).');
  process.exit(1);
}
const apiUrl = process.env.VITE_API_URL ?? loadEnv('production', process.cwd(), 'VITE_').VITE_API_URL;
let localApi = false;
try {
  const parsedApiUrl = new URL(apiUrl);
  localApi = parsedApiUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsedApiUrl.hostname);
  if ((!localApi && parsedApiUrl.protocol !== 'https:') || parsedApiUrl.pathname !== '/' || parsedApiUrl.search || parsedApiUrl.hash) {
    throw new Error();
  }
} catch {
  console.error('VITE_API_URL must be an absolute HTTPS URL, or an HTTP localhost URL for USB-reversed debug testing.');
  console.error('Set it in frontend/.env or in the PowerShell session, then rebuild the APK.');
  process.exit(1);
}
if (!fs.existsSync(path.join('node_modules', '@capacitor', 'cli'))) {
  run('npm', ['install', '@capacitor/core', '@capacitor/android', '@capacitor/push-notifications']);
  run('npm', ['install', '-D', '@capacitor/cli']);
}
run('npx', ['vite', 'build']);
if (!fs.existsSync('android')) run('npx', ['cap', 'add', 'android']);
run('node', ['scripts/patch-android.mjs']);
run('npx', ['cap', 'sync', 'android']);
if (localApi) {
  const debugManifestPath = path.join('android', 'app', 'src', 'debug', 'AndroidManifest.xml');
  fs.mkdirSync(path.dirname(debugManifestPath), { recursive: true });
  fs.writeFileSync(
    debugManifestPath,
    '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n' +
      '    <application android:usesCleartextTraffic="true" />\n' +
      '</manifest>\n'
  );
  console.log('Enabled HTTP access for localhost in this debug build only.');
}
run(win ? 'gradlew.bat' : './gradlew', ['--no-daemon', 'assembleDebug'], { cwd: 'android' });

const apk = path.join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
console.log(fs.existsSync(apk) ? `\nDONE. Your APK: ${apk}` : '\nBuild finished but the APK was not found where expected.');
