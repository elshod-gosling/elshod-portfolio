import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const CYAN = 0x55ffed,
  PINK = 0xff3aaf,
  GOLD = 0xffb352;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const random = (() => {
  let s = 73;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
})();

export async function createWorkshop(host, options) {
  options.onProgress("Switching on the workshop…");
  const mobile = () => host.clientWidth < 650;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.5 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x070b18);
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b18);
  scene.fog = new THREE.FogExp2(0x070b18, 0.023);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 110);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = options.motion;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false; // Enabled only when user toggles Free Orbit
  controls.enableRotate = false; // Enabled only when user toggles Free Orbit
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.55;
  controls.minAzimuthAngle = -1.2;
  controls.maxAzimuthAngle = 1.6;
  controls.minDistance = 5;
  controls.maxDistance = 42;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.target.set(0, 2.2, 0);
  camera.position.set(11.2, 7.2, 14.5);
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples = mobile() ? 2 : 4;
  composer.renderTarget2.samples = mobile() ? 2 : 4;
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(800, 600),
    0.38,
    0.4,
    1.15,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const unitBox = new THREE.BoxGeometry(1, 1, 1),
    materials = new Map();
  function mat(color, metalness = 0.15, roughness = 0.65) {
    const k = `${color}/${metalness}/${roughness}`;
    if (!materials.has(k))
      materials.set(
        k,
        new THREE.MeshStandardMaterial({ color, metalness, roughness }),
      );
    return materials.get(k);
  }
  const glow = (color) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(1.6),
      toneMapped: false,
    });
  const cyanGlow = glow(CYAN),
    pinkGlow = glow(PINK),
    goldGlow = glow(GOLD);
  const root = new THREE.Group();
  scene.add(root);
  function box(w, h, d, x, y, z, color = 0x19243b, parent = root) {
    const o = new THREE.Mesh(
      unitBox,
      typeof color === "number" ? mat(color) : color,
    );
    o.scale.set(w, h, d);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function rounded(w, h, d, x, y, z, color, r = 0.06, parent = root) {
    const o = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 2, r),
      typeof color === "number" ? mat(color) : color,
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
      new THREE.CylinderGeometry(radiusTop, radius, height, 20),
      typeof color === "number" ? mat(color) : color,
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function sphere(radius, x, y, z, color, parent = root) {
    const o = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 12),
      typeof color === "number" ? mat(color) : color,
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
      typeof color === "number" ? mat(color) : color,
    );
    parent.add(o);
    return o;
  }
  function bar(a, b, radius, color, parent = root) {
    const start = v3(...a),
      end = v3(...b);
    const o = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 8),
      typeof color === "number" ? mat(color) : color,
    );
    o.position.copy(start).add(end).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(v3(0, 1, 0), end.sub(start).normalize());
    parent.add(o);
    return o;
  }
  function textTexture(
    lines,
    {
      color = "#b5fff9",
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
      c.shadowBlur = 7;
      c.shadowColor = color;
      c.fillStyle = color;
      c.fillText(line, align === "center" ? width / 2 : 35, y, width - 50);
      c.shadowBlur = 0;
    });
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
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
  for (const image of [shaderImage])
    if (image) {
      image.colorSpace = THREE.SRGBColorSpace;
      image.anisotropy = 4;
    }
  options.onProgress("Stocking the project shelf…");

  // Pavement: a live planar reflection with a subtle wet-surface distortion.
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
      "vec4(mix(vec3(.0021,.00335,.0091),base.rgb*.46,exp(-length(vGround)*.018)),1.0)",
    );
  const floor = new Reflector(new THREE.PlaneGeometry(160, 160), {
    textureWidth: mobile() ? 512 : 1024,
    textureHeight: mobile() ? 512 : 1024,
    clipBias: 0.003,
    shader: floorShader,
    multisample: 0,
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  scene.add(floor);
  // A raised sidewalk gives the diorama a physical edge against its reflections.
  box(9.1, 0.23, 6.4, 0, 0.105, 0.25, 0x1a2437);
  box(9.15, 0.055, 0.09, 0, 0.225, 3.48, 0x3c5262);
  box(0.09, 0.055, 6.4, 4.53, 0.225, 0.25, 0x394657);
  for (let i = 0; i < 14; i++)
    box(0.018, 0.007, 6.3, -4.3 + i * 0.65, 0.226, 0.2, 0x101728);
  for (let i = 0; i < 10; i++)
    box(9, 0.008, 0.018, 0, 0.227, -2.7 + i * 0.65, 0x101728);
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
  // Soft pools of spilled neon, separate from the sharp reflected signage.
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
  groundGlow(-1, 2, CYAN, 7, 0.28);
  groundGlow(3, 1, PINK, 6, 0.28);
  groundGlow(-3, 2.6, GOLD, 3, 0.2);

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
  // The booth is open at the front, with an actual furnished interior.
  box(5.2, 0.22, 3.5, 0, 0.35, -0.35, 0x14233a);
  box(5.2, 3.1, 0.16, 0, 1.95, -2.0, 0x17243c);
  box(0.17, 3.1, 3.5, -2.53, 1.95, -0.35, 0x20354d);
  box(0.17, 3.1, 3.5, 2.53, 1.95, -0.35, 0x20324a);
  box(5.5, 0.22, 3.85, 0, 3.58, -0.35, 0x182438);
  box(5.65, 0.07, 3.92, 0, 3.72, -0.35, 0x3d405e);
  for (let i = 0; i < 14; i++)
    box(0.04, 0.04, 3.8, -2.6 + i * 0.4, 3.78, -0.35, 0x48516c);
  for (const x of [-2.46, 2.46]) box(0.18, 2.8, 0.18, x, 1.86, 1.34, 0x414052);
  box(4.75, 1.15, 0.54, 0, 1.02, 1.24, 0x2c3047, aboutGroup);
  for (let i = 0; i < 13; i++)
    box(
      0.24,
      1.03,
      0.035,
      -2.16 + i * 0.36,
      1.02,
      1.53,
      i % 2 ? 0x42344b : 0x34324a,
      aboutGroup,
    );
  box(5.22, 0.13, 0.87, 0, 1.67, 1.3, 0x73504b, aboutGroup);
  box(5.22, 0.035, 0.04, 0, 1.72, 1.75, 0xc18868, aboutGroup);
  box(5.1, 0.035, 0.03, 0, 0.51, 1.57, pinkGlow, aboutGroup);
  // Hanging perforated tool wall and shelves.
  box(4.5, 1.75, 0.065, 0, 2.27, -1.87, 0x26364f);
  for (let x = 0; x < 18; x++)
    for (let y = 0; y < 7; y++)
      box(
        0.018,
        0.018,
        0.012,
        -2.1 + x * 0.24,
        1.65 + y * 0.22,
        -1.826,
        0x586379,
      );
  box(4.2, 0.09, 0.36, 0, 2.85, -1.57, 0x75634e);
  for (let i = 0; i < 9; i++) {
    const height = 0.18 + random() * 0.17;
    box(
      0.12,
      height,
      0.17,
      -1.8 + i * 0.2,
      2.94 + height / 2,
      -1.55,
      [0x376b74, 0x72505e, 0x8a7444][i % 3],
    );
  }
  label(
    "KEEP MAKING THINGS.",
    2.2,
    0.22,
    0.25,
    2.51,
    -1.81,
    { size: 60, color: "#87a7bf", font: "500" },
    aboutGroup,
  );
  box(4.75, 0.04, 0.03, 0, 3.25, 1.28, cyanGlow);

  // Live animated GLSL Cyberpunk shader for the main monitor screen
  const cyberScreenShader = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
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
      uniform sampler2D uTexture;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        // Cyber scanlines
        float scanline = sin(uv.y * 220.0 + uTime * 6.0) * 0.06;
        // Perspective digital cyber grid on screen
        vec2 p = uv * 2.0 - 1.0;
        float gridY = 0.5 / (abs(p.y) + 0.12) + uTime * 0.6;
        float gridX = p.x / (abs(p.y) + 0.12);
        float grid = (step(0.91, fract(gridX * 3.5)) + step(0.91, fract(gridY * 3.5))) * 0.22;

        // Matrix rain / code pulse stream
        float stream = sin(uv.y * 32.0 - uTime * 10.0 + sin(uv.x * 24.0) * 5.0);
        stream = smoothstep(0.72, 0.98, stream) * 0.38;

        vec4 tex = texture2D(uTexture, uv);
        vec3 base = tex.a > 0.05 ? tex.rgb * 1.15 : vec3(0.04, 0.08, 0.16);

        vec3 neonCyan = vec3(0.2, 0.96, 0.9);
        vec3 neonPink = vec3(1.0, 0.22, 0.72);

        vec3 col = base + neonCyan * (grid + stream) - scanline;
        col += neonPink * (0.06 * sin(uTime * 1.8 + uv.x * 5.0));

        // Edge vignette / bezel screen gradient
        float edge = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) *
                     smoothstep(0.0, 0.05, uv.y) * smoothstep(1.0, 0.95, uv.y);
        col *= edge;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  });

  function monitor(x, y, z, width, height, matOrTex) {
    rounded(
      width + 0.14,
      height + 0.14,
      0.12,
      x,
      y,
      z,
      0x10172b,
      0.05,
      aboutGroup,
    );
    const screenMat = matOrTex instanceof THREE.Material
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
    aboutGroup.add(screen);
    box(0.055, 0.27, 0.07, x, y - height / 2 - 0.18, z, 0x4a526a, aboutGroup);
    box(
      0.45,
      0.04,
      0.27,
      x,
      y - height / 2 - 0.32,
      z + 0.01,
      0x3a475c,
      aboutGroup,
    );
    sphere(
      0.018,
      x + width / 2 - 0.02,
      y - height / 2 - 0.045,
      z + 0.073,
      cyanGlow,
      aboutGroup,
    );
  }
  monitor(-0.85, 2.26, 0.62, 1.55, 0.87, cyberScreenShader);

  const codeTexture = textTexture(
    [
      "> elshod@night-lab:~$",
      "  init shaders --target GLSL",
      "  Iris / OptiFine [OK]",
      "  120 FPS · Tashkent UTC+5",
      "  building next gen...",
    ],
    {
      color: "#83f8dc",
      background: "#081923",
      size: 26,
      font: "500",
      width: 768,
      height: 400,
      align: "left",
    },
  );
  monitor(0.95, 2.2, 0.64, 1.1, 0.75, codeTexture);
  // Keyboard, mug, soldering tools, and the bright little power switch.
  box(1, 0.045, 0.32, -0.8, 1.76, 1.21, 0x232a40, aboutGroup);
  const keys = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.053, 0.018, 0.044),
    mat(0x728299),
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
  cylinder(0.09, 0.24, 1.84, 1.85, 1.28, 0x466b76, aboutGroup);
  cylinder(0.075, 0.01, 1.84, 1.975, 1.28, 0x0b1528, aboutGroup);
  const mugHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.016, 6, 15),
    mat(0x466b76),
  );
  mugHandle.position.set(1.95, 1.86, 1.28);
  aboutGroup.add(mugHandle);
  for (let i = 0; i < 5; i++)
    box(
      0.03,
      0.24,
      0.03,
      -1.96 + i * 0.055,
      1.86,
      0.76,
      [0x8d6474, 0x577d78, 0xb9914f][i % 3],
      aboutGroup,
    );
  cylinder(0.17, 0.1, -1.85, 1.75, 0.76, 0x353345, aboutGroup);
  label(
    "REAL-TIME / REAL CURIOUS",
    2.2,
    0.15,
    0,
    0.88,
    1.557,
    { size: 40, color: "#d7a5bf" },
    aboutGroup,
  );

  // Striped canvas awning, with scalloped valance and glowing frame.
  const awning = new THREE.Group();
  awning.position.set(0, 3.33, 1.68);
  awning.rotation.x = 0.22;
  root.add(awning);
  for (let i = 0; i < 12; i++) {
    box(
      0.47,
      0.075,
      1.33,
      -2.585 + i * 0.47,
      0,
      0,
      i % 2 ? 0x432b59 : 0x6b3567,
      awning,
    );
    box(
      0.47,
      0.22,
      0.06,
      -2.585 + i * 0.47,
      -0.12,
      0.65,
      i % 2 ? 0x432b59 : 0x6b3567,
      awning,
    );
  }
  bar([-2.84, -0.03, 0.68], [2.84, -0.03, 0.68], 0.025, pinkGlow, awning);
  for (const x of [-2.6, 2.6])
    bar([x, 3.32, 2.31], [x, 2.82, 1.35], 0.035, 0x55516b);
  // Main marquee: typography is part of the building, not an overlay.
  rounded(5.5, 1.08, 0.24, 0, 4.35, 1.25, 0x22233e, 0.06);
  box(5.23, 0.85, 0.02, 0, 4.35, 1.382, 0x101b30);
  frame(5.35, 0.94, 0, 4.35, 1.41, pinkGlow, root, 0.024);
  frame(5.13, 0.75, 0, 4.35, 1.425, mat(0x407b86), root, 0.01);
  label("ELSHOD’S", 4.8, 0.64, 0, 4.47, 1.44, {
    size: 134,
    color: "#aafff5",
    font: "650",
  });
  label("N I G H T   L A B", 3.75, 0.24, 0, 4.08, 1.44, {
    size: 64,
    color: "#ff9bde",
    font: "500",
  });
  for (const x of [-2.15, 2.15])
    bar([x, 3.74, 1.17], [x, 3.88, 1.17], 0.055, 0x353653);
  // Rooftop utility boxes, pipes, a satellite dish, and a trophy sign.
  rounded(1.18, 0.64, 0.85, 1.48, 4.12, -0.72, 0x535369, 0.05);
  const fan = new THREE.Group();
  fan.position.set(1.48, 4.13, -0.269);
  root.add(fan);
  const fanRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.022, 8, 32),
    mat(0x263348),
  );
  fan.add(fanRing);
  const fanBlades = new THREE.Group();
  fan.add(fanBlades);
  for (let i = 0; i < 5; i++) {
    const blade = box(0.115, 0.35, 0.018, 0, 0.08, 0.015, 0x222c43, fanBlades);
    blade.rotation.z = (i * Math.PI * 2) / 5;
  }
  sphere(0.055, 1.48, 4.13, -0.237, 0x66718a);
  for (let i = 0; i < 6; i++)
    box(0.1, 0.28, 0.025, 0.75 + i * 0.065, 4.1, -0.265, 0x202b40);
  pipe(
    [
      [-2.65, 1, -0.5],
      [-2.65, 3.5, -0.5],
      [-2.65, 4.05, -1],
      [-2.1, 4.1, -1],
    ],
    0.07,
    0x9b7153,
  );
  pipe(
    [
      [2.67, 0.5, -1.1],
      [2.67, 2.8, -1.1],
      [2.67, 2.9, 0.2],
    ],
    0.055,
    0x80706c,
  );
  for (let i = 0; i < 4; i++)
    cylinder(0.32, 0.055, -1.2, 3.9 + i * 0.14, -0.8, 0x42465b);
  cylinder(0.28, 0.7, -1.2, 4.19, -0.8, 0x323a51);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 24, 12, 0, Math.PI * 2, 0, 0.65),
    mat(0x8392a0, 0.45, 0.45),
  );
  dish.rotation.set(-0.6, 0.2, -0.4);
  dish.position.set(-1.22, 4.7, -0.85);
  root.add(dish);
  bar([-1.2, 4.5, -0.8], [-0.85, 4.95, -0.5], 0.017, 0x6e86a4);
  const trophy = new THREE.Group();
  trophy.position.set(-0.4, 4.65, 0.05);
  honorsGroup.add(trophy);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 + Math.PI / 2,
      r = i % 2 ? 0.16 : 0.36;
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.01,
      bevelSegments: 1,
      steps: 1,
    }),
    goldGlow,
  );
  star.position.y = 0.19;
  trophy.add(star);
  cylinder(0.035, 0.3, 0, -0.12, 0, 0xc79557, trophy);
  box(0.62, 0.12, 0.38, 0, -0.31, 0, 0x514a49, trophy);
  box(1.55, 0.32, 0.07, -0.4, 5.27, 0.04, 0x251c35, honorsGroup);
  label(
    "SIDE QUESTS ★",
    1.45,
    0.23,
    -0.4,
    5.27,
    0.082,
    { color: "#ffd09a", size: 80 },
    honorsGroup,
  );

  // Project vending machine. Each brightly colored cartridge represents a build.
  rounded(1.45, 2.62, 1.04, 3.34, 1.55, 0.58, 0x65334f, 0.09, projectsGroup);
  rounded(1.28, 2.39, 0.07, 3.34, 1.59, 1.12, 0x2d243e, 0.035, projectsGroup);
  box(0.91, 1.57, 0.06, 3.17, 1.78, 1.176, 0x091d31, projectsGroup);
  frame(0.99, 1.65, 3.17, 1.78, 1.22, cyanGlow, projectsGroup, 0.016);
  label(
    "PROJECTS",
    1.14,
    0.25,
    3.34,
    2.66,
    1.19,
    { size: 100, color: "#92fff3" },
    projectsGroup,
  );
  const cartridgeColors = [
    0x4ecdbb, 0x9e6ddd, 0xb77bd3, 0x5099c1, 0xc17d49, 0x648d86,
  ];
  for (let i = 0; i < 6; i++) {
    const x = 2.94 + (i % 2) * 0.42,
      y = 2.25 - Math.floor(i / 2) * 0.49;
    rounded(
      0.24,
      0.32,
      0.2,
      x,
      y,
      1.23,
      cartridgeColors[i],
      0.025,
      projectsGroup,
    );
    box(0.17, 0.09, 0.008, x, y + 0.025, 1.337, 0xc9dde0, projectsGroup);
    cylinder(0.04, 0.04, x, y + 0.18, 1.23, 0x334557, projectsGroup);
  }
  for (let i = 0; i < 3; i++)
    box(
      0.9,
      0.025,
      0.2,
      3.17,
      2.05 - i * 0.5,
      1.23,
      mat(0x445772),
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
      i === 0 ? pinkGlow : 0x747289,
      projectsGroup,
    );
  box(0.16, 0.035, 0.015, 3.86, 1.04, 1.203, 0x111729, projectsGroup);
  rounded(0.82, 0.29, 0.035, 3.25, 0.6, 1.195, 0x11192e, 0.03, projectsGroup);
  label(
    "PICK A PROJECT",
    0.77,
    0.15,
    3.25,
    0.61,
    1.22,
    { size: 62, color: "#ad80ad" },
    projectsGroup,
  );
  label(
    "01—04",
    0.22,
    0.5,
    4.077,
    1.86,
    0.6,
    { size: 85, color: "#b784b3" },
    projectsGroup,
  ).rotation.y = Math.PI / 2;

  // A payphone doubles as the contact portal.
  cylinder(0.07, 1.3, -3.45, 0.9, 1.8, 0x4e4554, contactGroup);
  rounded(0.85, 1.18, 0.58, -3.45, 1.94, 1.8, 0xa0714a, 0.07, contactGroup);
  rounded(0.7, 0.93, 0.03, -3.45, 1.98, 2.106, 0x1d293e, 0.03, contactGroup);
  label(
    ["SAY", "HELLO."],
    0.54,
    0.46,
    -3.45,
    2.12,
    2.133,
    { size: 90, height: 420, color: "#90ffe9" },
    contactGroup,
  );
  for (let i = 0; i < 9; i++)
    box(
      0.07,
      0.04,
      0.025,
      -3.56 + (i % 3) * 0.11,
      1.91 - Math.floor(i / 3) * 0.075,
      2.145,
      0x7397a4,
      contactGroup,
    );
  pipe(
    [
      [-3.8, 2.2, 2.18],
      [-3.85, 1.95, 2.2],
      [-3.8, 1.69, 2.18],
    ],
    0.05,
    0x536478,
    contactGroup,
  );
  pipe(
    [
      [-3.81, 1.69, 2.18],
      [-3.87, 1.37, 2.16],
      [-3.58, 1.26, 2.13],
      [-3.5, 1.64, 2.13],
    ],
    0.013,
    0x303448,
    contactGroup,
  );
  label(
    "THE HOTLINE",
    0.88,
    0.19,
    -3.45,
    2.66,
    1.82,
    { size: 87, color: "#ffc178" },
    contactGroup,
  );
  // Physical signpost, stools, utility pole, and little workshop life.
  cylinder(0.045, 3.5, -4.07, 1.99, 2.72, 0x566076);
  const signBoards = [
    ["PROJECTS →", 2.85, 0x28616a, "#80fff1", "projects"],
    ["← ABOUT ME", 2.39, 0x6a355d, "#ffa5e1", "about"],
    ["SAY HELLO ↗", 1.93, 0x826240, "#ffdd95", "contact"],
  ];
  for (const [text, y, color, ink, id] of signBoards) {
    const g = new THREE.Group();
    g.userData.section = id;
    root.add(g);
    rounded(1.72, 0.35, 0.1, -4.07, y, 2.87, color, 0.025, g);
    label(text, 1.53, 0.25, -4.07, y, 2.934, { size: 83, color: ink }, g);
  }
  for (const x of [-1.55, 0, 1.55]) {
    cylinder(0.29, 0.13, x, 0.93, 2.53, 0x884c61);
    cylinder(0.25, 0.035, x, 1.012, 2.53, 0xb2677d);
    for (const dx of [-0.17, 0.17])
      for (const dz of [-0.14, 0.14])
        bar(
          [x + dx, 0.29, 2.53 + dz],
          [x + dx * 0.8, 0.87, 2.53 + dz * 0.8],
          0.025,
          0x4b5065,
        );
    const footRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.018, 6, 20),
      mat(0x646b7b),
    );
    footRing.rotation.x = Math.PI / 2;
    footRing.position.set(x, 0.48, 2.53);
    root.add(footRing);
  }
  // Paper lanterns: warm islands in the cyan and magenta light.
  function lantern(x, y, z) {
    bar([x, y + 0.7, z], [x, y + 0.38, z], 0.012, 0x6c5663);
    const lamp = sphere(0.32, x, y, z, glow(0xffa16b));
    lamp.scale.y = 1.15;
    for (let i = 0; i < 7; i++) {
      const yy = (i - 3) * 0.08;
      const rr = Math.sqrt(Math.max(0.015, 0.32 * 0.32 - yy * yy));
      const hoop = new THREE.Mesh(
        new THREE.TorusGeometry(rr, 0.007, 5, 28),
        mat(0x9d5b4b),
      );
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(x, y + yy * 1.12, z);
      root.add(hoop);
    }
    cylinder(0.12, 0.065, x, y + 0.36, z, 0x493443);
    cylinder(0.1, 0.08, x, y - 0.37, z, 0x493443);
    label("夜", 0.25, 0.28, x, y, z + 0.325, {
      size: 170,
      width: 256,
      height: 256,
      color: "#8e3e47",
      font: "600",
    });
  }
  lantern(-2.72, 2.78, 1.88);
  lantern(2.72, 3.35, 1.68);
  // Robot caretaker, including an animated head and antenna light.
  const robot = new THREE.Group();
  robot.position.set(3.75, 0.24, 2.57);
  robot.rotation.y = -0.25;
  robot.userData.section = "about";
  root.add(robot);
  rounded(0.55, 0.48, 0.38, 0, 0.4, 0, 0x798ba3, 0.07, robot);
  rounded(0.66, 0.43, 0.42, 0, 0.92, 0.02, 0x9fa8bb, 0.08, robot);
  rounded(0.5, 0.25, 0.035, 0, 0.94, 0.244, 0x101b31, 0.055, robot);
  box(0.105, 0.07, 0.012, -0.13, 0.96, 0.269, cyanGlow, robot);
  box(0.105, 0.07, 0.012, 0.13, 0.96, 0.269, cyanGlow, robot);
  bar([0, 1.14, 0.02], [0, 1.36, 0.02], 0.016, 0x8f92a9, robot);
  sphere(0.05, 0, 1.37, 0.02, pinkGlow, robot);
  for (const x of [-0.19, 0.19])
    rounded(0.22, 0.12, 0.3, x, 0.1, 0.08, 0x4f647e, 0.035, robot);
  bar([-0.31, 0.58, 0], [-0.43, 0.3, 0.1], 0.05, 0x66758e, robot);
  bar([0.31, 0.57, 0], [0.48, 0.78, 0.08], 0.05, 0x66758e, robot);
  sphere(0.065, 0.48, 0.82, 0.08, 0xa2b5c5, robot);
  label(
    "EL-01",
    0.3,
    0.09,
    0,
    0.43,
    0.2,
    { size: 84, color: "#172336" },
    robot,
  );
  // Shipping crates and a hardy little plant beside the booth.
  for (let i = 0; i < 2; i++) {
    box(0.62, 0.45, 0.57, -3.1, 0.47 + i * 0.45, -0.8, 0x66505d);
    frame(
      0.54,
      0.34,
      -3.1,
      0.47 + i * 0.45,
      -0.507,
      mat(0x9a6e69),
      root,
      0.012,
    );
  }
  cylinder(0.23, 0.35, -2.95, 0.42, 2.85, 0x735460, root, 0.17);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const leaf = sphere(
      0.13,
      -2.95 + Math.cos(a) * 0.16,
      0.78,
      2.85 + Math.sin(a) * 0.16,
      0x357c79,
    );
    leaf.scale.set(0.45, 2.2, 0.7);
    leaf.rotation.set(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8);
  }
  // Exterior conduit and overhead electrical lines.
  for (const [x, z, h] of [
    [-3.3, -1.6, 6.4],
    [4.35, -1.5, 6.65],
  ]) {
    cylinder(0.07, h, x, h / 2 + 0.25, z, 0x3c4059);
    bar([x - 0.55, h - 0.15, z], [x + 0.55, h - 0.15, z], 0.035, 0x655a76);
    for (const dx of [-0.42, 0, 0.42])
      cylinder(0.04, 0.17, x + dx, h - 0.02, z, 0x8c7a8c);
  }
  for (let i = 0; i < 3; i++) {
    pipe(
      [
        [-3.72 + i * 0.42, 6.3, -1.6],
        [-0.2, 5.52 - i * 0.08, -1.6],
        [3.93 + i * 0.42, 6.56, -1.5],
      ],
      0.012,
      0x36354d,
    );
  }
  pipe(
    [
      [-3.3, 5.5, -1.6],
      [-2.5, 4.3, -1.4],
      [-2.6, 3.5, 0.5],
    ],
    0.017,
    0x282c44,
  );
  bar([4.35, 5.8, -1.5], [4.35, 5.8, 0.2], 0.045, 0x4f536d);
  box(0.5, 0.08, 0.43, 4.35, 5.76, 0.25, 0x4e5064);
  box(0.43, 0.02, 0.34, 4.35, 5.7, 0.25, goldGlow);
  const openSign = new THREE.Group();
  openSign.position.set(-2.69, 2.63, 0.24);
  openSign.rotation.y = -Math.PI / 2;
  root.add(openSign);
  rounded(0.68, 1.49, 0.1, 0, 0, 0, 0x203249, 0.03, openSign);
  frame(0.58, 1.37, 0, 0, 0.065, cyanGlow, openSign, 0.012);
  label(
    ["O", "P", "E", "N"],
    0.38,
    1.16,
    0,
    0,
    0.08,
    { size: 84, width: 256, height: 1024, color: "#8effed" },
    openSign,
  );

  // Lighting is deliberately local: an amber interior and two neon washes.
  scene.add(new THREE.HemisphereLight(0x88a6e5, 0x29213d, 1.05));
  const moon = new THREE.DirectionalLight(0x839edc, 1.2);
  moon.position.set(-5, 10, 6);
  scene.add(moon);
  function light(color, intensity, distance, x, y, z) {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  }
  light(CYAN, 12, 12, -1, 3.4, 2.1);
  light(PINK, 16, 11, 3.7, 3.5, 2.1);
  light(0xffba82, 9, 7, 0, 2.7, 0.5);
  light(0xffa96d, 4, 5, -2.8, 2.6, 2.1);

  // Fine rain streaks; no images, tracking, or external asset services.
  const rainPositions = [],
    rainEnds = [];
  for (let i = 0; i < (mobile() ? 200 : 420); i++) {
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
      "varying float vFade;void main(){gl_FragColor=vec4(.36,.55,.76,.11*vFade);}",
  });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  scene.add(rain);
  // Floating atmospheric dust / cyber spark motes
  const particleCount = mobile() ? 110 : 240;
  const particleGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(particleCount * 3);
  const pColors = new Float32Array(particleCount * 3);
  const pBaseY = new Float32Array(particleCount);
  const pSpeeds = new Float32Array(particleCount);

  const colCyan = new THREE.Color(CYAN);
  const colPink = new THREE.Color(PINK);
  const colGold = new THREE.Color(GOLD);

  for (let i = 0; i < particleCount; i++) {
    pPositions[i * 3 + 0] = (random() - 0.5) * 12;
    const py = 0.35 + random() * 5.2;
    pPositions[i * 3 + 1] = py;
    pBaseY[i] = py;
    pPositions[i * 3 + 2] = (random() - 0.5) * 9;

    const col = i % 3 === 0 ? colCyan : i % 3 === 1 ? colPink : colGold;
    pColors[i * 3 + 0] = col.r;
    pColors[i * 3 + 1] = col.g;
    pColors[i * 3 + 2] = col.b;

    pSpeeds[i] = 0.35 + random() * 0.75;
  }

  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: mobile() ? 0.05 : 0.075,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
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
  const holoProjects = createHoloRing(3.34, 0.28, 1.15, CYAN, 0.65);
  const holoAbout = createHoloRing(-0.4, 0.28, 1.35, PINK, 0.75);
  const holoHonors = createHoloRing(-0.4, 4.45, 0.05, GOLD, 0.55);
  const holoContact = createHoloRing(-3.45, 0.28, 1.9, CYAN, 0.58);

  // Cinematic Camera Splines (POV on Scroll)
  // 0.00: Home (Wide diorama establishing shot)
  // 0.25: Projects (Vending machine terminal close-up)
  // 0.50: About (Workbench & dual screen command desk)
  // 0.75: Honors (Rooftop golden star trophy & antenna)
  // 1.00: Contact (Hotline payphone booth & signboards)
  const cameraCurve = new THREE.CatmullRomCurve3(
    [
      v3(11.2, 7.2, 14.5), // Station 0: Home
      v3(6.2, 3.4, 5.2),   // Station 1: Projects
      v3(-0.25, 2.32, 3.1),// Station 2: About
      v3(1.8, 5.6, 6.2),   // Station 3: Honors
      v3(-5.2, 3.1, 5.2),  // Station 4: Contact
    ],
    false,
    "catmullrom",
    0.2,
  );

  const targetCurve = new THREE.CatmullRomCurve3(
    [
      v3(0, 2.2, 0),        // Station 0: Home
      v3(3.34, 1.6, 0.85),  // Station 1: Projects
      v3(-0.45, 2.15, 0.7), // Station 2: About
      v3(-0.4, 4.75, 0.0),  // Station 3: Honors
      v3(-3.45, 1.95, 1.8), // Station 4: Contact
    ],
    false,
    "catmullrom",
    0.2,
  );

  let motion = options.motion,
    raf = 0,
    lastFrame = 0,
    time = 0,
    frameCount = 0,
    dirty = true,
    scrollProgress = 0,
    targetScrollProgress = 0,
    isFreeOrbit = false;

  const pointer = new THREE.Vector2(0, 0);
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    dirty = true;
    schedule();
  });

  const originalReflect = floor.onBeforeRender;
  floor.onBeforeRender = function (...args) {
    if (frameCount % 3 === 0 || dirty)
      originalReflect.apply(this, args);
  };

  function draw(now) {
    raf = 0;
    if (document.hidden) return;
    const interval = mobile() ? 1000 / 30 : 1000 / 60;
    if (now - lastFrame < interval) {
      schedule();
      return;
    }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.08) : 0;
    lastFrame = now;

    // Smooth scroll camera interpolation
    if (motion) {
      scrollProgress += (targetScrollProgress - scrollProgress) * 0.085;
    } else {
      scrollProgress = targetScrollProgress;
    }
    if (Math.abs(targetScrollProgress - scrollProgress) > 0.0003) {
      dirty = true;
    }

    if (!isFreeOrbit) {
      const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
      const baseCamPos = cameraCurve.getPointAt(p);
      const baseTarget = targetCurve.getPointAt(p);

      if (mobile()) {
        const diff = baseCamPos.clone().sub(baseTarget);
        diff.multiplyScalar(1.22);
        diff.y += 0.55;
        baseCamPos.copy(baseTarget).add(diff);
      }

      // Smooth mouse parallax
      const parX = pointer.x * (mobile() ? 0.12 : 0.35);
      const parY = pointer.y * (mobile() ? 0.09 : 0.25);

      camera.position.set(baseCamPos.x + parX, baseCamPos.y + parY, baseCamPos.z);
      controls.target.set(baseTarget.x, baseTarget.y, baseTarget.z);
    }

    controls.update();

    if (motion) {
      time += dt;
      fanBlades.rotation.z += dt * 2.2;
      robot.rotation.y = -0.25 + Math.sin(time * 0.8) * 0.12;
      star.rotation.y = Math.sin(time * 0.6) * 0.25;
      rainMaterial.uniforms.uTime.value = time;
      floor.material.uniforms.uTime.value = time;
      cyberScreenShader.uniforms.uTime.value = time;

      // Atmospheric particles bobbing
      const pArr = dustParticles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pArr[i * 3 + 1] = pBaseY[i] + Math.sin(time * pSpeeds[i] + i) * 0.22;
        pArr[i * 3 + 0] += Math.cos(time * 0.3 * pSpeeds[i] + i) * 0.001;
      }
      dustParticles.geometry.attributes.position.needsUpdate = true;

      // Holographic station ring pulses
      holoProjects.rotation.z += dt * 0.4;
      holoAbout.rotation.z -= dt * 0.35;
      holoHonors.rotation.z += dt * 0.5;
      holoContact.rotation.z -= dt * 0.45;

      holoProjects.material.opacity = 0.4 + Math.sin(time * 2.5) * 0.18;
      holoAbout.material.opacity = 0.4 + Math.sin(time * 2.2 + 1.0) * 0.18;
      holoHonors.material.opacity = 0.45 + Math.sin(time * 2.8 + 2.0) * 0.18;
      holoContact.material.opacity = 0.4 + Math.sin(time * 2.0 + 3.0) * 0.18;
    }

    frameCount++;
    composer.render();
    dirty = false;
    if (motion || Math.abs(targetScrollProgress - scrollProgress) > 0.0003 || controls.enableDamping) {
      schedule();
    }
  }

  function schedule() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(draw);
  }

  controls.addEventListener("change", () => {
    dirty = true;
    schedule();
  });

  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w * 0.7, h * 0.7);
    dirty = true;
    schedule();
  }
  new ResizeObserver(resize).observe(host);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastFrame = 0;
    } else schedule();
  });

  // 3D Click Interaction to fly to stations
  const raycaster = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (event) => {
    down = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (
      !down ||
      Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8
    ) {
      down = null;
      return;
    }
    const rect = host.getBoundingClientRect();
    const clickPointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(clickPointer, camera);
    const hits = raycaster.intersectObjects(root.children, true);
    for (const hit of hits) {
      let o = hit.object;
      while (o && !o.userData.section) o = o.parent;
      if (o?.userData.section && options.onSelect) {
        options.onSelect(o.userData.section);
        break;
      }
    }
    down = null;
  });

  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    document.body.classList.add("no-webgl");
    document.querySelector("#scene-error").hidden = false;
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    document.body.classList.remove("no-webgl");
    document.querySelector("#scene-error").hidden = true;
    dirty = true;
    schedule();
  });

  resize();
  composer.render();

  return {
    setScrollProgress(p) {
      targetScrollProgress = THREE.MathUtils.clamp(p, 0, 1);
      dirty = true;
      schedule();
    },
    setMotion(enabled) {
      motion = enabled;
      controls.enableDamping = enabled;
      lastFrame = 0;
      dirty = true;
      schedule();
    },
    toggleOrbit(enabled) {
      isFreeOrbit = typeof enabled === "boolean" ? enabled : !isFreeOrbit;
      controls.enableZoom = isFreeOrbit;
      controls.enableRotate = isFreeOrbit;
      dirty = true;
      schedule();
      return isFreeOrbit;
    },
    reset() {
      targetScrollProgress = 0;
      scrollProgress = 0;
      isFreeOrbit = false;
      controls.enableZoom = false;
      controls.enableRotate = false;
      dirty = true;
      schedule();
    },
  };
}
