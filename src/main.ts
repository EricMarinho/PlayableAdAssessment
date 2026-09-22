import "./style.css";

type GamePhase = "start" | "playing" | "ended";

const GameConfig = {
  DURATION_MS: 30000,
  MAX_TAPS: 50,
  TICK_MS: 120,
} as const;

const MILESTONES = [
  { taps: 15, msg: "Casual Gamer! +10 Demo Coins" },
  { taps: 35, msg: "App Explorer! +20 Demo Coins" },
] as const;

const shownMilestones = new Set<number>();

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

type CoinParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  alpha: number;
  wobble: number;
  wobbleSpeed: number;
  kind: "coin" | "spark";
  rot: number;
  rotSpeed: number;
  color: string;
};

const ParticleConfig = {
  MIN_COUNT: 4,
  MAX_COUNT: 7,
  SPARKS_PER_TAP: 8,
  SPARK_MIN_SPEED: 160,
  SPARK_MAX_SPEED: 380,
  MAX_PARTICLES: 240,
  GRAVITY: 820,
  SPARK_GRAVITY: 420,
  DRAG: 0.985,
  COIN_GOLD: "#FFC93C",
  COIN_OUTLINE: "#7A2E0A",
  COIN_ORANGE: "#F58324",
  COIN_PURPLE: "#7845D8",
  SPARK_WARM: "#FFF6E8",
  HIGHLIGHT: "rgba(255, 255, 255, 0.85)",
} as const;

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
let endHideTimeout: number | null = null;

// --- particle FX state ---
let particles: CoinParticle[] = [];
let fxCtx: CanvasRenderingContext2D | null = null;
let rafId: number | null = null;
let lastFrameMs = 0;
let fxPaused = false;

