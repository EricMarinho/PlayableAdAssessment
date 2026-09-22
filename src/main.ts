import "./style.css";

type GamePhase = "start" | "playing";

let phase: GamePhase = "start";
let initialized = false;

function sizeCanvas(): void {
  const canvas = document.getElementById("fx-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function handleVisibilityChange(): void {
  console.log(`visibilitychange: ${document.visibilityState}`);
}

function handleResize(): void {
  sizeCanvas();
  console.log(`resize: ${window.innerWidth} x ${window.innerHeight}`);
}

function handleStartClick(): void {
  if (phase !== "start") return;
  phase = "playing";
  const overlay = document.getElementById("start-screen") as HTMLElement | null;
  if (overlay) overlay.style.display = "none";
  console.log("game started");
}

function init(): void {
  if (initialized) return;
  // HMR guard: window persists across Vite re-evaluations
  const w = window as unknown as { __scramblyInitialized?: boolean };
  if (w.__scramblyInitialized) return;
  w.__scramblyInitialized = true;
  initialized = true;

  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const overlay = document.getElementById("start-screen");

  if (!startBtn || !overlay) return;

  sizeCanvas();

  // Remove before add to avoid HMR duplication of named handlers
  startBtn.removeEventListener("click", handleStartClick);
  startBtn.addEventListener("click", handleStartClick);

  document.removeEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  window.removeEventListener("resize", handleResize);
  window.addEventListener("resize", handleResize);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
