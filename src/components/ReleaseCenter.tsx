import {
  ArrowUpRight,
  Cloud,
  Download,
  ExternalLink,
  Flag,
  Github,
  Info,
  Rocket,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

const RELEASE_WORKFLOW_URL =
  'https://github.com/praisecyber/chatimall-frontend/actions/workflows/release.yml';
const FRONTEND_REPOSITORY_URL = 'https://github.com/praisecyber/chatimall-frontend';
const LATEST_APK_URL =
  'https://github.com/praisecyber/chatimall/releases/latest/download/Chatimall.apk';
const LATEST_RELEASE_URL = 'https://github.com/praisecyber/chatimall/releases/latest';
const FIREBASE_REMOTE_CONFIG_URL =
  'https://console.firebase.google.com/project/chatimall-2623/config';

function ExternalLinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-soft transition hover:bg-brand-700"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

function ReleaseCenter() {
  return (
    <div className="flex-1 h-full overflow-y-auto bg-paper p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-paper-line bg-paper-tint p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-700">
              Production operations
            </p>
            <h2 className="flex items-center gap-2 text-xl font-black text-ink">
              <Rocket className="h-5 w-5 text-brand-600" />
              Release Center
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-mute">
              Push feature changes to the frontend repository, then build and publish the web app, Android
              APK, and compatible Android live updates. Production can pause for approval once GitHub
              environment protection is configured.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExternalLinkButton href={RELEASE_WORKFLOW_URL}>Start a production build</ExternalLinkButton>
            <a
              href={FRONTEND_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-paper-line bg-white px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-paper-mist"
            >
              Open source repository <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2" aria-label="Release targets">
          <article className="rounded-2xl border border-paper-line bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-brand-700">
              <Cloud className="h-4 w-4" />
              <h3 className="text-sm font-bold text-ink">Web app · Vercel</h3>
            </div>
            <p className="text-xs leading-relaxed text-ink-mute">
              The workflow builds and deploys the production web app after approval. Configure the
              Vercel project credentials in GitHub Actions before starting a release.
            </p>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
            >
              Open Vercel dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </article>

          <article className="rounded-2xl border border-paper-line bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-brand-700">
              <Smartphone className="h-4 w-4" />
              <h3 className="text-sm font-bold text-ink">Android · Capgo live updates</h3>
            </div>
            <p className="text-xs leading-relaxed text-ink-mute">
              HTML, CSS, JavaScript, and other compatible web assets can update without downloading a new
              APK. Native code or plugin changes still require a new signed APK.
            </p>
            <a
              href="https://console.capgo.app/"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
            >
              Open Capgo console <ExternalLink className="h-3 w-3" />
            </a>
          </article>

          <article className="rounded-2xl border border-paper-line bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-brand-700">
              <Download className="h-4 w-4" />
              <h3 className="text-sm font-bold text-ink">Signed APK · GitHub Releases</h3>
            </div>
            <p className="text-xs leading-relaxed text-ink-mute">
              The release workflow attaches the signed APK to GitHub Releases. The download page follows
              the latest release automatically.
            </p>
            <a
              href={LATEST_RELEASE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
            >
              View latest release <ExternalLink className="h-3 w-3" />
            </a>
          </article>

          <article className="rounded-2xl border border-paper-line bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-brand-700">
              <Flag className="h-4 w-4" />
              <h3 className="text-sm font-bold text-ink">Feature flags · Firebase</h3>
            </div>
            <p className="text-xs leading-relaxed text-ink-mute">
              Existing Remote Config controls can be changed without rebuilding. New app features still
              need code changes and a release; native changes need a new APK.
            </p>
            <a
              href={FIREBASE_REMOTE_CONFIG_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-800"
            >
              Manage Remote Config <ExternalLink className="h-3 w-3" />
            </a>
          </article>
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <Info className="h-4 w-4" />
            One-time setup before publishing
          </h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-amber-950/80">
            <li>
              Add the required GitHub Actions secrets: Vercel project credentials, Capgo API token,
              a fine-grained release token for <code className="font-mono">praisecyber/chatimall</code>,
              production API URL, and Android signing keystore/passwords.
            </li>
            <li>Push or merge the feature code to the frontend repository before running its release workflow.</li>
            <li>
              Create a GitHub environment named <code className="font-mono">production</code> and require
              an approval reviewer so the publish job pauses before going live.
            </li>
            <li>
              Register <code className="font-mono">com.chatimall.app</code> in Capgo and configure its
              production channel. Existing installs need one new APK install to receive the updater;
              after that, compatible web changes can arrive over the air.
            </li>
            <li>
              Keep the Android signing keystore identical to the one used for existing production APKs.
              Otherwise Android will reject the APK as an update.
            </li>
            <li>
              The Render API is a separate service and is not deployed by this frontend release workflow.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <ExternalLinkButton href={RELEASE_WORKFLOW_URL}>
              <Github className="h-3.5 w-3.5" />
              Open GitHub Actions
            </ExternalLinkButton>
            <a
              href={LATEST_APK_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100"
            >
              <Download className="h-3.5 w-3.5" />
              Download latest APK
            </a>
            <a
              href="https://dashboard.render.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100"
            >
              Render dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-ink-mute">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
          Secrets stay in GitHub Actions and Vercel; they are never placed in this browser app. Direct APK
          installs still require Android&apos;s install confirmation.
        </p>
      </div>
    </div>
  );
}

export default ReleaseCenter;
