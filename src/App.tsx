import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import LandingPage from '@/components/LandingPage';
import MobileApp from '@/components/MobileApp';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CallProvider } from '@/lib/calls';
import { isNative, unregisterPush } from '@/lib/native';
import { AuthScreen, ProfileSetup } from '@/components/AuthScreen';
import AppLoadingScreen from '@/components/AppLoadingScreen';
import AppLoadingScreenPreview from '@/components/AppLoadingScreenPreview';
import { getToken } from '@/lib/http';
import type { Screen, Chat } from '@/types';

type View = 'landing' | 'app';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { userId, profile, loading } = useAuth();
  const [initialLoadingComplete, setInitialLoadingComplete] = useState(() => !getToken());
  const [isFinishingSetup, setIsFinishingSetup] = useState(false);
  const [setupLoadingComplete, setSetupLoadingComplete] = useState(false);
  const [prevUserId, setPrevUserId] = useState<string | null>(() => (getToken() ? 'init' : null));
  const [justSignedIn, setJustSignedIn] = useState(false);
  const [signInLoadingComplete, setSignInLoadingComplete] = useState(false);

  useEffect(() => {
    if (!prevUserId && userId && profile?.name) {
      setJustSignedIn(true);
      setSignInLoadingComplete(false);
    }
    setPrevUserId(userId);
  }, [userId, profile?.name, prevUserId]);

  // 1. Existing user launching app normally after splash screen
  if (getToken() && !initialLoadingComplete) {
    return (
      <AppLoadingScreen
        mode="launch"
        isReady={!loading && Boolean(userId && profile?.name)}
        onComplete={() => setInitialLoadingComplete(true)}
      />
    );
  }

  // 2. Auth session verification in progress
  if (loading) {
    return <AppLoadingScreen mode="launch" isReady={false} />;
  }

  // 3. First-time creating account / not signed in: Welcome screen + Auth flow
  if (!userId || !profile) {
    return <AuthScreen />;
  }

  // 4. Incomplete profile setup (requires name and optional avatar)
  if (!profile.name && !setupLoadingComplete) {
    return <ProfileSetup onComplete={() => setIsFinishingSetup(true)} />;
  }

  // 5. Finishing account creation loading page transition
  if (isFinishingSetup && !setupLoadingComplete) {
    return (
      <AppLoadingScreen
        mode="setup"
        isReady={true}
        onComplete={() => {
          setIsFinishingSetup(false);
          setSetupLoadingComplete(true);
        }}
      />
    );
  }

  // 6. Just signed in with existing account loading transition
  if (justSignedIn && !signInLoadingComplete) {
    return (
      <AppLoadingScreen
        mode="launch"
        isReady={true}
        customTitle="Welcome Back"
        onComplete={() => setSignInLoadingComplete(true)}
      />
    );
  }

  // 7. Normal app usage
  return <>{children}</>;
}


function App() {
  const { signOut } = useAuth();
  const [previewLoading, setPreviewLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      return hash === '#preview-loading' || params.get('preview') === 'loading';
    }
    return false;
  });

  const [view, setView] = useState<View>(() => {
    if (isNative()) return 'app'; // the Android app skips the marketing page
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash === '#app' || params.get('view') === 'app') {
        return 'app';
      }
    }
    return 'landing';
  });

  const [screen, setScreen] = useState<Screen>('chats');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isNarrowViewport, setIsNarrowViewport] = useState(() => window.innerWidth < 768);
  const isMobileLayout = isNative() || isNarrowViewport;

  useEffect(() => {
    const onResize = () => setIsNarrowViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const handleHash = () => {
      if (isNative()) return;
      if (window.location.hash === '#preview-loading') {
        setPreviewLoading(true);
      } else if (window.location.hash === '#app') {
        setPreviewLoading(false);
        setView('app');
      } else if (window.location.hash === '' || window.location.hash === '#top') {
        setPreviewLoading(false);
        setView('landing');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const openApp = () => {
    window.location.hash = 'app';
    setView('app');
    setScreen('chats');
    setActiveChat(null);
  };

  const backToLanding = () => {
    window.location.hash = '';
    setPreviewLoading(false);
    if (!isNative()) setView('landing');
  };

  const logout = async () => {
    await unregisterPush();
    await signOut();
    setActiveChat(null);
    backToLanding();
  };

  if (previewLoading) {
    return <AppLoadingScreenPreview onClose={backToLanding} />;
  }

  if (view === 'landing') {
    return <LandingPage onDownload={openApp} />;
  }

  return (
    <AuthGate>
    <CallProvider>
    <div className={`min-h-screen flex items-center justify-center relative ${isMobileLayout ? 'bg-paper p-0' : 'bg-paper-deep p-6'}`}>
      {!isMobileLayout && <div className="absolute top-4 left-6 right-6 flex items-center z-50">
        <button
          onClick={backToLanding}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-brand-50 text-ink-mute hover:text-ink transition-colors text-xs font-semibold border border-paper-line shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to landing page</span>
        </button>
      </div>}

      {/* App Container */}
      <div
        className={`relative w-full overflow-hidden bg-paper ${
          isMobileLayout ? 'h-dvh' : 'mt-12 h-[calc(100vh-76px)] max-w-[1360px] rounded-2xl border border-paper-line shadow-2xl'
        }`}
      >
        <MobileApp
          screen={screen}
          setScreen={setScreen}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          onLogout={logout}
          isDesktopView={!isMobileLayout}
        />
      </div>
    </div>
    </CallProvider>
    </AuthGate>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
