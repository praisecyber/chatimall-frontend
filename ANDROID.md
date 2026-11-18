# Building the Android app (APK) with push notifications

Requirements on your PC: Node 18+, **JDK 17**, and **Android Studio** (it installs the Android SDK).
Set `ANDROID_HOME` if Gradle cannot find the SDK.

## 1. One-command debug APK
```
npm install
npm run apk:debug
```
This installs Capacitor if missing, builds the web app, creates the `android/` project, adds the
mic/camera/notification permissions, syncs, and runs Gradle. The APK ends up at
`android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to a phone and install it.
(`.env` must exist first, because `VITE_API_URL` is baked into the build.)
The Android build excludes the previously downloaded APK from its own web assets.
Google Drive chat backups are currently available in the browser version only. The APK needs native Google sign-in/OAuth configuration before it can use Drive backups.

To work in Android Studio instead: `npm run android:sync` then `npm run android:open`.

## 2. Test on your phone
Enable "Install unknown apps" for your file manager/browser, open the APK, sign in.
Allow microphone, camera and notifications when asked.

## 3. Point the app at your server
The APK cannot use the PC's `localhost`. Deploy the server (see SETUP.md, section 6) and put its **https** address
in the project's `.env`. The APK build now stops if `VITE_API_URL` is missing or is invalid, rather than
silently producing an app that sends API requests to its own WebView:
```
VITE_API_URL=https://your-chatimall-server.example.com
```
Then rebuild the APK. If you set `CLIENT_ORIGINS` on the server, include `https://localhost` (the origin the
Android app uses).

For a USB-connected **debug-only** build against the backend running on this PC, use the device's localhost
through ADB reverse. In PowerShell, from `frontend/`:
```powershell
adb reverse tcp:4000 tcp:4000
$env:VITE_API_URL = 'http://localhost:4000'
npm run apk:debug
```
The build script enables cleartext access only in the debug variant, and the WebView allows mixed content
only when running a debug build. Do not use the local HTTP URL for a release build; use the HTTPS server
URL above instead.

## 4. Push notifications (Firebase Cloud Messaging – free)
1. console.firebase.google.com → create a project → **Add Android app** with package name
   `com.chatimall.app` → download `google-services.json` → put it in `android/app/`.
2. Project settings → **Service accounts** → **Generate new private key** (a JSON file).
3. On your server host set `FCM_SERVICE_ACCOUNT` to that JSON (whole file as one line, or a path to it).
   The server then sends a push for new messages and incoming calls whenever the receiver is not connected.
4. Rebuild the APK (`npm run apk:debug`) so it includes `google-services.json`.

Never commit the service-account JSON or `google-services.json` to a public repo.

## 5. Release APK / Play Store
A debug APK is fine for testing and sharing. For the Play Store you need a signed **release**
build (an AAB): in Android Studio use *Build → Generate Signed Bundle / APK*, create a keystore,
and **back it up** – if you lose it you can never update the app. Add an icon and splash screen
first (`npx @capacitor/assets generate`).

**Light/dark splash screen:** `assets/splash.png` (light) and `assets/splash-dark.png` (dark) are
already in place. `@capacitor/assets generate` reads both and creates a `drawable-night-*` set
automatically, so Android shows the dark splash on a phone in dark mode and the light one
otherwise — this follows the phone's own setting, not a clock, so there's nothing else to wire up.
After running it, open `android/app/src/main/res/` and confirm both a `drawable-*` and a
`drawable-night-*` splash image exist before you build — I can't run this generator myself (it
needs the Android SDK), so this one check matters.

## 6. Calls on mobile data
Add a TURN server in `.env` (see `.env.example`), rebuild, and test a call between two phones on
different networks. Without TURN, roughly one call in five between mobile networks can fail.

## 7. TikTok Share Kit (Android)
The Android app uses TikTok OpenSDK Share Kit to send a user-selected photo set or MP4 video to TikTok.
Add the Android app signature and SHA-256 signing-certificate fingerprint to the TikTok **sandbox**
app settings. The Android SDK is added from TikTok's official Maven repository; do not copy the SDK
sample app or its credentials into Chatimall.
The native plugin source is kept in `android-templates/` because the generated `android/` directory
is ignored by Git. Both `npm run apk:debug` and `npm run android:sync` apply the plugin, SDK dependencies,
and package visibility configuration before syncing the native project.

For a local sandbox build, set `TIKTOK_CLIENT_KEY` in the same PowerShell session that builds the app:
```powershell
$env:TIKTOK_CLIENT_KEY = '<sandbox client key>'
npm run android:sync
npm run apk:debug
```
The key is embedded in the Android build and must not be a client secret. Do not put a TikTok client
secret in the frontend or Android project. Configure the sandbox's Android platform with the signing
fingerprints for the exact build you install on the phone; Play Store signing fingerprints are
different from local debug fingerprints.

In the Android app, open **Settings → TikTok account → Choose photos or video**. Choose at least two
photos or one MP4 video, then complete or cancel the flow inside TikTok. Media is selected with
Android's system picker and remains user-controlled.

## 8. AdMob + Firebase Analytics
The Android app reports analytics to the Firebase **app** stream (not the web stream) and shows AdMob
banners/interstitials. Both are wired by `scripts/patch-android.mjs` at build time, so re-run
`npm run apk:debug` (or `npm run android:sync`) after changing anything here.

**Analytics + Remote Config.** These go through the `@capacitor-firebase/analytics` and
`@capacitor-firebase/remote-config` plugins, which require the Google Services Gradle plugin to read
`android/app/google-services.json` (see section 4). The patch script adds the plugin classpath and
applies `com.google.gms.google-services` **only when `google-services.json` exists**, so a checkout
without it still builds — analytics and Remote Config simply stay inert.

**AdMob APPLICATION_ID (build-time env, NOT a VITE_ variable).** AdMob refuses to start without a
`com.google.android.gms.ads.APPLICATION_ID` `<meta-data>` entry in `AndroidManifest.xml`. The patch
script injects it from the `ADMOB_ANDROID_APP_ID` environment variable, falling back to Google's
official test app id (`ca-app-pub-3940256099942544~3347511713`) when it is not set. Set it in the same
PowerShell session that builds the APK:
```powershell
$env:ADMOB_ANDROID_APP_ID = 'ca-app-pub-<your-id>~<your-id>'
npm run apk:debug
```

**AdMob ad unit IDs (VITE_ variables).** The banner and interstitial ad unit ids are read at build
time from `VITE_ADMOB_ANDROID_BANNER_ID` and `VITE_ADMOB_ANDROID_INTERSTITIAL_ID` (see `.env.example`).
When they are empty the app uses Google's public test ad units, which is correct for development.
Replace them with real ad unit ids before a Play Store release and rebuild.

Ads only run on Android; on the web and in the Electron desktop app every ad call is a no-op.
Whether the banner, the interstitial, and the message-count interval are shown is controlled by
Firebase Remote Config (`ads_banner_enabled`, `ads_interstitial_enabled`,
`ads_interstitial_after_messages`), so you can turn them off without shipping a new build.

