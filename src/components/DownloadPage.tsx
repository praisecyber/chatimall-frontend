import { APP_NAME } from '@/brand';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  Globe2,
  Laptop,
  PanelsTopLeft,
  ShieldCheck,
  Smartphone,
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
  return (
    <main className="pc-download-page">
      <header className="pc-download-header">
        <div className="pc-download-container pc-download-header-inner">
          <button type="button" className="pc-download-brand" onClick={onBack} aria-label={`${APP_NAME} home`}>
            <img src="/header/header-dark.svg" alt={APP_NAME} />
          </button>
          <nav className="pc-download-nav" aria-label="Download navigation">
            <button type="button" className="pc-download-nav-link" onClick={onBack}>
              <ArrowLeft size={16} />
              Home
            </button>
            <button type="button" className="pc-download-web-link" onClick={onOpenWebApp}>
              Open web app
              <ArrowUpRight size={15} />
            </button>
          </nav>
        </div>
      </header>

      <section className="pc-download-hero">
        <div className="pc-download-container pc-download-hero-inner">
          <div className="pc-download-hero-copy">
            <p className="pc-download-eyebrow">ONE ROOM. EVERY DEVICE.</p>
            <h1>Get Chatimall<br />for your device.</h1>
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
            <article className="pc-download-card pc-download-card-featured">
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

            <article className="pc-download-card">
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

            <article className="pc-download-card pc-download-card-web">
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

      <footer className="pc-download-footer">
        <div className="pc-download-container">
          <span>© 2025 {APP_NAME} · Say it. Grow it.</span>
          <button type="button" onClick={onBack}>Back to {APP_NAME}</button>
        </div>
      </footer>
    </main>
  );
}

export default DownloadPage;
