import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Loader2, Mail, QrCode, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { APP_NAME, APP_TAGLINE } from '@/brand';
import BrandMark from '@/components/BrandMark';
import { useAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/http';
import { initialsAvatar, normalizePhone } from '@/lib/format';

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f5f7f5] px-4 py-8 text-ink">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-brand-600/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-80 w-80 rounded-full bg-brand-600/[0.05] blur-3xl" />
      <svg
        className="auth-network"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <g className="auth-network__links">
          <path d="M0 170 155 265 310 180 475 295 635 215 800 320 975 200 1155 305 1325 185 1440 255" />
          <path d="M0 625 155 520 320 645 480 500 660 605 820 475 1010 590 1190 480 1365 625 1440 575" />
          <path d="M155 265 155 520M310 180 320 645M475 295 480 500M635 215 660 605M800 320 820 475M975 200 1010 590M1155 305 1190 480M1325 185 1365 625" />
          <path d="M0 170 320 645M310 180 660 605M635 215 1010 590M975 200 1365 625M0 625 475 295M320 645 800 320M660 605 1155 305M1010 590 1440 255" />
        </g>
        <g className="auth-network__pulses">
          <path className="auth-network__pulse" d="M0 170 155 265 310 180 475 295 635 215 800 320 975 200 1155 305 1325 185 1440 255" />
          <path className="auth-network__pulse auth-network__pulse--slow" d="M0 625 155 520 320 645 480 500 660 605 820 475 1010 590 1190 480 1365 625 1440 575" />
          <path className="auth-network__pulse auth-network__pulse--reverse" d="M155 265 155 520M310 180 320 645M475 295 480 500M635 215 660 605M800 320 820 475M975 200 1010 590M1155 305 1190 480M1325 185 1365 625" />
          <path className="auth-network__pulse auth-network__pulse--slow" d="M0 170 320 645M310 180 660 605M635 215 1010 590M975 200 1365 625M0 625 475 295M320 645 800 320M660 605 1155 305M1010 590 1440 255" />
        </g>
        <g className="auth-network__nodes">
          <circle cx="155" cy="265" r="4" />
          <circle cx="310" cy="180" r="3" />
          <circle cx="320" cy="645" r="4" />
          <circle cx="475" cy="295" r="3" />
          <circle cx="480" cy="500" r="4" />
          <circle cx="635" cy="215" r="4" />
          <circle cx="660" cy="605" r="3" />
          <circle cx="800" cy="320" r="4" />
          <circle cx="820" cy="475" r="3" />
          <circle cx="975" cy="200" r="4" />
          <circle cx="1010" cy="590" r="3" />
          <circle cx="1155" cy="305" r="4" />
          <circle cx="1190" cy="480" r="3" />
          <circle cx="1325" cy="185" r="4" />
          <circle cx="1365" cy="625" r="4" />
        </g>
      </svg>
      <div className={`relative z-10 flex w-full ${wide ? 'max-w-4xl' : 'max-w-md'} flex-col items-center`}>
        <div className="mb-6 flex items-center gap-3">
          <BrandMark size={42} />
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight text-ink">{APP_NAME}</div>
            <div className="text-[11px] font-medium text-brand-700">{APP_TAGLINE}</div>
          </div>
        </div>
        <div className="w-full rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_16px_48px_-24px_rgba(15,23,42,0.24)] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-4 py-3.5 rounded-2xl bg-paper-mist border border-transparent focus:bg-white focus:border-brand-600/30 outline-none text-ink placeholder-ink-faint text-sm transition-colors';
const btnCls =
  'w-full py-3.5 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lift hover:brightness-110 transition';

