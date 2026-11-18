import { useEffect } from 'react';
import { hideBanner, isAdsSupported, removeBanner, showBanner } from '@/lib/ads';
import { useRemoteFlags } from '@/lib/remoteConfig';

/**
 * Drives the native AdMob banner and reserves its screen space. Renders `null` on web/Electron
 * and whenever the `ads_banner_enabled` remote flag is off, so it never affects the browser
 * layout and never covers app content on Android.
 */
export default function AdBanner({ margin = 0 }: { margin?: number }) {
  const { ads_banner_enabled } = useRemoteFlags();
  const enabled = ads_banner_enabled && isAdsSupported();

  useEffect(() => {
    if (!enabled) {
      void hideBanner();
      return;
    }
    void showBanner({ margin });
    return () => {
      void removeBanner();
    };
  }, [enabled, margin]);

  if (!enabled) return null;

  // The native banner is drawn over the WebView, so reserve its height to avoid hiding content.
  return <div aria-hidden className="w-full h-14 flex-shrink-0" />;
}
