import { useState, useEffect } from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import LandingPage from '@/components/LandingPage';
import MobileApp from '@/components/MobileApp';
import AdminPanel from '@/components/AdminPanel';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CallProvider } from '@/lib/calls';
import { isNative, unregisterPush } from '@/lib/native';
import { AuthScreen, ProfileSetup, FullScreenSpinner } from '@/components/AuthScreen';
import type { Screen, Chat } from '@/types';

type View = 'landing' | 'app' | 'admin';

const ADMIN_AUTHORIZED_PHONES = ['09121598033', '2349121598033', '+2349121598033'];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { userId, profile, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!userId || !profile) return <AuthScreen />;
  if (!profile.name) return <ProfileSetup />;
  return <>{children}</>;
}

function App() {
  const { userId, profile, signOut } = useAuth();

  const isOwnerAdmin = Boolean(
    profile?.is_admin ||
    (profile?.phone &&
      ADMIN_AUTHORIZED_PHONES.some(
        (p) =>
          p.replace(/\D/g, '') === profile.phone?.replace(/\D/g, '') ||
          (profile.phone?.replace(/\D/g, '').startsWith('234') && p === '0' + profile.phone?.replace(/\D/g, '').slice(3))
      ))
  );

  const [view, setView] = useState<View>(() => {
    if (isNative()) return 'app';
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
      if (window.location.hash === '#admin') {
        if (userId && profile && isOwnerAdmin) {
          setView('admin');
        } else {
          // Strictly reject unauthorized or hacker attempts to navigate to #admin
          window.location.hash = '';
          setView('landing');
        }
      } else if (window.location.hash === '#app') {
        setView('app');
      } else if (window.location.hash === '' || window.location.hash === '#top') {
        setView('landing');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [userId, profile, isOwnerAdmin]);

  const openApp = () => {
    window.location.hash = 'app';
    setView('app');
    setScreen('chats');
    setActiveChat(null);
  };

  const backToLanding = () => {
    window.location.hash = '';
    if (!isNative()) setView('landing');
  };

  const logout = async () => {
    await unregisterPush();
    await signOut();
    setActiveChat(null);
    backToLanding();
  };

  // Strictly protected Admin View
  if (view === 'admin') {
    if (!userId || !profile || !isOwnerAdmin) {
      return (
        <div className="min-h-screen bg-paper-deep text-ink flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-full max-w-md bg-paper p-8 rounded-3xl border border-paper-line shadow-soft flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink mb-2">403 Access Denied</h1>
            <p className="text-xs text-ink-mute max-w-sm mb-6 leading-relaxed">
              This administrative console is cryptographically restricted to verified application owner Praise (09121598033). Unauthorized access attempts are monitored and blocked.
            </p>
            <button
              onClick={backToLanding}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lift transition cursor-pointer"
            >
              Return to App
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-paper-deep text-ink">
        <AdminPanel onBack={backToLanding} />
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage onDownload={openApp} />;
  }

  const isAdminScreen = screen === 'admin';

  return (
    <AuthGate>
      <CallProvider>
        <div
          className={`min-h-screen flex items-center justify-center relative ${
            isAdminScreen
              ? 'bg-paper p-0'
              : isMobileLayout
              ? 'bg-paper p-0'
              : 'bg-paper-deep p-6'
          }`}
        >
          {!isMobileLayout && !isAdminScreen && (
            <div className="absolute top-4 left-6 right-6 flex items-center z-50">
              <button
                onClick={backToLanding}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-brand-50 text-ink-mute hover:text-ink transition-colors text-xs font-semibold border border-paper-line shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to landing page</span>
              </button>
            </div>
          )}

          {/* App Container */}
          <div
            className={`relative w-full overflow-hidden bg-paper ${
              isAdminScreen
                ? 'h-screen max-w-none rounded-none border-0 shadow-none m-0 p-0'
                : isMobileLayout
                ? 'h-dvh'
                : 'mt-12 h-[calc(100vh-76px)] max-w-[1360px] rounded-2xl border border-paper-line shadow-2xl'
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
