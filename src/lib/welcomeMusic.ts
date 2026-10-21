/**
 * Chatimall Welcome Soundtrack Player ("Carefree" - Joyful Acoustic "Beautiful Day" Theme)
 * 
 * Plays Kevin MacLeod's world-famous cheerful acoustic guitar, ukulele & whistle song:
 * - Cheerful, sunny "It's a beautiful day" vibe
 * - Dual format support (/audio/welcome.mp3 and /audio/welcome.ogg)
 * - Auto-resumes smoothly on user gesture
 * - Continuous seamless loop
 * - Smooth fade-out when transitioning to auth
 */

export interface WelcomeMusicController {
  stop: () => void;
  resume: () => void;
  isPlaying: () => boolean;
}

let sharedAudio: HTMLAudioElement | null = null;
let sharedListeners: Set<(playing: boolean) => void> = new Set();
let isSharedStopped = false;
let fadeInterval: ReturnType<typeof setInterval> | null = null;

export function startWelcomeMusic(
  onStateChange?: (isPlaying: boolean) => void
): WelcomeMusicController {
  if (onStateChange) {
    sharedListeners.add(onStateChange);
  }

  const notifyAll = (playing: boolean) => {
    sharedListeners.forEach((cb) => {
      try {
        cb(playing);
      } catch {
        // ignore
      }
    });
  };

  // Cancel any pending fade-out interval immediately
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  isSharedStopped = false;

  if (sharedAudio) {
    sharedAudio.volume = 0.38;
    if (sharedAudio.paused) {
      sharedAudio.play().then(() => notifyAll(true)).catch(() => notifyAll(false));
    } else {
      notifyAll(true);
    }

    return {
      stop: () => stopSharedAudio(),
      resume: () => {
        if (sharedAudio && !isSharedStopped) {
          sharedAudio.volume = 0.38;
          sharedAudio.play().then(() => notifyAll(true)).catch(() => notifyAll(false));
        }
      },
      isPlaying: () => !isSharedStopped && !!sharedAudio && !sharedAudio.paused,
    };
  }

  try {
    sharedAudio = new Audio();
    // Support universal playback across all mobile & desktop browsers
    if (sharedAudio.canPlayType('audio/mpeg')) {
      sharedAudio.src = '/audio/welcome.mp3';
    } else {
      sharedAudio.src = '/audio/welcome.ogg';
    }
    sharedAudio.loop = true;
    sharedAudio.preload = 'auto';
    sharedAudio.volume = 0.38; // Clearly audible, cheerful and warm

    sharedAudio.addEventListener('play', () => notifyAll(true));
    sharedAudio.addEventListener('playing', () => notifyAll(true));
    sharedAudio.addEventListener('pause', () => notifyAll(false));
    sharedAudio.addEventListener('ended', () => notifyAll(false));
  } catch {
    return {
      stop: () => {},
      resume: () => {},
      isPlaying: () => false,
    };
  }

  const safePlay = () => {
    if (isSharedStopped || !sharedAudio) return;
    const playPromise = sharedAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => notifyAll(true))
        .catch(() => {
          notifyAll(false);
        });
    }
  };

  // Immediate attempt
  safePlay();

  // Gesture unlockers so the moment the user clicks or taps anywhere, it starts smoothly
  const unlockEvents = ['click', 'pointerdown', 'touchstart', 'keydown'] as const;
  const onUserGesture = () => {
    if (!isSharedStopped && sharedAudio && sharedAudio.paused) {
      safePlay();
    }
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, onUserGesture, { capture: true, passive: true }));

  function stopSharedAudio() {
    if (isSharedStopped) return;
    isSharedStopped = true;
    notifyAll(false);
    unlockEvents.forEach((ev) => window.removeEventListener(ev, onUserGesture, { capture: true }));

    if (!sharedAudio) return;

    // Smooth 400ms fade-out
    try {
      if (fadeInterval) clearInterval(fadeInterval);
      const audioToFade = sharedAudio;
      const step = audioToFade.volume / 10;
      fadeInterval = setInterval(() => {
        if (!audioToFade) {
          if (fadeInterval) clearInterval(fadeInterval);
          return;
        }
        if (audioToFade.volume > step) {
          audioToFade.volume = Math.max(0, audioToFade.volume - step);
        } else {
          audioToFade.volume = 0;
          audioToFade.pause();
          audioToFade.src = '';
          sharedAudio = null;
          sharedListeners.clear();
          if (fadeInterval) clearInterval(fadeInterval);
        }
      }, 40);
    } catch {
      try {
        sharedAudio.pause();
        sharedAudio.src = '';
        sharedAudio = null;
      } catch {
        // ignore
      }
    }
  }

  return {
    stop: stopSharedAudio,
    resume: safePlay,
    isPlaying: () => !isSharedStopped && !!sharedAudio && !sharedAudio.paused,
  };
}
