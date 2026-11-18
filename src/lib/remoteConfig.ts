import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { FirebaseRemoteConfig } from '@capacitor-firebase/remote-config';
import {
  fetchAndActivate as webFetchAndActivate,
  getRemoteConfig,
  getValue as webGetValue,
  isSupported as isWebRemoteConfigSupported,
} from 'firebase/remote-config';
import { firebaseApp } from './firebase';

/**
 * One Remote Config layer, two backends — same reasoning as `analytics.ts`. The native
 * `@capacitor-firebase/remote-config` plugin reads the Android app's config; the JS SDK reads it
 * in the browser. Every getter falls back to the in-code defaults below, so the app is fully
 * usable before (or without) a successful fetch.
 */
export const REMOTE_CONFIG_DEFAULTS = {
  ads_banner_enabled: true,
  ads_interstitial_enabled: true,
  /** 0 disables the message-interval interstitial entirely. */
  ads_interstitial_after_messages: 20,
  ads_native_enabled: false,
  /** Rewarded interstitial — user watches an ad in exchange for hiding ads for a while. */
  ads_rewarded_enabled: true,
  marketplace_checkout_enabled: true,
  marketplace_checkout_currency: 'USD',
} as const;

export interface RemoteFlags {
  ads_banner_enabled: boolean;
  ads_interstitial_enabled: boolean;
  ads_interstitial_after_messages: number;
  ads_native_enabled: boolean;
  ads_rewarded_enabled: boolean;
  marketplace_checkout_enabled: boolean;
  marketplace_checkout_currency: string;
}

export type RemoteFlagKey = keyof typeof REMOTE_CONFIG_DEFAULTS;
export type RemoteFlagValue = string | number | boolean;

const isNative = (): boolean => Capacitor.isNativePlatform();

// Production honours a 1-hour cache; development fetches fresh each time so edits are visible.
const MIN_FETCH_INTERVAL_SECONDS = import.meta.env.DEV ? 0 : 3600;
const FETCH_TIMEOUT_SECONDS = 60;

/** Values that came back from the backend, keyed by flag name. Empty until a fetch resolves. */
const store: Record<string, RemoteFlagValue> = {};
const listeners = new Set<() => void>();
let initPromise: Promise<void> | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

/** Defaults with any fetched values layered on top. */
function snapshot(): RemoteFlags {
  return { ...REMOTE_CONFIG_DEFAULTS, ...store } as RemoteFlags;
}

/** Coerce a raw string from the backend using the default's type as the hint. */
function coerce(key: string, raw: string): RemoteFlagValue {
  const fallback = (REMOTE_CONFIG_DEFAULTS as Record<string, RemoteFlagValue>)[key];
  if (typeof fallback === 'boolean') return raw === 'true' || raw === '1';
  if (typeof fallback === 'number') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return raw;
}

async function initNative(): Promise<void> {
  await FirebaseRemoteConfig.setSettings({
    minimumFetchIntervalInSeconds: MIN_FETCH_INTERVAL_SECONDS,
    fetchTimeoutInSeconds: FETCH_TIMEOUT_SECONDS,
  });
  await FirebaseRemoteConfig.setDefaults({ defaults: { ...REMOTE_CONFIG_DEFAULTS } });
  await FirebaseRemoteConfig.fetchAndActivate();
  const { values } = await FirebaseRemoteConfig.getAll();
  for (const [key, entry] of Object.entries(values)) {
    if (key in REMOTE_CONFIG_DEFAULTS) store[key] = coerce(key, entry.value);
  }
}

async function initWeb(): Promise<void> {
  if (!(await isWebRemoteConfigSupported())) return;
  const rc = getRemoteConfig(firebaseApp);
  rc.settings = {
    minimumFetchIntervalMillis: MIN_FETCH_INTERVAL_SECONDS * 1000,
    fetchTimeoutMillis: FETCH_TIMEOUT_SECONDS * 1000,
  };
  rc.defaultConfig = { ...REMOTE_CONFIG_DEFAULTS };
  await webFetchAndActivate(rc);
  for (const key of Object.keys(REMOTE_CONFIG_DEFAULTS)) {
    const raw = webGetValue(rc, key).asString();
    if (raw !== '') store[key] = coerce(key, raw);
  }
}

/**
 * Fetch and activate Remote Config once. Idempotent and never throws — callers can `void` it.
 * On any failure the in-code defaults stay in effect.
 */
export function initRemoteConfig(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      if (isNative()) await initNative();
      else await initWeb();
    } catch (err) {
      console.warn('[remote-config] initialization failed; falling back to defaults', err);
    } finally {
      notify();
    }
  })();
  return initPromise;
}

/** Resolve a flag, preferring a fetched value, then an explicit fallback, then the default. */
export function getFlag<T extends RemoteFlagValue = RemoteFlagValue>(key: string, fallback?: T): T {
  const value = store[key];
  if (value !== undefined) return value as T;
  if (fallback !== undefined) return fallback;
  return (REMOTE_CONFIG_DEFAULTS as Record<string, RemoteFlagValue>)[key] as unknown as T;
}

/**
 * React hook returning the resolved flags. Re-renders the component once the fetch completes.
 */
export function useRemoteFlags(): RemoteFlags {
  const [flags, setFlags] = useState<RemoteFlags>(snapshot);
  useEffect(() => {
    setFlags(snapshot());
    const listener = () => setFlags(snapshot());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return flags;
}
