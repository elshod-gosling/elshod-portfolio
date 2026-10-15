import "./style.css";

const $ = (selector) => document.querySelector(selector);
const scrollContainer = $("#scroll-container");
const progressFill = $("#progress-fill");
const stationIndicator = $("#station-indicator");
const announcement = $("#announcement");
const interactToast = $("#interact-toast");
const toastText = $("#toast-text");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const stations = [...document.querySelectorAll(".story-section")];
const dockButtons = [
  ...document.querySelectorAll(".dock button[data-station]"),
];
const qualityModes = ["auto", "eco", "high"];
let quality = "auto";
let stationOffsets = [];

let workshop = null;
let currentStation = 0;
let isFreeOrbit = false;
let motionOn = !reducedMotion.matches;
try {
  if (localStorage.getItem("night-lab-motion") === "off") motionOn = false;
  const savedQuality = localStorage.getItem("night-lab-quality");
  if (qualityModes.includes(savedQuality)) quality = savedQuality;
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
  if (!soundOn) return;
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
  const top = scrollContainer.scrollTop;
  let segment = 0;
  while (
    segment < stationOffsets.length - 1 &&
    top >= stationOffsets[segment + 1]
  )
    segment++;
  const start = stationOffsets[segment] || 0;
  const end = stationOffsets[segment + 1] ?? start;
  const fraction =
    end > start ? Math.min(1, Math.max(0, (top - start) / (end - start))) : 0;
  const progress = (segment + fraction) / (stations.length - 1);

  if (workshop) {
    workshop.setScrollProgress(progress);
  }

  // Update Progress HUD
  if (progressFill) {
    progressFill.style.transform = `scaleY(${progress})`;
  }

  // Active Station calculation (0 to 4)
  const newStation = segment;
  if (newStation !== currentStation) {
    currentStation = newStation;
    if (stationIndicator) {
      stationIndicator.textContent = `0${currentStation + 1} / 05`;
    }
    updateDock(currentStation);
  }
}

function updateDock(stationIdx) {
  document.body.dataset.station = String(stationIdx);
  dockButtons.forEach((btn) => {
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
  if (isFreeOrbit) setOrbit(false);
  const target = stations[stationIdx];
  if (target) {
    scrollContainer.scrollTo({
      top: target.offsetTop,
      behavior: motionOn ? "smooth" : "instant",
    });
  }
}

function measureStations() {
  const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
  stationOffsets = stations.map((station) =>
    Math.min(station.offsetTop, maxScroll),
  );
  handleScroll();
}
let scrollFrame = 0;
function scheduleScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    handleScroll();
  });
}
const stationObserver = new ResizeObserver(measureStations);
stationObserver.observe(scrollContainer);
stations.forEach((station) => stationObserver.observe(station));
updateDock(0);

// Navigation click triggers
document.addEventListener("click", (e) => {
  const stationBtn = e.target.closest("button[data-station]");
  if (stationBtn) {
    const stationIdx = parseInt(stationBtn.dataset.station, 10);
    if (!isNaN(stationIdx)) {
      scrollToStation(stationIdx);
    }
  }
});

// Free Orbit Toggle Mode
const orbitBtn = $("#orbit-toggle");
function setOrbit(enabled) {
  if (!workshop) return;
  isFreeOrbit = workshop.toggleOrbit(enabled);
  document.body.classList.toggle("free-orbit", isFreeOrbit);
  orbitBtn.setAttribute("aria-pressed", String(isFreeOrbit));
  orbitBtn.classList.toggle("active", isFreeOrbit);
  orbitBtn.title = isFreeOrbit ? "Exit free orbit" : "Explore in free orbit";
  orbitBtn.setAttribute("aria-label", orbitBtn.title);
  $("#exit-orbit").hidden = !isFreeOrbit;
  if (isFreeOrbit) $("#world").focus({ preventScroll: true });
}
if (orbitBtn) {
  orbitBtn.addEventListener("click", () => {
    if (!workshop) return;
    setOrbit(!isFreeOrbit);
    showToast(
      isFreeOrbit
        ? "⟲ Free 3D Orbit Mode: Drag & rotate diorama"
        : "▶ Rail Mode: Scroll-driven camera active",
      2500,
    );
  });
}
$("#exit-orbit").addEventListener("click", () => {
  setOrbit(false);
  orbitBtn.focus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isFreeOrbit) {
    setOrbit(false);
    orbitBtn.focus();
  }
});
$("#robot-label").addEventListener("click", () => workshop?.interact("robot"));

