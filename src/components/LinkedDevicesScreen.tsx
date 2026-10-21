import { useCallback, useEffect, useRef, useState } from 'react';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { Camera, ChevronRight, Link2, Monitor, Smartphone, Unlink } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';
import { api, setToken } from '@/lib/http';
import { isNative } from '@/lib/native';

interface LinkedDevice {
  id: string;
  name: string;
  platform: 'web' | 'android';
  created_at: string;
  last_seen_at: string;
  current: boolean;
}

interface LinkedDevicesResponse {
  devices: LinkedDevice[];
  limit: number;
  remaining: number;
}

function parseLinkCode(value: string): { link_id: string; secret: string } {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('That QR code is not a Chatimall device link.');
  }
  if (url.protocol !== 'chatimall:' || url.hostname !== 'device-link') {
    throw new Error('That QR code is not a Chatimall device link.');
  }
  const link_id = url.searchParams.get('link_id') ?? '';
  const secret = url.searchParams.get('secret') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(link_id) || !/^[A-Za-z0-9_-]{40,50}$/.test(secret)) {
    throw new Error('That QR code is invalid or incomplete.');
  }
  return { link_id, secret };
}

function deviceName(): string {
  if (isNative()) return 'Android device';
  const browser = /Edg\//.test(navigator.userAgent)
    ? 'Edge'
    : /Firefox\//.test(navigator.userAgent)
      ? 'Firefox'
      : /Chrome\//.test(navigator.userAgent)
        ? 'Chrome'
        : /Safari\//.test(navigator.userAgent)
          ? 'Safari'
          : 'Web browser';
  return `${browser} on ${navigator.platform || 'computer'}`.slice(0, 80);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function LinkedDevicesScreen({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [codeEntry, setCodeEntry] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  const approvalInProgress = useRef(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api<LinkedDevicesResponse>('/api/devices/linked');
      setDevices(result.devices);
      setLimit(result.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load linked devices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const approveLink = useCallback(async (value: string) => {
    if (approvalInProgress.current) return;
    approvalInProgress.current = true;
    setScanning(false);
    scannerControls.current?.stop();
    scannerControls.current = null;
    setApproving(true);
    setError(null);
    try {
      const credentials = parseLinkCode(value);
      await api('/api/devices/link/approve', {
        body: { ...credentials, name: deviceName() },
      });
      await loadDevices();
      setError('Device linked successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link this device.');
    } finally {
      approvalInProgress.current = false;
      setApproving(false);
    }
  }, [loadDevices]);

  const approvePairingCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedCode = pairingCode.replace(/\D/g, '');
    if (normalizedCode.length !== 9) {
      setError('Enter the 9-digit code shown on the device you want to link.');
      return;
    }
    setApproving(true);
    setError(null);
    try {
      await api('/api/devices/link/approve-code', {
        body: { code: normalizedCode, name: deviceName() },
      });
      setPairingCode('');
      await loadDevices();
      setError('Device linked successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link this device.');
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    if (!scanning || isNative()) return;
    let active = true;
    void import('@zxing/browser').then(({ BrowserQRCodeReader }) => {
      if (!active || !videoRef.current) return;
      const reader = new BrowserQRCodeReader();
      return reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _scanError, controls) => {
        scannerControls.current = controls;
        if (result && active) void approveLink(result.getText());
      }).then((controls) => {
        if (active) scannerControls.current = controls;
        else controls.stop();
      });
    }).catch((err: unknown) => {
      if (active) {
        setScanning(false);
        setError(err instanceof Error ? err.message : 'Could not access the camera.');
      }
    });
    return () => {
      active = false;
      scannerControls.current?.stop();
      scannerControls.current = null;
    };
  }, [scanning, approveLink]);

  const startScan = async () => {
    setError(null);
    if (!isNative()) {
      setScanning(true);
      return;
    }
    setScanning(true);
    try {
      if (Capacitor.getPlatform() === 'android') {
        const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if (!available) {
          await BarcodeScanner.installGoogleBarcodeScannerModule();
          setError('Installing the QR scanner. Try again in a few seconds.');
          return;
        }
      }
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
        autoZoom: true,
      });
      const value = barcodes[0]?.rawValue;
      if (value) await approveLink(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not scan the QR code.');
    } finally {
      setScanning(false);
    }
  };

  const unlinkDevice = async (device: LinkedDevice) => {
    setError(null);
    try {
      await api(`/api/devices/linked/${encodeURIComponent(device.id)}`, { method: 'DELETE' });
      if (device.current) {
        setToken(null);
        onClose();
        window.location.reload();
        return;
      }
      setConfirmId(null);
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlink this device.');
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#0f1720]/50 backdrop-blur-[2px]">
      <div className="flex h-full w-full flex-col bg-paper shadow-2xl">
        <div className="flex items-center justify-between border-b border-paper-line px-4 pb-3 pt-12">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-mist text-ink transition-colors hover:bg-brand-50"
            aria-label="Back to settings"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <h2 className="flex-1 px-3 text-center text-lg font-bold text-ink">Linked Devices</h2>
          <span className="w-9" />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <h3 className="text-sm font-bold text-ink">Use Chatimall on another device</h3>
                <p className="mt-1 text-xs leading-5 text-ink-mute">
                  Display the device-link QR code on the device you want to add, then scan it here to authorize the device.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={approving || scanning || codeEntry || devices.length >= limit}
              onClick={() => void startScan()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {approving ? 'Linking device...' : scanning ? 'Scanning QR code...' : 'Scan QR code'}
            </button>
            <button
              type="button"
              disabled={approving || devices.length >= limit}
              onClick={() => {
                setCodeEntry((visible) => !visible);
                setError(null);
              }}
              className="mt-3 w-full text-center text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50"
            >
              {codeEntry ? 'Use QR code instead' : 'Enter a code instead'}
            </button>
            {codeEntry && (
              <form onSubmit={(event) => void approvePairingCode(event)} className="mt-3 space-y-2">
                <label htmlFor="linked-device-pairing-code" className="block text-xs font-medium text-ink-mute">
                  Enter the 9-digit code shown on the device you want to link
                </label>
                <input
                  id="linked-device-pairing-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={9}
                  value={pairingCode}
                  onChange={(event) => setPairingCode(event.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="123 456 789"
                  className="w-full rounded-xl border border-paper-line bg-white px-3 py-3 text-center font-mono text-lg tracking-[0.2em] text-ink outline-none focus:border-brand-400"
                />
                <button
                  type="submit"
                  disabled={approving || pairingCode.length !== 9}
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {approving ? 'Linking device...' : 'Link device'}
                </button>
              </form>
            )}
            {scanning && !isNative() && (
              <div className="mt-3 overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
              </div>
            )}
            {devices.length >= limit && (
              <p className="mt-2 text-xs text-ink-mute">You have reached the limit of {limit} linked devices. Unlink one to add another.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Your devices</h3>
              <span className="text-xs text-ink-mute">{devices.length} of {limit}</span>
            </div>
            {loading ? (
              <p className="rounded-xl bg-paper-mist p-4 text-sm text-ink-mute">Loading linked devices...</p>
            ) : devices.length === 0 ? (
              <p className="rounded-xl bg-paper-mist p-4 text-sm text-ink-mute">No linked devices yet.</p>
            ) : (
              <div className="divide-y divide-paper-line rounded-xl border border-paper-line bg-white">
                {devices.map((device) => {
                  const Icon = device.platform === 'android' ? Smartphone : Monitor;
                  return (
                    <div key={device.id} className="flex items-center gap-3 p-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {device.name}{device.current ? ' · This device' : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-mute">Last active {formatDate(device.last_seen_at)}</p>
                      </div>
                      {confirmId === device.id ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <button type="button" onClick={() => setConfirmId(null)} className="text-xs font-semibold text-ink-mute">Cancel</button>
                          <button type="button" onClick={() => void unlinkDevice(device)} className="text-xs font-bold text-brand-700">Unlink</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(device.id)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-brand-50 hover:text-brand-700"
                          aria-label={`Unlink ${device.name}`}
                          title="Unlink device"
                        >
                          <Unlink className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p role="status" className={`rounded-xl p-3 text-sm ${error === 'Device linked successfully.' ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-700'}`}>
              {error}
            </p>
          )}
          <p className="text-xs leading-5 text-ink-faint">
            QR codes expire after two minutes. You can unlink a device here at any time; its access is revoked immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
