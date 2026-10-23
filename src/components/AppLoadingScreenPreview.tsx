import { useState } from 'react';
import AppLoadingScreen, { type AppLoadingMode } from './AppLoadingScreen';
import { Play, RotateCcw, Moon, Sun, ShieldCheck, Sparkles, X, CheckCircle2 } from 'lucide-react';

export default function AppLoadingScreenPreview({ onClose }: { onClose?: () => void }) {
  const [mode, setMode] = useState<AppLoadingMode>('launch');
  const [isReady, setIsReady] = useState(true);
  const [renderKey, setRenderKey] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleReplay = (newMode?: AppLoadingMode) => {
    if (newMode) setMode(newMode);
    setCompleted(false);
    setRenderKey((k) => k + 1);
  };

  const handleToggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  return (
    <div className={`relative w-full h-screen overflow-hidden ${isDark ? 'dark bg-[#0D151D]' : 'bg-[#F8FAF8]'}`}>
      {/* Floating Interactive Controls Pill */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/90 dark:bg-[#15202B]/90 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xl transition-all text-xs font-medium text-ink dark:text-white max-w-[95vw]">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleReplay('launch')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              mode === 'launch'
                ? 'bg-brand-600 text-white font-semibold shadow-xs'
                : 'text-ink-mute dark:text-ink-faint hover:text-ink dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Launch Mode</span>
          </button>
          <button
            type="button"
            onClick={() => handleReplay('setup')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              mode === 'setup'
                ? 'bg-brand-600 text-white font-semibold shadow-xs'
                : 'text-ink-mute dark:text-ink-faint hover:text-ink dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup Mode</span>
          </button>
        </div>

        {/* Replay */}
        <button
          type="button"
          onClick={() => handleReplay()}
          className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1.5 transition-colors font-semibold"
          title="Replay animation"
        >
          <RotateCcw className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>Replay</span>
        </button>

        {/* Readiness Simulator */}
        <button
          type="button"
          onClick={() => {
            setIsReady((r) => !r);
            if (!isReady) setCompleted(false);
          }}
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
            !isReady
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold'
              : 'border-transparent bg-black/5 dark:bg-white/5 text-ink-mute dark:text-ink-faint hover:text-ink'
          }`}
          title="Simulate network waiting: holds at 85% until ready"
        >
          <span>{isReady ? 'State: Ready' : 'Holding at 85%...'}</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={handleToggleDark}
          className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Toggle Dark Mode"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-mute" />}
        </button>

        {/* Close Preview */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-colors ml-1"
            title="Close Preview"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Completion Toast Notification */}
      {completed && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-lg animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed! Click "Replay" to watch the flow again.</span>
        </div>
      )}

      {/* Actual AppLoadingScreen Instance */}
      <AppLoadingScreen
        key={renderKey}
        mode={mode}
        isReady={isReady}
        onComplete={() => {
          setCompleted(true);
        }}
      />
    </div>
  );
}
