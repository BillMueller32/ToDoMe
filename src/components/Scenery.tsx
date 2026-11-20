import { useEffect, useState } from "react";
import { todayStr as todayKey, type DateStr } from "../lib/dates";
import { SCENES, sceneFor, sceneSrc, type Scene } from "../lib/scenes";

const DEV = import.meta.env.DEV;
const K_SCENE = "todome:dev-scene";
const K_OPACITY = "todome:dev-scene-opacity";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/**
 * Today's illustration, fixed behind the page. Only the selected image is loaded. It is
 * decorative: hidden from screen readers and never takes clicks or scrolls (see `.scene`).
 * If the image can't load (offline before it was cached, a missing file), the layer is
 * removed and the plain page background shows.
 */
export function Scenery({ today }: { today: DateStr }) {
  const [devScene, setDevScene] = useState(() => (DEV ? (read(K_SCENE) ?? "") : ""));
  const [devOpacity, setDevOpacity] = useState(() => (DEV ? (read(K_OPACITY) ?? "") : ""));
  const scene = (DEV && SCENES.find((s) => s.id === devScene)) || sceneFor(today);
  const src = sceneSrc(scene);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!DEV) return;
    const root = document.documentElement.style;
    if (devOpacity) root.setProperty("--scene-opacity-dev", devOpacity);
    else root.removeProperty("--scene-opacity-dev");
  }, [devOpacity]);

  return (
    <>
      {failed !== src && (
        <img
          className="scene"
          src={src}
          alt=""
          aria-hidden="true"
          draggable={false}
          decoding="async"
          onError={() => setFailed(src)}
          style={
            {
              "--focus-x": `${scene.focusX}%`,
              "--feature-top": scene.featureTop,
              "--scene-k": scene.opacity ?? 1,
            } as React.CSSProperties
          }
        />
      )}
      {DEV && (
        <DevSceneControls
          current={scene}
          scene={devScene}
          opacity={devOpacity}
          onScene={(v) => {
            setDevScene(v);
            write(K_SCENE, v || null);
          }}
          onOpacity={(v) => {
            setDevOpacity(v);
            write(K_OPACITY, v || null);
          }}
        />
      )}
    </>
  );
}

/**
 * Development only (`bun run dev`): pick a scene and try its faintness. The slider overrides
 * the current device's opacity (mobile or desktop) until reset. Not in the built app.
 */
function DevSceneControls(p: {
  current: Scene;
  scene: string;
  opacity: string;
  onScene: (v: string) => void;
  onOpacity: (v: string) => void;
}) {
  const img = document.querySelector<HTMLImageElement>("img.scene");
  // The slider sets the base (global) faintness; per-scene multipliers still apply on top.
  const base = img ? Number(getComputedStyle(img).opacity) / (p.current.opacity ?? 1) : 0.16;
  const shown = p.opacity || base.toFixed(3);
  return (
    <div className="dev-scene" role="group" aria-label="Scene preview (development only)">
      <label>
        Scene{" "}
        <select value={p.scene} onChange={(e) => p.onScene(e.target.value)}>
          <option value="">Today’s ({sceneFor(todayKey()).title})</option>
          {SCENES.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {s.title}
              {s.opacity ? ` (×${s.opacity})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Opacity{" "}
        <input
          type="range"
          min="0.04"
          max="0.5"
          step="0.01"
          value={shown || "0.16"}
          onChange={(e) => p.onOpacity(e.target.value)}
        />
        <output>{Math.round(Number(shown || 0.16) * 100)}%</output>
      </label>
      {(p.scene || p.opacity) && (
        <button
          type="button"
          onClick={() => {
            p.onScene("");
            p.onOpacity("");
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
