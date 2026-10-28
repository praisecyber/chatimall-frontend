import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Search,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import BrandMark from '@/components/BrandMark';
import { useAuth } from '@/lib/auth';
import { ApiError, api } from '@/lib/http';
import { initialsAvatar, normalizePhone } from '@/lib/format';
import { Country, COUNTRIES, DEFAULT_COUNTRY } from '@/lib/countries';
import CountryFlag from '@/components/CountryFlag';

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f3f5f3] px-4 py-8 text-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(31,124,90,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(31,124,90,0.06),_transparent_35%)]" />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="rgba(34, 139, 109, 0.25)" strokeWidth="1.2">
          <path d="M0 170 155 265 310 180 475 295 635 215 800 320 975 200 1155 305 1325 185 1440 255" />
          <path d="M0 625 155 520 320 645 480 500 660 605 820 475 1010 590 1190 480 1365 625 1440 575" />
          <path d="M155 265 155 520M310 180 320 645M475 295 480 500M635 215 660 605M800 320 820 475M975 200 1010 590M1155 305 1190 480M1325 185 1365 625" />
          <path d="M0 170 320 645M310 180 660 605M635 215 1010 590M975 200 1365 625M0 625 475 295M320 645 800 320M660 605 1155 305M1010 590 1440 255" />
        </g>
      </svg>
      <div className={`relative z-10 flex w-full ${wide ? 'max-w-4xl' : 'max-w-[660px]'} flex-col items-center`}>
        <div className="mb-7 flex items-center gap-3 self-start rounded-[18px] bg-[#1d2d29] px-4 py-2 shadow-[0_8px_22px_rgba(11,18,16,0.18)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f0ec] p-1.5">
            <BrandMark size={26} />
          </div>
          <div className="text-[13px] font-bold leading-none tracking-[-0.02em] text-white">
            Say it. Grow it.
          </div>
        </div>
        <div className="w-full rounded-[30px] border border-[#dfe9e4] bg-[#f5f8f5] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)] sm:p-11">
          {children}
        </div>
      </div>
    </div>
  );
}

import WelcomeScreen from '@/components/WelcomeScreen';

const inputCls =
  'w-full px-4 py-3.5 rounded-2xl bg-paper-mist border border-transparent focus:bg-white focus:border-brand-600/30 outline-none text-ink placeholder-ink-faint text-sm transition-colors';
const btnCls =
  'w-full py-4 rounded-[20px] bg-[#0f8a5f] text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_18px_rgba(15,138,96,0.23)] hover:brightness-105 transition';

