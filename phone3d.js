/**
 * Téléphone 3D (React Three Fiber, sans build : modules via importmap).
 * Hero : calé sur #phone3d, écrans en défilement auto. Au scroll, il se recentre,
 * fait un tour complet par étape (.feature-step) et change d'écran quand on voit son dos.
 * Si WebGL ou le CDN échoue, l'image .phone-fallback reste affichée.
 */
import { createElement as h, Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const FADE_S = 1.4; // durée du fondu entre deux écrans dans le hero (s)
// écran affiché à chaque étape du scroll (0 = hero, choisi par le défilement auto)
const STEP_SCREENS = [null, 0, 2, 1];
const story = { s: 0 }; // progression du scroll : 0 = hero, 1..3 = étapes
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => v * v * (3 - 2 * v);
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

// Progression du scroll : 0 en haut de page, k quand la k-ième étape est centrée.
function storyProgress(steps) {
  const anchors = [0, ...steps.map((el) => {
    const r = el.getBoundingClientRect();
    return r.top + scrollY + r.height / 2 - innerHeight / 2;
  })];
  for (let k = 0; k < anchors.length - 1; k++) {
    if (scrollY < anchors[k + 1]) return k + clamp01((scrollY - anchors[k]) / (anchors[k + 1] - anchors[k]));
  }
  return anchors.length - 1;
}

function Phone({ index, onReady }) {
  const group = useRef();
  const layers = useRef([]);
  const cur = useRef({ shown: 0, start: -1, from: 1 });
  const { gl, size, viewport } = useThree();
  const images = useLoader(THREE.ImageLoader, SCREENS.map((s) => s.src));
  const logo = useLoader(THREE.TextureLoader, "logo.png");
  const placeholder = useMemo(() => document.getElementById("phone3d"), []);
  const steps = useMemo(() => [...document.querySelectorAll(".feature-step")], []);

  // Poses (position monde + échelle). Hero : calée sur l'emplacement #phone3d tel
  // qu'il est en haut de page -> au scroll, le téléphone reste fixe puis se recentre.
  const heroPose = () => {
    const r = placeholder.getBoundingClientRect(), k = viewport.width / size.width;
    const top = r.top + scrollY;
    return {
      x: (r.left + r.width / 2 - size.width / 2) * k,
      y: -(top + r.height / 2 - size.height / 2) * k,
      s: (0.86 * r.height * k) / H,
    };
  };
  const stepPose = () => size.width >= 900
    ? { x: viewport.width * 0.2, y: 0, s: (0.8 * viewport.height) / H }
    : { x: 0, y: viewport.height * 0.14, s: Math.min((0.5 * viewport.height) / H, (0.8 * viewport.width) / W) };

  // Netteté : on réduit les captures à la taille réelle d'affichage (redimensionnement
  // haute qualité du navigateur) et on coupe les mipmaps, source du flou sur le texte.
  // ponytail: taille calculée au montage, pas recalculée au redimensionnement de la fenêtre
  const textures = useMemo(() => {
    const sMax = Math.max(heroPose().s, stepPose().s);
    const hPx = Math.min(2532, Math.round(SH * sMax * (size.height / viewport.height) * gl.getPixelRatio()));
    return images.map((img) => {
      const c = document.createElement("canvas");
      c.height = hPx;
      c.width = Math.round((hPx * 1170) / 2532);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      return t;
    });
  }, [images]);
  logo.colorSpace = THREE.SRGBColorSpace;

  const geo = useMemo(() => {
    const bevel = 0.02;
    const body = new THREE.ExtrudeGeometry(roundedRect(W - 2 * bevel, H - 2 * bevel, 0.13), {
      depth: D - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 8, curveSegments: 32,
    });
    body.center();
    return {
      body,
      screen: flatRounded(SW, SH, 0.1),
      island: flatRounded(0.27, 0.078, 0.039),
      bump: flatRounded(0.36, 0.36, 0.1),
      logo: flatRounded(0.34, 0.34, 0.08),
    };
  }, []);

  useEffect(onReady, [textures]);

  useFrame((state, dt) => {
    const g = group.current, t = state.clock.elapsedTime, float = REDUCED ? 0 : 1;
    const s = (story.s = storyProgress(steps));
    document.documentElement.classList.toggle("story-scrolled", s > 0.03);

    // segment en cours : le tour se fait au milieu, le téléphone reste de face aux extrémités
    const n = steps.length, seg = Math.min(Math.floor(s), n - 1);
    const e = smooth(clamp01((s - seg - 0.15) / 0.7));
    const from = seg === 0 ? heroPose() : stepPose(), to = stepPose();
    const mid = Math.sin(Math.PI * e); // 1 au moment où l'on voit le dos
    const x = from.x + (to.x - from.x) * e - mid * viewport.width * 0.05;
    // après la dernière étape, le téléphone remonte avec la page
    const last = steps[n - 1].getBoundingClientRect();
    const past = Math.max(0, innerHeight / 2 - (last.top + last.height / 2)) * (viewport.width / size.width);
    const y = from.y + (to.y - from.y) * e + past;
    const sc = (from.s + (to.s - from.s) * e) * (1 - 0.06 * mid);

    const tilt = -0.22 + 0.07 * Math.min(s, 1);
    const turn = REDUCED ? 0 : Math.PI * 2 * (seg + e);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, tilt + turn + pointer.x * 0.15 + Math.sin(t * 0.45) * 0.04 * float, 5, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.05 + pointer.y * 0.08, 3, dt);
    g.rotation.z = Math.sin(t * 0.6) * 0.015 * float;
    g.position.x = THREE.MathUtils.damp(g.position.x, x, 8, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, y + Math.sin(t * 0.9) * 0.04 * float, 8, dt);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, sc, 8, dt));

    // Écran : dans le hero, fondu du défilement auto ; au scroll, changement
    // instantané pendant que le dos est tourné vers nous (donc invisible).
    const screenOf = (k) => (k === 0 ? index : STEP_SCREENS[k]);
    const target = e < 0.5 ? screenOf(seg) : screenOf(seg + 1);
    const c = cur.current, L = layers.current;
    if (target !== c.shown) {
      c.shown = target;
      c.start = s < 0.01 ? t : -1;
      c.from = L[target] ? L[target].material.opacity : 0;
    }
    const p = c.start < 0 ? 1 : Math.min(1, (t - c.start) / FADE_S);
    L.forEach((m, i) => {
      if (!m) return;
      if (i === target) { m.renderOrder = 10; m.material.opacity = c.from + (1 - c.from) * smooth(p); }
      else { m.renderOrder = i; if (p === 1) m.material.opacity = 0; }
    });
  });

  const z = D / 2;
  const metal = h("meshPhysicalMaterial", { attach: "material-1", color: "#4a4552", metalness: 1, roughness: 0.25, clearcoat: 0.6 });
  const button = (x, y, len) => h("mesh", { position: [x, y, 0] },
    h("boxGeometry", { args: [0.02, len, 0.045] }),
    h("meshStandardMaterial", { color: "#4a4552", metalness: 1, roughness: 0.3 }));
  // éléments du dos : tournés vers -z (visibles quand le téléphone est retourné)
  const back = (props, ...children) => h("mesh", { rotation: [0, Math.PI, 0], ...props }, ...children);
  const lens = (x, y) => back({ position: [x, y, -z - 0.004] },
    h("circleGeometry", { args: [0.062, 48] }),
    h("meshPhysicalMaterial", { color: "#07060a", metalness: 0.6, roughness: 0.1, clearcoat: 1 }));

  return h("group", {
      ref: group,
      // entrée : le téléphone pivote depuis le profil
      rotation: [0.05, REDUCED ? -0.22 : -1.9, 0],
      position: [0, REDUCED ? 0 : -0.25, 0],
    },
    h("mesh", { geometry: geo.body },
      h("meshPhysicalMaterial", { attach: "material-0", color: "#0b0910", roughness: 0.12, metalness: 0.3, clearcoat: 1 }),
      metal),
    button(W / 2 + 0.006, 0.38, 0.3),
    button(-W / 2 - 0.006, 0.62, 0.09),
    button(-W / 2 - 0.006, 0.43, 0.16),
    button(-W / 2 - 0.006, 0.23, 0.16),
    ...textures.map((map, i) => h("mesh", {
      key: i, ref: (m) => (layers.current[i] = m), geometry: geo.screen,
      position: [0, 0, z + 0.001], renderOrder: i,
    }, h("meshBasicMaterial", { map, transparent: true, opacity: i === 0 ? 1 : 0, depthWrite: false, toneMapped: false }))),
    h("mesh", { geometry: geo.island, position: [0, SH / 2 - 0.058, z + 0.002], renderOrder: 11 },
      h("meshBasicMaterial", { color: "#000" })),
    // dos : module photo (en haut à gauche vu de dos) + logo Jnights
    back({ geometry: geo.bump, position: [W / 2 - 0.25, H / 2 - 0.25, -z - 0.002] },
      h("meshPhysicalMaterial", { color: "#1a1622", metalness: 0.8, roughness: 0.2, clearcoat: 1 })),
    lens(W / 2 - 0.19, H / 2 - 0.19),
    lens(W / 2 - 0.31, H / 2 - 0.31),
    back({ geometry: geo.logo, position: [0, 0.05, -z - 0.002] },
      h("meshBasicMaterial", { map: logo, toneMapped: false })),
  );
}