const qualityBtn = $("#quality-toggle");
function updateQuality() {
  const next =
    qualityModes[(qualityModes.indexOf(quality) + 1) % qualityModes.length];
  qualityBtn.firstElementChild.textContent = quality.toUpperCase();
  qualityBtn.setAttribute(
    "aria-label",
    `Graphics quality: ${quality}. Switch to ${next}`,
  );
  qualityBtn.title = `Graphics quality: ${quality}. Switch to ${next}`;
  workshop?.setQuality(quality);
}
qualityBtn.addEventListener("click", () => {
  quality =
    qualityModes[(qualityModes.indexOf(quality) + 1) % qualityModes.length];
  try {
    localStorage.setItem("night-lab-quality", quality);
  } catch {}
  updateQuality();
  showToast(
    quality === "eco"
      ? "Eco graphics · lighter on your battery"
      : quality === "high"
        ? "High graphics · full bloom and reflections"
        : "Auto graphics · adapts to your device",
    2500,
  );
});
updateQuality();

// Reset view
const resetBtn = $("#reset-view");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    scrollToStation(0);
    workshop?.reset();
    if (isFreeOrbit) {
      setOrbit(false);
    }
  });
}

if (scrollContainer) {
  scrollContainer.addEventListener("scroll", scheduleScroll, { passive: true });
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
let bgAudioContext,
  bgGain,
  soundOn = false;
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
    showToast(
      soundOn ? "🔊 Night Lab ambient sound enabled" : "🔇 Ambient sound muted",
      2000,
    );
  } catch {
    if (announcement)
      announcement.textContent =
        "Ambient sound is unavailable in this browser.";
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
    const [module] = await Promise.all([
      import("./workshop.js"),
      document.fonts.load('600 24px "Inter Tight"').catch(() => []),
    ]);
    const loadStatus = $("#load-status");

    workshop = await module.createWorkshop($("#world"), {
      motion: motionOn,
      quality,
      interactionHost: scrollContainer,
      robotLabel: $("#robot-label"),
      onContextChange: (available) => {
        orbitBtn.disabled = !available;
        if (!available && isFreeOrbit) setOrbit(false);
      },
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
          showToast("🤖 EL-01: 'Welcome to the Night Lab! Ready to explore?'");
        } else if (type === "choynak") {
          showToast("🍵 Fresh hot tea brewed on the workbench.");
        } else if (type === "monitor") {
          showToast(
            "🖥️ Display switched: Cyber Horizon ⇄ Audio Wave ⇄ Digital Ikat",
          );
        } else if (type === "trophy") {
          showToast(
            "🏆 Star Trophy: Purple Comet 1st Place & Olympiad Honors!",
          );
        } else if (type === "phone") {
          showToast("📞 The hotline is open. Pick a channel below.");
          scrollToStation(4);
        } else if (type === "cartridge") {
          showToast("📼 Project cartridge selected: Viewing projects");
          scrollToStation(1);
        }
      },
      onProgress: (text) => {
        if (loadStatus) loadStatus.textContent = text;
      },
    });

    workshop.setMotion(motionOn);
    workshop.setQuality(quality);
    document.body.classList.add("world-ready");
    orbitBtn.disabled = false;
    if (loadStatus) loadStatus.textContent = "NEON ONLINE · SCROLL TO EXPLORE.";
    measureStations();
  } catch (error) {
    console.warn(
      "3D workshop unavailable; standard portfolio views remain active.",
      error,
    );
    document.body.classList.add("no-webgl");
    const errEl = $("#scene-error");
    if (errEl) errEl.hidden = false;
    $("#load-status").textContent =
      "EXPLORE THE LAB USING THE NAVIGATION BELOW.";
  }
}
startWorld();
