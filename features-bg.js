/**
 * Dégradé animé en fond de toute la page (shadergradient, réglages « Halo »).
 * Canvas fixe derrière le contenu : présent partout, sans délimitation entre sections.
 */
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

const el = document.getElementById("pageBg");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (el) {
  createRoot(el).render(
    h(ShaderGradientCanvas, { pointerEvents: "none", pixelDensity: 1, fov: 45, lazyLoad: false, style: { position: "absolute", inset: 0 } },
      h(ShaderGradient, {
        type: "plane",
        animate: reduced ? "off" : "on",
        uSpeed: 0.3,
        uStrength: 4,
        uDensity: 1.3,
        uFrequency: 5.5,
        uAmplitude: 1,
        color1: "#a11fff",
        color2: "#d2dbd3",
        color3: "#cfc2e1",
        grain: "on",
        lightType: "3d",
        brightness: 1.2,
        reflection: 0.1,
        cAzimuthAngle: 180,
        cPolarAngle: 90,
        cDistance: 3.6,
        cameraZoom: 1,
        fov: 45,
        positionX: -1.4,
        positionY: 0,
        positionZ: 0,
        rotationX: 0,
        rotationY: 10,
        rotationZ: 50,
      })));
  // laisse le shader démarrer avant le fondu d'apparition
  setTimeout(() => el.classList.add("is-ready"), 300);
}
