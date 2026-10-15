# Elshod’s Night Lab

An interactive, neon-lit Three.js portfolio for **Elshodbek Ermuxammadov**. A small workshop, a rainy night, and a shelf full of projects.

**[Step inside →](https://elshod-gosling.github.io/elshod-portfolio/)**

![Night Lab preview](public/social-preview.jpg)

## Explore

Drag to orbit the workshop, scroll or pinch to zoom, and click the glowing objects:

- **Project vending machine:** Cyberpunk Shader, FinFlow AI, ZEHN-EDU, and elab, with artwork and links to their real repositories.
- **Workbench:** meet Elshodbek and explore the languages, tools, and creative interests behind the work.
- **Rooftop trophy:** math, STEM, and computer-science competition results.
- **Payphone:** Telegram, GitHub, Instagram, and CurseForge.

The navigation dock provides the same content without requiring interaction with 3D objects. Arrow keys rotate the focused scene; `+` and `-` zoom. Escape closes a content panel and restores focus to the control that opened it.

Sound is off by default. The sound button enables locally synthesized rain ambience and a quiet electrical hum. The motion button pauses the rain, fan, robot, and trophy animations; the preference persists. Reduced-motion preferences are respected, and rendering stops when the tab is hidden. The portfolio navigation remains usable if WebGL is unavailable.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

Production output is generated in `dist/`. Relative asset paths support GitHub Pages project hosting and other static hosts. Pushes to `main` build and deploy through `.github/workflows/pages.yml`.

## Source

- `src/workshop.js`: original procedural 3D models, lighting, live pavement reflections, bloom, rain shaders, raycasting, projected hotspots, and camera controls.
- `src/main.js`: navigation, content panels, keyboard behavior, preferences, clock, and synthesized ambience.
- `src/projects.js`: project descriptions and verified destinations.
- `src/style.css`: the interface and responsive layouts.
- `index.html`: accessible page structure and metadata.
- `public/assets/`: optimized project artwork.

The booth includes a furnished workbench, computer screens, keyboard, mug, striped awning, neon marquee, paper lanterns, vending machine, payphone, rooftop fan and satellite dish, electrical poles and cables, stools, crates, a plant, and a robot caretaker. Models and signage are generated in code, with no external 3D service or remote model downloads.

## References and content

The visual direction is inspired by **[Jesse Zhou’s Ramen](https://www.jessezhou.com/)**: a small immersive environment, neon lighting, reflections, and navigation through physical objects. The workshop geometry, scene, and interface in this repository are original implementations.

Biography, contact links, and competition results are carried forward from [Elshodbek’s earlier portfolio](https://el-port.iceiy.com/?i=1). Project descriptions are based on their public repositories.

- Cyberpunk artwork: `2026-09-03_10.34.33.png` from [Cyberpunk-shader-.build](https://github.com/elshod-gosling/Cyberpunk-shader-.build), resized and encoded as WebP.
- Learning-world artwork: `dist/assets/quest-worlds.webp` from [ZEHN-EDU](https://github.com/elshod-gosling/ZEHN-EDU).
- Fonts: Inter Tight and IBM Plex Mono via Fontsource, under their bundled open font licenses.

No analytics, remote fonts, account, or backend is required. Project and contact links open the relevant external websites.
