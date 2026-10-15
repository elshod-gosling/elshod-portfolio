import "./style.css";
import { projects } from "./projects.js";

const $ = (selector) => document.querySelector(selector);
const panel = $("#content-panel");
const panelContent = $("#panel-content");
const panelTitle = $("#panel-title");
const announcement = $("#announcement");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let workshop,
  entered = false,
  section = "home",
  opener;
let motionOn = !reducedMotion.matches;
try {
  if (localStorage.getItem("night-lab-motion") === "off") motionOn = false;
} catch {}

const projectSummaries = {
  cyberpunk: [
    "01 / REAL-TIME GRAPHICS",
    "A different atmosphere for Minecraft Java.",
    "GLSL · OPTIFINE / IRIS",
  ],
  finflow: [
    "02 / AI & FULL STACK",
    "Financial clarity, built with FstudentsTTT.",
    "NEXT.JS · PYTHON · FASTAPI",
  ],
  zehn: [
    "03 / INTERACTIVE LEARNING",
    "A multilingual learning arcade.",
    "EDTECH · EN / UZ / RU",
  ],
  elab: [
    "04 / DEVELOPER TOOLS",
    "Useful Python helpers for everyday building.",
    "PYTHON · OPEN SOURCE",
  ],
};

function enter() {
  if (entered) return;
  entered = true;
  document.body.classList.add("entered");
  $("#intro").inert = true;
  $("#hotspots").inert = false;
  workshop?.enter();
  announcement.textContent =
    "Welcome to the Night Lab. Explore the glowing objects or use the navigation.";
}
$("#enter-button").addEventListener("click", () => {
  enter();
  $("#navigation button").focus({ preventScroll: true });
});

