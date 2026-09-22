# Playable Ad Development Guidelines - Scrambly

## 1. Context & Objective
You are an expert AI Game Developer assisting in the creation of a Web-based Playable Ad for a product called **Scrambly**. 
Scrambly is a rewards platform where people discover mobile games, complete eligible activities, and redeem rewards[cite: 1].
**Goal:** Create a short, fun, and polished web playable (2D or 3D) that connects the gameplay/progress to the concept of earning rewards on Scrambly, ending with a clear Call to Action (CTA)[cite: 1].

## 2. Core Game Rules & Constraints
* **Familiar Mechanic:** Choose a simple, easily understandable casual game mechanic[cite: 1].
* **Purposeful Progression:** The game must have a clear beginning, middle (progress), and ending (win/finish state).
* **Compliance/Messaging:** Keep the product claims accurate[cite: 1]. Any reward balances shown inside the playable are simulated[cite: 1]. Guaranteed income and real payouts are not part of this demo, so avoid real-payout claims[cite: 1].
* **End State (CTA):** The game must end with a clearly labeled button inviting the player to explore Scrambly.

## 3. Visual Direction & Assets
* **Mood:** Warm, expressive, and approachable with rounded forms.
* **Mascot Asset (`scrambly-fox-reference.webp`):** A supplied raster image (294 × 320 pixels) is available in the root folder[cite: 1]. It features an orange fox holding a purple gaming controller with orange coins floating around it[cite: 2]. You MUST use this exact file in the UI or gameplay (e.g., as a character, guide, or end-screen mascot). Note that this is a raster reference; there is no rigged 3D model provided[cite: 1].
* **Color Palette:** This is a suggested working palette based on advertiser materials, not an official brand standard[cite: 1, 3]:
  * Orange: `#F58324`[cite: 3]
  * Purple: `#7845D8`[cite: 3]
  * Deep Ink: `#201338`[cite: 3]
  * Warm White: `#FFF6E8`[cite: 3]

## 4. Strict Technical Requirements
**Architecture & Files:**
* Single root `index.html` file (after build).
* Total build size must be under 5 MB (optimize images/sounds).
* **Zero External Requests:** Must run entirely locally from a simple static HTTP server. No external APIs, no CDNs (bundle fonts/libraries locally), no backend, no logins.
* Readable source code.

**Input & Layout:**
* Support both **Mouse** and **Touch** events flawlessly.
* **Scrolling:** Prevent default page scrolling so it doesn't interfere with gameplay (`touch-action: none;`, `preventDefault()` on touch/scroll where applicable).
* **Responsiveness:** Must adapt to mobile sizes. Target testing resolutions: 
  * Portrait: 320x568 and 390x844
  * Landscape: 568x320 and 844x390
* **Orientation:** If the game only supports one orientation (e.g., Portrait), you MUST implement an overlay prompting the user to "Rotate your device" when in the wrong orientation.

**The CTA (Call to Action) Behavior:**
* **Simulated Click:** Do NOT navigate away from the page.
* When the CTA is clicked, display a local UI confirmation message: `"CTA clicked — demo only"`.
* Log the click explicitly in the browser console: `console.log("CTA clicked");`.

**Visibility & Page State (CRITICAL):**
* Use the **Page Visibility API** (`document.addEventListener("visibilitychange", ...)`).
* If the user switches tabs or minimizes the browser:
  1. Pause the main gameplay loop.
  2. Pause any timers/clocks (resume without time jumps when they return).
  3. Mute/Pause all audio.

**Audio (If used):**
* Browsers block autoplay. Audio MUST only start **after** the first user interaction (click/touch).
* You must provide a visible Mute/Unmute toggle button.

**Reliability & Restart:**
* Include a review-friendly "Restart" or "Replay" button after the game ends.
* **Clean Reset:** Restarting must reset all states cleanly. Ensure no duplicate timers, intervals, or event listeners are created. Handle window resizing dynamically.

