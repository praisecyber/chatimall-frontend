import { useState, useEffect, useRef } from 'react';
import {
  MoreVertical,
  Globe,
  ChevronDown,
  X,
  Check,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { APP_NAME } from '@/brand';
import { startWelcomeMusic, type WelcomeMusicController } from '@/lib/welcomeMusic';
import { DancingCouplesBackground } from '@/components/DancingCouplesBackground';

const WELCOME_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'id', label: 'Bahasa Indonesia' },
];

/**
 * Chatimall Circular Doodle Artwork:
 * Clean, lightweight circular doodle in Chatimall brand green (#0F8A5F):
 * - Center: Smartphone with Chatimall voice note & chat
 * - In orbit: Voice mic, Gist room badge, security lock shield, video screen, sprout, ballot, laptop sync
 */
function WelcomeArtwork({ className = '' }: { className?: string }) {
  return (
    <div className={`relative mx-auto flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 300 300"
        className="h-full w-full max-h-[300px] max-w-[300px]"
        fill="none"
        stroke="#0F8A5F"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Chatimall illustration"
      >
        {/* --- 1. CENTER: Smartphone with Chat & Voice Note --- */}
        <rect x="112" y="82" width="76" height="136" rx="16" strokeWidth="2.4" />
        <rect x="119" y="96" width="62" height="106" rx="8" strokeWidth="1.6" />
        {/* Notch */}
        <line x1="138" y1="89" x2="162" y2="89" strokeWidth="2" />
        {/* Home Dot */}
        <circle cx="150" cy="209" r="2.5" fill="#0F8A5F" stroke="none" />

        {/* Incoming Chat Bubble */}
        <path
          d="M125 116h36a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-24l-7 6v-6h-5a6 6 0 0 1-6-6v-10a6 6 0 0 1 6-6Z"
          strokeWidth="1.6"
          fill="#DDF3E8"
        />
        <line x1="131" y1="123" x2="159" y2="123" strokeWidth="1.4" />
        <line x1="131" y1="129" x2="149" y2="129" strokeWidth="1.4" />

        {/* Outgoing Voice Note with Audio Equalizer Waves */}
        <path
          d="M131 150h38a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6h-6l-5 5v-5h-27a6 6 0 0 1-6-6v-12a6 6 0 0 1 6-6Z"
          strokeWidth="1.6"
          fill="#F0FAF4"
        />
        {/* Mic dot */}
        <circle cx="138" cy="159" r="2" fill="#0F8A5F" stroke="none" />
        {/* Voice Equalizer bars */}
        <line x1="145" y1="162" x2="145" y2="156" strokeWidth="1.5" />
        <line x1="149" y1="164" x2="149" y2="154" strokeWidth="1.5" />
        <line x1="153" y1="161" x2="153" y2="157" strokeWidth="1.5" />
        <line x1="157" y1="165" x2="157" y2="153" strokeWidth="1.5" />
        <line x1="161" y1="162" x2="161" y2="156" strokeWidth="1.5" />
        <line x1="165" y1="160" x2="165" y2="158" strokeWidth="1.5" />

        {/* --- 2. TOP (12 o'clock): Microphone --- */}
        <g transform="translate(138, 20)">
          <rect x="7" y="5" width="10" height="16" rx="5" strokeWidth="1.8" fill="#DDF3E8" />
          <path d="M3 13c0 5 4 9 9 9s9-4 9-9" strokeWidth="1.6" />
          <line x1="12" y1="22" x2="12" y2="28" strokeWidth="1.8" />
          <line x1="7" y1="28" x2="17" y2="28" strokeWidth="1.8" />
          <path d="M-1 9c-3 3-3 8 0 11" strokeWidth="1.5" />
          <path d="M25 9c3 3 3 8 0 11" strokeWidth="1.5" />
        </g>

        {/* --- 3. TOP-RIGHT (1:30): Gist Room Pill --- */}
        <g transform="translate(202, 38)">
          <rect x="0" y="0" width="62" height="26" rx="13" strokeWidth="1.8" fill="#DDF3E8" />
          <circle cx="14" cy="13" r="5" strokeWidth="1.5" fill="white" />
          <circle cx="25" cy="13" r="5" strokeWidth="1.5" fill="white" />
          <text
            x="44"
            y="17"
            fill="#0F8A5F"
            stroke="none"
            fontSize="8.5"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            GIST
          </text>
        </g>
        <circle cx="274" cy="51" r="3" fill="#0F8A5F" stroke="none" />
        <path d="M278 47c3 2 3 6 0 8" strokeWidth="1.4" />

        {/* --- 4. RIGHT (3 o'clock): Security Shield & Lock --- */}
        <g transform="translate(224, 114)">
          <path
            d="M20 0l16 6v14c0 10-7 18-16 22-9-4-16-12-16-22V6l16-6Z"
            strokeWidth="1.8"
            fill="#DDF3E8"
          />
          <rect x="15" y="19" width="10" height="9" rx="2" strokeWidth="1.5" fill="white" />
          <path d="M17 19v-4c0-1.7 1.3-3 3-3s3 1.3 3 3v4" strokeWidth="1.4" />
          <circle cx="20" cy="23.5" r="1.2" fill="#0F8A5F" stroke="none" />
        </g>
        <g transform="translate(244, 168)">
          <circle cx="8" cy="8" r="8" strokeWidth="1.6" fill="#F0FAF4" />
          <path d="M5 8l2.5 2.5 4-5" strokeWidth="1.6" />
        </g>

        {/* --- 5. BOTTOM-RIGHT (4:30): Watch Together Video --- */}
        <g transform="translate(196, 208)">
          <rect x="0" y="0" width="34" height="24" rx="6" strokeWidth="1.8" fill="#DDF3E8" />
          <polygon points="13,7 23,12 13,17" fill="#0F8A5F" stroke="none" />
          <line x1="3" y1="3" x2="31" y2="3" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="3" y1="21" x2="31" y2="21" strokeWidth="1" strokeDasharray="2,2" />
        </g>
        <path
          d="M246 226c-3-3-7-1-7 2.5 0 3.5 7 7 7 7s7-3.5 7-7c0-3.5-4-5.5-7-2.5Z"
          strokeWidth="1.4"
          fill="#0F8A5F"
        />

        {/* --- 6. BOTTOM (6 o'clock): Sprout Leaf --- */}
        <g transform="translate(138, 244)">
          <line x1="12" y1="12" x2="12" y2="28" strokeWidth="2.2" />
          <path d="M12 18c-7-1-12-6-12-12 6 0 11 5 12 12Z" strokeWidth="1.6" fill="#DDF3E8" />
          <path d="M12 14c7-1 12-6 12-12-6 0-11 5-12 12Z" strokeWidth="1.6" fill="#0F8A5F" />
        </g>
        <line x1="130" y1="278" x2="135" y2="274" strokeWidth="1.4" />
        <line x1="170" y1="278" x2="165" y2="274" strokeWidth="1.4" />

        {/* --- 7. BOTTOM-LEFT (7:30): Anonymous Ballot Box --- */}
        <g transform="translate(52, 206)">
          <rect x="0" y="10" width="30" height="22" rx="4" strokeWidth="1.7" fill="#DDF3E8" />
          <line x1="0" y1="16" x2="30" y2="16" strokeWidth="1.3" />
          <line x1="8" y1="10" x2="22" y2="10" strokeWidth="2" />
          <rect x="8" y="1" width="14" height="12" rx="2" strokeWidth="1.4" fill="white" />
          <path d="M12 7l1.5 1.5 3-3" strokeWidth="1.3" />
        </g>
        <g transform="translate(28, 172)">
          <circle cx="8" cy="8" r="6" strokeWidth="1.6" fill="#F0FAF4" />
          <circle cx="22" cy="8" r="6" strokeWidth="1.6" fill="#F0FAF4" />
          <line x1="14" y1="8" x2="16" y2="8" strokeWidth="1.6" />
        </g>

        {/* --- 8. LEFT (9 o'clock): Laptop Device --- */}
        <g transform="translate(18, 102)">
          <rect x="0" y="4" width="34" height="22" rx="3" strokeWidth="1.7" fill="#DDF3E8" />
          <line x1="0" y1="26" x2="34" y2="26" strokeWidth="2.5" />
          <path d="M14 11a4 4 0 0 1 6 0l2-2" strokeWidth="1.3" />
          <path d="M20 18a4 4 0 0 1-6 0l-2 2" strokeWidth="1.3" />
        </g>
        <polygon
          points="46,146 39,158 45,158 41,168 51,154 45,154"
          fill="#0F8A5F"
          stroke="none"
        />

        {/* --- 9. TOP-LEFT (10:30): Chat Bubble --- */}
        <g transform="translate(38, 42)">
          <path
            d="M12 0h24a8 8 0 0 1 8 8v10a8 8 0 0 1-8 8h-6l-7 7v-7h-11a8 8 0 0 1-8-8v-10a8 8 0 0 1 8-8Z"
            strokeWidth="1.8"
            fill="#DDF3E8"
          />
          <circle cx="36" cy="6" r="6" strokeWidth="1.4" fill="white" />
          <path
            d="M36 6.5c-1-1.2-2.5-.5-2.5.8 0 1.2 2.5 2.5 2.5 2.5s2.5-1.3 2.5-2.5c0-1.3-1.5-2-2.5-.8Z"
            fill="#0F8A5F"
            stroke="none"
          />
          <line x1="14" y1="9" x2="28" y2="9" strokeWidth="1.4" />
          <line x1="14" y1="15" x2="24" y2="15" strokeWidth="1.4" />
        </g>

        {/* Perimeter accent dots */}
        <circle cx="112" cy="42" r="2.5" fill="#0F8A5F" />
        <path d="M114 42v-8l6-2v8" strokeWidth="1.3" />
        <circle cx="96" cy="30" r="2" fill="#0F8A5F" stroke="none" />
        <circle cx="192" cy="24" r="2.2" strokeWidth="1.4" />
        <circle cx="282" cy="98" r="2.5" strokeWidth="1.4" />
        <circle cx="278" cy="188" r="2.2" strokeWidth="1.4" />
        <circle cx="106" cy="268" r="2.5" strokeWidth="1.4" />
        <circle cx="194" cy="262" r="2" fill="#0F8A5F" stroke="none" />
        <circle cx="36" cy="80" r="2" fill="#0F8A5F" stroke="none" />
        <circle cx="14" cy="148" r="2.2" strokeWidth="1.4" />
        <circle cx="28" cy="238" r="2" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

export function WelcomeScreen({
  onContinue,
  onLinkDevice,
}: {
  onContinue: () => void;
  onLinkDevice?: () => void;
}) {
  const [selectedLang, setSelectedLang] = useState('English');
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'help' | null>(null);

  // Welcome ambient soundtrack (plays gently in background)
  const musicRef = useRef<WelcomeMusicController | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    // Start welcome music with playback listener
    try {
      musicRef.current = startWelcomeMusic((playing) => {
        setIsMusicPlaying(playing);
      });
      setIsMusicPlaying(musicRef.current.isPlaying());
    } catch {
      // ignore
    }

    // In case browser suspended audio due to autoplay restrictions,
    // resume it immediately upon user's first touch, click or keypress
    const handleUserGesture = () => {
      if (musicRef.current) {
        musicRef.current.resume();
        setIsMusicPlaying(musicRef.current.isPlaying());
      } else {
        musicRef.current = startWelcomeMusic((playing) => {
          setIsMusicPlaying(playing);
        });
        setIsMusicPlaying(musicRef.current.isPlaying());
      }
    };

    window.addEventListener('pointerdown', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('click', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('keydown', handleUserGesture, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture, { capture: true });
      window.removeEventListener('click', handleUserGesture, { capture: true });
      window.removeEventListener('keydown', handleUserGesture, { capture: true });
      if (musicRef.current) {
        musicRef.current.stop();
        musicRef.current = null;
      }
      setIsMusicPlaying(false);
    };
  }, []);

  const handleAgree = () => {
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
    }
    setIsMusicPlaying(false);
    try {
      localStorage.setItem('chatimall_welcome_seen', 'true');
    } catch {
      // safe fallback
    }
    onContinue();
  };

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center bg-paper md:bg-gradient-to-br md:from-[#EBF5EF] md:via-[#F6FAF7] md:to-[#E3F2E9] p-0 md:p-6 lg:p-10 text-ink selection:bg-brand-500/20 overflow-x-hidden">
      {/* Animated Background of Two Characters Dancing to the Music */}
      <DancingCouplesBackground isPlaying={isMusicPlaying} />

      {/* =========================================================================
          1. PHONE VIEW (screens < 768px): Vertical Native Mobile Flow
          ========================================================================= */}
      <section className="relative z-10 flex min-h-dvh w-full flex-col justify-between bg-paper/25 backdrop-blur-xs px-6 py-6 md:hidden">
        {/* Top Header Bar: 3-Dot Overflow Menu */}
        <div className="flex w-full items-center justify-end">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-paper-mist hover:text-ink active:bg-paper-line focus-visible:outline-none"
              aria-label="More options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* Overflow Menu */}
            {overflowMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOverflowMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 z-50 min-w-[150px] overflow-hidden rounded-2xl border border-paper-line bg-paper py-1.5 shadow-[0_12px_36px_-6px_rgba(15,31,23,0.18)] animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setOverflowMenuOpen(false);
                      setActiveModal('help');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-brand-50 hover:text-brand-800 transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4 text-brand-600" />
                    <span>Help</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center Content: Artwork, Title, Simple Text, Language Picker */}
        <div className="my-auto flex flex-col items-center text-center">
          <div className="w-full flex justify-center py-2">
            <WelcomeArtwork className="h-[240px] w-[240px] opacity-45" />
          </div>

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">
            Welcome to {APP_NAME}
          </h1>

          <p className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-ink-mute">
            Read our{' '}
            <button
              type="button"
              onClick={() => setActiveModal('privacy')}
              className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Privacy Policy
            </button>
            . Tap &ldquo;Agree and continue&rdquo; to accept the{' '}
            <button
              type="button"
              onClick={() => setActiveModal('terms')}
              className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              Terms of Service
            </button>
            .
          </p>

          <button
            type="button"
            onClick={() => setLangModalOpen(true)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-paper-line bg-paper-mist hover:bg-paper-line2/50 px-4 py-1.5 text-xs font-semibold text-brand-700 transition-colors shadow-xs"
            aria-label="Select language"
          >
            <Globe className="h-3.5 w-3.5 text-brand-600" />
            <span>{selectedLang}</span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-mute" />
          </button>
        </div>

        {/* Bottom Action: Prominent Full-Width Button */}
        <div className="pt-6 w-full flex flex-col items-center">
          <button
            type="button"
            onClick={handleAgree}
            className="w-full rounded-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 py-3.5 px-6 text-sm font-bold text-white shadow-lift transition-all hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
          >
            Agree and continue
          </button>
        </div>
      </section>

      {/* =========================================================================
          2. DESKTOP VIEW (screens >= 768px): Spacious 2-Column Horizontal Card
          ========================================================================= */}
      <section className="relative z-10 hidden md:flex w-full max-w-4xl overflow-hidden rounded-3xl border border-paper-line/80 bg-paper/90 md:bg-white/88 backdrop-blur-md shadow-[0_24px_64px_-12px_rgba(15,138,95,0.14)] min-h-[520px]">
        
        {/* Left Column: Brand, Clean Text, Action */}
        <div className="flex flex-1 flex-col justify-between p-10 lg:p-12 border-r border-paper-line">
          {/* Top Brand & Language Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandMark size={34} />
              <span className="text-xl font-bold tracking-tight text-ink">{APP_NAME}</span>
            </div>

            <button
              type="button"
              onClick={() => setLangModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-paper-line bg-paper-mist hover:bg-paper-line2/50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors shadow-xs"
            >
              <Globe className="h-3.5 w-3.5 text-brand-600" />
              <span>{selectedLang}</span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-mute" />
            </button>
          </div>

          {/* Middle: Clean Headline & Simple Terms */}
          <div className="my-auto py-6">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-ink leading-tight">
              Welcome to <span className="text-brand-700">{APP_NAME}</span>
            </h1>

            <p className="mt-3 text-sm text-ink-mute leading-relaxed max-w-md">
              Fast, simple, and secure messaging. Built for spontaneous voice notes, live gist rooms, and private conversations.
            </p>

            <p className="mt-4 text-xs text-ink-mute leading-relaxed max-w-md">
              Read our{' '}
              <button
                type="button"
                onClick={() => setActiveModal('privacy')}
                className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                Privacy Policy
              </button>
              . Tap &ldquo;Agree and continue&rdquo; to accept the{' '}
              <button
                type="button"
                onClick={() => setActiveModal('terms')}
                className="font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                Terms of Service
              </button>
              .
            </p>

            {/* Help & Security placed directly under the text */}
            <div className="mt-3.5">
              <button
                type="button"
                onClick={() => setActiveModal('help')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-mute hover:text-brand-700 transition-colors group"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-brand-600 transition-transform group-hover:scale-110" />
                <span className="group-hover:underline">Help &amp; Security</span>
              </button>
            </div>
          </div>

          {/* Bottom Action: Prominent CTA */}
          <div className="pt-4 border-t border-paper-line flex items-center">
            <button
              type="button"
              onClick={handleAgree}
              className="rounded-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 py-3.5 px-9 text-sm font-bold text-white shadow-lift transition-all hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25"
            >
              Agree and continue
            </button>
          </div>
        </div>

        {/* Right Column: Visual Artwork Canvas */}
        <div className="flex flex-1 items-center justify-center bg-brand-50/20 backdrop-blur-xs p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute h-64 w-64 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <WelcomeArtwork className="h-[280px] w-[280px] opacity-80" />
          </div>
        </div>
      </section>

      {/* Language Selection Modal */}
      {langModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-xs rounded-2xl bg-paper p-4 shadow-2xl border border-paper-line flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between pb-3 border-b border-paper-line">
              <span className="text-sm font-bold text-ink">App language</span>
              <button
                type="button"
                onClick={() => setLangModalOpen(false)}
                className="p-1 rounded-full text-ink-mute hover:bg-paper-mist"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto py-2 space-y-0.5">
              {WELCOME_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setSelectedLang(lang.label);
                    setLangModalOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-ink hover:bg-brand-50 hover:text-brand-800 rounded-xl transition-colors"
                >
                  <span>{lang.label}</span>
                  {selectedLang === lang.label && (
                    <Check className="h-3.5 w-3.5 text-brand-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Modal: Privacy / Terms / Help */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-paper p-6 shadow-2xl border border-paper-line flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-paper-line">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Shield className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-ink">
                  {activeModal === 'privacy'
                    ? `${APP_NAME} Privacy Policy`
                    : activeModal === 'terms'
                    ? `${APP_NAME} Terms of Service`
                    : `${APP_NAME} Help`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-full text-ink-mute hover:bg-paper-mist"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 text-xs text-ink-soft space-y-3 leading-relaxed">
              {activeModal === 'privacy' && (
                <>
                  <p className="font-semibold text-ink">About your information</p>
                  <p className="text-ink-mute">
                    Chatimall handles account details and content you submit to provide messaging and community features. If you choose to sync device contacts, selected names and phone numbers are sent to our service to find people on Chatimall. End-to-end encryption applies to supported text messages only, not every feature or media type.
                  </p>
                  <a href="/privacy.html" className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
                    Read the full Privacy Policy
                  </a>
                </>
              )}
              {activeModal === 'terms' && (
                <>
                  <p className="font-semibold text-ink">Using Chatimall</p>
                  <p className="text-ink-mute">
                    Keep your account secure, respect other users, and do not use Chatimall for unlawful, abusive, or disruptive activity. You remain responsible for the content you share and the audience you choose.
                  </p>
                  <a href="/terms.html" className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
                    Read the full Terms of Service
                  </a>
                </>
              )}
              {activeModal === 'help' && (
                <>
                  <p className="font-semibold text-ink">Need help getting started?</p>
                  <p className="text-ink-mute">
                    • <strong>Get Started:</strong> Tap &ldquo;Agree and continue&rdquo; to set up your account and start messaging.<br />
                    • <strong>Support:</strong> Email support@chatimall.com for technical assistance.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-paper-line flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default WelcomeScreen;
