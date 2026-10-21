import React from 'react';

interface DancingCouplesBackgroundProps {
  isPlaying?: boolean;
  className?: string;
  variant?: 'ambient' | 'stage';
}

/**
 * DancingCouplesBackground
 *
 * Renders an animated scene of two characters dancing together to the welcome soundtrack.
 * Supports:
 * - variant="ambient": Soft ambient background behind cards
 * - variant="stage": Full, vibrant front-and-center centerpiece for loading screen
 */
export function DancingCouplesBackground({
  isPlaying = true,
  className = '',
  variant = 'ambient',
}: DancingCouplesBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden select-none z-0 ${className}`}
    >
      <style>{`
        @keyframes coupleBounceSway {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          25% {
            transform: translate3d(-6px, -5px, 0) rotate(-2.5deg);
          }
          50% {
            transform: translate3d(0, -1px, 0) rotate(0deg);
          }
          75% {
            transform: translate3d(6px, -5px, 0) rotate(2.5deg);
          }
        }

        @keyframes dancerLeftTorso {
          0%, 100% {
            transform: rotate(0deg) skewX(0deg);
          }
          25% {
            transform: rotate(-3deg) skewX(-2deg);
          }
          50% {
            transform: rotate(0deg) skewX(0deg);
          }
          75% {
            transform: rotate(2deg) skewX(1deg);
          }
        }

        @keyframes dancerRightTorso {
          0%, 100% {
            transform: rotate(0deg) skewX(0deg);
          }
          25% {
            transform: rotate(2deg) skewX(2deg);
          }
          50% {
            transform: rotate(0deg) skewX(0deg);
          }
          75% {
            transform: rotate(-3deg) skewX(-2deg);
          }
        }

        @keyframes skirtFlow {
          0%, 100% {
            transform: scaleX(1) skewX(0deg);
          }
          25% {
            transform: scaleX(1.08) skewX(-6deg) translateX(-3px);
          }
          50% {
            transform: scaleX(1.02) skewX(1deg);
          }
          75% {
            transform: scaleX(1.09) skewX(6deg) translateX(3px);
          }
        }

        @keyframes armLeadSwing {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(6deg);
          }
        }

        @keyframes armFollowSwing {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(5deg);
          }
          75% {
            transform: rotate(-6deg);
          }
        }

        @keyframes danceStepLeft {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-4px) rotate(-4deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(0) rotate(1deg);
          }
        }

        @keyframes danceStepRight {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(0) rotate(1deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(-4px) rotate(4deg);
          }
        }

        @keyframes headGroove {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-2px) rotate(-3deg);
          }
          50% {
            transform: translateY(1px) rotate(0deg);
          }
          75% {
            transform: translateY(-2px) rotate(3deg);
          }
        }

        @keyframes floorRipple {
          0% {
            transform: scale(0.7);
            opacity: 0.6;
          }
          50% {
            opacity: 0.35;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @keyframes shadowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.28;
          }
          25%, 75% {
            transform: scale(0.92);
            opacity: 0.18;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.32;
          }
        }

        @keyframes noteFloatUp1 {
          0% {
            transform: translate3d(0, 0, 0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          80% {
            opacity: 0.8;
          }
          100% {
            transform: translate3d(-35px, -140px, 0) scale(1.15) rotate(-20deg);
            opacity: 0;
          }
        }

        @keyframes noteFloatUp2 {
          0% {
            transform: translate3d(0, 0, 0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          25% {
            opacity: 0.95;
          }
          75% {
            opacity: 0.85;
          }
          100% {
            transform: translate3d(40px, -155px, 0) scale(1.2) rotate(25deg);
            opacity: 0;
          }
        }

        @keyframes noteFloatUp3 {
          0% {
            transform: translate3d(0, 0, 0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          30% {
            opacity: 0.85;
          }
          85% {
            opacity: 0.7;
          }
          100% {
            transform: translate3d(-15px, -165px, 0) scale(1.1) rotate(15deg);
            opacity: 0;
          }
        }

        @keyframes noteFloatUp4 {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          80% {
            opacity: 0.8;
          }
          100% {
            transform: translate3d(25px, -135px, 0) scale(1.1) rotate(-15deg);
            opacity: 0;
          }
        }

        @keyframes sparkleTwinkle {
          0%, 100% {
            transform: scale(0.4) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(45deg);
            opacity: 0.85;
          }
        }

        .animate-couple-dance {
          animation: coupleBounceSway 1.05s ease-in-out infinite;
          transform-origin: 50% 95%;
        }

        .animate-couple-idle {
          animation: coupleBounceSway 2.4s ease-in-out infinite;
          transform-origin: 50% 95%;
        }

        .animate-dancer-lead-torso {
          animation: dancerLeftTorso 1.05s ease-in-out infinite;
          transform-origin: 100px 140px;
        }

        .animate-dancer-follow-torso {
          animation: dancerRightTorso 1.05s ease-in-out infinite;
          transform-origin: 160px 140px;
        }

        .animate-skirt {
          animation: skirtFlow 1.05s ease-in-out infinite;
          transform-origin: 160px 150px;
        }

        .animate-arm-lead {
          animation: armLeadSwing 1.05s ease-in-out infinite;
          transform-origin: 88px 105px;
        }

        .animate-arm-follow {
          animation: armFollowSwing 1.05s ease-in-out infinite;
          transform-origin: 172px 105px;
        }

        .animate-step-lead {
          animation: danceStepLeft 1.05s ease-in-out infinite;
          transform-origin: 90px 175px;
        }

        .animate-step-follow {
          animation: danceStepRight 1.05s ease-in-out infinite;
          transform-origin: 165px 175px;
        }

        .animate-head-groove {
          animation: headGroove 1.05s ease-in-out infinite;
          transform-origin: 50% 50%;
        }

        .animate-floor-ripple-1 {
          animation: floorRipple 2.1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
          transform-origin: 130px 240px;
        }

        .animate-floor-ripple-2 {
          animation: floorRipple 2.1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
          animation-delay: 1.05s;
          transform-origin: 130px 240px;
        }

        .animate-shadow-pulse {
          animation: shadowPulse 1.05s ease-in-out infinite;
          transform-origin: 130px 242px;
        }

        .animate-note-1 {
          animation: noteFloatUp1 2.2s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          animation-delay: 0.1s;
        }

        .animate-note-2 {
          animation: noteFloatUp2 2.6s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          animation-delay: 0.7s;
        }

        .animate-note-3 {
          animation: noteFloatUp3 2.4s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          animation-delay: 1.3s;
        }

        .animate-note-4 {
          animation: noteFloatUp4 2.5s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          animation-delay: 1.9s;
        }

        .animate-sparkle-1 {
          animation: sparkleTwinkle 1.8s ease-in-out infinite;
          animation-delay: 0.2s;
        }

        .animate-sparkle-2 {
          animation: sparkleTwinkle 2.1s ease-in-out infinite;
          animation-delay: 0.9s;
        }

        .animate-sparkle-3 {
          animation: sparkleTwinkle 1.9s ease-in-out infinite;
          animation-delay: 1.4s;
        }
      `}</style>

      {/* Ambient background glow orbs */}
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-brand-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-emerald-400/18 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-200/25 blur-3xl pointer-events-none" />

      {/* Floating ambient musical notes across the wider background (Desktop & Mobile) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Mobile & Desktop Top Left Note */}
        <div
          className={`absolute left-[6%] md:left-[8%] top-[12%] text-brand-600/70 md:text-brand-600/85 transition-opacity duration-700 ${
            isPlaying ? 'opacity-100 animate-note-1' : 'opacity-40'
          }`}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>

        {/* Mobile & Desktop Top Right Note */}
        <div
          className={`absolute right-[8%] md:right-[10%] top-[14%] text-emerald-600/75 md:text-emerald-600/90 transition-opacity duration-700 ${
            isPlaying ? 'opacity-100 animate-note-2' : 'opacity-45'
          }`}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          </svg>
        </div>

        {/* Desktop Mid Left Note */}
        <div
          className={`hidden md:block absolute left-[10%] top-[46%] text-emerald-600/65 transition-opacity duration-700 ${
            isPlaying ? 'opacity-100 animate-note-3' : 'opacity-35'
          }`}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm">
            <path d="M12 2l8-1v3l-8 1v8.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V4.5l6-.75v6.8c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V2z" />
          </svg>
        </div>

        {/* Mobile & Desktop Bottom Left Note */}
        <div
          className={`absolute left-[8%] md:left-[12%] bottom-[14%] text-brand-700/60 md:text-brand-700/75 transition-opacity duration-700 ${
            isPlaying ? 'opacity-100 animate-note-4' : 'opacity-30'
          }`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>

        {/* Ambient Mid Top Note */}
        <div
          className={`absolute left-[48%] top-[6%] text-brand-600/60 transition-opacity duration-700 ${
            isPlaying ? 'opacity-100 animate-note-1' : 'opacity-30'
          }`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V3h2z" />
          </svg>
        </div>
      </div>

      {/* =====================================================================
          MAIN DANCING COUPLE STAGE
          - High visibility on BOTH phone and desktop
          - Phone: Centered in the middle zone with 100% opacity
          - Desktop: Positioned directly in the right background canvas shown in user screenshot
          ===================================================================== */}
      <div
        className={
          variant === 'stage'
            ? 'absolute inset-0 flex items-center justify-center pointer-events-none p-4 md:p-8'
            : 'absolute inset-0 flex items-center justify-center md:items-start md:justify-end md:pt-28 lg:pt-32 pointer-events-none p-4 md:pr-4 lg:pr-10 xl:pr-16'
        }
      >
        {/* Dancer Stage Wrapper: 100% full opacity, explicit square dimensions */}
        <div
          className={`relative transition-all duration-700 aspect-square ${
            variant === 'stage'
              ? isPlaying
                ? 'opacity-100 scale-100 w-[300px] h-[300px] md:w-[440px] md:h-[440px]'
                : 'opacity-90 scale-95 w-[300px] h-[300px] md:w-[440px] md:h-[440px]'
              : isPlaying
              ? 'opacity-100 scale-100 w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] md:w-[280px] md:h-[280px] lg:w-[340px] lg:h-[340px] xl:w-[390px] xl:h-[390px] drop-shadow-xl'
              : 'opacity-90 scale-95 w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] md:w-[280px] md:h-[280px] lg:w-[340px] lg:h-[340px] xl:w-[390px] xl:h-[390px]'
          }`}
        >
          <svg
            viewBox="0 0 260 260"
            className="w-full h-full aspect-square overflow-visible"
            fill="none"
            role="img"
            aria-label="Two dancers dancing to welcome music"
          >
            <defs>
              {/* Floor spotlight glow gradient */}
              <radialGradient id="floorSpotlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0F8A5F" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#10A37F" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0F8A5F" stopOpacity="0" />
              </radialGradient>

              {/* Dancer 1 (Lead) Jacket Gradient */}
              <linearGradient id="leadJacket" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F8A5F" />
                <stop offset="100%" stopColor="#0B6B4A" />
              </linearGradient>

              {/* Dancer 2 (Follow) Dress Gradient */}
              <linearGradient id="followDress" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10A37F" />
                <stop offset="50%" stopColor="#0F8A5F" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* Gold / Mint Musical Note Glow */}
              <linearGradient id="noteGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0F8A5F" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>

            {/* 1. Dance Floor Spotlight & Animated Sound Ripples */}
            <g id="dance-floor">
              {/* Sound ripple wave 1 */}
              <ellipse
                cx="130"
                cy="240"
                rx="70"
                ry="18"
                fill="none"
                stroke="#0F8A5F"
                strokeWidth="1.5"
                className={isPlaying ? 'animate-floor-ripple-1' : ''}
              />
              {/* Sound ripple wave 2 */}
              <ellipse
                cx="130"
                cy="240"
                rx="70"
                ry="18"
                fill="none"
                stroke="#10A37F"
                strokeWidth="1.2"
                className={isPlaying ? 'animate-floor-ripple-2' : ''}
              />

              {/* Floor ambient radial glow */}
              <ellipse
                cx="130"
                cy="240"
                rx="85"
                ry="22"
                fill="url(#floorSpotlight)"
              />

              {/* Dynamic Ground Shadow */}
              <ellipse
                cx="130"
                cy="242"
                rx="58"
                ry="12"
                fill="#0F3826"
                className={isPlaying ? 'animate-shadow-pulse' : ''}
              />
            </g>

            {/* 2. Floating Musical Notes Rising from Dancers */}
            <g id="floating-notes" fill="url(#noteGlow)">
              {/* Note 1 (Eighth Note ♪) rising top-left */}
              <g
                transform="translate(85, 95)"
                className={isPlaying ? 'animate-note-1' : 'opacity-0'}
              >
                <path d="M10 2v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V6h4V2h-6z" />
              </g>

              {/* Note 2 (Beamed Note ♫) rising top-right */}
              <g
                transform="translate(170, 85)"
                className={isPlaying ? 'animate-note-2' : 'opacity-0'}
              >
                <path d="M12 2l8-1v3l-8 1v8.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V4.5l6-.75v6.8c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V2z" />
              </g>

              {/* Note 3 (Quarter Note ♩) rising center */}
              <g
                transform="translate(125, 75)"
                className={isPlaying ? 'animate-note-3' : 'opacity-0'}
              >
                <path d="M9 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V3h2z" />
              </g>

              {/* Note 4 (Clef / Double Note ♬) rising side */}
              <g
                transform="translate(145, 110)"
                className={isPlaying ? 'animate-note-4' : 'opacity-0'}
              >
                <path d="M10 2v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V6h4V2h-6z" />
              </g>
            </g>

            {/* 3. Ambient Twinkling Sparkles (✦) */}
            <g id="sparkles" fill="#10A37F">
              <path
                d="M55 90 Q55 98 47 98 Q55 98 55 106 Q55 98 63 98 Q55 98 55 90 Z"
                className={isPlaying ? 'animate-sparkle-1' : 'opacity-0'}
              />
              <path
                d="M205 85 Q205 92 198 92 Q205 92 205 99 Q205 92 212 92 Q205 92 205 85 Z"
                className={isPlaying ? 'animate-sparkle-2' : 'opacity-0'}
              />
              <path
                d="M130 35 Q130 43 122 43 Q130 43 130 51 Q130 43 138 43 Q130 43 130 35 Z"
                className={isPlaying ? 'animate-sparkle-3' : 'opacity-0'}
              />
            </g>

            {/* 4. THE DANCING COUPLE (Animated Vector Group) */}
            <g
              id="dancing-couple-group"
              className={isPlaying ? 'animate-couple-dance' : 'animate-couple-idle'}
            >
              {/* =========================================================
                  DANCER 1 (Left - Lead Partner):
                  Jacket, stylish posture, hand linked with partner
                  ========================================================= */}
              <g id="dancer-lead">
                {/* Left Dancer Legs & Dance Steps */}
                <g id="lead-legs" className={isPlaying ? 'animate-step-lead' : ''}>
                  {/* Left Leg (Back) */}
                  <path
                    d="M90 168 L82 215 L74 238 L84 240 L94 218 L99 168 Z"
                    fill="#1F2937"
                  />
                  {/* Left Shoe */}
                  <path
                    d="M72 237 C70 238 68 240 70 242 C73 244 85 244 87 241 L84 237 Z"
                    fill="#0F8A5F"
                  />

                  {/* Right Leg (Front - Stepping towards partner) */}
                  <path
                    d="M102 168 L108 214 L118 238 L128 237 L119 214 L111 168 Z"
                    fill="#111827"
                  />
                  {/* Right Shoe */}
                  <path
                    d="M117 236 C117 241 129 243 133 241 C134 239 131 237 127 236 Z"
                    fill="#0F8A5F"
                  />
                </g>

                {/* Left Dancer Torso & Jacket */}
                <g id="lead-torso" className={isPlaying ? 'animate-dancer-lead-torso' : ''}>
                  {/* Crisp Shirt Collar & Tie */}
                  <path d="M96 102 L105 116 L108 102 Z" fill="#DDF3E8" />
                  <path d="M102 110 L104 128 L101 130 Z" fill="#047857" />

                  {/* Jacket Body */}
                  <path
                    d="M86 106 C86 106 100 102 112 106 C116 116 117 142 114 172 L88 172 C84 142 84 116 86 106 Z"
                    fill="url(#leadJacket)"
                  />
                  {/* Jacket Lapel Detail */}
                  <path
                    d="M93 105 L101 138 L107 104"
                    stroke="#DDF3E8"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />

                  {/* Back Left Arm (Holding Partner's Waist/Hand) */}
                  <path
                    d="M110 114 C122 118 136 122 148 126"
                    stroke="#0B6B4A"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  {/* Hand around waist */}
                  <circle cx="148" cy="126" r="4.5" fill="#F3C5A8" />

                  {/* Lead Head & Face */}
                  <g id="lead-head" className={isPlaying ? 'animate-head-groove' : ''}>
                    {/* Neck */}
                    <rect x="94" y="93" width="9" height="11" rx="3" fill="#F3C5A8" />
                    {/* Head */}
                    <circle cx="98" cy="84" r="13" fill="#F3C5A8" />
                    {/* Stylish Hair */}
                    <path
                      d="M87 84 C86 72 96 68 106 70 C112 71 113 77 113 81 C109 80 104 77 98 78 C94 79 91 82 87 84 Z"
                      fill="#1E1E1E"
                    />
                    {/* Joyful Closed Dancing Eye (Smiling curve) */}
                    <path
                      d="M99 83 C101 85 104 85 106 83"
                      stroke="#4B5563"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    {/* Happy Dance Smile */}
                    <path
                      d="M102 89 C104 91 107 91 108 89"
                      stroke="#C2410C"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Left Arm extended outward to clasp partner's hand */}
                  <g id="lead-arm-front" className={isPlaying ? 'animate-arm-lead' : ''}>
                    <path
                      d="M86 108 C78 116 76 126 84 138 C90 144 104 146 120 144"
                      stroke="url(#leadJacket)"
                      strokeWidth="6.5"
                      strokeLinecap="round"
                    />
                    {/* Lead front hand */}
                    <circle cx="120" cy="144" r="4.5" fill="#F3C5A8" />
                  </g>
                </g>
              </g>

              {/* =========================================================
                  DANCER 2 (Right - Follow Partner):
                  Emerald swishing dress, graceful arm, twirling with lead
                  ========================================================= */}
              <g id="dancer-follow">
                {/* Follow Dancer Legs */}
                <g id="follow-legs" className={isPlaying ? 'animate-step-follow' : ''}>
                  {/* Left Leg */}
                  <path
                    d="M148 185 L144 218 L142 238 L149 239 L154 218 L154 185 Z"
                    fill="#F3C5A8"
                  />
                  {/* Left Dancing Heel */}
                  <path
                    d="M140 237 C141 239 146 242 151 240 L153 237 Z"
                    fill="#0F8A5F"
                  />

                  {/* Right Leg (Kicking / stepping gracefully) */}
                  <path
                    d="M165 185 L172 216 L181 236 L189 234 L179 214 L171 185 Z"
                    fill="#F3C5A8"
                  />
                  {/* Right Dancing Heel */}
                  <path
                    d="M181 235 C183 238 189 238 192 235 L189 233 Z"
                    fill="#0F8A5F"
                  />
                </g>

                {/* Follow Dress & Swishing Skirt */}
                <g id="follow-skirt" className={isPlaying ? 'animate-skirt' : ''}>
                  <path
                    d="M145 142 C145 142 158 138 174 142 C184 154 200 180 196 195 C190 200 134 200 126 194 C124 178 138 152 145 142 Z"
                    fill="url(#followDress)"
                  />
                  {/* Dress Swirl Pleat Accents */}
                  <path
                    d="M142 155 Q152 178 140 195"
                    stroke="#DDF3E8"
                    strokeWidth="1.2"
                    strokeOpacity="0.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M160 148 Q172 174 170 196"
                    stroke="#DDF3E8"
                    strokeWidth="1.2"
                    strokeOpacity="0.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M174 152 Q185 174 188 193"
                    stroke="#34D399"
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                    strokeLinecap="round"
                  />
                </g>

                {/* Follow Dancer Torso & Bodice */}
                <g id="follow-torso" className={isPlaying ? 'animate-dancer-follow-torso' : ''}>
                  {/* Dress Bodice */}
                  <path
                    d="M148 108 C148 108 160 106 172 108 C175 116 176 132 174 144 C162 146 154 146 145 144 C144 132 145 116 148 108 Z"
                    fill="url(#followDress)"
                  />
                  {/* Sweetheart Neckline Detail */}
                  <path
                    d="M149 110 C154 114 165 114 171 110"
                    stroke="#DDF3E8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />

                  {/* Follow Head & Hair */}
                  <g id="follow-head" className={isPlaying ? 'animate-head-groove' : ''}>
                    {/* Graceful Neck */}
                    <rect x="157" y="93" width="8" height="12" rx="3" fill="#F3C5A8" />
                    {/* Head */}
                    <circle cx="161" cy="84" r="12" fill="#F3C5A8" />
                    {/* Flowing Dancing Hair with Bun & Bangs */}
                    <path
                      d="M152 82 C150 71 162 66 172 69 C177 71 179 78 178 84 C175 83 170 80 164 80 C159 80 156 82 152 82 Z"
                      fill="#374151"
                    />
                    {/* Hair Bun / Swirl */}
                    <circle cx="174" cy="74" r="7.5" fill="#374151" />
                    {/* Hair Blossom Flower */}
                    <circle cx="171" cy="71" r="3.5" fill="#10A37F" />
                    <circle cx="171" cy="71" r="1.5" fill="#DDF3E8" />
                    {/* Joyful Closed Dancing Eye */}
                    <path
                      d="M155 83 C157 85 160 85 162 83"
                      stroke="#4B5563"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    {/* Happy Smile */}
                    <path
                      d="M156 88 C158 90 161 90 163 88"
                      stroke="#C2410C"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Follow Arm 1 (Placed joyfully on Lead's shoulder) */}
                  <path
                    d="M150 110 C140 112 128 112 116 112"
                    stroke="#F3C5A8"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                  />
                  {/* Hand on shoulder */}
                  <circle cx="116" cy="112" r="4" fill="#F3C5A8" />

                  {/* Follow Arm 2 (Clasped with Lead's hand in dance hold) */}
                  <g id="follow-arm-hand" className={isPlaying ? 'animate-arm-follow' : ''}>
                    <path
                      d="M170 112 C168 126 150 142 124 144"
                      stroke="#F3C5A8"
                      strokeWidth="5.5"
                      strokeLinecap="round"
                    />
                    {/* Hands clasped together in harmony */}
                    <circle cx="122" cy="144" r="4.5" fill="#F3C5A8" />
                    <circle cx="121" cy="143" r="2" fill="#0F8A5F" />
                  </g>
                </g>
              </g>

              {/* Heart floating between them */}
              <g
                transform="translate(125, 96)"
                className={isPlaying ? 'animate-sparkle-1' : 'opacity-0'}
              >
                <path
                  d="M10 3.25c-1.5-2.25-4.5-2.25-6 0-1.5 2.25 0 5 6 9 6-4 7.5-6.75 6-9-1.5-2.25-4.5-2.25-6 0z"
                  fill="#0F8A5F"
                  opacity="0.85"
                />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default DancingCouplesBackground;
