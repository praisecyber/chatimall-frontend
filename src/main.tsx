import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initRemoteConfig } from '@/lib/remoteConfig';
import { initAds } from '@/lib/ads';
import './index.css';

// Fetch Remote Config first, then bring up AdMob. Both are fire-and-forget and degrade to
// in-code defaults / no-ops, so they never block or break first paint.
void initRemoteConfig().finally(() => {
  void initAds();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
