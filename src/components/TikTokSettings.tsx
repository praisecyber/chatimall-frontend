import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { ExternalLink, Loader2, Music2, Unlink } from 'lucide-react';
import { api } from '@/lib/http';

interface TikTokSharePlugin {
  getStatus(): Promise<{ configured: boolean; tiktokInstalled: boolean }>;
  shareMedia(): Promise<{ opened: boolean; mediaType: 'IMAGE' | 'VIDEO'; mediaCount: number }>;
  addListener(
    eventName: 'shareResult',
    listener: (event: { success: boolean; errorCode: number; message: string }) => void
  ): Promise<PluginListenerHandle>;
}

const tiktokShare = registerPlugin<TikTokSharePlugin>('TikTokShare');

interface TikTokStatus {
  enabled: boolean;
  connected: boolean;
  display_name: string;
  avatar_url: string;
  scopes: string[];
  can_list_videos: boolean;
}

interface TikTokVideo {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  share_url: string;
}

const EMPTY_STATUS: TikTokStatus = {
  enabled: false,
  connected: false,
  display_name: '',
  avatar_url: '',
  scopes: [],
  can_list_videos: false,
};

export default function TikTokSettings() {
  const [status, setStatus] = useState<TikTokStatus>(EMPTY_STATUS);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [nativeShareReady, setNativeShareReady] = useState(false);
  const [nativeShareProblem, setNativeShareProblem] = useState<string | null>(null);
  const isAndroid = Capacitor.getPlatform() === 'android';

  useEffect(() => {
    let active = true;
    void api<TikTokStatus>('/api/tiktok/status')
      .then((current) => active && setStatus(current))
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load TikTok status.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAndroid) return;
    let active = true;
    let listener: PluginListenerHandle | undefined;

    void tiktokShare.getStatus()
      .then(({ configured, tiktokInstalled }) => {
        if (active) {
          setNativeShareReady(configured && tiktokInstalled);
          setNativeShareProblem(
            !configured
              ? 'This Android build needs the TikTok sandbox client key.'
              : !tiktokInstalled
                ? 'Install TikTok on this device to use Share Kit.'
                : null
          );
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not check TikTok Share Kit.');
      });

    void tiktokShare.addListener('shareResult', (result) => {
      if (!active) return;
      if (result.success) {
        setShareNotice('TikTok returned a successful share result.');
        setError(null);
      } else {
        setShareNotice(null);
        setError(result.message || (result.errorCode === -2 ? 'TikTok sharing was cancelled.' : 'TikTok could not complete sharing.'));
      }
    }).then((registered) => {
      listener = registered;
      if (!active) void registered.remove();
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Could not listen for TikTok share results.');
    });

    return () => {
      active = false;
      if (listener) void listener.remove();
    };
  }, [isAndroid]);

  const shareToTikTok = async () => {
    setWorking(true);
    setError(null);
    setShareNotice(null);
    try {
      const result = await tiktokShare.shareMedia();
      setShareNotice(`Opening TikTok with ${result.mediaCount} ${result.mediaType === 'IMAGE' ? 'photos' : 'video(s)'}. Finish or cancel the post in TikTok.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not share media to TikTok.');
    } finally {
      setWorking(false);
    }
  };

  const connect = async () => {
    setWorking(true);
    setError(null);
    try {
      const result = await api<{ authorization_url: string }>('/api/tiktok/authorize', { method: 'POST' });
      window.location.assign(result.authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start TikTok authorization.');
      setWorking(false);
    }
  };

  const loadVideos = async () => {
    setWorking(true);
    setError(null);
    try {
      const result = await api<{ videos: TikTokVideo[] }>('/api/tiktok/videos');
      setVideos(result.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load TikTok videos.');
    } finally {
      setWorking(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect TikTok from this Chatimall account?')) return;
    setWorking(true);
    setError(null);
    try {
      await api('/api/tiktok/connection', { method: 'DELETE' });
      setStatus(EMPTY_STATUS);
      setVideos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disconnect TikTok.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-5 text-ink-mute">
        Link your TikTok account to your existing Chatimall account. Chatimall sign-in stays unchanged.
        TikTok will ask you to approve access before your profile or videos are shown here.
      </p>

      {isAndroid && (
        <div className="space-y-2 rounded-xl border border-paper-line bg-paper-mist p-3">
          <p className="text-sm font-semibold text-ink">Share to TikTok</p>
          <p className="text-xs leading-5 text-ink-mute">
            Choose photos or an MP4 video from this device. Review and finish the post in TikTok.
          </p>
          <button
            type="button"
            onClick={() => void shareToTikTok()}
            disabled={working || !nativeShareReady}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
            {nativeShareReady ? 'Choose photos or video' : 'Share Kit unavailable'}
          </button>
          {!nativeShareReady && (
            <p className="text-xs text-ink-mute">{nativeShareProblem}</p>
          )}
        </div>
      )}
      {shareNotice && <p role="status" className="text-xs text-emerald-700">{shareNotice}</p>}

      {loading ? (
        <div className="flex justify-center py-6 text-ink-faint"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : !status.enabled ? (
        <div className="rounded-xl border border-paper-line bg-paper-mist p-3 text-sm text-ink-mute">
          TikTok linking is not configured yet. It becomes available after the TikTok app is approved and its
          credentials are added to the backend environment.
        </div>
      ) : status.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-paper-line bg-paper-mist p-3">
            {status.avatar_url ? (
              <img src={status.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Music2 className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-faint">Connected TikTok account</p>
              <p className="truncate text-sm font-semibold text-ink">{status.display_name || 'TikTok user'}</p>
            </div>
            <button
              type="button"
              onClick={() => void disconnect()}
              disabled={working}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-white disabled:opacity-50"
            >
              <Unlink className="h-3.5 w-3.5" /> Disconnect
            </button>
          </div>

          {status.can_list_videos ? (
            <>
              <button
                type="button"
                onClick={() => void loadVideos()}
                disabled={working}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {working ? 'Loading…' : 'Show my recent TikTok videos'}
              </button>
              {videos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {videos.map((video) => (
                    <a
                      key={video.id}
                      href={video.share_url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-xl border border-paper-line bg-white"
                    >
                      {video.cover_image_url && (
                        <img src={video.cover_image_url} alt="" className="aspect-[9/12] w-full object-cover" />
                      )}
                      <span className="flex items-center justify-between gap-2 p-2 text-xs text-ink">
                        <span className="line-clamp-2">{video.title || video.video_description || 'TikTok video'}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-mute">Video display is unavailable because TikTok video.list permission was not granted.</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void connect()}
          disabled={working}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
          Connect TikTok
        </button>
      )}

      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      <p className="text-[11px] leading-4 text-ink-faint">
        You can disconnect at any time. TikTok videos remain hosted by TikTok and open on TikTok.
      </p>
    </div>
  );
}