function sizeFxCanvas(): void {
  const canvas = document.getElementById("fx-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = fxCtx ?? (canvas.getContext("2d") as CanvasRenderingContext2D | null);
  if (ctx) {
    if (!fxCtx) fxCtx = ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function sizeCanvas(): void {
  sizeFxCanvas();
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
    updateHud();
    endGame("time");
    return;
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
  if (state.phase === "ended") return;
  if (state.phase !== "playing") return;
  if (!state.isPaused) return;
  if (state.remainingMs <= 0) return;
  state.isPaused = false;
  startTimer();
}

function pauseFx(): void {
  fxPaused = true;
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastFrameMs = 0;
}

function resumeFx(): void {
  if (state.phase === "ended") return;
  fxPaused = false;
  lastFrameMs = 0;
  if (state.phase === "playing" && !document.hidden && particles.length > 0 && rafId === null) {
    rafId = window.requestAnimationFrame(loop);
  }
}

function handleVisibilityChange(): void {
  if (state.phase === "ended") return;
  if (document.hidden) {
    pauseTimer();
    pauseFx();
  } else {
    resumeTimer();
    resumeFx();
  }
}

function handleResize(): void {
  sizeFxCanvas();
  if (import.meta.env.DEV) console.log(`resize: ${window.innerWidth} x ${window.innerHeight}`);
}

function spawnCoins(clientX: number, clientY: number): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.getElementById("fx-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const count =
    ParticleConfig.MIN_COUNT +
    Math.floor(Math.random() * (ParticleConfig.MAX_COUNT - ParticleConfig.MIN_COUNT + 1));
  const clampedCount = Math.max(ParticleConfig.MIN_COUNT, Math.min(count, ParticleConfig.MAX_COUNT));
  for (let i = 0; i < clampedCount; i++) {
    const radius = 6 + Math.random() * 6;
    const life = 700 + Math.random() * 400;
    const p: CoinParticle = {
      x,
      y,
      vx: (Math.random() - 0.5) * 320,
      vy: -(300 + Math.random() * 220),
      radius,
      life,
      maxLife: life,
      alpha: 1,
      wobble: 0.4 + Math.random() * 1.2,
      wobbleSpeed: 2 + Math.random() * 3,
      kind: "coin",
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 16,
      color: ParticleConfig.COIN_GOLD,
    };
    particles.push(p);
  }
  // fast-fading white sparks for impact
  for (let i = 0; i < ParticleConfig.SPARKS_PER_TAP; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed =
      ParticleConfig.SPARK_MIN_SPEED +
      Math.random() * (ParticleConfig.SPARK_MAX_SPEED - ParticleConfig.SPARK_MIN_SPEED);
    const life = 280 + Math.random() * 200;
    const p: CoinParticle = {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      radius: 1.5 + Math.random() * 1.5,
      life,
      maxLife: life,
      alpha: 1,
      wobble: 0,
      wobbleSpeed: 0,
      kind: "spark",
      rot: 0,
      rotSpeed: 0,
      color: ParticleConfig.SPARK_WARM,
    };
    particles.push(p);
  }
  if (particles.length > ParticleConfig.MAX_PARTICLES) {
    const overflow = particles.length - ParticleConfig.MAX_PARTICLES;
    particles.splice(0, overflow);
  }
}

function onScramblyTap(e: Event): void {
  if (state.phase === "ended") return;
  const ev = e as CustomEvent<TapPayload>;
  const detail = ev.detail;
  if (!detail) return;
  spawnCoins(detail.x, detail.y);
  if (state.phase === "playing" && !document.hidden && !fxPaused) {
    if (rafId === null) {
      lastFrameMs = 0;
      rafId = window.requestAnimationFrame(loop);
    }
  }
}

function tickParticles(dtSec: number): void {
  for (const p of particles) {
    if (p.kind === "spark") {
      p.vy += ParticleConfig.SPARK_GRAVITY * dtSec;
    } else {
      p.vy += ParticleConfig.GRAVITY * dtSec;
    }
    p.vx *= Math.pow(ParticleConfig.DRAG, dtSec * 60);
    const wobbleOffset = Math.sin((p.maxLife - p.life) * 0.01 * p.wobbleSpeed) * p.wobble;
    p.x += p.vx * dtSec + wobbleOffset * dtSec * 12;
    p.y += p.vy * dtSec;
    p.rot += p.rotSpeed * dtSec;
    p.life -= dtSec * 1000;
    const linear = Math.max(0, Math.min(1, p.life / p.maxLife));
    p.alpha = p.kind === "spark" ? Math.pow(linear, 1.6) : linear;
  }
  particles = particles.filter((p) => p.life > 0 && p.alpha > 0);
}

function drawParticles(): void {
  if (!fxCtx) return;
  fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  fxCtx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    if (p.alpha <= 0) continue;
    fxCtx.save();
    fxCtx.globalAlpha = p.alpha;
    if (p.kind === "spark") {
      // glowing halo (fake glow, no shadowBlur for perf)
      fxCtx.fillStyle = p.color;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
      fxCtx.globalAlpha = p.alpha * 0.25;
      fxCtx.fill();
      fxCtx.globalAlpha = p.alpha;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      fxCtx.fill();
      fxCtx.fillStyle = "rgba(255,255,255,0.9)";
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
      fxCtx.fill();
    } else {
      // rotating coin: squash-spin via scale(cos(rot))
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot * 0.25);
      const squash = Math.abs(Math.cos(p.rot));
      const sx = 0.45 + 0.55 * squash;
      fxCtx.scale(sx, 1);
      // halo
      fxCtx.fillStyle = p.color;
      fxCtx.globalAlpha = p.alpha * 0.3;
      fxCtx.beginPath();
      fxCtx.arc(0, 0, p.radius * 1.8, 0, Math.PI * 2);
      fxCtx.fill();
      fxCtx.globalAlpha = p.alpha;
      fxCtx.fillStyle = p.color;
      fxCtx.beginPath();
      fxCtx.arc(0, 0, p.radius, 0, Math.PI * 2);
      fxCtx.fill();
      fxCtx.lineWidth = 2;
      fxCtx.strokeStyle = ParticleConfig.COIN_OUTLINE;
      fxCtx.stroke();
      fxCtx.fillStyle = ParticleConfig.HIGHLIGHT;
      fxCtx.beginPath();
      fxCtx.arc(-p.radius * 0.3, -p.radius * 0.35, p.radius * 0.28, 0, Math.PI * 2);
      fxCtx.fill();
    }
    fxCtx.restore();
  }
  fxCtx.globalCompositeOperation = "source-over";
}

function loop(ts: number): void {
  if (fxPaused || document.hidden) {
    rafId = null;
    return;
  }
  if (state.phase === "ended") {
    rafId = null;
    return;
  }
  if (lastFrameMs === 0) lastFrameMs = ts;
  let dt = (ts - lastFrameMs) / 1000;
  lastFrameMs = ts;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  tickParticles(dt);
  drawParticles();
  if (particles.length > 0) {
    rafId = window.requestAnimationFrame(loop);
  } else {
    rafId = null;
    lastFrameMs = 0;
  }
}

function clearParticles(): void {
  particles = [];
  if (fxCtx) {
    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastFrameMs = 0;
}

function showToast(msg: string): void {
  const container = document.getElementById("toast-container") as HTMLElement | null;
  if (!container) return;
  // max 1 visible toast
  container.replaceChildren();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = msg;
  container.appendChild(toast);
  void toast.offsetWidth;
  toast.classList.add("show");
  window.setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    window.setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 250);
  }, 1800);
}

