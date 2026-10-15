import "./style.css";

const $ = (selector) => document.querySelector(selector);
const scrollContainer = $("#scroll-container");
const progressFill = $("#progress-fill");
const stationIndicator = $("#station-indicator");
const announcement = $("#announcement");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let workshop = null;
let currentStation = 0;
let isFreeOrbit = false;
let motionOn = !reducedMotion.matches;
try {
  if (localStorage.getItem("night-lab-motion") === "off") motionOn = false;
} catch {}

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
let audioContext,
  audioGain,
  soundOn = false;
$("#sound-toggle")?.addEventListener("click", async () => {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      audioGain = audioContext.createGain();
      audioGain.gain.value = 0;
      audioGain.connect(audioContext.destination);
      const buffer = audioContext.createBuffer(
        1,
        audioContext.sampleRate * 3,
        audioContext.sampleRate,
      );
      const values = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < values.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.025;
        values[i] = last * 3;
      }
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      noise.connect(filter);
      filter.connect(audioGain);
      noise.start();
      const hum = audioContext.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 65;
      const humGain = audioContext.createGain();
      humGain.gain.value = 0.06;
      hum.connect(humGain);
      humGain.connect(audioGain);
      hum.start();
    }
    await audioContext.resume();
    soundOn = !soundOn;
    audioGain.gain.setTargetAtTime(
      soundOn ? 0.22 : 0,
      audioContext.currentTime,
      0.4,
    );
    const sToggle = $("#sound-toggle");
    sToggle?.setAttribute("aria-pressed", String(soundOn));
    sToggle?.setAttribute(
      "aria-label",
      soundOn ? "Mute ambient sound" : "Enable ambient sound",
    );
  } catch {
    if (announcement)
      announcement.textContent = "Ambient sound is unavailable in this browser.";
  }
});
document.addEventListener("visibilitychange", () => {
  if (audioContext)
    audioGain.gain.setTargetAtTime(
      document.hidden ? 0 : soundOn ? 0.22 : 0,
      audioContext.currentTime,
      0.2,
    );
});

// Start 3D World
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
      onProgress: (text) => {
        if (loadStatus) loadStatus.textContent = text;
      },
    });
    document.body.classList.add("world-ready");
    if (loadStatus) loadStatus.textContent = "THE LIGHTS ARE ON. SCROLL TO EXPLORE.";
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
