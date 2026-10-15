import "./style.css";

const $ = (selector) => document.querySelector(selector);
const scrollContainer = $("#scroll-container");
const progressFill = $("#progress-fill");
const stationIndicator = $("#station-indicator");
const announcement = $("#announcement");
const interactToast = $("#interact-toast");
const toastText = $("#toast-text");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let workshop = null;
let currentStation = 0;
let isFreeOrbit = false;
let motionOn = !reducedMotion.matches;
try {
  if (localStorage.getItem("night-lab-motion") === "off") motionOn = false;
} catch {}

// Toast Notification Management
let toastTimer = null;
function showToast(message, duration = 3200) {
  if (!interactToast || !toastText) return;
  clearTimeout(toastTimer);
  toastText.textContent = message;
  interactToast.classList.add("show");
  toastTimer = setTimeout(() => {
    interactToast.classList.remove("show");
  }, duration);
}

// Procedural Web Audio Synthesizer for 3D Interactions
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSfx(type) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === "robot") {
      // Robot chirp / sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "choynak") {
      // Hot tea steam hiss / pour
      const bufferSize = ctx.sampleRate * 0.45;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.12;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + 0.45);
      filter.Q.value = 3.0;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.45);
    } else if (type === "monitor") {
      // Terminal double blip
      [880, 1320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.06);
      });
    } else if (type === "trophy") {
      // Victory bell arpeggio (C-E-G-C)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.22, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.07 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.55);
      });
    } else if (type === "phone") {
      // Telephone ring / dual-tone
      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      });
    } else if (type === "cartridge") {
      // Mechanical snap / click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch {}
}

// Update scroll progress & camera POV along the Catmull-Rom spline
function handleScroll() {
  if (!scrollContainer) return;
  const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
  const progress = maxScroll > 0 ? scrollContainer.scrollTop / maxScroll : 0;

  if (workshop) {
    workshop.setScrollProgress(progress);
  }

  // Update Progress HUD
  if (progressFill) {
    progressFill.style.height = `${progress * 100}%`;
  }

  // Active Station calculation (0 to 4)
  const newStation = Math.min(4, Math.max(0, Math.round(progress * 4)));
  if (newStation !== currentStation) {
    currentStation = newStation;
    if (stationIndicator) {
      stationIndicator.textContent = `0${currentStation + 1} / 05`;
    }
    updateDock(currentStation);
  }
}

function updateDock(stationIdx) {
  document.querySelectorAll(".dock button[data-station]").forEach((btn) => {
    const idx = parseInt(btn.dataset.station, 10);
    if (idx === stationIdx) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "page");
    } else {
      btn.classList.remove("active");
      btn.removeAttribute("aria-current");
    }
  });
}

function scrollToStation(stationIdx) {
  const target = document.querySelector(`.story-section[data-station="${stationIdx}"]`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth" });
  }
}

// Navigation click triggers
document.addEventListener("click", (e) => {
  const stationBtn = e.target.closest("[data-station]");
  if (stationBtn) {
    const stationIdx = parseInt(stationBtn.dataset.station, 10);
    if (!isNaN(stationIdx)) {
      scrollToStation(stationIdx);
    }
  }
});

// Free Orbit Toggle Mode
const orbitBtn = $("#orbit-toggle");
if (orbitBtn) {
  orbitBtn.addEventListener("click", () => {
    if (!workshop) return;
    isFreeOrbit = workshop.toggleOrbit();
    orbitBtn.setAttribute("aria-pressed", String(isFreeOrbit));
    orbitBtn.classList.toggle("active", isFreeOrbit);
    orbitBtn.title = isFreeOrbit ? "Exit Free 3D Orbit (Return to Rail)" : "Toggle Free 3D Orbit";
    showToast(isFreeOrbit ? "⟲ Free 3D Orbit Mode: Drag & rotate diorama" : "▶ Rail Mode: Scroll-driven camera active", 2500);
  });
}

// Reset view
const resetBtn = $("#reset-view");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    scrollToStation(0);
    workshop?.reset();
    if (isFreeOrbit) {
      isFreeOrbit = false;
      orbitBtn?.setAttribute("aria-pressed", "false");
      orbitBtn?.classList.remove("active");
    }
  });
}

if (scrollContainer) {
  scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
}

// Tashkent Time & Year
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tashkent",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
function clock() {
  const now = new Date();
  const timeEl = $("#local-time");
  if (timeEl) {
    timeEl.textContent = clockFormat.format(now);
    timeEl.dateTime = now.toISOString();
  }
  const yearEl = $("#year");
  if (yearEl) {
    yearEl.textContent = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
    }).format(now);
  }
}
clock();
setInterval(clock, 30000);