function checkMilestones(): void {
  for (const m of MILESTONES) {
    if (state.taps >= m.taps && !shownMilestones.has(m.taps)) {
      shownMilestones.add(m.taps);
      showToast(m.msg);
    }
  }
}

function endGame(reason: "taps" | "time"): void {
  if (state.phase !== "playing") return;
  state.phase = "ended";
  stopTimer();
  pauseFx();
  const foxBtn = document.getElementById("fox-btn") as HTMLButtonElement | null;
  if (foxBtn) {
    foxBtn.disabled = true;
    foxBtn.setAttribute("aria-disabled", "true");
  }
  const won = state.taps >= GameConfig.MAX_TAPS || reason === "taps";
  const endTitle = document.getElementById("end-title") as HTMLElement | null;
  const endStats = document.getElementById("end-stats") as HTMLElement | null;
  if (endTitle) {
    endTitle.textContent = won ? "You Did It!" : "Time's Up!";
  }
  if (endStats) {
    endStats.textContent = won
      ? "You earned 50 Scrambly Coins (Demo Balance)! In Scrambly, your playtime turns into real rewards."
      : `You tapped ${state.taps} times. You earned ${state.taps} Scrambly Coins (Demo Balance)! In Scrambly, your playtime turns into real rewards.`;
  }
  const endScreen = document.getElementById("end-screen") as HTMLElement | null;
  if (endScreen) {
    if (endHideTimeout !== null) {
      window.clearTimeout(endHideTimeout);
      endHideTimeout = null;
    }
    endScreen.hidden = false;
    void endScreen.offsetWidth;
    endScreen.classList.add("is-open");
  }
  const exploreBtn = document.getElementById("explore-btn") as HTMLButtonElement | null;
  if (exploreBtn) {
    exploreBtn.focus();
  }
}

function handleExploreClick(): void {
  if (import.meta.env.DEV) console.log("CTA clicked");
  const confirm = document.getElementById("cta-confirm") as HTMLElement | null;
  if (confirm) confirm.hidden = false;
}