function renderProjects() {
  panelTitle.textContent = "Ideas, out in the wild.";
  panelContent.innerHTML = `<p class="panel-intro">Pick something off the shelf. Everything here started with a little curiosity.</p>${Object.entries(
    projects,
  )
    .map(
      ([id, p]) =>
        `<button class="project-row" data-project="${id}"><span class="project-row-top"><span>${projectSummaries[id][0]}</span><span>↗</span></span><h3>${p.title}</h3><p>${projectSummaries[id][1]}</p><div class="row-tags">${projectSummaries[id][2]}</div></button>`,
    )
    .join(
      "",
    )}<a class="panel-link secondary" href="https://github.com/elshod-gosling?tab=repositories" target="_blank" rel="noopener noreferrer">All repositories <span>↗</span></a>`;
}
function renderProject(id) {
  const p = projects[id];
  panelTitle.textContent = p.title;
  const art =
    id === "cyberpunk"
      ? "./assets/cyberpunk.webp"
      : id === "zehn"
        ? "./assets/quest-worlds.webp"
        : null;
  panelContent.innerHTML = `<button class="text-back" data-back>← BACK TO THE SHELF</button>${art ? `<img class="project-art ${id}" src="${art}" alt="${p.title} project artwork" />` : ""}<p class="panel-intro">${p.description}</p><div class="tag-list">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div><a class="panel-link" href="${p.source}" target="_blank" rel="noopener noreferrer">View source on GitHub <span>↗</span></a>${p.live ? `<a class="panel-link secondary" href="${p.live}" target="_blank" rel="noopener noreferrer">Visit the project <span>↗</span></a>` : ""}`;
  $(".panel-scroll").scrollTop = 0;
  panelTitle.focus({ preventScroll: true });
  announcement.textContent = `${p.title} project details.`;
}
const sectionContent = {
  about: () => {
    panelTitle.innerHTML = "The human<br />behind the screen.";
    panelContent.innerHTML = `<p class="panel-intro">Hey, I’m <span class="bio-name">Elshodbek Ermuxammadov</span>, a developer from Uzbekistan. I like the space where technical depth meets creative freedom. One day it’s an algorithm. The next, a shader that changes the whole mood of a world.</p><p class="panel-intro">I build systems, experiment with graphics, and turn “what if?” into things you can actually use. This workshop is a little window into that world.</p><div class="bio-list"><div><span>UNDER THE HOOD</span><p>C++ · Python · TypeScript<br />Algorithms & full-stack development</p></div><div><span>BEYOND THE SURFACE</span><p>GLSL · WebGL · Blender<br />Shaders & real-time rendering</p></div><div><span>AFTER HOURS</span><p>C# · Unity · Linux<br />Game mechanics & open-source tools</p></div></div><a class="panel-link" href="https://github.com/orgs/FstudentsTTT/repositories" target="_blank" rel="noopener noreferrer">Also building with FstudentsTTT <span>↗</span></a>`;
  },
  honors: () => {
    panelTitle.innerHTML = "A competitive<br />streak.";
    panelContent.innerHTML = `<p class="panel-intro">Math, logic, and the persistence to keep working when the first idea doesn’t.</p><div class="honor-row"><span class="honor-year">2026</span><div><h3>Purple Comet</h3><p>International Math Competition<br />Uzbekistan</p></div><span class="honor-place">1st<small>PLACE</small></span></div><div class="honor-row"><span class="honor-year">2025</span><div><h3>Regional STEM Olympiad</h3><p>Applied sciences & logical problem solving</p></div><span class="honor-place">3rd<small>PLACE</small></span></div><div class="honor-row"><span class="honor-year">2024</span><div><h3>Computer Science Olympiad</h3><p>Regional · Informatics & algorithms</p></div><span class="honor-place">3rd<small>PLACE</small></span></div>`;
  },
  contact: () => {
    panelTitle.innerHTML = "Good things start<br />with a hello.";
    panelContent.innerHTML = `<p class="contact-heading">A project, a collaboration,<br />or a wonderfully weird idea.</p><p class="panel-intro">The lab is open. Drop me a message and let’s see where the conversation goes.</p><a class="panel-link" href="https://t.me/elshod_gosling" target="_blank" rel="noopener noreferrer">Telegram / @elshod_gosling <span>↗</span></a><a class="panel-link secondary" href="https://github.com/elshod-gosling" target="_blank" rel="noopener noreferrer">GitHub / elshod-gosling <span>↗</span></a><a class="panel-link secondary" href="https://instagram.com/elshod.for.real" target="_blank" rel="noopener noreferrer">Instagram / elshod.for.real <span>↗</span></a><a class="panel-link secondary" href="https://www.curseforge.com/members/elshodbek/projects" target="_blank" rel="noopener noreferrer">CurseForge / elshodbek <span>↗</span></a><p class="contact-note">BASED IN UZBEKISTAN · UTC+5<br />ALWAYS CURIOUS ABOUT WHAT’S NEXT.</p>`;
  },
};
function openSection(next, trigger) {
  if (trigger) opener = trigger;
  enter();
  section = next;
  $("#hotspots").inert = next !== "home";
  document.querySelectorAll(".dock [data-section]").forEach((button) => {
    if (button.dataset.section === next)
      button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (next === "home") {
    panel.hidden = true;
    document.body.classList.remove("has-panel");
    workshop?.focus("home");
    return;
  }
  $("#panel-eyebrow").textContent = {
    projects: "01 / THE PROJECT SHELF",
    about: "02 / MEET THE DEVELOPER",
    honors: "03 / THE SIDE QUESTS",
    contact: "04 / THE HOTLINE",
  }[next];
  if (next === "projects") renderProjects();
  else sectionContent[next]();
  panel.hidden = false;
  document.body.classList.add("has-panel");
  $(".panel-scroll").scrollTop = 0;
  panelTitle.tabIndex = -1;
  panelTitle.focus({ preventScroll: true });
  workshop?.focus(next);
  announcement.textContent = `${panelTitle.innerText} panel opened.`;
}
document
  .querySelectorAll("[data-section]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      openSection(button.dataset.section, button),
    ),
  );
panelContent.addEventListener("click", (event) => {
  const target = event.target.closest("[data-project],[data-back]");
  if (!target) return;
  if (target.hasAttribute("data-back")) {
    renderProjects();
    panelTitle.focus({ preventScroll: true });
  } else renderProject(target.dataset.project);
});
function closePanel() {
  openSection("home");
  opener?.focus({ preventScroll: true });
}
$("#panel-close").addEventListener("click", closePanel);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) closePanel();
});
$("#reset-view").addEventListener("click", () => {
  openSection("home");
  workshop?.reset();
});
const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tashkent",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
function clock() {
  const now = new Date();
  $("#local-time").textContent = clockFormat.format(now);
  $("#local-time").dateTime = now.toISOString();
  $("#year").textContent = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
  }).format(now);
}
clock();
setInterval(clock, 30000);
function applyMotion() {
  document.body.classList.toggle("motion-paused", !motionOn);
  $("#motion-toggle").setAttribute("aria-pressed", String(!motionOn));
  $("#motion-toggle").setAttribute(
    "aria-label",
    motionOn ? "Pause animation" : "Resume animation",
  );
  $("#motion-icon").textContent = motionOn ? "Ⅱ" : "▷";
  workshop?.setMotion(motionOn);
}
applyMotion();
$("#motion-toggle").addEventListener("click", () => {
  motionOn = !motionOn;
  try {
    localStorage.setItem("night-lab-motion", motionOn ? "on" : "off");
  } catch {}
  applyMotion();
});
reducedMotion.addEventListener("change", (event) => {
  motionOn = !event.matches;
  applyMotion();
});

let audioContext,
  audioGain,
  soundOn = false;
$("#sound-toggle").addEventListener("click", async () => {
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
    $("#sound-toggle").setAttribute("aria-pressed", String(soundOn));
    $("#sound-toggle").setAttribute(
      "aria-label",
      soundOn ? "Mute ambient sound" : "Enable ambient sound",
    );
  } catch {
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

async function startWorld() {
  try {
    await document.fonts.ready;
    const { createWorkshop } = await import("./workshop.js");
    workshop = await createWorkshop($("#world"), {
      motion: motionOn,
      onSelect: (id) => openSection(id, $(`[data-spot="${id}"]`)),
      onProgress: (text) => ($("#load-status").textContent = text),
    });
    document.body.classList.add("world-ready");
    $("#load-status").textContent = "THE LIGHTS ARE ON. COME ON IN.";
    if (entered) workshop.enter();
    if (section !== "home") workshop.focus(section);
  } catch (error) {
    console.warn(
      "3D workshop unavailable; portfolio navigation remains available.",
      error,
    );
    document.body.classList.add("no-webgl", "entered");
    $("#scene-error").hidden = false;
    $("#world").removeAttribute("tabindex");
    $("#scene-hint").hidden = true;
  }
}
startWorld();
