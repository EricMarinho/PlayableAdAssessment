import "./style.css";

type GamePhase = "start" | "playing";

const GameConfig = {
  DURATION_MS: 30000,
  MAX_TAPS: 50,
  TICK_MS: 120,
} as const;

type GameState = {
  phase: GamePhase;
  taps: number;
  remainingMs: number;
  lastTick: number;
  timerId: number | null;
  isPaused: boolean;
};

type TapPayload = {
  taps: number;
  x: number;
  y: number;
};

let state: GameState = {
  phase: "start",
  taps: 0,
  remainingMs: GameConfig.DURATION_MS,
  lastTick: 0,
  timerId: null,
  isPaused: false,
};

let initialized = false;
let lastPointerMs = 0;

function sizeCanvas(): void {
  const canvas = document.getElementById("fx-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function updateHud(): void {
  const timerEl = document.getElementById("timer");
  const tapCountEl = document.getElementById("tap-count");
  const progress = document.getElementById("progress");
  const progressFill = document.getElementById("progress-fill") as HTMLElement | null;

  if (timerEl) {
    const secs = Math.ceil(state.remainingMs / 1000);
    const display = Math.max(0, secs);
    timerEl.textContent = `${display}s`;
  }
  if (tapCountEl) {
    tapCountEl.textContent = String(state.taps);
  }
  if (progressFill) {
    const pct = Math.min(state.taps / GameConfig.MAX_TAPS, 1) * 100;
    progressFill.style.width = `${pct}%`;
  }
  if (progress) {
    progress.setAttribute("aria-valuenow", String(Math.min(state.taps, GameConfig.MAX_TAPS)));
  }
}

function tick(): void {
  const now = performance.now();
  const delta = now - state.lastTick;
  state.lastTick = now;
  state.remainingMs = Math.max(0, state.remainingMs - delta);
  if (state.remainingMs <= 0) {
    state.remainingMs = 0;
    stopTimer();
  }
  updateHud();
}

function startTimer(): void {
  stopTimer();
  state.lastTick = performance.now();
  state.timerId = window.setInterval(tick, GameConfig.TICK_MS);
}

function stopTimer(): void {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function pauseTimer(): void {
  if (state.phase !== "playing") return;
  if (state.isPaused) return;
  if (state.timerId === null) return;
  const now = performance.now();
  const delta = now - state.lastTick;
  state.remainingMs = Math.max(0, state.remainingMs - delta);
  stopTimer();
  state.isPaused = true;
  updateHud();
}

function resumeTimer(): void {
  if (state.phase !== "playing") return;
  if (!state.isPaused) return;
  if (state.remainingMs <= 0) return;
  state.isPaused = false;
  state.lastTick = performance.now();
  state.timerId = window.setInterval(tick, GameConfig.TICK_MS);
}

function handleVisibilityChange(): void {
  if (document.hidden) {
    pauseTimer();
  } else {
    resumeTimer();
  }
}

function handleResize(): void {
  sizeCanvas();
  console.log(`resize: ${window.innerWidth} x ${window.innerHeight}`);
}

function handleFoxTap(x: number, y: number): void {
  if (state.phase !== "playing") return;
  if (state.remainingMs <= 0) return;
  state.taps = Math.min(state.taps + 1, GameConfig.MAX_TAPS);

  updateHud();

  const foxBtn = document.getElementById("fox-btn") as HTMLElement | null;
  if (foxBtn) {
    foxBtn.classList.remove("is-squishing");
    void foxBtn.offsetWidth;
    foxBtn.classList.add("is-squishing");
  }

  const payload: TapPayload = { taps: state.taps, x, y };
  window.dispatchEvent(new CustomEvent<TapPayload>("scrambly:tap", { detail: payload }));
}

function handleFoxPointerDown(e: PointerEvent): void {
  if (e.cancelable) e.preventDefault();
  lastPointerMs = Date.now();
  handleFoxTap(e.clientX, e.clientY);
}

function handleFoxClick(e: MouseEvent): void {
  // Fallback for environments without pointer events; suppress double-count if pointerdown already handled
  if (Date.now() - lastPointerMs < 500) return;
  handleFoxTap(e.clientX, e.clientY);
}

function handleStartClick(): void {
  if (state.phase !== "start") return;
  state.phase = "playing";
  state.taps = 0;
  state.remainingMs = GameConfig.DURATION_MS;
  state.isPaused = false;
  const overlay = document.getElementById("start-screen") as HTMLElement | null;
  if (overlay) overlay.style.display = "none";
  updateHud();
  startTimer();
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
  const foxBtn = document.getElementById("fox-btn") as HTMLButtonElement | null;

  sizeCanvas();
  updateHud();

  if (startBtn) {
    startBtn.removeEventListener("click", handleStartClick);
    startBtn.addEventListener("click", handleStartClick);
  }

  if (foxBtn) {
    foxBtn.removeEventListener("pointerdown", handleFoxPointerDown);
    foxBtn.addEventListener("pointerdown", handleFoxPointerDown);
    foxBtn.removeEventListener("click", handleFoxClick);
    foxBtn.addEventListener("click", handleFoxClick);
  }

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
