import { useState } from 'react';
import { APP_NAME } from '@/brand';
import PhoneStage from '@/components/PhoneStage';
import {
  ArrowUpRight,
  Check,
  Download,
  Globe2,
  Menu,
  PanelsTopLeft,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';

const WINDOWS_DOWNLOAD_URL =
  'https://github.com/praisecyber/chatimall/releases/latest/download/Chatimall-Setup.exe';
const APK_DOWNLOAD_URL =
  'https://github.com/praisecyber/chatimall/releases/download/v1.0.0/Chatimall.apk';

function DownloadPage({
  onOpenWebApp,
  onBack,
}: {
  onOpenWebApp: () => void;
  onBack: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="pc-page pc-theme-milk" id="top">
      <header className="pc-header">
        <div className="pc-container">
          <nav className="pc-nav">
            <button type="button" className="pc-wordmark" onClick={onBack} aria-label={`${APP_NAME} home`}>
              <img src="/header/header-dark.svg" alt={APP_NAME} className="pc-wordmark-logo" />
            </button>

            <div className="pc-nav-links">
              <a href="#platforms" className="pc-nav-link">Platforms</a>
              <button type="button" className="pc-nav-link" onClick={onBack}>Home</button>
            </div>

            <div className="pc-nav-right">
              <button
                type="button"
                onClick={onOpenWebApp}
                className="pc-button pc-nav-cta"
              >
                Open Web App
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="pc-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="pc-container" style={{ position: 'relative' }}>
            <div className="pc-mobile-menu">
              <a href="#platforms" className="pc-nav-link" onClick={() => setMobileMenuOpen(false)}>
                Platforms
              </a>
              <button
                type="button"
                className="pc-nav-link"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onBack();
                }}
              >
                Home
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', marginTop: '4px', borderTop: '1px solid rgba(15, 31, 23, 0.08)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenWebApp();
                  }}
                  className="pc-button pc-nav-cta"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Open Web App
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <section className="pc-hero">
        <div className="pc-container">
          <div className="pc-hero-grid">
            <div className="pc-hero-copy">
              <p className="pc-kicker pc-mono">ONE ROOM. EVERY DEVICE.</p>
              <h1 className="pc-hero-title">
                Get {APP_NAME} for <br />
                <span className="pc-hero-accent-wrap">
                  <span className="pc-hero-accent">every device.</span>
                  <svg
                    className="pc-hero-underline"
                    viewBox="0 0 280 20"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M4 14 Q 140 2, 276 12"
                      stroke="#0F8A5F"
                      strokeWidth="5.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
              <p className="pc-hero-intro">
                Voice notes, live rooms, and your people—ready wherever you are.
                Pick a download to get started.
              </p>
              <div className="pc-hero-actions">
                <a
                  className="pc-button pc-button-primary"
                  href={WINDOWS_DOWNLOAD_URL}
                  data-testid="button-download-windows"
                >
                  <Download className="w-4 h-4" />
                  Download for Windows
                </a>
                <a
                  className="pc-button pc-button-secondary"
                  href={APK_DOWNLOAD_URL}
                  data-testid="button-download-apk"
                >
                  <Smartphone className="w-4 h-4" />
                  Download for Android
                </a>
              </div>
              <div className="pc-download-trust">
                <span><Check size={15} /> Free to use</span>
                <span><ShieldCheck size={15} /> Secure connection</span>
              </div>
            </div>

            <PhoneStage />
          </div>
        </div>
      </section>

      <div className="pc-marquee">
        <div className="pc-marquee-track">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="pc-marquee-group">
              <span className="pc-marquee-item pc-text-mint">WINDOWS</span>
              <span className="pc-marquee-item pc-text-muted">ANDROID</span>
              <span className="pc-marquee-item pc-text-coral">WEB BROWSER</span>
              <span className="pc-marquee-item pc-text-muted">ONE ROOM EVERYWHERE</span>
              <span className="pc-marquee-item pc-text-mint">FREE TO USE</span>
            </span>
          ))}
        </div>
      </div>

      <section className="pc-section" id="platforms">
        <div className="pc-container">
          <p className="pc-kicker pc-mono">CHOOSE YOUR PLATFORM</p>
          <h2 className="pc-section-title">
            Everything you need to <span className="pc-title-mint">get started.</span>
          </h2>

          <div className="pc-download-grid">
            <article className="pc-download-card pc-download-card-featured">
              <div className="pc-download-card-top">
                <div className="pc-download-icon pc-download-icon-featured"><PanelsTopLeft size={25} /></div>
                <span className="pc-download-recommended">RECOMMENDED</span>
              </div>
              <h3>{APP_NAME} for Windows</h3>
              <p className="pc-download-card-copy">The full desktop experience, installed on your PC.</p>
              <div className="pc-download-specs">
                <span>Windows 10 or later</span><span>64-bit</span><span>Installer</span>
              </div>
              <a
                className="pc-button pc-button-primary"
                href={WINDOWS_DOWNLOAD_URL}
                data-testid="button-download-windows-card"
              >
                <Download className="w-4 h-4" />
                Download for Windows
              </a>
              <p className="pc-download-version">Latest release · Windows x64</p>
            </article>

            <article className="pc-download-card">
              <div className="pc-download-icon"><Smartphone size={24} /></div>
              <h3>{APP_NAME} for Android</h3>
              <p className="pc-download-card-copy">Install the Android app directly from the APK.</p>
              <div className="pc-download-specs">
                <span>Android</span><span>APK</span>
              </div>
              <a
                className="pc-button pc-button-secondary"
                href={APK_DOWNLOAD_URL}
                data-testid="button-download-apk-card"
              >
                <Download className="w-4 h-4" />
                Download APK
              </a>
              <p className="pc-download-version">Android app package</p>
            </article>

            <article className="pc-download-card pc-download-card-web">
              <div className="pc-download-icon"><Globe2 size={24} /></div>
              <h3>{APP_NAME} on the web</h3>
              <p className="pc-download-card-copy">No install needed. Open {APP_NAME} in your browser.</p>
              <div className="pc-download-specs">
                <span>Any device</span><span>Always up to date</span>
              </div>
              <button
                type="button"
                className="pc-button pc-button-secondary"
                onClick={onOpenWebApp}
                data-testid="button-open-web-app"
              >
                Open web app
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <p className="pc-download-version">Works in your browser</p>
            </article>
          </div>

          <p className="pc-download-help">
            Having trouble installing?{' '}
            <a href="https://github.com/praisecyber/chatimall/issues">Get help on GitHub</a>.
          </p>
        </div>
      </section>

      <section className="pc-final">
        <div className="pc-container">
          <div className="pc-final-inner">
            <div>
              <p className="pc-kicker pc-mono">YOUR NEXT FAVORITE ROOM</p>
              <h2 className="pc-final-headline">
                Talk like you're <br />
                <span className="pc-title-mint">actually there.</span>
              </h2>
              <p className="pc-final-copy">
                {APP_NAME} is ready to carry around. Install it once and your chats,
                rooms, and groups follow you to every device.
              </p>
              <button
                type="button"
                onClick={onOpenWebApp}
                className="pc-button pc-button-primary"
                style={{ marginTop: '28px' }}
              >
                <ArrowUpRight className="w-4 h-4" />
                Open Web App
              </button>
            </div>
            <div className="pc-final-aside">
              <p className="pc-final-aside-title">One room. Every device.</p>
              <p className="pc-final-aside-text">
                Start on your phone and pick the conversation back up on your PC — no
                setup, no sync button.
              </p>
              <div className="pc-final-aside-heart">
                <Check className="w-4 h-4 text-[#0F8A5F]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="pc-footer">
        <div className="pc-container">
          <div className="pc-footer-row">
            <button
              type="button"
              className="pc-wordmark"
              onClick={onBack}
              aria-label={`${APP_NAME} home`}
              style={{ fontSize: '1.05rem' }}
            >
              <img src="/footer/footer-dark.svg" alt={APP_NAME} className="pc-wordmark-logo" />
            </button>
            <div className="pc-footer-links">
              <a href="#platforms" className="pc-nav-link">Platforms</a>
              <a href="https://github.com/praisecyber/chatimall/issues" className="pc-nav-link">Get help</a>
            </div>
            <p className="pc-footer-copy pc-mono">© 2025 {APP_NAME.toLowerCase()} / made for the in-between</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DownloadPage;
