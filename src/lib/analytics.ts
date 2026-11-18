import { Capacitor } from '@capacitor/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import {
  getAnalytics,
  isSupported as isWebAnalyticsSupported,
  logEvent as webLogEvent,
  setAnalyticsCollectionEnabled as webSetEnabled,
  setUserId as webSetUserId,
  setUserProperties as webSetUserProperties,
  type Analytics,
} from 'firebase/analytics';
import { firebaseApp } from './firebase';

/**
 * One analytics layer, two backends.
 *
 * Why two: the Firebase JS SDK fired inside the Android WebView reports to a *web* data stream.
 * Everything the mobile side actually depends on — AdMob linking, user metrics, conversions,
 * audiences and the BigQuery export — is attached to the Android *app* stream, which the web SDK
 * never touches. On Android we therefore go through the native `@capacitor-firebase/analytics`
 * plugin (which reports to the app stream); on the web (and Electron, which is not a Capacitor
 * native platform) we use the JS SDK.
 */
const isNative = (): boolean => Capacitor.isNativePlatform();

/** Values GA4 will accept verbatim. Objects/arrays are JSON-encoded so nothing is ever dropped. */
type ParamValue = string | number | boolean;

let webAnalytics: Analytics | null = null;
let webAnalyticsResolved = false;

/** Lazily resolve the web Analytics instance; returns null when unsupported (SSR, no measurementId). */
function getWebAnalytics(): Analytics | null {
  if (isNative() || typeof window === 'undefined') return null;
  if (webAnalyticsResolved) return webAnalytics;
  webAnalyticsResolved = true;
  try {
    webAnalytics = getAnalytics(firebaseApp);
  } catch (err) {
    // Analytics is optional: never let a missing measurementId take the app down.
    console.warn('[analytics] web analytics is unavailable', err);
    webAnalytics = null;
  }
  return webAnalytics;
}

/** Fire-and-forget probe so the first event isn't dropped while `isSupported()` settles. */
void isWebAnalyticsSupported()
  .then((yes) => {
    if (yes) getWebAnalytics();
  })
  .catch(() => {
    /* unsupported environment — web backend simply stays off */
  });

