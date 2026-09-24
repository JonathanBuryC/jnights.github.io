/**
 * Téléphone 3D du hero (React Three Fiber, sans build : modules via importmap).
 * Si WebGL ou le CDN échoue, l'image .phone-fallback reste affichée.
 */
import { createElement as h, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const SCREENS = [
  { src: "app-screen-1.png", label: "Découvrir" },
  { src: "app-screen-2.png", label: "Rechercher" },
  { src: "app-screen-3.png", label: "Réserver" },
];
const SW = 0.92, SH = SW * (2532 / 1170); // écran au ratio exact des captures
const W = SW + 0.08, H = SH + 0.08, D = 0.1; // châssis
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pointer = { x: 0, y: 0 };
addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2, P = Math.PI;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -P / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, P / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, P / 2, P);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, P, 1.5 * P);
  return s;
}

// ShapeGeometry avec UV ramenées à 0..1 pour y plaquer une texture entière
function flatRounded(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 24);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => { env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
}

function Phone({ index, onNext, onReady }) {
  const group = useRef();
  const layers = useRef([]);
  const { gl } = useThree();
  const textures = useLoader(THREE.TextureLoader, SCREENS.map((s) => s.src));

  const geo = useMemo(() => {
    const bevel = 0.02;
    const body = new THREE.ExtrudeGeometry(roundedRect(W - 2 * bevel, H - 2 * bevel, 0.13), {
      depth: D - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 8, curveSegments: 32,
    });
    body.center();
    return { body, screen: flatRounded(SW, SH, 0.1), island: flatRounded(0.27, 0.078, 0.039), glass: flatRounded(SW, SH, 0.1) };
  }, []);

  useEffect(() => {
    const aniso = gl.capabilities.getMaxAnisotropy();
    textures.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.needsUpdate = true; });
    onReady();
  }, [textures]);

  useFrame((state, dt) => {
    const g = group.current, t = state.clock.elapsedTime;
    const float = REDUCED ? 0 : 1;
    const ry = -0.38 + pointer.x * 0.28 + Math.sin(t * 0.45) * 0.05 * float;
    const rx = 0.1 + pointer.y * 0.12;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ry, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, 3, dt);
    g.rotation.z = Math.sin(t * 0.6) * 0.015 * float;
    g.position.y = THREE.MathUtils.damp(g.position.y, Math.sin(t * 0.9) * 0.04 * float, 4, dt);
    layers.current.forEach((m, i) => {
      if (m) m.material.opacity = THREE.MathUtils.damp(m.material.opacity, i === index ? 1 : 0, 6, dt);
    });
  });

  const z = D / 2;
  const metal = h("meshPhysicalMaterial", { attach: "material-1", color: "#4a4552", metalness: 1, roughness: 0.25, clearcoat: 0.6 });
  const button = (x, y, len) => h("mesh", { position: [x, y, 0] },
    h("boxGeometry", { args: [0.02, len, 0.045] }),
    h("meshStandardMaterial", { color: "#4a4552", metalness: 1, roughness: 0.3 }));

  return h("group", {
      ref: group,
      // entrée : le téléphone pivote depuis le profil
      rotation: [0.1, REDUCED ? -0.38 : -1.9, 0],
      position: [0, REDUCED ? 0 : -0.25, 0],
      onClick: (e) => { e.stopPropagation(); onNext(); },
      onPointerOver: () => (document.body.style.cursor = "pointer"),
      onPointerOut: () => (document.body.style.cursor = ""),
    },
    h("mesh", { geometry: geo.body },
      h("meshPhysicalMaterial", { attach: "material-0", color: "#050407", roughness: 0.15, metalness: 0.2, clearcoat: 1 }),
      metal),
    button(W / 2 + 0.006, 0.38, 0.3),
    button(-W / 2 - 0.006, 0.62, 0.09),
    button(-W / 2 - 0.006, 0.43, 0.16),
    button(-W / 2 - 0.006, 0.23, 0.16),
    ...textures.map((map, i) => h("mesh", {
      key: i, ref: (m) => (layers.current[i] = m), geometry: geo.screen,
      position: [0, 0, z + 0.001], renderOrder: i,
    }, h("meshBasicMaterial", { map, transparent: true, opacity: i === index ? 1 : 0, depthWrite: false, toneMapped: false }))),
    h("mesh", { geometry: geo.island, position: [0, SH / 2 - 0.058, z + 0.002], renderOrder: 5 },
      h("meshBasicMaterial", { color: "#000" })),
    // reflet de la vitre : suit l'environnement quand le téléphone tourne
    h("mesh", { geometry: geo.glass, position: [0, 0, z + 0.003], renderOrder: 6 },
      h("meshStandardMaterial", { color: "#fff", metalness: 1, roughness: 0.06, transparent: true, opacity: 0.07, depthWrite: false })),
  );
}

function App({ container }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [tick, setTick] = useState(0); // relance le timer après un clic

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SCREENS.length), 4000);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(container);
    return () => io.disconnect();
  }, []);

  const go = (i) => { setIndex(i); setTick((t) => t + 1); };

  return h("div", { className: "phone-stage" },
    h(Canvas, {
        dpr: [1, 2], frameloop: visible ? "always" : "never",
        camera: { position: [0, 0, 5.1], fov: 30 },
        gl: { antialias: true, alpha: true },
      },
      h(Environment),
      h("directionalLight", { position: [-2, 3, 2], intensity: 1.2 }),
      h("pointLight", { position: [-3, 1.5, 2], intensity: 24, color: "#e84fb0" }),
      h("pointLight", { position: [3, -1, 2.5], intensity: 14, color: "#8b5cf6" }),
      h(Suspense, { fallback: null },
        h(Phone, { index, onNext: () => go((index + 1) % SCREENS.length), onReady: () => container.classList.add("is-ready") }))),
    h("div", { className: "phone-tabs", role: "tablist" },
      SCREENS.map((s, i) => h("button", {
        key: s.src, role: "tab", "aria-selected": i === index,
        className: i === index ? "is-active" : "", onClick: () => go(i),
      }, h("span", null, String(i + 1).padStart(2, "0")), s.label))),
  );
}

const container = document.getElementById("phone3d");
if (container) createRoot(container.querySelector(".phone-canvas")).render(h(App, { container }));