## 5. Agent Instructions for Code Generation & Tech Stack
**CRITICAL:** We are using **Vite + TypeScript + Vanilla DOM / HTML5 Canvas**. DO NOT use heavy frameworks like Phaser, PixiJS, or Three.js. The goal is a highly modular, strictly typed, and ultra-lightweight zero-dependency architecture that demonstrates fundamental engineering skills.
1. **UI & Layout:** Rely heavily on CSS3 (Flexbox/Grid, transforms, `@keyframes`, custom cubic-bezier easings) to render a responsive, polished, and bouncy UI (buttons, progress bars, mascot display).
2. **Particles/Juice:** Create a completely transparent `<canvas>` layer with `pointer-events: none;` overlaying the DOM. Use the Vanilla Canvas API strictly as a lightweight particle engine to spawn and animate floating/bouncing Scrambly coins (`#F58324`)[cite: 3] whenever the user clicks/taps.
3. **Asset Usage:** Directly reference `./scrambly-fox-reference.webp` in the DOM. Integrate it meaningfully into the scene.
4. **Initialization:** Implement the Window Visibility and Resize listeners early in the base engine structure.
5. **Documentation:** Write clean, descriptive TypeScript interfaces and comments to explain state logic and architecture, satisfying the "readable source" requirement.

## 6. Game Design Document (GDD): "Scrambly Tap & Reward"

**Core Loop:** 
A short, casual clicker where the player taps the Scrambly mascot to simulate earning rewards. It mimics the Scrambly product loop (Play -> Progress -> Earn) directly in the browser.

**Flow & States:**
*   **State 1: Start Screen:** 
    *   A simple overlay with a "Tap to Start" button. This ensures the audio context (if added) is active and the timer starts cleanly upon user intent.
*   **State 2: Active Gameplay:**
    *   **Timer:** A 30-second countdown displayed at the top.
    *   **Progress Bar:** A visual bar (using the `#7845D8` purple) that fills up dynamically as the player taps.
    *   **Interaction:** The central element is the `scrambly-fox-reference.webp` mascot. Every tap/click triggers a CSS squish/bounce animation on the fox to provide satisfying tactile feedback.
    *   **Juice/Feedback:** Every tap spawns 1 to 3 floating orange coins (`#F58324`) on the transparent HTML5 Canvas layer. They float upwards and fade out gracefully.
*   **State 3: Milestones (Progression):**
    *   At 15 taps: Display a brief CSS-animated toast notification: *"Casual Gamer! +10 Demo Coins"*.
    *   At 35 taps: Display a second toast: *"App Explorer! +20 Demo Coins"*.
*   **State 4: End Game & CTA:**
    *   **Trigger:** The game ends either when the timer hits `0`, OR when the player reaches `50 taps`.
    *   **Action:** Pause all canvas particles, stop timers, and disable input listeners. An end-screen modal slides in.
    *   **End Copy:** *"You earned 50 Scrambly Coins (Demo Balance)! In Scrambly, your playtime turns into real rewards."*
    *   **Buttons:** 
        1.  **"Explore Scrambly" (Primary CTA):** Triggers the simulated click behavior (logging to console + UI confirmation).
        2.  **"Play Again" (Secondary):** Cleanly resets the score, timer, particles, and UI back to State 2.

## 7. Initialization & Git Workflow (CRITICAL)

**Step 1: Project Initialization**
If not already done, execute the following commands to initialize the project:
```bash
npm create vite@latest scrambly-playable -- --template vanilla-ts
cd scrambly-playable
npm install

**Step 2: Commit Standards (Conventional Commits)**
You MUST use Conventional Commits for all actions (feat:, fix:, chore:, style:, refactor:).

First Commit: Once initialized and cleared, immediately commit the base state as: chore: initial Vite setup and clean boilerplate.

**Step 3: Atomic Feature Commits**
DO NOT write the entire game in a single massive commit. Create separate, atomic Git commits for each logical milestone. An ideal commit history should look similar to this:

chore: initial Vite setup and clean boilerplate

chore: add scrambly-fox asset and color palette

feat: implement Window Visibility and Resize listeners

feat: create State 1 (Start Screen) and core UI layout

feat: build clicker logic, progress bar, and timer

feat: add HTML5 Canvas particle system for coins

feat: implement milestone toasts and End Game CTA

style: polish CSS animations and responsiveness