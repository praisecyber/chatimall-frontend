import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  Mail,
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
    <div className="flex min-h-[100svh] w-full bg-[#f7f8f6] text-ink">
      {/* Desktop brand panel */}
      <aside className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden border-r border-[#e7e9e5] bg-white p-10 lg:flex xl:w-[46%]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0fa958]/[0.07] blur-[110px]" />

        <div className="relative flex flex-col items-center gap-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-[#e6f5ed] shadow-[0_10px_30px_rgba(15,169,88,0.14)]">
            <BrandMark size={62} />
          </div>
          <div className="text-4xl font-extrabold tracking-[-0.03em] text-[#14231c]">
            Chat<span className="text-[#0fa958]">imall</span>
          </div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7b8981]">
            Say it. Grow it.
          </div>
        </div>
      </aside>

      {/* Form column */}
      <div className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8">
        <main className={`mx-auto flex w-full flex-1 flex-col items-center justify-center py-6 ${wide ? 'max-w-[860px]' : 'max-w-[420px]'}`}>
          <div className="mb-7 flex flex-col items-center gap-3.5 text-center lg:hidden">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#e6f5ed] shadow-[0_6px_20px_rgba(15,169,88,0.12)]">
              <BrandMark size={46} />
            </div>
            <div>
              <div className="text-[22px] font-extrabold leading-none tracking-[-0.03em] text-[#14231c]">Chatimall</div>
              <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b8981]">Say it. Grow it.</div>
            </div>
          </div>
          <div className="w-full rounded-[28px] border border-[#e7e9e5] bg-white p-6 shadow-[0_12px_40px_rgba(25,45,34,0.06)] sm:p-8">
            {children}
          </div>
        </main>

        <footer className="mx-auto w-full max-w-md pb-1 text-center text-[11px] leading-relaxed text-[#8a968f]">
          By continuing, you agree to keep your conversations respectful and your account details private.
        </footer>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-4 py-4 rounded-2xl bg-[#f1f3f2] text-ink placeholder-[#9aa59f] text-[15px] font-medium outline-none transition focus:bg-white focus:ring-2 focus:ring-[#0fa958]/25';
const btnCls =
  'w-full py-4 rounded-full bg-[#0fa958] text-white font-bold text-[15px] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_10px_22px_rgba(15,169,88,0.28)] hover:brightness-105 active:scale-[0.99] transition';

/** Phone number → email OTP (verified by the Chatimall server). */
export function AuthScreen() {
  const {
    requestPhoneEmailOtp,
    verifyPhoneEmailOtp,
    requestPhoneRecoveryOtp,
    verifyPhoneRecoveryOtp,
    completeLinkedSignIn,
  } = useAuth();
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
  const [phoneRecoveryMode, setPhoneRecoveryMode] = useState(false);
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

  const normalizePhoneInput = () => {
    const raw = phoneInput.trim();
    if (!raw) {
      setError('Enter your phone number to continue.');
      return null;
    }

    let fullNumber = raw;
    if (!raw.startsWith('+')) {
      const national = raw.replace(/^0+/, '');
      fullNumber = `${selectedCountry.code}${national}`;
    }

    const normalized = normalizePhone(fullNumber);
    if (!normalized) {
      setError(`Please enter a valid phone number for ${selectedCountry.name} (${selectedCountry.code}).`);
      return null;
    }
    return normalized;
  };

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const normalized = normalizePhoneInput();
    if (!normalized) return;
    setPhone(normalized);
    setEmailInput('');
    setEmail('');
    setCode('');
    setPin('');
    setSecondFactorRequired(false);
    setPhoneRecoveryMode(false);
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
      setPhoneRecoveryMode(false);
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the verification email.');
    } finally {
      setBusy(false);
    }
  };

  const recoverWithPhone = async (recoveryPhone = phone) => {
    setError(null);
    setBusy(true);
    try {
      const res = await requestPhoneRecoveryOtp(recoveryPhone);
      setPhone(recoveryPhone);
      setDevCode(res.devCode ?? null);
      setEmail('');
      setCode('');
      setPin('');
      setSecondFactorRequired(false);
      setPhoneRecoveryMode(true);
      setStep('otp');
      setCooldown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start account recovery.');
    } finally {
      setBusy(false);
    }
  };

  const recoverFromPhoneEntry = () => {
    setError(null);
    const normalized = normalizePhoneInput();
    if (normalized) void recoverWithPhone(normalized);
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
      if (phoneRecoveryMode) {
        await verifyPhoneRecoveryOtp(phone, code.trim(), secondFactorRequired ? pin : undefined);
      } else {
        await verifyPhoneEmailOtp(phone, email, code.trim(), secondFactorRequired ? pin : undefined);
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
        <div className="mx-auto mb-7 grid w-full max-w-[300px] grid-cols-2 gap-1 rounded-full bg-[#edf1ee] p-1" role="group" aria-label="Choose sign-in method">
          <button
            type="button"
            aria-pressed={loginMethod === 'phone'}
            onClick={() => {
              setLoginMethod('phone');
              setLinkChallenge(null);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-full px-2 py-2.5 text-sm font-semibold transition-colors ${loginMethod === 'phone' ? 'bg-white text-[#0d9460] shadow-sm' : 'text-[#5c6864] hover:text-ink'}`}
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
            className={`flex items-center justify-center gap-2 rounded-full px-2 py-2.5 text-sm font-semibold transition-colors ${loginMethod === 'device' ? 'bg-white text-[#0d9460] shadow-sm' : 'text-[#5c6864] hover:text-ink'}`}
          >
            <QrCode className="h-4 w-4 shrink-0" /> Link device
          </button>
        </div>
      )}

      {step === 'phone' && loginMethod === 'phone' ? (
        <form onSubmit={sendCode} className="space-y-6">
          <div className="text-center">
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[#16241e]">
              Sign in with your phone
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[#68746d]">
              We'll email you a one-time code to verify it's you. No password needed.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              {/* Country Selector Trigger */}
              <div className="relative" ref={countryPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowCountryPicker((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-2xl bg-[#f1f3f2] px-3.5 py-4 text-sm font-semibold text-ink transition hover:bg-[#e9edea] select-none"
                  title="Select Country"
                  aria-label={`Selected country: ${selectedCountry.name} (${selectedCountry.code})`}
                >
                  <CountryFlag country={selectedCountry} size="lg" />
                  <span className="text-sm font-bold tracking-tight text-ink">{selectedCountry.code}</span>
                  <ChevronDown className={`w-4 h-4 text-[#8a968f] transition-transform duration-200 ${showCountryPicker ? 'rotate-180 text-[#0fa958]' : ''}`} />
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
                className="min-w-0 flex-1 rounded-2xl bg-[#f1f3f2] px-4 py-4 text-[15px] font-medium text-ink placeholder-[#9aa59f] outline-none transition focus:bg-white focus:ring-2 focus:ring-[#0fa958]/25"
              />
            </div>
            <p className="text-center text-[11px] text-[#8a968f]">
              With or without leading zero (e.g. <span className="font-mono text-[#5c6864]">09121598033</span> or <span className="font-mono text-[#5c6864]">9121598033</span>).
            </p>
          </div>

          {error && <p className="text-center text-[13px] font-semibold text-[#de5b5b]">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={recoverFromPhoneEntry}
            className="w-full text-center text-[13px] font-semibold text-[#68746d] transition hover:text-ink disabled:opacity-50"
          >
            Can’t sign in? Recover account
          </button>
        </form>
      ) : step === 'email' && loginMethod === 'phone' ? (
        <form onSubmit={sendPhoneEmailCode} className="space-y-5">
          <div className="text-center">
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[#16241e]">
              Where should we send the code?
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[#68746d]">
              Enter your email — we'll send a one-time verification code for phone <span className="font-mono font-semibold text-[#3c4843]">+{phone}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep('phone');
              setError(null);
            }}
            className="mx-auto flex items-center gap-1 text-[13px] font-medium text-[#8a968f] transition hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Change number
          </button>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa59f]" />
            <input
              autoFocus
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              className={`${inputCls} pl-11`}
            />
          </div>
          <p className="text-center text-[11px] leading-relaxed text-[#8a968f]">
            The code goes to the verified email for this account. Completing it confirms this phone number for the account, but does not prove access to its SIM.
          </p>
          {error && <p role="alert" className="text-center text-[13px] font-semibold text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Send code
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void recoverWithPhone()}
            className="w-full text-center text-[13px] font-semibold text-[#68746d] transition hover:text-ink disabled:opacity-50"
          >
            {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
            Can’t sign in? Recover account
          </button>
        </form>
      ) : step === 'phone' && loginMethod === 'device' ? (
        <div className="mx-auto grid w-full max-w-3xl items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="space-y-5">
            <div>
              <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[#16241e]">Link Chatimall to your phone</h1>
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
        <form onSubmit={verify} className="space-y-5">
          <div className="text-center">
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[#16241e]">
              Check your email
            </h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[#68746d]">
              {phoneRecoveryMode
                ? `If this number has an account with a verified email, a code was sent to that email. Phone +${phone.replace(/^\+/, '')}`
                : <>Enter the code we sent to <span className="font-semibold text-[#3c4843]">{email}</span> for phone <span className="font-mono font-semibold text-[#3c4843]">+{phone.replace(/^\+/, '')}</span>.</>}
            </p>
            {devCode && (
              <p className="mt-2 text-xs text-amber-700">Dev mode: your code is <b className="tabular-nums">{devCode}</b></p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(loginMethod === 'phone' ? 'email' : 'phone');
              setCode('');
              setPin('');
              setSecondFactorRequired(false);
              setPhoneRecoveryMode(false);
              setError(null);
            }}
            className="mx-auto flex items-center gap-1 text-[13px] font-medium text-[#8a968f] transition hover:text-ink"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {phoneRecoveryMode ? 'Back' : 'Change email'}
          </button>
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${inputCls} text-center text-lg tabular-nums tracking-[0.4em]`}
          />
          {secondFactorRequired && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa59f]" />
              <input
                id="account-security-pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                placeholder="Account security PIN"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
                className={`${inputCls} pl-11 text-center text-lg tabular-nums tracking-[0.3em]`}
              />
            </div>
          )}
          {error && <p className="text-center text-[13px] font-semibold text-rose-600">{error}</p>}
          <button type="submit" disabled={busy} className={btnCls}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Verify
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || busy}
            onClick={() => phoneRecoveryMode ? void recoverWithPhone() : void sendPhoneEmailCode()}
            className="w-full text-center text-[13px] font-semibold text-[#0d9460] transition disabled:text-[#8a968f]"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </form>
      )}
      <div className="mt-7 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8a968f]">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#0fa958]" />
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
      <form onSubmit={save} className="space-y-6">
        <div className="text-center">
          <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-[#16241e]">Set up your profile</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[#68746d]">This is how your friends will see you.</p>
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