/** Strip undefined/null and coerce objects to JSON so params are always GA4-safe primitives. */
function sanitize(params?: Record<string, unknown>): Record<string, ParamValue> | undefined {
  if (!params) return undefined;
  const out: Record<string, ParamValue> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else {
      try {
        out[key] = JSON.stringify(value);
      } catch {
        // Circular or otherwise unserializable — skip it rather than throw.
      }
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Log a GA4 event. Never throws and never rejects: analytics must not be able to break a flow.
 * Silently no-ops when the active backend is unavailable.
 */
export function logEvent(name: string, params?: Record<string, unknown>): void {
  const sanitized = sanitize(params);
  if (isNative()) {
    void FirebaseAnalytics.logEvent({ name, params: sanitized }).catch((err) => {
      console.warn(`[analytics] logEvent("${name}") failed`, err);
    });
    return;
  }
  const analytics = getWebAnalytics();
  if (!analytics) return;
  try {
    webLogEvent(analytics, name, sanitized);
  } catch (err) {
    console.warn(`[analytics] logEvent("${name}") failed`, err);
  }
}

/** Associate (or clear) the signed-in user id. */
export function setAnalyticsUser(userId: string | null): void {
  if (isNative()) {
    void FirebaseAnalytics.setUserId({ userId }).catch((err) => {
      console.warn('[analytics] setUserId failed', err);
    });
    return;
  }
  const analytics = getWebAnalytics();
  if (!analytics) return;
  try {
    webSetUserId(analytics, userId);
  } catch (err) {
    console.warn('[analytics] setUserId failed', err);
  }
}

/** Set GA4 user properties. The native plugin needs one call per property. */
export function setAnalyticsUserProperties(props: Record<string, string | number | boolean>): void {
  if (isNative()) {
    for (const [key, value] of Object.entries(props)) {
      void FirebaseAnalytics.setUserProperty({ key, value: String(value) }).catch((err) => {
        console.warn(`[analytics] setUserProperty("${key}") failed`, err);
      });
    }
    return;
  }
  const analytics = getWebAnalytics();
  if (!analytics) return;
  try {
    webSetUserProperties(analytics, props);
  } catch (err) {
    console.warn('[analytics] setUserProperties failed', err);
  }
}

/** Report the current screen. Android uses setCurrentScreen; web emits a GA4 `screen_view`. */
export function setAnalyticsScreen(name: string): void {
  if (isNative()) {
    void FirebaseAnalytics.setCurrentScreen({ screenName: name }).catch((err) => {
      console.warn(`[analytics] setCurrentScreen("${name}") failed`, err);
    });
    return;
  }
  // The web SDK's setCurrentScreen is deprecated — GA4 wants a screen_view event instead.
  logEvent('screen_view', { screen_name: name, firebase_screen: name });
}

/** Turn collection on/off (e.g. for a consent gate). */
export function setAnalyticsEnabled(enabled: boolean): void {
  if (isNative()) {
    void FirebaseAnalytics.setEnabled({ enabled }).catch((err) => {
      console.warn('[analytics] setEnabled failed', err);
    });
    return;
  }
  const analytics = getWebAnalytics();
  if (!analytics) return;
  try {
    webSetEnabled(analytics, enabled);
  } catch (err) {
    console.warn('[analytics] setAnalyticsCollectionEnabled failed', err);
  }
}

// ---------------------------------------------------------------------------
// Typed helpers. Names follow GA4's recommended events wherever one exists.
// ---------------------------------------------------------------------------

/** GA4 recommended `login`. `method` is typically 'phone' or 'device'. */
export function trackLogin(method: string): void {
  logEvent('login', { method });
}

/** GA4 recommended `sign_up`. */
export function trackSignUp(method: string): void {
  logEvent('sign_up', { method });
}

/** Alias for {@link setAnalyticsScreen} — reads better at call sites. */
export function trackScreen(name: string): void {
  setAnalyticsScreen(name);
}

/** GA4 recommended `view_item`. `priceMajor` is in major units (e.g. 12.5 = $12.50). */
export function trackViewItem(item: {
  id: string;
  name?: string;
  priceMajor?: number;
  currency?: string;
}): void {
  logEvent('view_item', {
    item_id: item.id,
    item_name: item.name,
    currency: item.currency,
    value: item.priceMajor,
  });
}

/** Custom `contact_seller` — a marketplace buyer reaching out to a seller. */
export function trackContactSeller(listing: {
  listingId: string;
  title?: string;
  priceMajor?: number;
  currency?: string;
}): void {
  logEvent('contact_seller', {
    listing_id: listing.listingId,
    title: listing.title,
    value: listing.priceMajor,
    currency: listing.currency,
  });
}

/** GA4 recommended `begin_checkout`. */
export function trackBeginCheckout(checkout: {
  orderReference?: string;
  amountMajor: number;
  currency: string;
}): void {
  logEvent('begin_checkout', {
    transaction_id: checkout.orderReference,
    value: checkout.amountMajor,
    currency: checkout.currency,
  });
}

/** Custom `order_created` — an order was placed successfully. */
export function trackOrderCreated(order: {
  orderReference: string;
  amountMajor: number;
  currency: string;
}): void {
  logEvent('order_created', {
    transaction_id: order.orderReference,
    value: order.amountMajor,
    currency: order.currency,
  });
}

/**
 * The `ecommerce_purchase` event used for revenue/ARPU/ARPPU reporting.
 * `amountMajor` is in MAJOR currency units (USD 12.50 -> 12.5) and `orderReference`
 * becomes `transaction_id`. Shipping (major units) and a coupon code are optional.
 */
export function trackPurchase(purchase: {
  orderReference: string;
  amountMajor: number;
  currency: string;
  shippingMajor?: number;
  coupon?: string;
}): void {
  logEvent('ecommerce_purchase', {
    transaction_id: purchase.orderReference,
    value: purchase.amountMajor,
    currency: purchase.currency,
    shipping: purchase.shippingMajor,
    coupon: purchase.coupon,
  });
}

/** Custom `ad_impression` — an ad unit was shown. */
export function trackAdImpression(ad: { format: string; adUnit?: string; placement?: string }): void {
  logEvent('ad_impression', {
    ad_format: ad.format,
    ad_unit: ad.adUnit,
    placement: ad.placement,
  });
}

/** Custom `ad_click` — an ad was tapped. */
export function trackAdClick(ad: { format: string; adUnit?: string; placement?: string }): void {
  logEvent('ad_click', {
    ad_format: ad.format,
    ad_unit: ad.adUnit,
    placement: ad.placement,
  });
}

/** GA4 recommended `share`. */
export function trackShare(contentType: string): void {
  logEvent('share', { content_type: contentType });
}

/** Custom `call_started`. `kind` is 'voice' or 'video'. */
export function trackCallStarted(call: { kind: string }): void {
  logEvent('call_started', { call_type: call.kind });
}

/** Custom `message_sent`. `conversationType` is 'direct' or 'group'. */
export function trackMessageSent(message: { conversationType: string }): void {
  logEvent('message_sent', { conversation_type: message.conversationType });
}
