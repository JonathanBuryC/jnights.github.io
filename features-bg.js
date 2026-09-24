/**
 * Dégradé animé discret derrière la section Fonctionnalités (shadergradient).
 * Crème -> lilas -> violet, mouvement lent ; masqué en haut/bas par le CSS.
 */
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

const el = document.getElementById("featuresBg");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (el) {
  createRoot(el).render(
    h(ShaderGradientCanvas, { pointerEvents: "none", pixelDensity: 1, style: { position: "absolute", inset: 0 } },
      h(ShaderGradient, {
        type: "plane",
        animate: reduced ? "off" : "on",
        uSpeed: 0.15,
        uStrength: 2.4,
        uDensity: 1.2,
        uFrequency: 5.5,
        uAmplitude: 1,
        color1: "#f6f1ff",
        color2: "#d9c6ff",
        color3: "#a47bff",
        grain: "off",
        lightType: "3d",
        brightness: 1.2,
        reflection: 0.1,
        cAzimuthAngle: 180,
        cPolarAngle: 90,
        cDistance: 3.6,
        cameraZoom: 1,
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
