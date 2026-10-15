import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// A closed, elliptical ribbon twisted twice around its centerline.
// Geometry, lighting, and reflections are generated locally; no remote 3D assets.
function ribbonGeometry(around = 240, cross = 48) {
  const positions = [],
    indices = [];
  for (let i = 0; i <= around; i++) {
    const u = (i / around) * Math.PI * 2;
    const twist = u * 2;
    const center = 1.12 + 0.12 * Math.sin(u * 3);
    for (let j = 0; j <= cross; j++) {
      const v = (j / cross) * Math.PI * 2;
      const wide = 0.57 * Math.cos(v),
        narrow = 0.155 * Math.sin(v);
      const radial = center + wide * Math.cos(twist) - narrow * Math.sin(twist);
      const height =
        wide * Math.sin(twist) +
        narrow * Math.cos(twist) +
        0.21 * Math.sin(u * 3);
      positions.push(radial * Math.cos(u), radial * Math.sin(u), height);
      if (i < around && j < cross) {
        const a = i * (cross + 1) + j,
          b = a + cross + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createSculpture(host, initialMotion) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 6.3);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  const environmentMap = pmrem.fromScene(environment, 0.035);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();

  const geometry = ribbonGeometry();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xe9e8e3,
    metalness: 1,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);
  const wireSurface = ribbonGeometry(72, 12);
  const wireGeometry = new THREE.WireframeGeometry(wireSurface);
  wireSurface.dispose();
  const wire = new THREE.LineSegments(
    wireGeometry,
    new THREE.LineBasicMaterial({
      color: 0xff875d,
      transparent: true,
      opacity: 0.28,
    }),
  );
  wire.visible = false;
  group.add(wire);
  const keyLight = new THREE.DirectionalLight(0xfff6e8, 5);
  keyLight.position.set(-3, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xff613c, 3);
  rimLight.position.set(4, -2, 2);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xdde8ff, 3);
  fillLight.position.set(-4, -1, 1);
  scene.add(fillLight);

  let motion = initialMotion,
    visible = true,
    dragging = false,
    raf = 0;
  let rotationX = 0.62,
    rotationY = -0.42,
    idleAngle = 0,
    last = 0;
  let pointerX = 0,
    pointerY = 0,
    lastX = 0,
    lastY = 0;
  function render() {
    group.rotation.set(
      rotationX + pointerY * 0.08,
      rotationY + idleAngle + pointerX * 0.08,
      -0.37,
    );
    renderer.render(scene, camera);
  }
  function tick(now) {
    raf = 0;
    if (!visible || document.hidden || !motion) {
      last = 0;
      return;
    }
    const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (!dragging) idleAngle += delta * 0.12;
    render();
    raf = requestAnimationFrame(tick);
  }
  function schedule() {
    if (!raf && motion && visible && !document.hidden)
      raf = requestAnimationFrame(tick);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = camera.aspect < 0.9 ? 6.8 : 6.1;
    camera.updateProjectionMatrix();
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) {
        render();
        schedule();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    },
    { threshold: 0.05 },
  );
  observer.observe(host);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else schedule();
  });
  host.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    host.setPointerCapture(event.pointerId);
  });
  host.addEventListener("pointermove", (event) => {
    if (dragging) {
      rotationY += (event.clientX - lastX) * 0.008;
      rotationX += (event.clientY - lastY) * 0.008;
      lastX = event.clientX;
      lastY = event.clientY;
      render();
    } else if (event.pointerType === "mouse" && motion) {
      const rect = host.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      pointerY = (event.clientY - rect.top) / rect.height - 0.5;
    }
  });
  function stopDrag() {
    dragging = false;
  }
  host.addEventListener("pointerup", stopDrag);
  host.addEventListener("pointercancel", stopDrag);
  host.addEventListener("lostpointercapture", stopDrag);
  host.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });
  host.addEventListener("keydown", (event) => {
    const changes = {
      ArrowLeft: [0, -0.15],
      ArrowRight: [0, 0.15],
      ArrowUp: [-0.15, 0],
      ArrowDown: [0.15, 0],
    };
    if (!changes[event.key]) return;
    event.preventDefault();
    rotationX += changes[event.key][0];
    rotationY += changes[event.key][1];
    render();
  });
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    motion = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    host.classList.remove("is-ready");
    document.querySelector("#render-status").textContent = "STATIC / LOW POWER";
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    host.classList.add("is-ready");
    document.querySelector("#render-status").textContent = "LIVE / WEBGL";
    motion = !document.documentElement.classList.contains("motion-paused");
    render();
    schedule();
  });
  resize();
  schedule();
  return {
    setMotion(enabled) {
      motion = enabled;
      if (!motion && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
      render();
      schedule();
    },
    setMaterial(name) {
      wire.visible = name === "wire";
      mesh.visible = name !== "wire";
      material.color.set(name === "ember" ? 0xff5725 : 0xe9e8e3);
      material.metalness = name === "ember" ? 0.38 : 1;
      material.roughness = name === "ember" ? 0.28 : 0.18;
      material.envMapIntensity = name === "ember" ? 1.3 : 2.2;
      render();
    },
    reset() {
      rotationX = 0.62;
      rotationY = -0.42;
      idleAngle = 0;
      pointerX = pointerY = 0;
      render();
    },
  };
}
