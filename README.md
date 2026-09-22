# Scrambly Playable Ad — "Tap & Reward" Demo

A high-performance, vibrant, and interactive playable ad built for **Simula Ad**, adhering to strict size and technical constraints while mirroring official user acquisition (UA) assets.

## 🛠️ Quick Start
```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Generate production build and check size limits
npm run build
```

## 🚀 Tech Stack & Architecture
- **Framework:** Vanilla TypeScript & Vite (Zero heavy runtime overhead).
- **Styling:** Vanilla CSS3 (Custom keyframe animations, Flexbox, GPU-accelerated transforms, and dynamic CSS custom properties).
- **Rendering:** HTML5 Canvas API for performant particle and coin animations.
- **Build Output:** Fully optimized and bundled for static deployment (`dist/`).

## 📋 Compliance & Constraints
- **Playtime Loop:** 30-second countdown timer with a 50-tap win condition.
- **Milestone Feedback:** Dynamic toast notifications triggering at key thresholds (15 and 35 taps).
- **Weight Limit:** Sub-5MB production build with readable source code.
- **Accessibility:** Fully supports `prefers-reduced-motion` and scales cleanly across mobile viewports (320px up to large tablet/desktop frames).
- **Audio Scope:** In accordance with the assessment criteria ("only apply conditional requirements your design uses"), audio elements and mute controls were intentionally omitted to maintain a lightweight codebase and avoid browser autoplay restrictions.

## 🔍 Engineering Audit & Known Edge Cases
During final verification, the following edge cases were cataloged for post-v1 iteration:
- **Landscape Scrolling:** `touch-action: none` locks body scrolling on ultra-compact landscape viewports (e.g., iPhone SE in landscape).
- **Keyboard Navigation:** Space/Enter triggers on the fox asset default to origin coordinates `(0,0)` rather than bounding-box centroids.
- **Viewport Adjustments:** Relies on standard window resize bounds rather than dynamic `visualViewport` API tracking for mobile browser chrome hiding.
- **Canvas Resize Mapping:** `clearRect` references `window.innerWidth/Height` instead of canvas client size, causing active particles to teleport on resize.
- **Hidden Tab State Soft-Lock:** Hiding the window at an exact `0ms` delta can leave the timer interval in a stale state without forcing `endGame`.
- **Toast Timer Leak:** Milestone toast timeouts are untracked, allowing active toasts to bleed ~2 seconds into a newly restarted game session.

# Visual & Engineering Showcase

For a detailed visual breakdown of the art direction transition, UI component hierarchy, and UA marketing asset alignment, please view the external showcase:
👉 [[Scrambly Playable Ad Visual Showcase Link Here](https://canva.link/gtnhz79zi6xcbhx)]