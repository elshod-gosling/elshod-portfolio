# Elshod’s Night Lab

An interactive, neon-lit Three.js portfolio for **Elshodbek Ermuxammadov**. A small workshop, a rainy night, and a shelf full of projects.

**[Step inside →](https://elshod-gosling.github.io/elshod-portfolio/)**

![Night Lab preview](public/social-preview.jpg)

## Explore

Scroll to travel between five stations, use the labeled dock to jump to a section, and click the glowing objects. Enable free orbit with the top-right orbit button to drag, pinch, or scroll around the scene.

- **Project vending machine:** Cyberpunk Shader, FinFlow AI, ZEHN-EDU, and elab, with artwork and links to their real repositories.
- **Workbench:** meet Elshodbek and explore the languages, tools, and creative interests behind the work.
- **Rooftop trophy:** math, STEM, and computer-science competition results.
- **Payphone:** Telegram, GitHub, Instagram, and CurseForge.

The navigation dock provides the same content without requiring interaction with 3D objects. In free orbit, arrow keys rotate the focused scene, `+` and `-` zoom, and Escape returns to the portfolio and restores focus to the orbit button. EL-01 is 1.7× larger, with a brighter shell and a keyboard-accessible greeting button.

Sound, including interaction effects, is off by default. The sound button enables locally synthesized rain ambience and a quiet electrical hum. The motion button pauses animation and stops the render loop until interaction requires another frame. Motion and graphics preferences persist. Reduced-motion and reduced-transparency preferences are respected, and rendering stops when the tab is hidden or the WebGL context is lost. The portfolio navigation remains usable if WebGL is unavailable.

## Performance and readability

- Static geometry is batched by material within each scene group: 478 meshes become 167 while retaining interactive objects and station metadata.
- Repeated geometries and glowing materials are shared. Ambient particles animate in a GPU shader instead of uploading positions every frame.
- **Auto** uses a lighter rendering path on phones and constrained devices and reduces resolution after sustained slow frames. **Eco** renders at up to 30 fps without postprocessing; **High** allows up to 60 fps with bloom. Pixel counts are capped on large or high-density screens.
- Bloom is loaded separately only when needed and rendered at reduced resolution. Pavement reflections refresh immediately during camera movement and less often for ambient animation.
- Text remains available before 3D startup. The scene module and required font load concurrently, and shaders compile asynchronously.
- Glass blur is limited to outer surfaces, with solid fallbacks. Body text is 16–17 px, project titles are 25–26 px, and mobile dock labels remain visible. Project cards use the main scroll area instead of a nested scroll trap.
- Camera stations follow measured section offsets, so larger text, long project lists, and viewport changes do not misalign navigation.

In development, `#world` exposes `data-meshes-before`, `data-meshes-after`, `data-rendered-frames`, and `data-draw-calls` for inspection. Frame diagnostics are omitted from production builds.

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
- `src/effects.js`: optional bloom and output pipeline, loaded only for higher graphics quality.
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