function App({ placeholder, storyEl }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [tick, setTick] = useState(0); // relance le timer après un clic

  // défilement auto des écrans, seulement tant qu'on est en haut (hero)
  useEffect(() => {
    const id = setInterval(() => {
      if (story.s < 0.01) setIndex((i) => (i + 1) % SCREENS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(storyEl);
    return () => io.disconnect();
  }, []);

  const go = (i) => { setIndex(i); setTick((t) => t + 1); };

  return h(Fragment, null,
    h(Canvas, {
        // Suréchantillonnage : rendu à 2× la densité de l'écran puis réduit par le
        // navigateur -> texte de l'écran net malgré l'inclinaison et le mouvement.
        dpr: Math.min(3, devicePixelRatio * 2), frameloop: visible ? "always" : "never",
        camera: { position: [0, 0, 4.5], fov: 30 },
        gl: { antialias: true, alpha: true },
      },
      h(Environment),
      h("directionalLight", { position: [-2, 3, 2], intensity: 1.2 }),
      h("directionalLight", { position: [2, 2, -3], intensity: 1.5 }),
      h("pointLight", { position: [-3, 1.5, 2], intensity: 24, color: "#e84fb0" }),
      h("pointLight", { position: [3, -1, 2.5], intensity: 14, color: "#8b5cf6" }),
      h("pointLight", { position: [0, 1, -3], intensity: 16, color: "#c084fc" }),
      h(Suspense, { fallback: null },
        h(Phone, { index, onReady: () => document.documentElement.classList.add("phone-ready") }))),
    // points du hero, rendus dans l'emplacement du téléphone
    createPortal(h("div", { className: "phone-dots" },
      SCREENS.map((s, i) => h("button", {
        key: s.src, "aria-label": s.label,
        className: "dot-indicator" + (i === index ? " is-active" : ""), onClick: () => go(i),
      }))), placeholder),
  );
}

const stage = document.getElementById("phoneStage");
const placeholder = document.getElementById("phone3d");
if (stage && placeholder) createRoot(stage).render(h(App, { placeholder, storyEl: document.getElementById("story") }));