/** Phone number → OTP code (verified by the Chatimall server). */
export function AuthScreen() {
  const { requestOtp, verifyOtp, requestEmailOtp, verifyEmailOtp, completeLinkedSignIn } = useAuth();
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email' | 'device'>('phone');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [secondFactorRequired, setSecondFactorRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [linkChallenge, setLinkChallenge] = useState<{ link_id: string; secret: string; pairing_code: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (loginMethod !== 'device' || linkChallenge) return;
    let active = true;
    setError(null);
    void api<{ link_id: string; secret: string; pairing_code: string }>('/api/devices/link/start', {
      body: { platform: 'web' },
    }).then((challenge) => {
      if (active) setLinkChallenge(challenge);
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Could not start device linking.');
    });
    return () => {
      active = false;
    };
  }, [loginMethod, linkChallenge]);

  useEffect(() => {
    if (loginMethod !== 'device' || !linkChallenge) return;
    let active = true;
    let polling = false;
    let terminal = false;
    const poll = async () => {
      if (!active || polling || terminal) return;
      polling = true;
      try {
        const result = await api<{ status: 'pending' | 'approved' | 'completed' | 'expired'; token?: string }>(
          '/api/devices/link/status',
          { body: { link_id: linkChallenge.link_id, secret: linkChallenge.secret } }
        );
        if (!active) return;
        if (result.status === 'expired' || result.status === 'completed') {
          terminal = true;
          setError('This QR code has expired. Generate a new code to try again.');
        } else if (result.status === 'approved' && result.token) {
          terminal = true;
          await completeLinkedSignIn(result.token, linkChallenge.link_id);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not check the linking request.');
      } finally {
        polling = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loginMethod, linkChallenge, completeLinkedSignIn]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const normalized = normalizePhone(phoneInput);
    if (!normalized) {
      setError('Enter your number with country code, e.g. +15551234567');
      return;
    }
    setBusy(true);
    try {
      const res = await requestOtp(normalized);
      setDevCode(res.devCode ?? null);
      setPhone(normalized);
      setPin('');
      setSecondFactorRequired(false);
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.');
    }
    setBusy(false);
  };

  const sendEmailCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const normalized = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const res = await requestEmailOtp(normalized);
      setDevCode(res.devCode ?? null);
      setEmail(normalized);
      setPin('');
      setSecondFactorRequired(false);
      setLoginMethod('email');
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the email code.');
    }
    setBusy(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 4) {
      setError('Enter the code we sent you.');
      return;
    }
    setBusy(true);
    try {
      if (loginMethod === 'email') {
        await verifyEmailOtp(email, code.trim(), secondFactorRequired ? pin : undefined);
      } else {
        await verifyOtp(phone, code.trim(), secondFactorRequired ? pin : undefined);
      }
      // on success the auth context takes over and the app opens
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SECOND_FACTOR_REQUIRED') {
        setSecondFactorRequired(true);
        setError(null);
      } else if (err instanceof ApiError && err.code === 'BAD_SECOND_FACTOR') {
        setSecondFactorRequired(true);
        setError('That security PIN is incorrect.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not verify the code.');
      }
      setBusy(false);
    }
  };

  return (
    <Shell wide={loginMethod === 'device'}>
      {step === 'phone' && (
        <div className="mx-auto mb-6 grid w-full max-w-xl grid-cols-3 gap-1 rounded-xl bg-paper-mist p-1" role="group" aria-label="Choose sign-in method">
          <button
            type="button"
            aria-pressed={loginMethod === 'phone'}
            onClick={() => {
              setLoginMethod('phone');
              setLinkChallenge(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${loginMethod === 'phone' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-mute hover:text-ink'}`}
          >
            <Smartphone className="h-4 w-4 shrink-0" /> Phone
          </button>
          <button
            type="button"
            aria-pressed={loginMethod === 'email'}
            onClick={() => {
              setLoginMethod('email');
              setLinkChallenge(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${loginMethod === 'email' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-mute hover:text-ink'}`}
          >
            <Mail className="h-4 w-4 shrink-0" /> Email
          </button>
          <button
            type="button"
            aria-pressed={loginMethod === 'device'}
            onClick={() => {
              setLoginMethod('device');
              setLinkChallenge(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${loginMethod === 'device' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-mute hover:text-ink'}`}
          >
            <QrCode className="h-4 w-4 shrink-0" /> Link device
          </button>
        </div>
      )}

      {step === 'phone' && loginMethod === 'phone' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">
              Enter your phone number to securely sign in to Chatimall.
            </p>
          </div>
          <input
            autoFocus
            type="tel"
            inputMode="tel"
            placeholder="+1 555 123 4567"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className={inputCls}
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue
          </button>
        </form>
      ) : step === 'phone' && loginMethod === 'email' ? (
        <form onSubmit={sendEmailCode} className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sign in with email</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">
              Enter a verified email linked to an existing Chatimall account. If it matches, we’ll send a sign-in code.
            </p>
          </div>
          <input
            autoFocus
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            className={inputCls}
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send email code
          </button>
        </form>
      ) : step === 'phone' && loginMethod === 'device' ? (
        <div className="mx-auto grid w-full max-w-3xl items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Link Chatimall to your phone</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">
                Open Chatimall on your phone, go to Settings, and link this desktop using the QR code or the code below.
              </p>
            </div>
            <ol className="space-y-3 text-sm text-ink-soft">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">1</span><span>Open <b>Settings → Link an existing account</b> on your phone.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">2</span><span>Scan this QR code, or choose code entry and type the code shown here.</span></li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">3</span><span>Approve the request on your phone. This page will sign in automatically.</span></li>
            </ol>
            {linkChallenge && (
              <div className="rounded-xl border border-paper-line bg-paper-mist px-4 py-3 text-center md:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Or enter this code on your phone</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-ink">{linkChallenge.pairing_code}</p>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            {(!linkChallenge || error?.includes('expired')) && (
              <button
                type="button"
                onClick={() => {
                  setLinkChallenge(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                <RefreshCw className="h-4 w-4" /> Generate a new code
              </button>
            )}
          </div>
          <div className="mx-auto flex min-h-64 w-full max-w-64 items-center justify-center rounded-2xl border border-paper-line bg-white p-4 shadow-sm">
            {linkChallenge ? (
              <QRCodeSVG
                value={`chatimall://device-link?link_id=${encodeURIComponent(linkChallenge.link_id)}&secret=${encodeURIComponent(linkChallenge.secret)}`}
                size={224}
                level="M"
                title="QR code to link this desktop"
              />
            ) : error ? (
              <div className="text-center text-sm text-ink-mute"><QrCode className="mx-auto mb-2 h-7 w-7 text-brand-600" />Unable to load a linking code.</div>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setCode('');
              setPin('');
              setSecondFactorRequired(false);
              setError(null);
            }}
            className="flex items-center gap-1 text-xs text-ink-mute hover:text-ink"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Change {loginMethod === 'email' ? 'email' : 'number'}
          </button>
          <div>
            <h1 className="text-xl font-bold">Enter the code</h1>
            <p className="text-sm text-ink-mute mt-1">
              {loginMethod === 'email' ? `If verified, the code was sent to ${email}` : `Sent to +${phone.replace(/^\+/, '')}`}
            </p>
            {devCode && (
              <p className="text-xs text-amber-700 mt-2">Dev mode: your code is <b className="tabular-nums">{devCode}</b></p>
            )}
          </div>
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${inputCls} text-center tracking-[0.4em] text-lg tabular-nums`}
          />
          {secondFactorRequired && (
            <div>
              <label htmlFor="account-security-pin" className="mb-1 block text-xs font-semibold text-ink-soft">Account security PIN</label>
              <input
                id="account-security-pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                placeholder="6 to 12 digits"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                className={`${inputCls} text-center tracking-[0.3em] text-lg tabular-nums`}
              />
            </div>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Verify
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || busy}
            onClick={() => (loginMethod === 'email' ? sendEmailCode() : sendCode())}
            className="w-full text-xs text-brand-600 disabled:text-gray-500"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </form>
      )}
      <div className="mt-6 flex items-center gap-2 text-[11px] text-ink-faint">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-brand-600" /> Your sign-in details are protected and used only to access your account.
      </div>
    </Shell>
  );
}

/** First-time setup: name + photo. */
export function ProfileSetup() {
  const { profile, updateProfile, uploadAvatar } = useAuth();
  const [name, setName] = useState(profile?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      setAvatarUrl(await uploadAvatar(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    setBusy(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), avatar_url: avatarUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    }
    setBusy(false);
  };

  return (
    <Shell>
      <form onSubmit={save} className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Set up your profile</h1>
          <p className="text-sm text-ink-mute mt-1">This is how your friends will see you.</p>
        </div>
        <div className="flex justify-center">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative">
            <img
              src={avatarUrl || initialsAvatar(name, profile?.phone ?? '')}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-brand-600/30"
            />
            <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center border-2 border-[#131b29]">
              <Camera className="w-4 h-4 text-white" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <input
          autoFocus
          maxLength={40}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button type="submit" disabled={busy} className={btnCls}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue
        </button>
      </form>
    </Shell>
  );
}

export function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-paper-deep flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
    </div>
  );
}
