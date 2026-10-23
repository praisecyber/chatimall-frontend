import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { APP_NAME } from '@/brand';

export type AppLoadingMode = 'launch' | 'setup';

interface AppLoadingScreenProps {
  mode?: AppLoadingMode;
  /** Whether the underlying data/auth is ready. If provided, progress will smoothly finish once ready. */
  isReady?: boolean;
  /** Called when progress reaches 100% and transition completes */
  onComplete?: () => void;
  /** Optional custom title override */
  customTitle?: string;
}

const LAUNCH_STEPS = [
  { threshold: 0, text: 'Connecting securely...' },
  { threshold: 30, text: 'Loading your chats & media...' },
  { threshold: 65, text: 'Verifying end-to-end encryption...' },
  { threshold: 90, text: 'Almost ready...' },
  { threshold: 100, text: 'Welcome back!' },
];

const SETUP_STEPS = [
  { threshold: 0, text: 'Creating your profile...' },
  { threshold: 25, text: 'Generating encryption keys...' },
  { threshold: 55, text: 'Initializing your secure workspace...' },
  { threshold: 85, text: 'Finalizing account setup...' },
  { threshold: 100, text: 'All set! Opening Chatimall...' },
];

export default function AppLoadingScreen({
  mode = 'launch',
  isReady = true,
  onComplete,
  customTitle,
}: AppLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  const steps = mode === 'setup' ? SETUP_STEPS : LAUNCH_STEPS;

  // Active step message based on progress
  const activeMessage =
    [...steps].reverse().find((s) => progress >= s.threshold)?.text ?? steps[0].text;

  useEffect(() => {
    // Total animation target: ~1400ms - 1800ms
    const intervalTime = 30;
    const stepIncrement = mode === 'setup' ? 2 : 2.5;

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        // If underlying data is not ready yet, hold at 85%
        if (!isReady && prev >= 85) {
          return 85;
        }

        const next = Math.min(100, prev + stepIncrement);
        if (next >= 100) {
          window.clearInterval(timer);
          // Trigger smooth fade out
          window.setTimeout(() => {
            setExiting(true);
            window.setTimeout(() => {
              onComplete?.();
            }, 450);
          }, 200);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => window.clearInterval(timer);
  }, [isReady, mode, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between select-none overflow-hidden transition-all duration-500 ease-out ${
        exiting ? 'opacity-0 scale-[1.01] pointer-events-none' : 'opacity-100 scale-100'
      } bg-[#F8FAF8] dark:bg-[#0D151D] text-ink dark:text-white`}
      style={{
        fontFamily: "'Manrope', 'Space Grotesk', -apple-system, sans-serif",
      }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Loading Chatimall"
    >
      {/* Ambient background glow accents */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-brand-500/10 dark:bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-brand-600/10 dark:bg-brand-600/15 blur-3xl" />

      {/* Top spacer */}
      <div className="h-14 w-full" />

      {/* Center Hero: Pulsing Brand Icon & Progress */}
      <div className="relative flex flex-col items-center justify-center px-6 text-center max-w-sm w-full">
        {/* Animated Brand Icon with concentric glowing rings */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer Ripple */}
          <div className="absolute h-28 w-28 rounded-full bg-brand-500/[0.08] dark:bg-brand-400/[0.12] animate-ping opacity-60 duration-1000" />
          
          {/* Inner Soft Glow */}
          <div className="absolute h-24 w-24 rounded-full bg-brand-500/15 dark:bg-brand-500/25 blur-md" />

          {/* Brand Mark Container */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white dark:bg-[#14202B] shadow-[0_12px_32px_-8px_rgba(15,138,95,0.28)] border border-brand-500/20 transition-transform duration-300">
            <BrandMark size={48} />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink dark:text-white">
          {customTitle ?? APP_NAME}
        </h1>

        {/* Dynamic status phrase */}
        <div className="mt-2 h-6 flex items-center justify-center">
          <p className="text-xs font-medium text-brand-700 dark:text-brand-300 transition-opacity duration-300 flex items-center gap-1.5">
            {mode === 'setup' && <Sparkles className="h-3 w-3 animate-spin text-brand-500" />}
            {activeMessage}
          </p>
        </div>

        {/* Modern Progress Bar */}
        <div className="mt-7 w-full max-w-[220px]">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-400 transition-all duration-150 ease-out shadow-[0_0_10px_rgba(18,160,111,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-medium text-ink-mute dark:text-ink-faint">
            <span>{mode === 'setup' ? 'Setting up' : 'Connecting'}</span>
            <span className="tabular-nums font-semibold">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Encryption & Brand Signature (WhatsApp-style) */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.04] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04] backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-ink-mute dark:text-ink-faint shadow-xs">
          <Lock className="h-3 w-3 text-brand-600 dark:text-brand-400" />
          <span>End-to-end encrypted</span>
        </div>

        <div className="leading-tight">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-ink-faint">
            from
          </span>
          <span className="text-xs font-bold tracking-widest text-brand-700 dark:text-brand-400 uppercase">
            {APP_NAME}
          </span>
        </div>
      </div>
    </div>
  );
}
