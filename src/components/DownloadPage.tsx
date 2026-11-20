import { useState } from 'react';
import { APP_NAME } from '@/brand';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  Globe2,
  Laptop,
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
    <main className="pc-download-page">
      <header className="pc-header pc-download-header">
        <div className="pc-container">
          <nav className="pc-nav" aria-label="Download navigation">
            <button type="button" className="pc-wordmark pc-download-brand" onClick={onBack} aria-label={`${APP_NAME} home`}>
              <img src="/header/header-dark.svg" alt={APP_NAME} className="pc-wordmark-logo" />
            </button>

            <div className="pc-nav-links">
              <button type="button" className="pc-nav-link" onClick={onBack}>Home</button>
              <a href="#windows-download" className="pc-nav-link">Windows</a>
              <a href="#android-download" className="pc-nav-link">Android</a>
              <a href="#web-download" className="pc-nav-link">Web</a>
            </div>

            <div className="pc-nav-right">
              <button
                type="button"
                className="pc-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>
        </div>

        {mobileMenuOpen && (
          <div className="pc-container pc-download-mobile-menu-wrap">
            <div className="pc-mobile-menu">
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
              <a href="#windows-download" className="pc-nav-link" onClick={() => setMobileMenuOpen(false)}>Windows</a>
              <a href="#android-download" className="pc-nav-link" onClick={() => setMobileMenuOpen(false)}>Android</a>
              <a href="#web-download" className="pc-nav-link" onClick={() => setMobileMenuOpen(false)}>Web</a>
            </div>
          </div>
        )}
      </header>

      <section className="pc-download-hero">
        <div className="pc-download-container pc-download-hero-inner">
          <div className="pc-download-hero-copy">
            <button type="button" className="pc-download-back" onClick={onBack}>
              <ArrowLeft size={16} />
              Go back
            </button>
            <p className="pc-download-eyebrow">ONE ROOM. EVERY DEVICE.</p>
            <h1>Get <span className="pc-download-title-accent">{APP_NAME}</span><br />for your device.</h1>
            <p className="pc-download-lede">
              Voice notes, live rooms, and your people—ready wherever you are.
              Pick a download to get started.
            </p>
            <div className="pc-download-trust">
              <span><Check size={15} /> Free to use</span>
              <span><ShieldCheck size={15} /> Secure connection</span>
            </div>
          </div>
          <div className="pc-download-hero-art" aria-hidden="true">
            <div className="pc-download-device pc-download-device-back"><Smartphone size={40} /></div>
            <div className="pc-download-device pc-download-device-front"><Laptop size={62} /></div>
            <span className="pc-download-art-dot pc-download-art-dot-one" />
            <span className="pc-download-art-dot pc-download-art-dot-two" />
          </div>
        </div>
      </section>

      <section className="pc-download-options" aria-labelledby="pc-download-heading">
        <div className="pc-download-container">
          <div className="pc-download-section-heading">
            <div>
              <p className="pc-download-eyebrow pc-download-eyebrow-green">DOWNLOAD CHATIMALL</p>
              <h2 id="pc-download-heading">Choose your platform</h2>
            </div>
            <p>All downloads are free. An internet connection is required.</p>
          </div>

          <div className="pc-download-grid">
            <article id="windows-download" className="pc-download-card pc-download-card-featured">
              <div className="pc-download-card-top">
                <div className="pc-download-icon pc-download-icon-featured"><PanelsTopLeft size={25} /></div>
                <span className="pc-download-recommended">RECOMMENDED</span>
              </div>
              <h3>Chatimall for Windows</h3>
              <p className="pc-download-card-copy">The full desktop experience, installed on your PC.</p>
              <div className="pc-download-specs">
                <span>Windows 10 or later</span><span>64-bit</span><span>Installer</span>
              </div>
              <a
                className="pc-download-button"
                href={WINDOWS_DOWNLOAD_URL}
                data-testid="button-download-windows"
              >
                <Download size={18} />
                Download for Windows
              </a>
              <p className="pc-download-version">Latest release · Windows x64</p>
            </article>

            <article id="android-download" className="pc-download-card">
              <div className="pc-download-icon"><Smartphone size={24} /></div>
              <h3>Chatimall for Android</h3>
              <p className="pc-download-card-copy">Install the Android app directly from the APK.</p>
              <div className="pc-download-specs">
                <span>Android</span><span>APK</span>
              </div>
              <a
                className="pc-download-button pc-download-button-secondary"
                href={APK_DOWNLOAD_URL}
                data-testid="button-download-apk"
              >
                <Download size={18} />
                Download APK
              </a>
              <p className="pc-download-version">Android app package</p>
            </article>

            <article id="web-download" className="pc-download-card pc-download-card-web">
              <div className="pc-download-icon"><Globe2 size={24} /></div>
              <h3>Chatimall on the web</h3>
              <p className="pc-download-card-copy">No install needed. Open Chatimall in your browser.</p>
              <div className="pc-download-specs">
                <span>Any device</span><span>Always up to date</span>
              </div>
              <button
                type="button"
                className="pc-download-button pc-download-button-secondary"
                onClick={onOpenWebApp}
                data-testid="button-open-web-app"
              >
                Open web app
                <ArrowUpRight size={18} />
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

      <footer className="pc-footer pc-download-footer">
        <div className="pc-download-container">
          <div className="pc-footer-row">
            <button
              type="button"
              className="pc-wordmark pc-download-footer-brand"
              onClick={onBack}
              aria-label={`${APP_NAME} home`}
            >
              <img src="/footer/footer-dark.svg" alt={APP_NAME} className="pc-wordmark-logo" />
            </button>
            <nav className="pc-footer-links" aria-label="Download footer">
              <a href="#windows-download" className="pc-nav-link">Windows</a>
              <a href="#android-download" className="pc-nav-link">Android</a>
              <a href="#web-download" className="pc-nav-link">Web</a>
              <button type="button" className="pc-nav-link" onClick={onBack}>Home</button>
            </nav>
            <p className="pc-footer-copy pc-mono">
              © 2025 {APP_NAME.toLowerCase()} / made for the in-between
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default DownloadPage;