/** Phone number → email OTP (verified by the Chatimall server). */
export function AuthScreen() {
  const { requestPhoneEmailOtp, verifyPhoneEmailOtp, completeLinkedSignIn } = useAuth();
  const [welcomeAccepted, setWelcomeAccepted] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'device'>('phone');
  const [step, setStep] = useState<'phone' | 'email' | 'otp'>('phone');
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

  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCountryPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCountryPicker]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const raw = phoneInput.trim();
    if (!raw) {
      setError('Enter your phone number to continue.');
      return;
    }

    let fullNumber = raw;
    if (!raw.startsWith('+')) {
      // Strip leading 0 if present (e.g. 09121598033 -> 9121598033 with country code +234)
      const national = raw.replace(/^0+/, '');
      fullNumber = `${selectedCountry.code}${national}`;
    }

    const normalized = normalizePhone(fullNumber);
    if (!normalized) {
      setError(`Please enter a valid phone number for ${selectedCountry.name} (${selectedCountry.code}).`);
      return;
    }
    setPhone(normalized);
    setEmailInput('');
    setEmail('');
    setCode('');
    setPin('');
    setSecondFactorRequired(false);
    setStep('email');
  };

  const sendPhoneEmailCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const normalized = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const res = await requestPhoneEmailOtp(phone, normalized);
      setDevCode(res.devCode ?? null);
      setEmail(normalized);
      setPin('');
      setSecondFactorRequired(false);
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the verification email.');
    } finally {
      setBusy(false);
    }
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
      await verifyPhoneEmailOtp(phone, email, code.trim(), secondFactorRequired ? pin : undefined);
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

  if (!welcomeAccepted) {
    return (
      <WelcomeScreen
        onContinue={() => setWelcomeAccepted(true)}
        onLinkDevice={() => {
          setWelcomeAccepted(true);
          setLoginMethod('device');
        }}
      />
    );
  }

  return (
    <Shell wide={loginMethod === 'device'}>
      {step === 'phone' && (
        <div className="mx-auto mb-8 grid w-full max-w-[560px] grid-cols-2 gap-1 rounded-[16px] bg-[#e8f0ec] p-1" role="group" aria-label="Choose sign-in method">
          <button
            type="button"
            aria-pressed={loginMethod === 'phone'}
            onClick={() => {
              setLoginMethod('phone');
              setLinkChallenge(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-[12px] px-2 py-3 text-sm font-semibold transition-colors ${loginMethod === 'phone' ? 'bg-white text-[#1f7660] shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : 'text-[#4d5d57] hover:text-ink'}`}
          >
            <Smartphone className="h-4 w-4 shrink-0" /> Phone
          </button>
          <button
            type="button"
            aria-pressed={loginMethod === 'device'}
            onClick={() => {
              setLoginMethod('device');
              setLinkChallenge(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-[12px] px-2 py-3 text-sm font-semibold transition-colors ${loginMethod === 'device' ? 'bg-white text-[#1f7660] shadow-[0_1px_2px_rgba(15,23,42,0.05)]' : 'text-[#4d5d57] hover:text-ink'}`}
          >
            <QrCode className="h-4 w-4 shrink-0" /> Link device
          </button>
        </div>
      )}

      {step === 'phone' && loginMethod === 'phone' ? (
        <form onSubmit={sendCode} className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.04em] text-[#1f2d2a] leading-tight">
              Create or sign in with phone
            </h1>
            <p className="mt-2 text-[1.02rem] leading-relaxed text-[#5c6864]">
              Enter your phone number, then verify your sign-in with a code sent to your email.
            </p>
          </div>

          <div className="space-y-2.5 pt-3">
            <label className="text-[1rem] font-bold text-[#2d3a36]">Country &amp; Phone Number</label>
            <div className="relative flex items-center rounded-[18px] bg-[#edf2ee] border border-[#dfeae4] focus-within:border-[#55ad91] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#6cc3a5]/15 transition-all">
              {/* Country Selector Trigger */}
              <div className="relative" ref={countryPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowCountryPicker((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3.5 py-3.5 text-sm font-semibold text-ink hover:bg-black/[0.04] active:bg-black/[0.08] rounded-l-2xl transition border-r border-black/[0.08] select-none"
                  title="Select Country"
                  aria-label={`Selected country: ${selectedCountry.name} (${selectedCountry.code})`}
                >
                  <CountryFlag country={selectedCountry} size="lg" />
                  <span className="text-xs font-bold font-mono tracking-tight text-ink">{selectedCountry.code}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-ink-mute transition-transform duration-200 ${showCountryPicker ? 'rotate-180 text-brand-600' : ''}`} />
                </button>

                {/* Country Picker Popover Dropdown */}
                {showCountryPicker && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 max-h-84 rounded-2xl bg-white shadow-2xl border border-black/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 border-b border-black/[0.06] bg-paper-mist/60">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-mute" />
                        <input
                          type="text"
                          autoFocus
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Search country or code..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-black/[0.08] focus:border-brand-600 outline-none text-ink placeholder-ink-faint shadow-inner"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-black/[0.03] max-h-60 p-1">
                      {filteredCountries.map((country) => {
                        const isSelected = selectedCountry.iso === country.iso && selectedCountry.code === country.code;
                        return (
                          <button
                            key={`${country.iso}-${country.code}`}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setShowCountryPicker(false);
                              setCountrySearch('');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-xl transition text-xs ${
                              isSelected ? 'bg-brand-50 text-brand-700 font-bold' : 'hover:bg-paper-mist text-ink'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <CountryFlag country={country} size="md" />
                              <span className="truncate">{country.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-[11px] font-mono font-semibold text-ink-soft">{country.code}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                      {filteredCountries.length === 0 && (
                        <div className="py-6 text-center text-xs text-ink-mute">
                          No matching country found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Local Phone Input */}
              <input
                autoFocus
                type="tel"
                inputMode="tel"
                placeholder={selectedCountry.format || 'e.g. 912 159 8033'}
                value={phoneInput}
                onChange={(e) => {
                  const val = e.target.value;
                  // If user pasted a full international number starting with +
                  if (val.startsWith('+')) {
                    const match = COUNTRIES.find((c) => val.startsWith(c.code));
                    if (match) {
                      setSelectedCountry(match);
                      setPhoneInput(val.slice(match.code.length).trim());
                      return;
                    }
                  }
                  setPhoneInput(val);
                }}
                className="flex-1 px-3.5 py-3.5 bg-transparent outline-none text-ink placeholder-ink-faint text-sm font-medium"
              />
            </div>
            <p className="text-[11px] text-ink-mute">
              Enter with or without leading zero (e.g. <span className="font-mono text-ink-soft">09121598033</span> or <span className="font-mono text-ink-soft">9121598033</span>).
            </p>
          </div>

          {error && <p className="text-[0.95rem] font-medium text-[#de5b5b]">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue
          </button>
        </form>
      ) : step === 'email' && loginMethod === 'phone' ? (
        <form onSubmit={sendPhoneEmailCode} className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Verify your phone sign-in</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">
              Enter an email address where we can send your one-time code for phone <span className="font-mono">+{phone}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setError(null);
            }}
            className="flex items-center gap-1 text-xs text-ink-mute hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Change number
          </button>
          <input
            autoFocus
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            className={inputCls}
          />
          <p className="text-xs leading-relaxed text-ink-mute">
            The code will be delivered to the verified email for this account. Completing it confirms this phone number for the account, but does not prove access to its SIM.
          </p>
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send verification code
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
              setStep(loginMethod === 'phone' ? 'email' : 'phone');
              setCode('');
              setPin('');
              setSecondFactorRequired(false);
              setError(null);
            }}
            className="flex items-center gap-1 text-xs text-ink-mute hover:text-ink"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Change email
          </button>
          <div>
            <h1 className="text-xl font-bold">Enter the code</h1>
            <p className="text-sm text-ink-mute mt-1">
              Sent to {email} for phone +{phone.replace(/^\+/, '')}
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
            onClick={() => sendPhoneEmailCode()}
            className="w-full text-xs text-brand-600 disabled:text-gray-500"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </form>
      )}
      <div className="mt-7 flex items-center justify-center gap-2 text-[0.95rem] text-[#5d6662]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#0f8a5f]" />
        <span className="text-center leading-snug">
          Your sign-in details are protected and used only to access your account.
        </span>
      </div>
    </Shell>
  );
}

/** First-time setup: name + photo. */
export function ProfileSetup({ onComplete }: { onComplete?: () => void }) {
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
      onComplete?.();
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
