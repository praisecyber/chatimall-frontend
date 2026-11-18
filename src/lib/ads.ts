import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize, type BannerAdOptions } from '@capacitor-community/admob';
import { logEvent } from './analytics';
import { getFlag } from './remoteConfig';
import { secureGetItem, secureSetItem } from './secure';

/**
 * AdMob layer. Android-only: on web and Electron every function is a no-op, so nothing about
 * the browser/desktop build changes. All gating goes through {@link isAdsSupported}.
 *
 * Google's official test ad-unit ids are the fallback so a build without env config still
 * renders *test* ads rather than blank space (and never serves real ads to you).
 */
const BANNER_AD_UNIT_ID =
  import.meta.env.VITE_ADMOB_ANDROID_BANNER_ID || 'ca-app-pub-3940256099942544/6300978111';
const INTERSTITIAL_AD_UNIT_ID =
  import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/1033173712';
const REWARDED_INTERSTITIAL_AD_UNIT_ID =
  import.meta.env.VITE_ADMOB_ANDROID_REWARDED_INTERSTITIAL_ID || 'ca-app-pub-3940256099942544/5354046379';

/** How long a rewarded ad grants the cosmetic "Supporter" badge. */
const SUPPORTER_BADGE_MS = 60 * 60 * 1000; // 1 hour
const SUPPORTER_BADGE_KEY = 'supporter-badge-until';

/** Ads are only meaningful in the installed Android app. */
export function isAdsSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

// ---- Rewarded-ad cosmetic reward -----------------------------------------
// The rewarded ad exists to earn ad revenue for the app owner. The user gets a
// purely cosmetic "Supporter" badge (gold ring + label) for SUPPORTER_BADGE_MS —
// it does NOT hide or disable any ads, so ad revenue is unaffected.
let supporterBadgeUntil: number | null = null;

/** Load the persisted supporter-badge expiry. Called once by initAds. */
async function loadSupporterState(): Promise<void> {
  const raw = await secureGetItem(SUPPORTER_BADGE_KEY);
  if (!raw) return;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return;
  if (parsed <= Date.now()) {
    supporterBadgeUntil = null;
    void secureSetItem(SUPPORTER_BADGE_KEY, '').catch(() => {});
    return;
  }
  supporterBadgeUntil = parsed;
}

/** Grant the supporter badge for the given duration (persisted). */
export async function grantSupporterBadge(ms: number): Promise<void> {
  supporterBadgeUntil = Date.now() + ms;
  await secureSetItem(SUPPORTER_BADGE_KEY, String(supporterBadgeUntil));
}

/** Sync getter for the supporter-badge expiry timestamp (null = inactive). */
export function getSupporterBadgeUntil(): number | null {
  return supporterBadgeUntil;
}

/** True while the user has an active supporter badge. */
export function isSupporterBadgeActive(): boolean {
  return supporterBadgeUntil !== null && supporterBadgeUntil > Date.now();
}

let initPromise: Promise<void> | null = null;

/** Initialize the AdMob SDK once. Idempotent; safe to call from multiple places. */
export function initAds(): Promise<void> {
  if (!isAdsSupported()) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await AdMob.initialize({ initializeForTesting: import.meta.env.DEV });
      await loadSupporterState();
    } catch (err) {
      console.warn('[ads] AdMob initialization failed', err);
    }
  })();
  return initPromise;
}

/** Show a bottom banner. Respects the `ads_banner_enabled` remote flag. */
export async function showBanner(options?: { margin?: number; position?: BannerAdPosition }): Promise<void> {
  if (!isAdsSupported()) return;
  if (!getFlag<boolean>('ads_banner_enabled')) return;
  try {
    await initAds();
    const config: BannerAdOptions = {
      adId: BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: options?.position ?? BannerAdPosition.BOTTOM_CENTER,
      margin: options?.margin ?? 0,
      isTesting: import.meta.env.DEV,
    };
    await AdMob.showBanner(config);
    logEvent('ad_impression', { ad_format: 'banner', ad_unit: BANNER_AD_UNIT_ID, placement: 'banner' });
  } catch (err) {
    console.warn('[ads] showBanner failed', err);
  }
}

/** Hide (but keep alive) the banner. */
export async function hideBanner(): Promise<void> {
  if (!isAdsSupported()) return;
  try {
    await AdMob.hideBanner();
  } catch (err) {
    console.warn('[ads] hideBanner failed', err);
  }
}

/** Destroy the banner entirely (release the native view). */
export async function removeBanner(): Promise<void> {
  if (!isAdsSupported()) return;
  try {
    await AdMob.removeBanner();
  } catch (err) {
    console.warn('[ads] removeBanner failed', err);
  }
}

// ---- Interstitial pacing ---------------------------------------------------
// A single process-wide counter: every qualifying message the user opens increments it, and an
// interstitial is only allowed once the remote-config threshold is reached.
let messagesSinceLastInterstitial = 0;

/** Called when the user opens/reads a message; drives the interstitial interval. */
export function countOpenedMessage(): void {
  messagesSinceLastInterstitial += 1;
}

/**
 * Show an interstitial if the remote-config flags and message counter allow it.
 * `ads_interstitial_enabled` turns it off; `ads_interstitial_after_messages` (0 disables)
 * is the number of opened messages required between ads.
 */
export async function showInterstitialIfDue(placement: string): Promise<void> {
  if (!isAdsSupported()) return;
  if (!getFlag<boolean>('ads_interstitial_enabled')) return;
  const threshold = getFlag<number>('ads_interstitial_after_messages');
  if (!threshold || threshold <= 0) return;
  if (messagesSinceLastInterstitial < threshold) return;

  messagesSinceLastInterstitial = 0;
  try {
    await initAds();
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID, isTesting: import.meta.env.DEV });
    await AdMob.showInterstitial();
    logEvent('ad_impression', { ad_format: 'interstitial', ad_unit: INTERSTITIAL_AD_UNIT_ID, placement });
  } catch (err) {
    console.warn('[ads] showInterstitialIfDue failed', err);
  }
}

// ---- Rewarded interstitial -------------------------------------------------
export interface Reward {
  type: string;
  amount: number;
}

/**
 * Show a rewarded interstitial. Returns the granted reward, or `null` if the
 * ad was dismissed before the reward was granted (or rewarded ads are disabled).
 * On a successful reward, the user gets a cosmetic "Supporter" badge for
 * {@link SUPPORTER_BADGE_MS}. Ads are NOT hidden — this ad exists purely to
 * earn ad revenue for the app owner.
 */
export async function showRewardedInterstitial(): Promise<Reward | null> {
  if (!isAdsSupported()) return null;
  if (!getFlag<boolean>('ads_rewarded_enabled')) return null;
  try {
    await initAds();
    await AdMob.prepareRewardInterstitialAd({
      adId: REWARDED_INTERSTITIAL_AD_UNIT_ID,
      isTesting: import.meta.env.DEV,
    });
    const reward = await AdMob.showRewardInterstitialAd();
    logEvent('ad_impression', {
      ad_format: 'rewarded_interstitial',
      ad_unit: REWARDED_INTERSTITIAL_AD_UNIT_ID,
      value: reward.amount,
      reward_type: reward.type,
    });
    await grantSupporterBadge(SUPPORTER_BADGE_MS);
    return reward;
  } catch (err) {
    console.warn('[ads] showRewardedInterstitial failed', err);
    return null;
  }
}
