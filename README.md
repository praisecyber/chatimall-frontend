# Chatimall — Frontend

React + TypeScript + Vite frontend for Chatimall. Deploy target: **Vercel**. Also builds to Android via Capacitor (see [ANDROID.md](file:///C:/Users/PRAISECYBER/Desktop/chatimall_full/frontend/ANDROID.md)).

Sibling repos:
- `chatimall-backend` — Node/Express + MongoDB API server (chats, users, auth, sockets) → Render
- `chatimall-translate-service` — Python/ML voice-note translation microservice → its own VPS/instance (needs ≥ 4 GB RAM)

## Local development

```bash
npm install
cp .env.example .env         # if .env.example exists; otherwise create frontend/.env and leave empty for local dev
npm run dev                  # Vite dev server on http://localhost:5173
```

Vite automatically proxies API + socket calls to the backend at `http://localhost:4000` when running locally — no `VITE_API_URL` needed for development.

Other commands:

```bash
npm run build                # Production build to dist/
npm run typecheck            # TypeScript checks (tsc --noEmit)
npm run lint                 # ESLint
npm run preview              # Serve the built dist/ locally
```

## Link a web or Android device

On a device that is already signed in, open **Settings → Link an existing account** and scan the QR code shown on the device you want to add, or enter its 9-digit pairing code. Pairing requests expire after two minutes; up to five linked devices can be active at once. Unlink a device from the settings screen to revoke its sessions.

Web QR scanning requires camera access and a secure context (HTTPS, or localhost). Android uses the ML Kit barcode scanner; the Google Barcode Scanner module may download the first time it is needed.

## Phone sign-in with email codes

Sign-in starts with a phone number, then asks for an email address and sends the one-time code to that email. Existing phone accounts receive codes only at their already-linked, verified email. Completing the email OTP confirms the submitted phone number for the account. Changing or confirming a number in Settings also sends a code to the account's verified email. The backend must have an email delivery provider configured; see the backend README for the available providers.

The email code proves access to the email inbox and confirms the account's association with the submitted phone number, but it does not prove possession of the SIM. Confirmed numbers are used for phone contact discovery. This flow avoids SMS charges for sign-in and phone confirmation, but is not equivalent to carrier-based phone verification.

If normal sign-in fails, choose **Recover account using this phone**. Chatimall looks up the existing account by phone and sends a recovery code only to its already-verified email. The flow does not reveal whether a number is registered, does not accept a replacement email, and does not create or change account details.

## Deploy → Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project** → import repo. Vercel reads [vercel.json](file:///C:/Users/PRAISECYBER/Desktop/chatimall_full/frontend/vercel.json) automatically.
3. Set the following **environment variables**:
   - `VITE_API_URL` = your backend's full URL (e.g. `https://chatimall-backend.onrender.com`)
   - `VITE_GOOGLE_CLIENT_ID` = Google OAuth **Web application** client ID for Drive backups
4. Deploy.

The landing page's Android download button and QR code use the latest APK attached to
[Chatimall GitHub Releases](https://github.com/praisecyber/chatimall/releases/latest), rather than bundling the
large APK in the Vercel deployment.

## Production release workflow

The owner-only Admin Console **Release Center** links to the frontend repository's
`.github/workflows/release.yml`. Push feature changes to `praisecyber/chatimall-frontend`, then run the
workflow from GitHub Actions. It checks types and lint, builds the web app, a signed Android APK, and
a checksum-verified updater bundle, then pauses at the protected `production` environment before
deploying the website and update bundle to Vercel and publishing `Chatimall.apk`
as a new release in `praisecyber/chatimall` (the existing download repository). Render is a separate
backend service and is not deployed by this frontend workflow.

Before the first run:

1. Add these repository Actions secrets: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`,
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_STORE_PASSWORD`, and
   `ANDROID_KEY_PASSWORD`. `ANDROID_GOOGLE_SERVICES_JSON_BASE64` is optional.
2. Add these secrets to the GitHub `production` environment: `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `CHATIMALL_RELEASE_TOKEN`. The last secret must be a
   fine-grained token with Contents read/write access only to `praisecyber/chatimall`, so the frontend
   workflow can publish the APK to the repository used by the download page.
3. Configure the `production` environment to require a reviewer and restrict deployments to the
   production branch. Store the Android signing keystore safely and do not commit it.
4. Configure the Vercel project’s production environment variables, including `VITE_API_URL` and
   `VITE_GOOGLE_CLIENT_ID`. The workflow uses those values for its production build.
5. No Capgo account, token, or separate update server is required. Vercel serves the update-check
   endpoint and versioned ZIP bundles alongside the web app. The updater is configured to use that
   production endpoint and verifies bundle downloads with a SHA-256 checksum.

To encode an Android keystore for the `ANDROID_KEYSTORE_BASE64` secret in PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\chatimall-release.jks'))
```

Self-hosted live updates are limited to web assets compatible with the native code already installed.
Changes to native code, Capacitor configuration, or plugins still need a signed APK; do not publish an
OTA bundle that requires a native change. The new APK must be installed once to add/configure the
updater on existing devices; later compatible web updates can arrive over the air. This avoids
Capgo's paid service, but does not guarantee unlimited or permanently free hosting: the endpoint and bundles use
Vercel's quotas, so monitor usage and check the current plan limits.
Direct APK installation continues to require Android's install confirmation. The signing keystore
must match the one used for existing production APKs or Android will reject the APK as an update;
devices running debug builds will need a one-time uninstall/reinstall to move to a separately signed
production build.

## Windows desktop installer (Electron)

The Windows app is an Electron desktop client for the deployed Chatimall web app. It opens the production site at
`https://praisecyber-chatimall-frontend.vercel.app/`, so it uses the same sign-in and backend as the browser and
requires an internet connection.

On Windows, build the x64 NSIS installer from the `frontend` directory:

```bash
npm install
npm run build:windows
```

The installer is written to `frontend/release/Chatimall-Setup.exe`. Attach that file to a GitHub Release with the
asset name `Chatimall-Setup.exe`; the download page links to the latest release asset. Electron external links open
in the system browser, and the desktop window does not expose Node.js to the web app. The NSIS installer includes a
branded welcome and completion page, Chatimall icons, a custom sidebar, and an optional install-directory step.

## Google Drive chat backups

Settings → Chat backup supports password-protected backups in browsers and Android. Backups are encrypted on-device with AES-256-GCM before upload. Attachments are not included. To enable Drive access:

1. Create a Google Cloud project and enable the **Google Drive API**.
2. Configure the OAuth consent screen and add test accounts while the app is in testing.
3. Create a **Web application** OAuth client. Add `http://localhost:5173` and the deployed frontend origin to its authorized JavaScript origins.
4. For Android, create an **Android** OAuth client in the same project for package `com.chatimall.app`. Register the SHA-1 signing fingerprints used by your debug, release, and Play-signed APKs.
5. Set `VITE_GOOGLE_CLIENT_ID` to the Web client ID in `frontend/.env.local`, Vercel, or the environment used for APK builds. Rebuild/redeploy after changing it. This is a public client ID; never put a client secret in the frontend.

Automatic scheduled backups are not available yet. Use **Back up now** in Settings to create a password-protected backup. Save the password somewhere safe; Chatimall cannot recover it.

The first Drive action asks you to authorize access. If Google requires authorization again, use **Find backups in Google Drive** in Settings. After signing in on a new device, enter the backup password to restore the device encryption key. Chat history remains in the signed-in Chatimall account; the Drive file includes an encrypted history snapshot as well.

## Android APK (Capacitor)

App ID is pre-configured as `com.chatimall.app` in [capacitor.config.json](file:///C:/Users/PRAISECYBER/Desktop/chatimall_full/frontend/capacitor.config.json). On a machine with Android Studio installed:

```bash
npm install
npm run build                # IMPORTANT: build the web assets FIRST, and make sure VITE_API_URL is set to your real backend
npx cap add android          # first time only
npx cap sync android
npx cap open android
```

Then in Android Studio: **Build → Generate Signed Bundle / APK** (create a keystore the first time if you don't have one).

## Environment variables

| Variable | Local dev | Production (Vercel / Android build) |
|---|---|---|
| `VITE_API_URL` | Unset (Vite proxies to localhost:4000) | **Required** — full backend base URL (no trailing slash) |
| `VITE_GOOGLE_CLIENT_ID` | Unset | Google OAuth Web client ID; required for Google Drive backups in browser and Android builds |
