import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Central Asian & Silk Road Cyberpunk Color Palette
const TURQUOISE = 0x00e5d0, // Samarkand Turquoise / Firuza
  COBALT = 0x143f7a, // Registan Deep Blue
  GOLD = 0xffc444, // Silk Road Saffron Gold
  RUBY = 0xe6286b, // Pomegranate Ruby / Anor
  CYAN = 0x55ffed;

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const random = (() => {
  let s = 73;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
})();

export async function createWorkshop(host, options) {
  options.onProgress("Initializing Night Lab…");
  const mobile = () => host.clientWidth < 768;
  const constrainedDevice =
    (navigator.hardwareConcurrency || 8) <= 4 ||
    (navigator.deviceMemory || 8) <= 4 ||
    navigator.connection?.saveData;
  let qualityMode = options.quality || "auto";
  let adaptiveScale = 1;
  const eco = () =>
    qualityMode === "eco" ||
    (qualityMode === "auto" && (mobile() || constrainedDevice));
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: eco() ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, eco() ? 1 : 1.5),
  );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x060a16);
  if (import.meta.env.DEV) renderer.info.autoReset = false;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a16);
  scene.fog = new THREE.FogExp2(0x060a16, 0.02);

  // Cinematic Perspective Camera with generous field of view and zoomed-in hero framing
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = options.motion;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false; // Enabled only when user toggles Free Orbit
  controls.enableRotate = false; // Enabled only when user toggles Free Orbit
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.52;
  controls.minAzimuthAngle = -1.4;
  controls.maxAzimuthAngle = 1.6;
  controls.minDistance = 5;
  controls.maxDistance = 35;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.target.set(0, 2.2, 0);
  camera.position.set(9.0, 5.2, 11.5);

  // Mobile/Eco renders directly, avoiding all postprocessing framebuffers.
  // The optional bloom pipeline is downloaded only when it is needed.
  let effects = null,
    effectsPromise = null;

  const unitBox = new THREE.BoxGeometry(1, 1, 1),
    materials = new Map(),
    glowMaterials = new Map(),
    geometries = new Map();
  function cachedGeometry(key, create) {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  }
  function mat(color, metalness = 0.15, roughness = 0.65) {
    const k = `${color}/${metalness}/${roughness}`;
    if (!materials.has(k))
      materials.set(
        k,
        new THREE.MeshStandardMaterial({ color, metalness, roughness }),
      );
    return materials.get(k);
  }
  function glow(color) {
    if (!glowMaterials.has(color))
      glowMaterials.set(
        color,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(1.6),
          toneMapped: false,
        }),
      );
    return glowMaterials.get(color);
  }
  const cyanGlow = glow(TURQUOISE),
    rubyGlow = glow(RUBY),
    goldGlow = glow(GOLD);

  // A single shared clearcoat material; no extra transmission render pass.
  const liquidGlassMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.06,
    metalness: 0.08,
    transmission: 0.0,
    transparent: true,
    opacity: 0.2,
    color: new THREE.Color(0xa5f4ff),
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    reflectivity: 0.95,
    depthWrite: false,
  });

  const root = new THREE.Group();
  scene.add(root);

  function box(w, h, d, x, y, z, color = 0x19243b, parent = root) {
    const o = new THREE.Mesh(
      unitBox,
      color instanceof THREE.Material
        ? color
        : typeof color === "number"
          ? mat(color)
          : color,
    );
    o.scale.set(w, h, d);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function rounded(w, h, d, x, y, z, color, r = 0.06, parent = root) {
    const o = new THREE.Mesh(
      cachedGeometry(
        `rounded/${w}/${h}/${d}/${r}`,
        () => new RoundedBoxGeometry(w, h, d, 1, r),
      ),
      color instanceof THREE.Material
        ? color
        : typeof color === "number"
          ? mat(color)
          : color,
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function cylinder(
    radius,
    height,
    x,
    y,
    z,
    color,
    parent = root,
    radiusTop = radius,
  ) {
    const o = new THREE.Mesh(
      cachedGeometry(
        `cylinder/${radiusTop}/${radius}/${height}`,
        () => new THREE.CylinderGeometry(radiusTop, radius, height, 12),
      ),
      color instanceof THREE.Material
        ? color
        : typeof color === "number"
          ? mat(color)
          : color,
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function sphere(radius, x, y, z, color, parent = root) {
    const o = new THREE.Mesh(
      cachedGeometry(
        `sphere/${radius}`,
        () => new THREE.SphereGeometry(radius, 16, 10),
      ),
      color instanceof THREE.Material
        ? color
        : typeof color === "number"
          ? mat(color)
          : color,
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function pipe(points, radius, color, parent = root) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => v3(...p)));
    const o = new THREE.Mesh(
      new THREE.TubeGeometry(
        curve,
        Math.max(12, points.length * 8),
        radius,
        7,
        false,
      ),
      color instanceof THREE.Material
        ? color
        : typeof color === "number"
          ? mat(color)
          : color,
    );
    parent.add(o);
    return o;
  }
  function bar(a, b, radius, color, parent = root) {
    const start = v3(...a),
      end = v3(...b);
    const o = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 8),
      color instanceof THREE.Material
        ? color
        : typeof color === "number"
          ? mat(color)
          : color,
    );
    o.position.copy(start).add(end).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(v3(0, 1, 0), end.sub(start).normalize());
    parent.add(o);
    return o;
  }
  function textTexture(
    lines,
    {
      color = "#a0fff6",
      background = null,
      font = "600",
      width = 1024,
      height = 256,
      size = 100,
      align = "center",
    } = {},
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    if (background) {
      c.fillStyle = background;
      c.fillRect(0, 0, width, height);
    }
    c.textAlign = align;
    c.textBaseline = "middle";
    const rows = Array.isArray(lines) ? lines : [lines];
    const fontSize = align === "left" ? size : height / (rows.length + 0.55);
    c.font = `${font} ${fontSize}px "Inter Tight", Arial`;
    rows.forEach((line, i) => {
      const y = height / 2 + (i - (rows.length - 1) / 2) * fontSize * 1.05;
      c.shadowBlur = 8;
      c.shadowColor = color;
      c.fillStyle = color;
      c.fillText(line, align === "center" ? width / 2 : 35, y, width - 50);
      c.shadowBlur = 0;
    });
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function label(lines, w, h, x, y, z, settings = {}, parent = root) {
    const texture = textTexture(lines, settings);
    const o = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: !settings.background,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function frame(w, h, x, y, z, color, parent = root, r = 0.025) {
    bar([x - w / 2, y - h / 2, z], [x - w / 2, y + h / 2, z], r, color, parent);
    bar([x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], r, color, parent);
    bar([x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], r, color, parent);
    bar([x - w / 2, y + h / 2, z], [x + w / 2, y + h / 2, z], r, color, parent);
  }

  const loader = new THREE.TextureLoader();
  const [shaderImage] = await Promise.all([
    loader
      .loadAsync(`${import.meta.env.BASE_URL}assets/cyberpunk.webp`)
      .catch(() => null),
  ]);
  if (shaderImage) {
    shaderImage.colorSpace = THREE.SRGBColorSpace;
    shaderImage.anisotropy = 4;
  }

  options.onProgress("Lighting up the neon workshop…");

  // Wet pavement with live planar reflection and rain ripple distortion
  const floorShader = {
    ...Reflector.ReflectorShader,
    uniforms: THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
  };
  floorShader.uniforms.uTime = { value: 0 };
  floorShader.vertexShader = floorShader.vertexShader
    .replace("varying vec4 vUv;", "varying vec4 vUv; varying vec2 vGround;")
    .replace(
      "vUv = textureMatrix",
      "vGround = position.xy; vUv = textureMatrix",
    );
  floorShader.fragmentShader = floorShader.fragmentShader
    .replace(
      "varying vec4 vUv;",
      "varying vec4 vUv; varying vec2 vGround; uniform float uTime;",
    )
    .replace(
      "vec4 base = texture2DProj( tDiffuse, vUv );",
      `vec2 uv = vUv.xy / vUv.w; float ripple = sin(vGround.x * 23.0 + sin(vGround.y*8.0)) * sin(vGround.y*30.0+uTime*.4); uv += vec2(ripple*.0008,ripple*.0004); vec4 base = texture2D(tDiffuse,uv);`,
    )
    .replace(
      "vec4( blendOverlay( base.rgb, color ), 1.0 )",
      "vec4(mix(vec3(.0021,.00335,.0091),base.rgb*.48,exp(-length(vGround)*.018)),1.0)",
    );
  const floor = new Reflector(new THREE.PlaneGeometry(160, 160), {
    textureWidth: eco() ? 256 : 512,
    textureHeight: eco() ? 256 : 512,
    clipBias: 0.003,
    shader: floorShader,
    multisample: 0,
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  scene.add(floor);

  // Sidewalk with paving edge
  box(9.1, 0.23, 6.4, 0, 0.105, 0.25, 0x162135);
  box(9.15, 0.055, 0.09, 0, 0.225, 3.48, 0x364859);
  box(0.09, 0.055, 6.4, 4.53, 0.225, 0.25, 0x334050);
  for (let i = 0; i < 14; i++)
    box(0.018, 0.007, 6.3, -4.3 + i * 0.65, 0.226, 0.2, 0x0e1424);
  for (let i = 0; i < 10; i++)
    box(9, 0.008, 0.018, 0, 0.227, -2.7 + i * 0.65, 0x0e1424);
  for (let i = 0; i < 7; i++)
    box(
      0.3,
      0.01,
      0.08,
      2.5 + i * 0.27,
      0.234,
      3.12,
      i % 2 ? 0x151c2b : 0xb67b31,
    );

  // Soft pools of spilled neon
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 128;
  const gc = glowCanvas.getContext("2d");
  const gradient = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  gc.fillStyle = gradient;
  gc.fillRect(0, 0, 128, 128);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);

  function groundGlow(x, z, color, size, opacity = 0.3) {
    const o = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    o.rotation.x = -Math.PI / 2;
    o.position.set(x, 0.241, z);
    root.add(o);
  }
  groundGlow(-1, 2, TURQUOISE, 7, 0.28);
  groundGlow(3, 1, RUBY, 6, 0.28);
  groundGlow(-3, 2.6, GOLD, 3, 0.2);

  // Group definitions for interactive stations
  const aboutGroup = new THREE.Group();
  aboutGroup.userData.section = "about";
  root.add(aboutGroup);

  const projectsGroup = new THREE.Group();
  projectsGroup.userData.section = "projects";
  root.add(projectsGroup);

  const honorsGroup = new THREE.Group();
  honorsGroup.userData.section = "honors";
  root.add(honorsGroup);

  const contactGroup = new THREE.Group();
  contactGroup.userData.section = "contact";
  root.add(contactGroup);

  // The Lab Booth Structure
  box(5.2, 0.22, 3.5, 0, 0.35, -0.35, 0x122036);
  box(5.2, 3.1, 0.16, 0, 1.95, -2.0, 0x152238);
  box(0.17, 3.1, 3.5, -2.53, 1.95, -0.35, 0x1d3047);
  box(0.17, 3.1, 3.5, 2.53, 1.95, -0.35, 0x1d2e44);
  box(5.5, 0.22, 3.85, 0, 3.58, -0.35, 0x162234);
  box(5.65, 0.07, 3.92, 0, 3.72, -0.35, 0x363a54);
  for (let i = 0; i < 14; i++)
    box(0.04, 0.04, 3.8, -2.6 + i * 0.4, 3.78, -0.35, 0x424a64);
  for (const x of [-2.46, 2.46]) box(0.18, 2.8, 0.18, x, 1.86, 1.34, 0x3c3c4e);

  // Workbench Counter with Central Asian woodwork inlays
  box(4.75, 1.15, 0.54, 0, 1.02, 1.24, 0x242a3e, aboutGroup);
  for (let i = 0; i < 13; i++)
    box(
      0.24,
      1.03,
      0.035,
      -2.16 + i * 0.36,
      1.02,
      1.53,
      i % 2 ? 0x163452 : 0x202b42,
      aboutGroup,
    );
  box(5.22, 0.13, 0.87, 0, 1.67, 1.3, 0x5a3e3b, aboutGroup);
  box(5.22, 0.035, 0.04, 0, 1.72, 1.75, 0xab7356, aboutGroup);
  box(5.1, 0.035, 0.03, 0, 0.51, 1.57, cyanGlow, aboutGroup);

  // Front Liquid Glass window on the workshop
  box(4.78, 1.42, 0.03, 0, 2.45, 1.48, liquidGlassMat, aboutGroup);
  frame(4.8, 1.44, 0, 2.45, 1.49, mat(0xb88835, 0.6, 0.2), aboutGroup, 0.016);

  // Hanging tool wall and shelves
  box(4.5, 1.75, 0.065, 0, 2.27, -1.87, 0x223046);
  for (let x = 0; x < 18; x++)
    for (let y = 0; y < 7; y++)
      box(
        0.018,
        0.018,
        0.012,
        -2.1 + x * 0.24,
        1.65 + y * 0.22,
        -1.826,
        0x4f5a6f,
      );
  box(4.2, 0.09, 0.36, 0, 2.85, -1.57, 0x6a5843);
  for (let i = 0; i < 9; i++) {
    const height = 0.18 + random() * 0.17;
    box(
      0.12,
      height,
      0.17,
      -1.8 + i * 0.2,
      2.94 + height / 2,
      -1.55,
      [0x184282, 0x00a896, 0xb88835][i % 3],
    );
  }
  label(
    "CODE & CREATIVITY · TASHKENT",
    2.4,
    0.22,
    0.25,
    2.51,
    -1.81,
    { size: 55, color: "#80d5d0", font: "600" },
    aboutGroup,
  );
  box(4.75, 0.04, 0.03, 0, 3.25, 1.28, cyanGlow);

  // 3-Mode Animated Cyber / Silk Road GLSL Shader for the Primary Monitor
  let currentShaderMode = 0;
  const cyberScreenShader = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMode: { value: 0 },
      uTexture: { value: shaderImage || new THREE.Texture() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform int uMode;
      uniform sampler2D uTexture;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float scanline = sin(uv.y * 220.0 + uTime * 6.0) * 0.05;
        vec3 col = vec3(0.02, 0.05, 0.12);
        vec3 turquoise = vec3(0.0, 0.9, 0.82);
        vec3 gold = vec3(1.0, 0.77, 0.27);
        vec3 ruby = vec3(0.9, 0.16, 0.42);

        if (uMode == 0) {
          // Mode 0: Cyber Matrix Rain & Perspective Horizon
          vec2 p = uv * 2.0 - 1.0;
          float gridY = 0.5 / (abs(p.y) + 0.12) + uTime * 0.6;
          float gridX = p.x / (abs(p.y) + 0.12);
          float grid = (step(0.91, fract(gridX * 3.5)) + step(0.91, fract(gridY * 3.5))) * 0.22;
          float stream = sin(uv.y * 32.0 - uTime * 10.0 + sin(uv.x * 24.0) * 5.0);
          stream = smoothstep(0.72, 0.98, stream) * 0.38;
          vec4 tex = texture2D(uTexture, uv);
          vec3 base = tex.a > 0.05 ? tex.rgb * 1.15 : vec3(0.04, 0.08, 0.16);
          col = base + turquoise * (grid + stream) + ruby * 0.06;
        } else if (uMode == 1) {
          // Mode 1: Neon Audio Waveform / Synthesizer
          float wave1 = sin(uv.x * 18.0 + uTime * 4.0) * 0.18 + 0.5;
          float wave2 = cos(uv.x * 28.0 - uTime * 3.0) * 0.12 + 0.5;
          float line1 = smoothstep(0.03, 0.0, abs(uv.y - wave1));
          float line2 = smoothstep(0.02, 0.0, abs(uv.y - wave2));
          float bars = step(0.65, fract(uv.x * 30.0)) * step(uv.y, 0.5 + sin(uv.x * 20.0 + uTime * 5.0) * 0.3);
          col = vec3(0.02, 0.05, 0.1) + turquoise * line1 * 1.2 + gold * line2 * 1.4 + turquoise * bars * 0.25;
        } else {
          // Mode 2: Central Asian Silk Road Digital Ikat
          float ikat = sin(uv.y * 22.0 + sin(uv.x * 12.0 + uTime * 2.0) * 4.0);
          ikat = smoothstep(-0.2, 0.8, ikat);
          float diamond = abs(sin(uv.x * 14.0 + uv.y * 14.0 + uTime * 0.8)) + abs(sin(uv.x * 14.0 - uv.y * 14.0 - uTime * 0.8));
          diamond = smoothstep(1.3, 1.8, diamond);
          col = mix(vec3(0.04, 0.1, 0.24), turquoise, ikat * 0.6) + gold * diamond * 0.4 + ruby * 0.15;
        }

        col -= scanline;
        float edge = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) *
                     smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
        col *= edge;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  });

  function monitor(x, y, z, width, height, matOrTex, isInteractive = false) {
    const monGroup = new THREE.Group();
    if (isInteractive) monGroup.userData.interactive = "monitor";
    aboutGroup.add(monGroup);

    rounded(
      width + 0.14,
      height + 0.14,
      0.12,
      x,
      y,
      z,
      0x0f1526,
      0.05,
      monGroup,
    );
    const screenMat =
      matOrTex instanceof THREE.Material
        ? matOrTex
        : new THREE.MeshBasicMaterial({
            map: matOrTex,
            color: matOrTex ? 0xffffff : 0x2c8394,
            toneMapped: false,
          });
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      screenMat,
    );
    screen.position.set(x, y, z + 0.066);
    if (isInteractive) screen.userData.interactive = "monitor";
    monGroup.add(screen);

    box(0.055, 0.27, 0.07, x, y - height / 2 - 0.18, z, 0x4a526a, monGroup);
    box(
      0.45,
      0.04,
      0.27,
      x,
      y - height / 2 - 0.32,
      z + 0.01,
      0x3a475c,
      monGroup,
    );
    sphere(
      0.018,
      x + width / 2 - 0.02,
      y - height / 2 - 0.045,
      z + 0.073,
      cyanGlow,
      monGroup,
    );
    return screen;
  }
  const mainScreen = monitor(
    -0.85,
    2.26,
    0.62,
    1.55,
    0.87,
    cyberScreenShader,
    true,
  );

  const codeTexture = textTexture(
    [
      "> elshod@night-lab:~$",
      "  init shaders --target GLSL",
      "  Iris / OptiFine [OK]",
      "  120 FPS · Tashkent UTC+5",
      "  [CLICK SCREEN TO SWITCH MODE]",
    ],
    {
      color: "#83f8dc",
      background: "#081923",
      size: 24,
      font: "500",
      width: 768,
      height: 400,
      align: "left",
    },
  );
  monitor(0.95, 2.2, 0.64, 1.1, 0.75, codeTexture, true);

  // Mechanical Keyboard
  box(1, 0.045, 0.32, -0.8, 1.76, 1.21, 0x1e2436, aboutGroup);
  const keys = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.053, 0.018, 0.044),
    mat(0x68788e),
    60,
  );
  const keyMatrix = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) {
    keyMatrix.makeTranslation(
      -1.22 + (i % 15) * 0.06,
      1.794,
      1.11 + Math.floor(i / 15) * 0.065,
    );
    keys.setMatrixAt(i, keyMatrix);
  }
  aboutGroup.add(keys);

  // Traditional Uzbek Choynak (Teapot) & Piyola (Tea Bowl) with Paxta / Cobalt Porcelain Pattern
  const choynakGroup = new THREE.Group();
  choynakGroup.position.set(1.85, 1.76, 1.25);
  choynakGroup.userData.interactive = "choynak";
  aboutGroup.add(choynakGroup);

  const choyPot = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 20, 16),
    mat(0x143f7a, 0.3, 0.2), // Cobalt blue porcelain
  );
  choyPot.scale.set(1.15, 0.95, 1.15);
  choyPot.position.y = 0.12;
  choyPot.userData.interactive = "choynak";
  choynakGroup.add(choyPot);

  // Gold trim ring around choynak belly
  const choyTrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.138, 0.007, 6, 24),
    glow(GOLD),
  );
  choyTrim.rotation.x = Math.PI / 2;
  choyTrim.position.y = 0.12;
  choynakGroup.add(choyTrim);

  // Teapot domed lid with golden finial
  cylinder(0.075, 0.035, 0, 0.22, 0, 0xf5f5fa, choynakGroup, 0.05);
  sphere(0.02, 0, 0.25, 0, glow(GOLD), choynakGroup);

  // Curved spout
  pipe(
    [
      [0.08, 0.08, 0],
      [0.16, 0.13, 0],
      [0.2, 0.21, 0],
    ],
    0.02,
    0x143f7a,
    choynakGroup,
  );

  // Arched handle
  const choyHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.014, 8, 20, Math.PI * 1.15),
    mat(0x143f7a, 0.2, 0.3),
  );
  choyHandle.rotation.z = Math.PI * 0.85;
  choyHandle.position.set(-0.1, 0.12, 0);
  choynakGroup.add(choyHandle);

  // Piyola (Uzbek traditional tea bowl)
  const piyola = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.045, 0.065, 18),
    mat(0xf5f5fa, 0.2, 0.2),
  );
  piyola.position.set(1.52, 1.79, 1.25);
  piyola.userData.interactive = "choynak";
  aboutGroup.add(piyola);

  const piyolaRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.006, 6, 20),
    glow(TURQUOISE),
  );
  piyolaRim.rotation.x = Math.PI / 2;
  piyolaRim.position.set(1.52, 1.825, 1.25);
  aboutGroup.add(piyolaRim);

  cylinder(0.072, 0.01, 1.52, 1.81, 1.25, glow(0xffa834), aboutGroup);

  // Tea steam particles
  const steamCount = 28;
  const steamGeo = new THREE.BufferGeometry();
  const steamPositions = new Float32Array(steamCount * 3);
  const steamLifes = new Float32Array(steamCount);
  for (let i = 0; i < steamCount; i++) {
    steamPositions[i * 3 + 0] = 1.85 + (random() - 0.5) * 0.15;
    steamPositions[i * 3 + 1] = 1.95 + random() * 0.45;
    steamPositions[i * 3 + 2] = 1.25 + (random() - 0.5) * 0.15;
    steamLifes[i] = random();
  }
  steamGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(steamPositions, 3),
  );
  const steamMat = new THREE.PointsMaterial({
    size: 0.055,
    color: 0x9be8ff,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const teaSteam = new THREE.Points(steamGeo, steamMat);
  aboutGroup.add(teaSteam);

  for (let i = 0; i < 5; i++)
    box(
      0.03,
      0.24,
      0.03,
      -1.96 + i * 0.055,
      1.86,
      0.76,
      [0x184282, 0x00a896, 0xb88835][i % 3],
      aboutGroup,
    );
  cylinder(0.17, 0.1, -1.85, 1.75, 0.76, 0x2e2c3c, aboutGroup);

  label(
    "DEEP LOGIC · CLEAN CODE",
    2.4,
    0.15,
    0,
    0.88,
    1.557,
    { size: 40, color: "#98e8e2" },
    aboutGroup,
  );

  // Uzbek Khan-Atlas & Samarkand Turquoise Awning
  const awning = new THREE.Group();
  awning.position.set(0, 3.33, 1.68);
  awning.rotation.x = 0.22;
  root.add(awning);
  const atlasColors = [0x00d2be, 0x143f7a, 0xb81b4d, 0xffc444];
  for (let i = 0; i < 12; i++) {
    const col = atlasColors[i % 4];
    box(0.47, 0.075, 1.33, -2.585 + i * 0.47, 0, 0, col, awning);
    box(0.47, 0.22, 0.06, -2.585 + i * 0.47, -0.12, 0.65, col, awning);
  }
  bar([-2.84, -0.03, 0.68], [2.84, -0.03, 0.68], 0.025, goldGlow, awning);
  for (const x of [-2.6, 2.6])
    bar([x, 3.32, 2.31], [x, 2.82, 1.35], 0.035, 0x484860);

  // Main Marquee with Central Asian 8-pointed star icons & Uzbek Subtitle
  rounded(5.5, 1.15, 0.24, 0, 4.35, 1.25, 0x151c32, 0.06);
  box(5.23, 0.92, 0.02, 0, 4.35, 1.382, 0x0a1222);
  frame(5.35, 1.02, 0, 4.35, 1.41, cyanGlow, root, 0.024);
  frame(5.13, 0.82, 0, 4.35, 1.425, goldGlow, root, 0.012);
  label("ELSHOD’S", 4.8, 0.62, 0, 4.54, 1.44, {
    size: 130,
    color: "#aafff5",
    font: "700",
  });
  label("✦  N I G H T   L A B  ✦", 4.2, 0.24, 0, 4.18, 1.44, {
    size: 66,
    color: "#ffd152",
    font: "600",
  });
  label("TASHKENT · NIGHT LABORATORY", 3.2, 0.16, 0, 3.92, 1.44, {
    size: 40,
    color: "#00e5d0",
    font: "500",
  });
  for (const x of [-2.15, 2.15])
    bar([x, 3.74, 1.17], [x, 3.88, 1.17], 0.055, 0x2e3048);

  // Rooftop utility, satellite dish, and honors
  rounded(1.18, 0.64, 0.85, 1.48, 4.12, -0.72, 0x4a4a5e, 0.05);
  const fan = new THREE.Group();
  fan.position.set(1.48, 4.13, -0.269);
  root.add(fan);
  const fanRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.022, 8, 32),
    mat(0x222c3e),
  );
  fan.add(fanRing);
  const fanBlades = new THREE.Group();
  fan.add(fanBlades);
  for (let i = 0; i < 5; i++) {
    const blade = box(0.115, 0.35, 0.018, 0, 0.08, 0.015, 0x1d263a, fanBlades);
    blade.rotation.z = (i * Math.PI * 2) / 5;
  }
  sphere(0.055, 1.48, 4.13, -0.237, 0x5a647c);
  for (let i = 0; i < 6; i++)
    box(0.1, 0.28, 0.025, 0.75 + i * 0.065, 4.1, -0.265, 0x1b2438);

  pipe(
    [
      [-2.65, 1, -0.5],
      [-2.65, 3.5, -0.5],
      [-2.65, 4.05, -1],
      [-2.1, 4.1, -1],
    ],
    0.07,
    0x8a6345,
  );
  pipe(
    [
      [2.67, 0.5, -1.1],
      [2.67, 2.8, -1.1],
      [2.67, 2.9, 0.2],
    ],
    0.055,
    0x72625e,
  );
  for (let i = 0; i < 4; i++)
    cylinder(0.32, 0.055, -1.2, 3.9 + i * 0.14, -0.8, 0x3a3e52);
  cylinder(0.28, 0.7, -1.2, 4.19, -0.8, 0x2b3248);

  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 24, 12, 0, Math.PI * 2, 0, 0.65),
    mat(0x768594, 0.45, 0.45),
  );
  dish.rotation.set(-0.6, 0.2, -0.4);
  dish.position.set(-1.22, 4.7, -0.85);
  root.add(dish);
  bar([-1.2, 4.5, -0.8], [-0.85, 4.95, -0.5], 0.017, 0x5e7490);

  // Central Asian 8-Pointed Star Trophy (Rub al-Hizb / Qomusiy Yulduz)
  const trophy = new THREE.Group();
  trophy.position.set(-0.4, 4.65, 0.05);
  trophy.userData.interactive = "trophy";
  honorsGroup.add(trophy);

  const starShape = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 + Math.PI / 2;
    const r = i % 2 ? 0.22 : 0.44;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();

  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.015,
      bevelSegments: 2,
    }),
    goldGlow,
  );
  star.position.y = 0.22;
  star.userData.interactive = "trophy";
  trophy.add(star);

  cylinder(0.04, 0.32, 0, -0.12, 0, 0xc79557, trophy);
  box(0.68, 0.14, 0.42, 0, -0.32, 0, 0x3d3548, trophy);

  // Liquid Glass protective vitrine showcase for the star trophy
  box(0.72, 0.95, 0.52, 0, 0.15, 0, liquidGlassMat, trophy);
  frame(0.74, 0.97, 0, 0.15, 0.26, goldGlow, trophy, 0.012);

  box(1.7, 0.34, 0.07, -0.4, 5.35, 0.04, 0x1c2138, honorsGroup);
  label(
    "HONORS & AWARDS ✦",
    1.6,
    0.24,
    -0.4,
    5.35,
    0.082,
    { color: "#ffd09a", size: 76 },
    honorsGroup,
  );

  // Project Vending Machine with Liquid Glass Display Front
  rounded(1.45, 2.62, 1.04, 3.34, 1.55, 0.58, 0x5a2d46, 0.09, projectsGroup);
  rounded(1.28, 2.39, 0.07, 3.34, 1.59, 1.12, 0x271f36, 0.035, projectsGroup);
  box(0.91, 1.57, 0.06, 3.17, 1.78, 1.176, 0x081829, projectsGroup);
  frame(0.99, 1.65, 3.17, 1.78, 1.22, cyanGlow, projectsGroup, 0.016);

  // Liquid Glass front panel on vending machine
  box(1.26, 2.36, 0.03, 3.34, 1.6, 1.25, liquidGlassMat, projectsGroup);

  label(
    "FEATURED PROJECTS",
    1.18,
    0.25,
    3.34,
    2.66,
    1.28,
    { size: 90, color: "#80fff1" },
    projectsGroup,
  );

  const cartridgeColors = [
    0x00d2be, 0x143f7a, 0xb81b4d, 0xffc444, 0x5099c1, 0x9e6ddd,
  ];
  const cartridges = [];
  for (let i = 0; i < 6; i++) {
    const x = 2.94 + (i % 2) * 0.42,
      y = 2.25 - Math.floor(i / 2) * 0.49;
    const cart = rounded(
      0.24,
      0.32,
      0.2,
      x,
      y,
      1.21,
      cartridgeColors[i],
      0.025,
      projectsGroup,
    );
    cart.userData.interactive = "cartridge";
    cartridges.push(cart);
    box(0.17, 0.09, 0.008, x, y + 0.025, 1.317, 0xc9dde0, projectsGroup);
    cylinder(0.04, 0.04, x, y + 0.18, 1.21, 0x2a3948, projectsGroup);
  }
  for (let i = 0; i < 3; i++)
    box(
      0.9,
      0.025,
      0.2,
      3.17,
      2.05 - i * 0.5,
      1.21,
      mat(0x38475e),
      projectsGroup,
    );
  for (let i = 0; i < 4; i++)
    box(
      0.12,
      0.045,
      0.035,
      3.86,
      2.11 - i * 0.22,
      1.199,
      i === 0 ? rubyGlow : 0x666479,
      projectsGroup,
    );
  box(0.16, 0.035, 0.015, 3.86, 1.04, 1.203, 0x0f1424, projectsGroup);
  rounded(0.82, 0.29, 0.035, 3.25, 0.6, 1.195, 0x0e1526, 0.03, projectsGroup);
  label(
    "SELECT CARTRIDGE",
    0.77,
    0.15,
    3.25,
    0.61,
    1.22,
    { size: 58, color: "#95d5cb" },
    projectsGroup,
  );

  // Retro Cyber Payphone / Hotline
  const payphoneGroup = new THREE.Group();
  payphoneGroup.userData.interactive = "phone";
  contactGroup.add(payphoneGroup);

  cylinder(0.07, 1.3, -3.45, 0.9, 1.8, 0x423a48, payphoneGroup);
  rounded(0.85, 1.18, 0.58, -3.45, 1.94, 1.8, 0x8a5e3c, 0.07, payphoneGroup);
  rounded(0.7, 0.93, 0.03, -3.45, 1.98, 2.106, 0x182234, 0.03, payphoneGroup);
  label(
    ["HOTLINE", "DISPATCH"],
    0.54,
    0.46,
    -3.45,
    2.12,
    2.133,
    { size: 85, height: 420, color: "#80ffe8" },
    payphoneGroup,
  );
  for (let i = 0; i < 9; i++)
    box(
      0.07,
      0.04,
      0.025,
      -3.56 + (i % 3) * 0.11,
      1.91 - Math.floor(i / 3) * 0.075,
      2.145,
      0x638491,
      payphoneGroup,
    );
  pipe(
    [
      [-3.8, 2.2, 2.18],
      [-3.85, 1.95, 2.2],
      [-3.8, 1.69, 2.18],
    ],
    0.05,
    0x455364,
    payphoneGroup,
  );
  label(
    "THE HOTLINE ✦",
    0.88,
    0.19,
    -3.45,
    2.66,
    1.82,
    { size: 82, color: "#ffc178" },
    payphoneGroup,
  );

  // Physical Signpost with English Phrasing
  cylinder(0.045, 3.5, -4.07, 1.99, 2.72, 0x4a5367);
  const signBoards = [
    ["PROJECTS →", 2.85, 0x184282, "#80fff1", "projects"],
    ["← ABOUT ME", 2.39, 0x6e2c4c, "#ffa5e1", "about"],
    ["SAY HELLO ↗", 1.93, 0x7a5a38, "#ffdd95", "contact"],
  ];
  for (const [text, y, color, ink, id] of signBoards) {
    const g = new THREE.Group();
    g.userData.section = id;
    root.add(g);
    rounded(1.85, 0.35, 0.1, -4.07, y, 2.87, color, 0.025, g);
    label(text, 1.65, 0.25, -4.07, y, 2.934, { size: 76, color: ink }, g);
  }

  for (const x of [-1.55, 0, 1.55]) {
    cylinder(0.29, 0.13, x, 0.93, 2.53, 0x764254);
    cylinder(0.25, 0.035, x, 1.012, 2.53, 0x9c596d);
    for (const dx of [-0.17, 0.17])
      for (const dz of [-0.14, 0.14])
        bar(
          [x + dx, 0.29, 2.53 + dz],
          [x + dx * 0.8, 0.87, 2.53 + dz * 0.8],
          0.025,
          0x404456,
        );
    const footRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.018, 6, 20),
      mat(0x565c6c),
    );
    footRing.rotation.x = Math.PI / 2;
    footRing.position.set(x, 0.48, 2.53);
    root.add(footRing);
  }

  // Uzbek Oriental Brass & Turquoise Fanoos Lanterns (Central Asian Filigree)
  function uzbekLantern(x, y, z) {
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(x, y, z);
    root.add(lanternGroup);

    bar([x, y + 0.82, z], [x, y + 0.4, z], 0.012, 0xb88835);
    cylinder(0.18, 0.1, x, y + 0.36, z, 0xb88835, root, 0.05);
    sphere(0.035, x, y + 0.42, z, glow(GOLD), root);

    // Glowing turquoise and amber filigree lantern core
    cylinder(0.24, 0.46, x, y + 0.12, z, glow(TURQUOISE), root, 0.2);

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rx = Math.cos(a) * 0.23,
        rz = Math.sin(a) * 0.23;
      bar(
        [x + rx, y + 0.34, z + rz],
        [x + rx, y - 0.11, z + rz],
        0.012,
        0xb88835,
        root,
      );
    }
    cylinder(0.22, 0.06, x, y - 0.13, z, 0xb88835, root, 0.14);
    sphere(0.045, x, y - 0.18, z, glow(GOLD), root);

    // Central Asian 8-pointed star medallion (✦)
    label(["✦", "TOSHKENT"], 0.34, 0.32, x, y + 0.12, z + 0.245, {
      size: 110,
      width: 256,
      height: 256,
      color: "#00e5d0",
      font: "700",
    });

    const lanternLight = new THREE.PointLight(TURQUOISE, 4.5, 4.5, 2);
    lanternLight.position.set(x, y + 0.12, z);
    scene.add(lanternLight);
  }
  uzbekLantern(-2.72, 2.78, 1.88);
  uzbekLantern(2.72, 3.35, 1.68);

  // Robot Caretaker (EL-01) with Uzbek Stylized Do'ppi Cap
  const robot = new THREE.Group();
  robot.position.set(3.3, 0.24, 2.72);
  robot.scale.setScalar(1.7);
  robot.rotation.y = -0.25;
  robot.userData.interactive = "robot";
  root.add(robot);

  const robotShell = mat(0xa5c6d4, 0.3, 0.35);
  robotShell.emissive.setHex(0x173c4b);
  robotShell.emissiveIntensity = 0.35;
  rounded(0.55, 0.48, 0.38, 0, 0.4, 0, robotShell, 0.07, robot);
  rounded(0.66, 0.43, 0.42, 0, 0.92, 0.02, robotShell, 0.08, robot);
  rounded(0.5, 0.25, 0.035, 0, 0.94, 0.244, 0x0f182c, 0.055, robot);

  // Stylized Central Asian square embroidered Do'ppi cap on EL-01
  rounded(0.44, 0.12, 0.4, 0, 1.18, 0.02, 0x143f7a, 0.03, robot);
  frame(0.46, 0.13, 0, 1.18, 0.02, glow(TURQUOISE), robot, 0.008);

  box(0.105, 0.07, 0.012, -0.13, 0.96, 0.269, cyanGlow, robot);
  box(0.105, 0.07, 0.012, 0.13, 0.96, 0.269, cyanGlow, robot);
  bar([0, 1.14, 0.02], [0, 1.36, 0.02], 0.016, 0x7c7f96, robot);
  const antennaMaterial = rubyGlow.clone();
  const robotAntenna = sphere(0.05, 0, 1.37, 0.02, antennaMaterial, robot);
  for (const x of [-0.19, 0.19])
    rounded(0.22, 0.12, 0.3, x, 0.1, 0.08, 0x43566f, 0.035, robot);

  const robotLeftArm = bar(
    [-0.31, 0.58, 0],
    [-0.43, 0.3, 0.1],
    0.05,
    0x56647c,
    robot,
  );
  const robotRightArmGroup = new THREE.Group();
  robotRightArmGroup.position.set(0.31, 0.57, 0);
  robot.add(robotRightArmGroup);
  bar([0, 0, 0], [0.17, 0.21, 0.08], 0.05, 0x56647c, robotRightArmGroup);
  sphere(0.065, 0.17, 0.25, 0.08, 0x90a3b3, robotRightArmGroup);

  label(
    "EL-01",
    0.3,
    0.09,
    0,
    0.43,
    0.2,
    { size: 84, color: "#141e2e" },
    robot,
  );

  // Exterior conduit and illuminated OPEN sign
  for (const [x, z, h] of [
    [-3.3, -1.6, 6.4],
    [4.35, -1.5, 6.65],
  ]) {
    cylinder(0.07, h, x, h / 2 + 0.25, z, 0x34384d);
    bar([x - 0.55, h - 0.15, z], [x + 0.55, h - 0.15, z], 0.035, 0x564c67);
    for (const dx of [-0.42, 0, 0.42])
      cylinder(0.04, 0.17, x + dx, h - 0.02, z, 0x796979);
  }
  for (let i = 0; i < 3; i++) {
    pipe(
      [
        [-3.72 + i * 0.42, 6.3, -1.6],
        [-0.2, 5.52 - i * 0.08, -1.6],
        [3.93 + i * 0.42, 6.56, -1.5],
      ],
      0.012,
      0x2e2d42,
    );
  }
  pipe(
    [
      [-3.3, 5.5, -1.6],
      [-2.5, 4.3, -1.4],
      [-2.6, 3.5, 0.5],
    ],
    0.017,
    0x22263a,
  );
  bar([4.35, 5.8, -1.5], [4.35, 5.8, 0.2], 0.045, 0x43465e);
  box(0.5, 0.08, 0.43, 4.35, 5.76, 0.25, 0x434557);
  box(0.43, 0.02, 0.34, 4.35, 5.7, 0.25, goldGlow);

  // OPEN sign
  const openSign = new THREE.Group();
  openSign.position.set(-2.69, 2.63, 0.24);
  openSign.rotation.y = -Math.PI / 2;
  root.add(openSign);
  rounded(0.68, 1.49, 0.1, 0, 0, 0, 0x1b2b3f, 0.03, openSign);
  frame(0.58, 1.37, 0, 0, 0.065, cyanGlow, openSign, 0.012);
  label(
    ["O", "P", "E", "N"],
    0.38,
    1.16,
    0,
    0,
    0.08,
    { size: 96, width: 256, height: 1024, color: "#80ffe8" },
    openSign,
  );

  // Lighting with Samarkand turquoise, cobalt, and saffron ambient fills
  scene.add(new THREE.HemisphereLight(0x9bbce8, 0x30243d, 1.55));
  const moon = new THREE.DirectionalLight(0x7896db, 1.25);
  moon.position.set(-5, 12, 7);
  scene.add(moon);

  function light(color, intensity, distance, x, y, z) {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  }
  light(TURQUOISE, 13, 13, -1, 3.4, 2.1);
  light(RUBY, 14, 11, 3.7, 3.5, 2.1);
  light(GOLD, 10, 8, 0, 2.7, 0.5);
  light(0xff9a55, 4, 5, -2.8, 2.6, 2.1);

  // Fine rain streaks
  const rainPositions = [],
    rainEnds = [];
  for (let i = 0; i < (mobile() ? 180 : 380); i++) {
    const x = (random() - 0.5) * 24,
      z = (random() - 0.5) * 20,
      y = random() * 15;
    for (let end = 0; end < 2; end++) {
      rainPositions.push(x, y, z);
      rainEnds.push(end);
    }
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(rainPositions, 3),
  );
  rainGeometry.setAttribute(
    "aEnd",
    new THREE.Float32BufferAttribute(rainEnds, 1),
  );
  const rainMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader:
      "uniform float uTime; attribute float aEnd; varying float vFade; void main(){vec3 p=position;p.y=mod(p.y-uTime*4.0,15.0)+aEnd*.16;p.x-=p.y*.035;vFade=1.0-smoothstep(7.0,15.0,p.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}",
    fragmentShader:
      "varying float vFade;void main(){gl_FragColor=vec4(.3,.6,.85,.12*vFade);}",
  });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  scene.add(rain);

  // Atmospheric dust / cyber spark particles
  const particleCount = mobile() ? 120 : 250;
  const particleGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(particleCount * 3);
  const pColors = new Float32Array(particleCount * 3);
  const pSpeeds = new Float32Array(particleCount);

  const colTurquoise = new THREE.Color(TURQUOISE);
  const colRuby = new THREE.Color(RUBY);
  const colGold = new THREE.Color(GOLD);

  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3 + 0] = (random() - 0.5) * 12;
    const py = 0.35 + random() * 5.2;
    pPositions[i * 3 + 1] = py;
    pPositions[i * 3 + 2] = (random() - 0.5) * 9;

    const col = i % 3 === 0 ? colTurquoise : i % 3 === 1 ? colRuby : colGold;
    pColors[i * 3 + 0] = col.r;
    pColors[i * 3 + 1] = col.g;
    pColors[i * 3 + 2] = col.b;

    pSpeeds[i] = 0.35 + random() * 0.75;
  }

  particleGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(pPositions, 3),
  );
  particleGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));

  particleGeo.setAttribute("aSpeed", new THREE.BufferAttribute(pSpeeds, 1));
  const particleMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute vec3 color;
      attribute float aSpeed;
      varying vec3 vColor;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * aSpeed + position.x * 3.0) * 0.22;
        p.x += cos(uTime * 0.3 * aSpeed + position.z) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(42.0 * uPixelRatio / -mv.z, 1.0, 5.0);
        vColor = color;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float alpha = 1.0 - smoothstep(0.1, 0.5, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vColor, alpha * 0.7);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dustParticles = new THREE.Points(particleGeo, particleMat);
  scene.add(dustParticles);

  // Holographic floating station markers
  function createHoloRing(x, y, z, color, radius) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.015, 8, 32),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(1.5),
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, z);
    root.add(ring);
    return ring;
  }
  const holoProjects = createHoloRing(3.34, 0.28, 1.15, TURQUOISE, 0.65);
  const holoAbout = createHoloRing(-0.4, 0.28, 1.35, RUBY, 0.75);
  const holoHonors = createHoloRing(-0.4, 4.45, 0.05, GOLD, 0.55);
  const holoContact = createHoloRing(-3.45, 0.28, 1.9, TURQUOISE, 0.58);

  // Bake static siblings by material while keeping animated and interactive
  // parts separate. Parent station metadata is retained for raycasting.
  const movingObjects = new Set([
    robot,
    trophy,
    fanBlades,
    holoProjects,
    holoAbout,
    holoHonors,
    holoContact,
  ]);
  let meshesBefore = 0;
  if (import.meta.env.DEV)
    root.traverse((object) => {
      if (object.isMesh) meshesBefore++;
    });
  function batchStaticMeshes(group) {
    const batches = new Map();
    for (const child of [...group.children]) {
      if (movingObjects.has(child)) continue;
      if (child.isGroup) {
        batchStaticMeshes(child);
        continue;
      }
      if (
        !child.isMesh ||
        child.isInstancedMesh ||
        child.userData.interactive ||
        child.material.transparent ||
        Array.isArray(child.material)
      )
        continue;
      const key = child.material;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(child);
    }
    for (const [material, meshes] of batches) {
      if (meshes.length < 2) continue;
      const baked = meshes.map((mesh) => {
        mesh.updateMatrix();
        const geometry = mesh.geometry.index
          ? mesh.geometry.toNonIndexed()
          : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrix);
        return geometry;
      });
      const merged = mergeGeometries(baked);
      baked.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      meshes.forEach((mesh) => group.remove(mesh));
      group.add(new THREE.Mesh(merged, material));
    }
  }
  batchStaticMeshes(root);
  if (import.meta.env.DEV) {
    let meshesAfter = 0;
    root.traverse((object) => {
      if (object.isMesh) meshesAfter++;
    });
    console.info(
      `Night Lab geometry: ${meshesBefore} → ${meshesAfter} meshes after batching.`,
    );
    host.dataset.meshesBefore = meshesBefore;
    host.dataset.meshesAfter = meshesAfter;
  }

  // Cinematic Camera Splines (POV on Scroll)
  // 0.00: Home (Wide establishing shot with diorama in full view)
  // 0.25: Projects (Comfortable angle framing the vending machine on the right)
  // 0.50: About (Looking through window into workshop desk, tea set, and robot)
  // 0.75: Honors (High rooftop angle, looking over marquee down at the 8-pointed star trophy)
  // 1.00: Contact (Angled view of payphone booth and street signpost)
  const cameraCurve = new THREE.CatmullRomCurve3(
    [
      v3(9.0, 5.2, 11.5), // Station 0: Home (Zoomed in & heroic)
      v3(6.8, 3.6, 7.2), // Station 1: Projects (Vending machine & cartridges)
      v3(2.2, 3.2, 6.8), // Station 2: About (Workbench, GLSL screen, Tea set, Robot)
      v3(4.2, 7.6, 7.8), // Station 3: Honors (Rooftop Star Trophy, clear over marquee)
      v3(-6.5, 3.4, 7.2), // Station 4: Contact (Payphone & Signpost)
    ],
    false,
    "catmullrom",
    0.2,
  );

  const targetCurve = new THREE.CatmullRomCurve3(
    [
      v3(0, 2.2, 0), // Station 0: Home
      v3(3.2, 1.8, 1.0), // Station 1: Projects
      v3(-0.4, 2.0, 0.9), // Station 2: About
      v3(-0.4, 4.85, 0.05), // Station 3: Honors
      v3(-3.2, 2.0, 1.6), // Station 4: Contact
    ],
    false,
    "catmullrom",
    0.2,
  );

  let motion = options.motion,
    raf = 0,
    lastFrame = 0,
    lastRender = 0,
    time = 0,
    dirty = true,
    scrollProgress = 0,
    targetScrollProgress = 0,
    isFreeOrbit = false,
    contextLost = false;
  let robotWave = 0,
    choynakSteamTimer = 0,
    trophySpinBonus = 0,
    antennaTimer;
  let frameNow = 0,
    reflectionDirty = true,
    lastReflectionTime = -Infinity;
  let hoverDirty = false,
    hoverEligible = false,
    lastHoverTime = 0,
    currentHovered = null;
  let averageFrame = 1 / 60,
    sampleFrames = 0,
    lastQualityChange = 0;
  let renderedFrames = 0;
  const pointer = new THREE.Vector2();
  const cameraPosition = v3(),
    cameraTarget = v3(),
    cameraDistance = v3();
  const markerPosition = v3();
  const raycaster = new THREE.Raycaster();
  const interactionHost = options.interactionHost || host;
  const marker = options.robotLabel;
  const finePointer = matchMedia("(pointer: fine)");
  controls.enabled = false;
  controls.enableDamping = false;

  function triggerInteractiveAction(type) {
    if (type === "robot") {
      robotWave = motion ? 1.8 : 0;
      if (!motion) robotRightArmGroup.rotation.z = 0.65;
      robotAntenna.material.color.setHex(GOLD);
      clearTimeout(antennaTimer);
      antennaTimer = setTimeout(() => {
        robotAntenna.material.color.copy(rubyGlow.color);
        if (!motion) robotRightArmGroup.rotation.z = 0;
        dirty = true;
        schedule();
      }, 1800);
    } else if (type === "choynak") {
      choynakSteamTimer = motion ? 2.5 : 0;
    } else if (type === "monitor") {
      currentShaderMode = (currentShaderMode + 1) % 3;
      cyberScreenShader.uniforms.uMode.value = currentShaderMode;
    } else if (type === "trophy") {
      if (motion) trophySpinBonus = 20;
      else star.rotation.y += Math.PI / 4;
    }
    options.onInteract?.(type);
    dirty = true;
    schedule();
  }

  function isSceneTarget(target) {
    return (
      target instanceof Element &&
      !target.closest(".story-card, button, a, .header, .dock, .scene-error")
    );
  }
  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      const rect = host.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (pointer.x === x && pointer.y === y) return;
      pointer.set(x, y);
      hoverEligible = isSceneTarget(event.target);
      hoverDirty = true;
      dirty = true;
      schedule();
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    pointer.set(0, 0);
    hoverEligible = false;
    hoverDirty = true;
    dirty = true;
    schedule();
  });

  function pick(coords) {
    raycaster.setFromCamera(coords, camera);
    const hits = raycaster.intersectObject(root, true);
    for (const hit of hits) {
      // Glass remains visually in front of the objects without blocking them.
      if (hit.object.material?.transparent) continue;
      let object = hit.object;
      while (object && !object.userData.interactive && !object.userData.section)
        object = object.parent;
      if (object) return object.userData;
      return null;
    }
    return null;
  }
  function checkHover() {
    const data = hoverEligible && !isFreeOrbit ? pick(pointer) : null;
    const found = data?.interactive || data?.section || null;
    if (found !== currentHovered) {
      currentHovered = found;
      interactionHost.style.cursor = found ? "pointer" : "";
      options.onHover?.(found);
    }
    hoverDirty = false;
  }

  // Reflections refresh immediately for camera changes, then at a lower rate
  // for ambient animation. Paused scenes still receive their first reflection.
  const originalReflect = floor.onBeforeRender;
  floor.onBeforeRender = function (...args) {
    if (!reflectionDirty && frameNow - lastReflectionTime < (eco() ? 160 : 80))
      return;
    lastReflectionTime = frameNow;
    reflectionDirty = false;
    rain.visible = dustParticles.visible = teaSteam.visible = false;
    try {
      originalReflect.apply(this, args);
    } finally {
      rain.visible = dustParticles.visible = teaSteam.visible = true;
    }
  };

  function updateMarker() {
    if (!marker) return;
    robot.localToWorld(markerPosition.set(0, 1.6, 0));
    markerPosition.project(camera);
    const x = (markerPosition.x * 0.5 + 0.5) * host.clientWidth;
    const y = (-markerPosition.y * 0.5 + 0.5) * host.clientHeight;
    marker.hidden =
      isFreeOrbit ||
      scrollProgress > 0.08 ||
      markerPosition.z > 1 ||
      x < 40 ||
      x > host.clientWidth - 40 ||
      y < 100 ||
      y > host.clientHeight - 150;
    if (!marker.hidden) {
      const safeX = Math.max(100, Math.min(host.clientWidth - 100, x));
      marker.style.transform = `translate3d(${Math.round(safeX)}px, ${Math.round(y - 14)}px, 0) translate(-50%, -100%)`;
    }
  }

  function draw(now) {
    raf = 0;
    if (document.hidden || contextLost) return;
    if (
      lastRender &&
      now - lastRender < (eco() ? 1000 / 30 : 1000 / 60) - 0.75
    ) {
      schedule();
      return;
    }
    if (import.meta.env.DEV) renderer.info.reset();
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 1 / 60;
    lastFrame = lastRender = now;
    frameNow = now;
    const previousProgress = scrollProgress;
    scrollProgress = motion
      ? scrollProgress +
        (targetScrollProgress - scrollProgress) * (1 - Math.exp(-7 * dt))
      : targetScrollProgress;
    const travelling = Math.abs(targetScrollProgress - scrollProgress) > 0.0001;
    if (!travelling) scrollProgress = targetScrollProgress;
    reflectionDirty ||=
      Math.abs(scrollProgress - previousProgress) > 0.00001 || dirty;

    let controlsChanged = false;
    if (!isFreeOrbit) {
      // getPoint preserves the five station knots; getPointAt would redistribute
      // them by distance and aim at the wrong object for a selected station.
      const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
      cameraCurve.getPoint(p, cameraPosition);
      targetCurve.getPoint(p, cameraTarget);
      if (host.clientWidth < 1000) {
        cameraDistance
          .copy(cameraPosition)
          .sub(cameraTarget)
          .multiplyScalar(Math.max(1.2, 1 / camera.aspect));
        cameraPosition.copy(cameraTarget).add(cameraDistance);
      }
      camera.position.copy(cameraPosition);
      if (motion && finePointer.matches) {
        camera.position.x += pointer.x * 0.16;
        camera.position.y += pointer.y * 0.1;
      }
      controls.target.copy(cameraTarget);
      camera.lookAt(cameraTarget);
    } else controlsChanged = controls.update(dt);

    if (motion) {
      time += dt;
      fanBlades.rotation.z += dt * 2.2;
      if (robotWave > 0) {
        robotWave -= dt;
        robotRightArmGroup.rotation.z = Math.sin(time * 12) * 0.45 + 0.5;
        robot.rotation.y = -0.25 + Math.sin(time * 6) * 0.25;
      } else {
        robotRightArmGroup.rotation.z = 0;
        robot.rotation.y = -0.25 + Math.sin(time * 0.8) * 0.12;
      }
      if (trophySpinBonus > 0) {
        trophySpinBonus = Math.max(0, trophySpinBonus - dt * 8);
        star.rotation.y += dt * (2 + trophySpinBonus);
      } else star.rotation.y = Math.sin(time * 0.6) * 0.25;
      rainMaterial.uniforms.uTime.value = time;
      floor.material.uniforms.uTime.value = time;
      cyberScreenShader.uniforms.uTime.value = time;
      particleMat.uniforms.uTime.value = time;

      const steamArray = teaSteam.geometry.attributes.position.array;
      const steamSpeed = choynakSteamTimer > 0 ? 1.4 : 0.55;
      if (choynakSteamTimer > 0) choynakSteamTimer -= dt;
      for (let i = 0; i < steamCount; i++) {
        steamLifes[i] = (steamLifes[i] + dt * steamSpeed) % 1;
        steamArray[i * 3 + 1] = 1.95 + steamLifes[i] * 0.55;
        steamArray[i * 3] = 1.85 + Math.sin(time * 2.5 + i) * 0.05;
      }
      teaSteam.geometry.attributes.position.needsUpdate = true;
      teaSteam.material.opacity = choynakSteamTimer > 0 ? 0.75 : 0.4;
      holoProjects.material.opacity = 0.4 + Math.sin(time * 2.5) * 0.18;
      holoAbout.material.opacity = 0.4 + Math.sin(time * 2.2 + 1) * 0.18;
      holoHonors.material.opacity = 0.45 + Math.sin(time * 2.8 + 2) * 0.18;
      holoContact.material.opacity = 0.4 + Math.sin(time * 2 + 3) * 0.18;
    }

    scene.updateMatrixWorld();
    if (hoverDirty && now - lastHoverTime > 80) {
      checkHover();
      lastHoverTime = now;
    }
    if (!eco() && effects) effects.composer.render();
    else renderer.render(scene, camera);
    if (import.meta.env.DEV) {
      host.dataset.renderedFrames = ++renderedFrames;
      host.dataset.drawCalls = renderer.info.render.calls;
    }
    updateMarker();
    dirty = false;

    // Auto quality reacts to sustained slow frames, avoiding shader warmup.
    if (motion && qualityMode === "auto" && ++sampleFrames > 90) {
      averageFrame += (dt - averageFrame) * 0.05;
      if (now - lastQualityChange > 6000) {
        const previousScale = adaptiveScale;
        if (averageFrame > (eco() ? 0.055 : 0.035))
          adaptiveScale = Math.max(0.65, adaptiveScale - 0.15);
        else if (averageFrame < (eco() ? 0.037 : 0.021))
          adaptiveScale = Math.min(1, adaptiveScale + 0.1);
        if (previousScale !== adaptiveScale) {
          lastQualityChange = now;
          resize();
        }
      }
    }
    if (motion || travelling || (isFreeOrbit && controlsChanged) || hoverDirty)
      schedule();
  }

  function schedule() {
    if (!raf && !document.hidden && !contextLost)
      raf = requestAnimationFrame(draw);
  }
  controls.addEventListener("change", () => {
    reflectionDirty = true;
    dirty = true;
    schedule();
  });

  function updateFraming() {
    const w = host.clientWidth,
      h = host.clientHeight;
    camera.setViewOffset(
      w,
      h,
      isFreeOrbit ? 0 : w >= 1000 ? -w * 0.2 : 0,
      !isFreeOrbit && w < 1000 ? h * 0.26 : 0,
      w,
      h,
    );
  }
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    updateFraming();
    const ratio =
      Math.min(
        window.devicePixelRatio || 1,
        eco() ? 1 : 1.5,
        Math.sqrt((eco() ? 950000 : 2400000) / (w * h)),
      ) * adaptiveScale;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    if (effects) {
      effects.composer.setPixelRatio(ratio);
      effects.composer.setSize(w, h);
      effects.bloom.setSize(
        Math.round(w * ratio * 0.5),
        Math.round(h * ratio * 0.5),
      );
    } else if (!eco() && !effectsPromise) {
      effectsPromise = import("./effects.js")
        .then(({ createEffects }) => {
          effects = createEffects(renderer, scene, camera);
          resize();
        })
        .catch((error) =>
          console.warn(
            "Bloom unavailable; direct rendering remains active.",
            error,
          ),
        );
    }
    particleMat.uniforms.uPixelRatio.value = ratio;
    host.dataset.graphics = eco() ? "eco" : "high";
    floor.getRenderTarget().setSize(eco() ? 256 : 512, eco() ? 256 : 512);
    reflectionDirty = dirty = true;
    schedule();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else {
      lastFrame = lastRender = 0;
      reflectionDirty = true;
      schedule();
    }
  });

  let down = null;
  function pointerDown(event) {
    if (!isSceneTarget(event.target)) return;
    down = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }
  function pointerUp(event) {
    if (!down || down.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (distance > 8 || !isSceneTarget(event.target)) return;
    const rect = host.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const data = pick(pointer);
    if (data?.interactive) triggerInteractiveAction(data.interactive);
    else if (data?.section) options.onSelect?.(data.section);
  }
  for (const surface of new Set([renderer.domElement, interactionHost])) {
    surface.addEventListener("pointerdown", pointerDown, { passive: true });
    surface.addEventListener("pointerup", pointerUp, { passive: true });
    surface.addEventListener("pointercancel", () => {
      down = null;
    });
  }
  host.addEventListener("keydown", (event) => {
    if (!isFreeOrbit) return;
    const actions = {
      ArrowLeft: () => controls.rotateLeft(0.12),
      ArrowRight: () => controls.rotateLeft(-0.12),
      ArrowUp: () => controls.rotateUp(0.1),
      ArrowDown: () => controls.rotateUp(-0.1),
      "+": () => controls.dollyIn(1.12),
      "=": () => controls.dollyIn(1.12),
      "-": () => controls.dollyOut(1.12),
    };
    if (actions[event.key]) {
      event.preventDefault();
      actions[event.key]();
      dirty = true;
      schedule();
    }
  });

  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (marker) marker.hidden = true;
    document.body.classList.add("no-webgl");
    document.querySelector("#scene-error").hidden = false;
    options.onContextChange?.(false);
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    document.body.classList.remove("no-webgl");
    document.querySelector("#scene-error").hidden = true;
    lastFrame = lastRender = 0;
    options.onContextChange?.(true);
    resize();
  });

  await renderer.compileAsync(scene, camera);
  resize();
  return {
    setScrollProgress(p) {
      const next = THREE.MathUtils.clamp(p, 0, 1);
      if (next === targetScrollProgress) return;
      targetScrollProgress = next;
      dirty = true;
      schedule();
    },
    setMotion(enabled) {
      motion = enabled;
      controls.enableDamping = enabled && isFreeOrbit;
      lastFrame = lastRender = 0;
      dirty = true;
      schedule();
    },
    setQuality(mode) {
      qualityMode = ["auto", "eco", "high"].includes(mode) ? mode : "auto";
      adaptiveScale = 1;
      averageFrame = 1 / 60;
      sampleFrames = 0;
      resize();
    },
    toggleOrbit(enabled) {
      isFreeOrbit = typeof enabled === "boolean" ? enabled : !isFreeOrbit;
      controls.enabled = isFreeOrbit;
      controls.enableZoom = controls.enableRotate = isFreeOrbit;
      controls.enableDamping = motion && isFreeOrbit;
      updateFraming();
      dirty = true;
      schedule();
      return isFreeOrbit;
    },
    interact: triggerInteractiveAction,
    reset() {
      targetScrollProgress = scrollProgress = 0;
      pointer.set(0, 0);
      isFreeOrbit = false;
      controls.enabled =
        controls.enableZoom =
        controls.enableRotate =
        controls.enableDamping =
          false;
      updateFraming();
      dirty = true;
      schedule();
    },
  };
}