// Motion preferences
function applyMotion() {
  document.body.classList.toggle("motion-paused", !motionOn);
  const mToggle = $("#motion-toggle");
  if (mToggle) {
    mToggle.setAttribute("aria-pressed", String(!motionOn));
    mToggle.setAttribute(
      "aria-label",
      motionOn ? "Pause animation" : "Resume animation",
    );
  }
  const mIcon = $("#motion-icon");
  if (mIcon) mIcon.textContent = motionOn ? "Ⅱ" : "▷";
  workshop?.setMotion(motionOn);
}
applyMotion();
$("#motion-toggle")?.addEventListener("click", () => {
  motionOn = !motionOn;
  try {
    localStorage.setItem("night-lab-motion", motionOn ? "on" : "off");
  } catch {}
  applyMotion();
});
reducedMotion.addEventListener("change", (e) => {
  motionOn = !e.matches;
  applyMotion();
});

// Ambient sound generator
let bgAudioContext, bgGain, soundOn = false;
$("#sound-toggle")?.addEventListener("click", async () => {
  try {
    if (!bgAudioContext) {
      bgAudioContext = getAudioContext();
      bgGain = bgAudioContext.createGain();
      bgGain.gain.value = 0;
      bgGain.connect(bgAudioContext.destination);
      const buffer = bgAudioContext.createBuffer(
        1,
        bgAudioContext.sampleRate * 3,
        bgAudioContext.sampleRate,
      );
      const values = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < values.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.025;
        values[i] = last * 3;
      }
      const noise = bgAudioContext.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = bgAudioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      noise.connect(filter);
      filter.connect(bgGain);
      noise.start();
      const hum = bgAudioContext.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 65;
      const humGain = bgAudioContext.createGain();
      humGain.gain.value = 0.06;
      hum.connect(humGain);
      humGain.connect(bgGain);
      hum.start();
    }
    await bgAudioContext.resume();
    soundOn = !soundOn;
    bgGain.gain.setTargetAtTime(
      soundOn ? 0.22 : 0,
      bgAudioContext.currentTime,
      0.4,
    );
    const sToggle = $("#sound-toggle");
    sToggle?.setAttribute("aria-pressed", String(soundOn));
    sToggle?.setAttribute(
      "aria-label",
      soundOn ? "Mute ambient sound" : "Enable ambient sound",
    );
    showToast(soundOn ? "🔊 Night Lab ambient sound enabled" : "🔇 Ambient sound muted", 2000);
  } catch {
    if (announcement)
      announcement.textContent = "Ambient sound is unavailable in this browser.";
  }
});
document.addEventListener("visibilitychange", () => {
  if (bgAudioContext)
    bgGain.gain.setTargetAtTime(
      document.hidden ? 0 : soundOn ? 0.22 : 0,
      bgAudioContext.currentTime,
      0.2,
    );
});

// Start 3D World with 3D Object Interactivity
async function startWorld() {
  try {
    await document.fonts.ready;
    const { createWorkshop } = await import("./workshop.js");
    const loadStatus = $("#load-status");

    workshop = await createWorkshop($("#world"), {
      motion: motionOn,
      onSelect: (sectionName) => {
        const stationMap = {
          home: 0,
          projects: 1,
          about: 2,
          honors: 3,
          contact: 4,
        };
        if (typeof stationMap[sectionName] === "number") {
          scrollToStation(stationMap[sectionName]);
        }
      },
      onInteract: (type) => {
        playSfx(type);
        if (type === "robot") {
          showToast("🤖 EL-01: 'Assalomu alaykum! Toshkent Night Lab-ga xush kelibsiz!'");
        } else if (type === "choynak") {
          showToast("🍵 Issiq ko'k choy damlandi (Hot green tea brewed in Uzbek porcelain choynak!)");
        } else if (type === "monitor") {
          showToast("🖥️ Monitor rejimi almashdi: Cyber Grid ⇄ Synthesizer Wave ⇄ Silk Road Ikat");
        } else if (type === "trophy") {
          showToast("🏆 8-qirrali Yulduz: Purple Comet 1st Place & Olimpiadalar!");
        } else if (type === "phone") {
          showToast("📞 Telegram @elshod_gosling ochilmoqda...");
          setTimeout(() => {
            window.open("https://t.me/elshod_gosling", "_blank");
          }, 600);
        } else if (type === "cartridge") {
          showToast("📼 Loyiha tanlandi (Project cartridge selected)");
          scrollToStation(1);
        }
      },
      onHover: (type) => {
        // Can optionally provide subtle hints
      },
      onProgress: (text) => {
        if (loadStatus) loadStatus.textContent = text;
      },
    });

    document.body.classList.add("world-ready");
    if (loadStatus) loadStatus.textContent = "CHIRAQLAR YONDI · SCROLL TO EXPLORE.";
    handleScroll();
  } catch (error) {
    console.warn(
      "3D workshop unavailable; standard portfolio views remain active.",
      error,
    );
    document.body.classList.add("no-webgl");
    const errEl = $("#scene-error");
    if (errEl) errEl.hidden = false;
  }
}
startWorld();
