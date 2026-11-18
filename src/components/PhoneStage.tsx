import { Plus, Send } from 'lucide-react';

/**
 * The Chatimall phone mockup. Shared by the landing and download pages so both
 * render the exact same device art from one place.
 */
function PhoneStage() {
  return (
    <div className="pc-phone-stage">
      <div className="pc-orbit-bg"></div>
      {/* Floating ambient glow dots */}
      <div className="pc-glow-dot pc-glow-coral"></div>
      <div className="pc-glow-dot pc-glow-mint"></div>
      <div className="pc-glow-dot pc-glow-yellow"></div>

      <div className="pc-phone">
        {/* Dynamic island pill notch */}
        <div className="pc-phone-notch"></div>

        <div className="pc-phone-top">
          <span className="pc-phone-time">9:41</span>
          <span className="pc-status pc-mono">online</span>
        </div>

        <div className="pc-phone-screen">
          <div className="pc-chat-card-top">
            <div className="pc-chat-title">the gist room</div>
            <div className="pc-chat-members-bar">
              <span className="pc-members-text">4 friends · awake now</span>
              <div className="pc-member-avatars">
                <span className="pc-mini-avatar pc-avatar-coral">M</span>
                <span className="pc-mini-avatar pc-avatar-mint">S</span>
                <span className="pc-mini-avatar pc-avatar-yellow">A</span>
              </div>
            </div>
          </div>

          <div className="pc-pulse-line">
            <span className="pc-pulse-dot"></span>
            conversation is glowing
          </div>

          <div className="pc-bubbles-list">
            <div className="pc-bubble pc-bubble-other">
              I found the tiny cinema you were talking about.
              <span className="bubble-time">Mara · 9:38</span>
            </div>
            <div className="pc-bubble pc-bubble-mine">
              The one with the red seats? Send me the pin.
              <span className="bubble-time">you · 9:39</span>
            </div>
            <div className="pc-bubble pc-bubble-other">
              Already there. It feels like a secret.
              <span className="bubble-time">Mara · 9:40</span>
            </div>
          </div>

          <div className="pc-composer">
            <div className="pc-composer-left">
              <Plus className="w-3.5 h-3.5 text-[#86808b]" />
              <span className="pc-composer-placeholder">Say something...</span>
            </div>
            <div className="pc-composer-send">
              <Send className="w-3 h-3 text-white fill-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhoneStage;
