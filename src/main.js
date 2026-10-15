import "./style.css";

const projects = {
  cyberpunk: {
    title: "Cyberpunk Shader",
    category: "01 / REAL-TIME GRAPHICS",
    description:
      "A shader pack that gives Minecraft Java a different atmosphere: neon color, cinematic lighting, and a world that feels a little more cyberpunk. Built with GLSL for the OptiFine and Iris rendering ecosystem.",
    tags: ["GLSL", "Shaders", "Minecraft Java", "OptiFine / Iris"],
    source: "https://github.com/elshod-gosling/Cyberpunk-shader-.build",
    live: "https://www.curseforge.com/members/elshodbek/projects",
  },
  finflow: {
    title: "FinFlow AI",
    category: "02 / AI & FULL-STACK DEVELOPMENT",
    description:
      "Built with the FstudentsTTT team for the National AI Hackathon 2026. FinFlow AI brings financial analysis, business visibility, and AI-assisted insights to small and medium businesses in Uzbekistan. A Next.js frontend meets a Python and FastAPI backend.",
    tags: ["Team project", "Next.js", "Python", "FastAPI"],
    source: "https://github.com/FstudentsTTT/FinFlow",
  },
  zehn: {
    title: "ZEHN-EDU",
    category: "03 / INTERACTIVE LEARNING",
    description:
      "A multilingual learning arcade that turns coding, mathematics, typing, and digital skills into playful challenges. Explore illustrated worlds and introductory exercises in English, Uzbek, and Russian. Built as a learning prototype with an emphasis on approachable interaction.",
    tags: ["Web app", "Education", "English / Uzbek / Russian", "Interactive"],
    source: "https://github.com/elshod-gosling/ZEHN-EDU",
    live: "https://elshod-gosling.github.io/ZEHN-EDU/",
  },
  elab: {
    title: "elab",
    category: "04 / OPEN-SOURCE TOOLS",
    description:
      "An open-source Python utility library built around a simple idea: useful functions should make the next thing easier to build. A space for practical helpers, experiments, and everyday developer tools. The terminal illustration on this portfolio is a visual concept, not a library API example.",
    tags: ["Python", "Utilities", "Open source"],
    source: "https://github.com/elshod-gosling/elab",
  },
};

const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
function closeMenu() {
  mobileNav.hidden = true;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  mobileNav.hidden = !open;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia("(min-width: 701px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

const cards = [...document.querySelectorAll(".project-card")];
document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    cards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
    const count = cards.filter((card) => !card.hidden).length;
    const category = {
      all: "",
      graphics: "graphics ",
      products: "product ",
      tools: "tool ",
    }[filter];
    document.querySelector("#filter-status").textContent =
      `Showing ${count} ${category}project${count === 1 ? "" : "s"}.`;
  });
});

const dialog = document.querySelector("#project-dialog");
let dialogOpener;
document.querySelectorAll("[data-project]").forEach((button) =>
  button.addEventListener("click", () => {
    const project = projects[button.dataset.project];
    dialogOpener = button;
    document.querySelector("#dialog-category").textContent = project.category;
    document.querySelector("#dialog-title").textContent = project.title;
    document.querySelector("#dialog-description").textContent =
      project.description;
    document.querySelector("#dialog-tags").replaceChildren(
      ...project.tags.map((tag) => {
        const span = document.createElement("span");
        span.textContent = tag;
        return span;
      }),
    );
    document.querySelector("#dialog-source").href = project.source;
    const live = document.querySelector("#dialog-live");
    live.hidden = !project.live;
    if (project.live) live.href = project.live;
    else live.removeAttribute("href");
    dialog.showModal();
    document.body.style.overflow = "hidden";
  }),
);
document
  .querySelector(".dialog-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  }
});
dialog.addEventListener("close", () => {
  document.body.style.overflow = "";
  dialogOpener?.focus({ preventScroll: true });
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tashkent",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
function updateTime() {
  const now = new Date();
  document.querySelector("#local-time").textContent =
    `${timeFormat.format(now)} UZT`;
  document.querySelector("#local-time").dateTime = now.toISOString();
  document.querySelector("#year").textContent = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
  }).format(now);
}
updateTime();
setInterval(updateTime, 30000);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let motionOn = !reducedMotion.matches;
try {
  if (localStorage.getItem("el-motion") === "off") motionOn = false;
} catch {
  /* Storage can be disabled. */
}
let sculpture;
let activeMaterial = "chrome";
const motionButton = document.querySelector("#motion-toggle");
function applyMotion() {
  document.documentElement.classList.toggle("motion-paused", !motionOn);
  motionButton.setAttribute("aria-pressed", String(!motionOn));
  motionButton.innerHTML = `MOTION: ${motionOn ? "ON" : "OFF"} <span>${motionOn ? "◉" : "○"}</span>`;
  motionButton.setAttribute(
    "aria-label",
    motionOn ? "Pause animations" : "Resume animations",
  );
  sculpture?.setMotion(motionOn);
}
applyMotion();
motionButton.addEventListener("click", () => {
  motionOn = !motionOn;
  try {
    localStorage.setItem("el-motion", motionOn ? "on" : "off");
  } catch {
    /* Optional preference. */
  }
  applyMotion();
});
reducedMotion.addEventListener("change", (event) => {
  motionOn = !event.matches;
  applyMotion();
});
document.querySelectorAll("[data-material]").forEach((button) =>
  button.addEventListener("click", () => {
    activeMaterial = button.dataset.material;
    document
      .querySelectorAll("[data-material]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    sculpture?.setMaterial(activeMaterial);
  }),
);
document
  .querySelector("#reset-sculpture")
  .addEventListener("click", () => sculpture?.reset());

async function startSculpture() {
  const host = document.querySelector("#sculpture");
  try {
    const { createSculpture } = await import("./sculpture.js");
    sculpture = createSculpture(host, motionOn);
    sculpture.setMaterial(activeMaterial);
    document.querySelector("#render-status").textContent = "LIVE / WEBGL";
    host.classList.add("is-ready");
  } catch (error) {
    console.warn(
      "The interactive sculpture is unavailable. Showing the static sculpture.",
      error,
    );
    document.querySelector("#render-status").textContent = "STATIC / LOW POWER";
    document.querySelector(".material-controls").hidden = true;
    document.querySelector("#reset-sculpture").hidden = true;
    document.querySelector(".drag-hint").textContent = "FORM / EXPLORATION";
    host.removeAttribute("tabindex");
    host.setAttribute(
      "aria-label",
      "Abstract sculptural rings, static fallback",
    );
  }
}
startSculpture();
