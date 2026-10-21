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

## Alternate email sign-in

After signing in with a phone number, open **Settings → Personal Info → Add a sign-in email** and verify the email address. A verified email can then receive a login code as an alternative to SMS for that same account. The backend must have an email delivery adapter configured; see the backend README for its webhook contract. Email sign-in does not create a separate account.

## Deploy → Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project** → import repo. Vercel reads [vercel.json](file:///C:/Users/PRAISECYBER/Desktop/chatimall_full/frontend/vercel.json) automatically.
3. Set the following **environment variables**:
   - `VITE_API_URL` = your backend's full URL (e.g. `https://chatimall-backend.onrender.com`)
   - `VITE_GOOGLE_CLIENT_ID` = Google OAuth **Web application** client ID for Drive backups
4. Deploy.

## Google Drive chat backups

The Settings → Chat backup screen stores password-encrypted chat history and the device encryption key in the signed-in user's Google Drive. Google Drive receives only the encrypted backup; Chatimall does not receive the backup password. Attachments remain in Chatimall storage and are not included in the backup file.

To enable browser backups:

1. Create a Google Cloud project and enable the **Google Drive API**.
2. Configure the OAuth consent screen and add the intended account as a test user while the app is in testing.
3. Create an OAuth client ID of type **Web application**. Add `http://localhost:5173` and the deployed frontend origin to **Authorized JavaScript origins**.
4. Set `VITE_GOOGLE_CLIENT_ID` to that client ID in `frontend/.env.local` for local testing and in the Vercel project environment for production. Rebuild/redeploy after changing it. Do not add a client secret to the frontend.

Backups are currently manual and available in the browser version. Google blocks browser-based OAuth inside Android WebViews; enabling Drive backup in the APK requires a separate native Android Google sign-in integration and Android OAuth client. Scheduled automatic backups are not enabled.

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
| `VITE_GOOGLE_CLIENT_ID` | Unset | Google OAuth Web client ID; required for browser Google Drive backups |