function handlePlayAgainClick(): void {
  clearParticles();
  state.taps = 0;
  state.remainingMs = GameConfig.DURATION_MS;
  state.isPaused = false;
  shownMilestones.clear();
  updateHud();
  const endScreen = document.getElementById("end-screen") as HTMLElement | null;
  if (endScreen) {
    endScreen.classList.remove("is-open");
    if (endHideTimeout !== null) window.clearTimeout(endHideTimeout);
    endHideTimeout = window.setTimeout(() => {
      endScreen.hidden = true;
      endHideTimeout = null;
    }, 320);
  }
  const confirm = document.getElementById("cta-confirm") as HTMLElement | null;
  if (confirm) confirm.hidden = true;
  const foxBtn = document.getElementById("fox-btn") as HTMLButtonElement | null;
  if (foxBtn) {
    foxBtn.disabled = false;
    foxBtn.removeAttribute("aria-disabled");
    foxBtn.focus();
  }
  state.phase = "playing";
  if (fxPaused) {
    fxPaused = false;
    lastFrameMs = 0;
  }
  startTimer();
}

function handleFoxTap(x: number, y: number): void {
  if (state.phase === "ended") return;
  if (state.phase !== "playing") return;
  if (state.remainingMs <= 0) return;
  state.taps = Math.min(state.taps + 1, GameConfig.MAX_TAPS);

  updateHud();
  checkMilestones();

  const foxBtn = document.getElementById("fox-btn") as HTMLButtonElement | null;
  if (foxBtn) {
    foxBtn.classList.remove("is-squishing");
    foxBtn.classList.remove("is-glowing");
    void foxBtn.offsetWidth;
    foxBtn.classList.add("is-squishing");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      foxBtn.classList.add("is-glowing");
    }
  }

  const payload: TapPayload = { taps: state.taps, x, y };
  window.dispatchEvent(new CustomEvent<TapPayload>("scrambly:tap", { detail: payload }));

  if (state.taps >= GameConfig.MAX_TAPS) {
    endGame("taps");
  }
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
  const foxBtn = document.getElementById("fox-btn") as HTMLButtonElement | null;
  if (foxBtn) foxBtn.focus({ preventScroll: true });
  updateHud();
  startTimer();
  // lazily start FX loop on next tap; ensure fx not paused
  if (fxPaused) {
    fxPaused = false;
    lastFrameMs = 0;
  }
  if (import.meta.env.DEV) console.log("game started");
}

function handleFoxAnimationEnd(e: AnimationEvent): void {
  if (e.animationName === "mascot-pulse") {
    (e.currentTarget as HTMLElement | null)?.classList.remove("is-glowing");
  }
}

function init(): void {
  if (initialized) return;
  // HMR guard: window persists across Vite re-evaluations — trivial guard, flag set after DOM check below
  const w = window as unknown as { __scramblyInitialized?: boolean };
  if (w.__scramblyInitialized) return;

  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const foxBtn = document.getElementById("fox-btn") as HTMLButtonElement | null;
  const fxCanvas = document.getElementById("fx-canvas") as HTMLCanvasElement | null;
  const exploreBtn = document.getElementById("explore-btn") as HTMLButtonElement | null;
  const playAgainBtn = document.getElementById("play-again-btn") as HTMLButtonElement | null;
  if (fxCanvas && !fxCtx) {
    fxCtx = fxCanvas.getContext("2d") as CanvasRenderingContext2D | null;
  }

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
    foxBtn.removeEventListener("animationend", handleFoxAnimationEnd as EventListener);
    foxBtn.addEventListener("animationend", handleFoxAnimationEnd as EventListener);
  }

  if (exploreBtn) {
    exploreBtn.removeEventListener("click", handleExploreClick);
    exploreBtn.addEventListener("click", handleExploreClick);
  }

  if (playAgainBtn) {
    playAgainBtn.removeEventListener("click", handlePlayAgainClick);
    playAgainBtn.addEventListener("click", handlePlayAgainClick);
  }

  document.removeEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  window.removeEventListener("resize", handleResize);
  window.addEventListener("resize", handleResize);

  window.removeEventListener("scrambly:tap", onScramblyTap as EventListener);
  window.addEventListener("scrambly:tap", onScramblyTap as EventListener);

  // mark initialized after DOM wiring — keeps guard trivial but after DOM check
  w.__scramblyInitialized = true;
  initialized = true;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
