/**
 * Téléphone 3D (React Three Fiber + GSAP ScrollTrigger, sans build : modules via importmap).
 * Hero : calé sur #phone3d, écrans en défilement auto. Au scroll, une timeline GSAP
 * (réglages : POSES / DUR ci-dessous) l'anime de dos → tranche → face écran pour chaque
 * section .feature-step (paliers à droite, à gauche puis au milieu) ; l'écran ne change
 * que quand il est de dos (invisible).
 * Si WebGL ou le CDN échoue, l'image .phone-fallback reste affichée.
 */
import { createElement as h, Fragment, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Écrans : 0-2 = défilement auto du hero, puis un écran par palier (DISCOVER / BOOK / CREATE)
const SCREENS = [
  { src: "app-screen-1.png", label: "Découvrir" },
  { src: "app-screen-2.png", label: "Rechercher" },
  { src: "app-screen-3.png", label: "Réserver" },
  { src: "screen-events/screen_creation_evenement.png", label: "Créer" },
];
const HERO_SCREENS = 3;
const DISCOVER = 0, BOOK = 2, CREATE = 3;

// ============================================================
// RÉGLAGES DU MOUVEMENT
// Poses : x / y = position depuis le centre de l'écran (fraction de largeur / hauteur,
// y > 0 = vers le haut), s = hauteur du téléphone (fraction de la hauteur d'écran),
// ry = rotation gauche/droite en degrés (0 = face écran, 180 = de dos, 90/270 = tranche ;
// la valeur continue d'augmenter d'un palier à l'autre), rz = inclinaison en degrés.
// ============================================================
const POSES = {
  back1: { x: 0.18, y: -0.16, s: 0.95, ry: 160, rz: -15 },  // etape-01 : de dos, bas coupé
  edge1: { x: 0.2, y: -0.07, s: 0.88, ry: 270, rz: -6 },    // etape-02 : tranche
  face1: { x: 0.2, y: -0.01, s: 0.8, ry: 340, rz: 0 },      // etape-03 : palier 1 À DROITE, 3/4 (-20°)
  face1Up: { y: 0.04 },                                      // etape-04 : remonte doucement
  edge2: { x: 0.12, y: 0.02, s: 0.8, ry: 450, rz: -12 },    // etape-05 : tranche
  back2: { x: 0.02, y: -0.06, s: 0.84, ry: 540, rz: -30 },  // etape-06 : de dos, traverse vers la gauche…
  back2Low: { x: -0.08, y: -0.14, rz: -60 },                 // …descend et bascule
  turn2: { x: -0.16, y: -0.06, s: 0.82, ry: 690, rz: -15 }, // etape-07 : se retourne, encore incliné
  face2: { x: -0.2, y: -0.01, s: 0.8, ry: 740, rz: 0 },     // palier 2 À GAUCHE, 3/4 inversé (+20°)
  face2Up: { y: 0.04 },
  edge3: { x: -0.14, y: 0.02, s: 0.8, ry: 810, rz: 12 },    // tranche
  back3: { x: -0.06, y: -0.14, s: 0.86, ry: 900, rz: 15 },  // de dos, revient vers le milieu
  edge3b: { x: 0, y: -0.14, s: 0.78, ry: 990, rz: 6 },      // tranche
  face3: { x: 0, y: -0.13, s: 0.72, ry: 1080, rz: 0 },      // palier 3 AU MILIEU, sous le titre
  face3Up: { y: -0.1 },
};
// Durées relatives de chaque phase (seul le rapport entre elles compte).
// hold = palier face écran : c'est lui qui laisse le temps de lire.
const DUR = { heroToBack: 1, toEdge: 0.8, toFace: 0.8, hold: 4, faceToEdge: 0.7, edgeToBack: 0.7, tilt: 0.9, turn: 0.9, settle: 0.6 };
const SHEET = true; // fenêtre de filtres qui monte dans l'écran pendant le palier 1
const SCRUB = 0.6; // lissage du scrub (s)
const MOBILE_MAX = 767; // en dessous : téléphone centré, plus petit, texte en dessous
const REVEAL_EXTRA = 0.2; // scroll libre avant que le téléphone bouge (fraction de la hauteur d'écran)

const SW = 0.92, SH = SW * (2532 / 1170); // écran au ratio exact des captures
const W = SW + 0.08, H = SH + 0.08, D = 0.1; // châssis
const FADE_S = 1.4; // durée du fondu entre deux écrans dans le hero (s)
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DEG = Math.PI / 180;
const pointer = { x: 0, y: 0 };
addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

// État animé par GSAP et lu à chaque image par le rendu 3D (aucun re-render React au scroll).
// hero = 1 : calé sur l'emplacement du hero ; screen = -1 : défilement auto du hero.
const S = { p: 0, hero: 1, x: 0.2, y: 0, s: 0.8, ry: -12, rz: 0, screen: -1, sheet: 0 };
// Scroll de « révélation » : on descend d'abord normalement jusqu'à voir tout le
// téléphone (et ses points) ; la séquence ne démarre qu'ensuite.
const reveal = { d0: 0 };

function buildTimeline() {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
  // mouvement réduit : mêmes positions, mais toujours face écran et droit
  const go = (p, d) => {
    const v = { ...p };
    if (REDUCED) { if ("ry" in v) v.ry = -12; if ("rz" in v) v.rz = 0; }
    tl.to(S, { ...v, duration: d });
  };

  go({ ...POSES.back1, hero: 0 }, DUR.heroToBack);
  tl.set(S, { screen: DISCOVER, sheet: 0 });                    // de dos : écran palier 1
  go(POSES.edge1, DUR.toEdge);
  go(POSES.face1, DUR.toFace);
  tl.addLabel("p1");
  go(POSES.face1Up, DUR.hold);
  if (SHEET) tl.to(S, { sheet: 1, duration: DUR.hold * 0.45, ease: "power2.out" }, "p1+=" + DUR.hold * 0.15);
  tl.addLabel("p1mid", "p1+=" + DUR.hold / 2);

  go(POSES.edge2, DUR.faceToEdge);
  go(POSES.back2, DUR.edgeToBack);
  tl.set(S, { screen: BOOK, sheet: 0 });                         // de dos : écran palier 2
  go(POSES.back2Low, DUR.tilt);
  go(POSES.turn2, DUR.turn);
  go(POSES.face2, DUR.settle);
  tl.addLabel("p2");
  go(POSES.face2Up, DUR.hold);
  tl.addLabel("p2mid", "p2+=" + DUR.hold / 2);

  go(POSES.edge3, DUR.faceToEdge);
  go(POSES.back3, DUR.edgeToBack);
  tl.set(S, { screen: CREATE });                                 // de dos : écran palier 3
  go(POSES.edge3b, DUR.toEdge);
  go(POSES.face3, DUR.toFace);
  tl.addLabel("p3");
  go(POSES.face3Up, DUR.hold);
  tl.addLabel("p3mid", "p3+=" + DUR.hold / 2);
  return tl;
}

// Scroll → temps de la timeline, en calant le milieu de chaque palier sur le moment où
// la section correspondante est centrée à l'écran (synchronisation écran / texte).
function initScroll(storyEl, steps, placeholder) {
  const tl = buildTimeline();
  let anchors = [];
  const measure = () => {
    const top = (el) => el.getBoundingClientRect().top + scrollY;
    reveal.d0 = Math.max(0, top(placeholder) + placeholder.offsetHeight + 24 - innerHeight) + innerHeight * REVEAL_EXTRA;
    anchors = [[0, 0], [reveal.d0, 0]];
    steps.forEach((el, i) => anchors.push([top(el) + el.offsetHeight / 2 - innerHeight / 2, tl.labels["p" + (i + 1) + "mid"]]));
    anchors.push([top(storyEl) + storyEl.offsetHeight - innerHeight, tl.duration()]);
  };
  const timeAt = (y) => {
    for (let i = 0; i < anchors.length - 1; i++) {
      const [y0, t0] = anchors[i], [y1, t1] = anchors[i + 1];
      if (y <= y1) return y1 > y0 ? t0 + (t1 - t0) * Math.min(1, Math.max(0, (y - y0) / (y1 - y0))) : t1;
    }
    return tl.duration();
  };
  const update = () => {
    const t = timeAt(scrollY);
    S.p = t / tl.duration();
    document.documentElement.classList.toggle("story-scrolled", S.p > 0.01);
    gsap.to(tl, { time: t, duration: SCRUB, ease: "power3.out", overwrite: true });
  };
  ScrollTrigger.create({ trigger: storyEl, start: "top top", end: "bottom bottom", onUpdate: update, onRefresh: () => { measure(); update(); } });
  measure();
  update();
}

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

// Fenêtre « Filtres » dessinée dans le style de l'app, qui monte depuis le bas de l'écran.
// Coordonnées pensées pour un écran de 390 × 844 (iPhone), mises à l'échelle.
function drawSheet(ctx, cw, ch, k) {
  const u = cw / 390, font = (w, px) => `${w} ${px * u}px Inter, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = `rgba(0,0,0,${0.5 * k})`;
  ctx.fillRect(0, 0, cw, ch);
  const y0 = ch - 350 * u + (1 - k) * 370 * u;
  ctx.fillStyle = "#15131c";
  ctx.beginPath(); ctx.roundRect(0, y0, cw, 380 * u, [28 * u, 28 * u, 0, 0]); ctx.fill();
  ctx.fillStyle = "#3a3645";
  ctx.beginPath(); ctx.roundRect(cw / 2 - 20 * u, y0 + 10 * u, 40 * u, 5 * u, 3 * u); ctx.fill();
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff"; ctx.font = font(700, 24); ctx.fillText("Filtres", 24 * u, y0 + 52 * u);
  const chips = (label, items, active, y) => {
    ctx.fillStyle = "#9a96a8"; ctx.font = font(500, 15); ctx.fillText(label, 24 * u, y);
    let x = 24 * u;
    ctx.font = font(600, 15);
    items.forEach((t, i) => {
      const w = ctx.measureText(t).width + 32 * u;
      ctx.fillStyle = i === active ? "#8b5cf6" : "#221f2b";
      ctx.beginPath(); ctx.roundRect(x, y + 16 * u, w, 36 * u, 18 * u); ctx.fill();
      ctx.fillStyle = i === active ? "#fff" : "#d6d3df";
      ctx.fillText(t, x + 16 * u, y + 34 * u);
      x += w + 10 * u;
    });
  };
  chips("Ville", ["Paris", "Lyon", "Marseille", "Lille"], 0, y0 + 96 * u);
  chips("Tranche d'âge", ["18-21", "22-26", "27-30", "30+"], 1, y0 + 176 * u);
  const g = ctx.createLinearGradient(20 * u, 0, cw - 20 * u, 0);
  g.addColorStop(0, "#c084fc"); g.addColorStop(1, "#8b5cf6");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(20 * u, y0 + 262 * u, cw - 40 * u, 52 * u, 16 * u); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = font(700, 17); ctx.textAlign = "center";
  ctx.fillText("Afficher les soirées", cw / 2, y0 + 288 * u);
  ctx.textAlign = "left";
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

function Phone({ index, onReady }) {
  const group = useRef();
  const layers = useRef([]);
  const cur = useRef({ shown: 0, start: -1, from: 1, sheet: 0 });
  const { gl, size, viewport } = useThree();
  const images = useLoader(THREE.ImageLoader, SCREENS.map((s) => s.src));
  const logo = useLoader(THREE.TextureLoader, "logo.png");
  const placeholder = useMemo(() => document.getElementById("phone3d"), []);

  // Hero : suit l'emplacement #phone3d pendant la révélation, puis reste fixe à l'écran.
  const heroPose = () => {
    const r = placeholder.getBoundingClientRect(), k = viewport.width / size.width;
    const top = r.top + scrollY - Math.min(scrollY, reveal.d0);
    return {
      x: (r.left + r.width / 2 - size.width / 2) * k,
      y: -(top + r.height / 2 - size.height / 2) * k,
      s: (0.86 * r.height * k) / H,
    };
  };
  // Séquence : pose GSAP (fractions d'écran) convertie en unités 3D ; mobile = centré, plus petit.
  const seqPose = () => {
    const vw = viewport.width, vh = viewport.height;
    if (size.width > MOBILE_MAX) return { x: S.x * vw, y: S.y * vh, s: (S.s * vh) / H };
    return { x: 0, y: (0.15 + S.y * 0.5) * vh, s: Math.min((S.s * 0.6 * vh) / H, (0.72 * vw) / W) };
  };

  // Netteté : on réduit les captures à la taille réelle d'affichage (redimensionnement
  // haute qualité du navigateur) et on coupe les mipmaps, source du flou sur le texte.
  // ponytail: taille calculée au montage, pas recalculée au redimensionnement de la fenêtre
  const screens = useMemo(() => {
    const sMax = Math.max(heroPose().s, (0.95 * viewport.height) / H);
    const hPx = Math.min(2532, Math.round(SH * sMax * (size.height / viewport.height) * gl.getPixelRatio()));
    return images.map((img) => {
      const c = document.createElement("canvas");
      c.height = hPx;
      c.width = Math.round((hPx * 1170) / 2532);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      return { img, c, ctx, tex };
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

  useEffect(onReady, [screens]);

  useFrame((state, dt) => {
    const g = group.current, t = state.clock.elapsedTime, float = REDUCED ? 0 : 1;
    const hp = heroPose(), sp = seqPose(), k = S.hero, lerp = (a, b) => b + (a - b) * k;
    // léger flottement qui suit le scroll + respiration au repos
    const drift = (Math.sin(S.p * Math.PI * 8) * 0.012 + Math.sin(t * 0.9) * 0.008) * viewport.height * float;

    const damp = (v, target, l = 6) => THREE.MathUtils.damp(v, target, l, dt);
    g.position.x = damp(g.position.x, lerp(hp.x, sp.x));
    g.position.y = damp(g.position.y, lerp(hp.y, sp.y) + drift);
    g.scale.setScalar(damp(g.scale.x, lerp(hp.s, sp.s)));
    g.rotation.y = damp(g.rotation.y, S.ry * DEG + (pointer.x * 0.12 + Math.sin(t * 0.45) * 0.03) * float, 5);
    g.rotation.x = damp(g.rotation.x, 0.04 + pointer.y * 0.06 * float, 3);
    g.rotation.z = damp(g.rotation.z, S.rz * DEG, 5);

    // Fenêtre de filtres : on recompose l'écran Découvrir seulement quand elle bouge.
    if (Math.abs(S.sheet - cur.current.sheet) > 0.002) {
      const { img, c, ctx, tex } = screens[DISCOVER];
      cur.current.sheet = S.sheet;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      if (S.sheet > 0.002) drawSheet(ctx, c.width, c.height, S.sheet);
      tex.needsUpdate = true;
    }

    // Écran : dans le hero, fondu du défilement auto ; pendant la séquence, changement
    // instantané posé dans la timeline aux moments où le téléphone est de dos.
    const target = S.screen < 0 ? index : S.screen;
    const c = cur.current, L = layers.current;
    if (target !== c.shown) {
      c.shown = target;
      c.start = S.screen < 0 ? t : -1;
      c.from = L[target] ? L[target].material.opacity : 0;
    }
    const p = c.start < 0 ? 1 : Math.min(1, (t - c.start) / FADE_S);
    L.forEach((m, i) => {
      if (!m) return;
      if (i === target) { m.renderOrder = 10; m.material.opacity = c.from + (1 - c.from) * p * p * (3 - 2 * p); }
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
    ...screens.map(({ tex }, i) => h("mesh", {
      key: i, ref: (m) => (layers.current[i] = m), geometry: geo.screen,
      position: [0, 0, z + 0.001], renderOrder: i,
    }, h("meshBasicMaterial", { map: tex, transparent: true, opacity: i === 0 ? 1 : 0, depthWrite: false, toneMapped: false }))),
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

  // défilement auto des écrans du hero, seulement tant qu'on n'a pas scrollé
  useEffect(() => {
    const id = setInterval(() => {
      if (S.p < 0.005) setIndex((i) => (i + 1) % HERO_SCREENS);
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
      SCREENS.slice(0, HERO_SCREENS).map((s, i) => h("button", {
        key: s.src, "aria-label": s.label,
        className: "dot-indicator" + (i === index ? " is-active" : ""), onClick: () => go(i),
      }))), placeholder),
  );
}

const stage = document.getElementById("phoneStage");
const placeholder = document.getElementById("phone3d");
const storyEl = document.getElementById("story");
if (stage && placeholder && storyEl) {
  initScroll(storyEl, [...document.querySelectorAll(".feature-step")], placeholder);
  createRoot(stage).render(h(App, { placeholder, storyEl }));
}
