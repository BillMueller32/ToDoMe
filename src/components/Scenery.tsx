import { useEffect, useState } from "react";
import type { DateStr } from "../lib/dates";
import { SCENES, sceneFor } from "../lib/scenes";

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
 */
export function Scenery({ today }: { today: DateStr }) {
  const [devScene, setDevScene] = useState(() => (DEV ? (read(K_SCENE) ?? "") : ""));
  const [devOpacity, setDevOpacity] = useState(() => (DEV ? (read(K_OPACITY) ?? "") : ""));
  const scene = (DEV && SCENES.find((s) => s.id === devScene)) || sceneFor(today);

  useEffect(() => {
    if (!DEV) return;
    const root = document.documentElement.style;
    if (devOpacity) root.setProperty("--scene-opacity", devOpacity);
    else root.removeProperty("--scene-opacity");
  }, [devOpacity]);

  return (
    <>
      <img
        className="scene"
        src={scene.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
        style={{ "--focus-x": `${scene.focusX}%` } as React.CSSProperties}
      />
      {DEV && (
        <DevSceneControls
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

/** Development only (`bun run dev`): pick a scene and try its faintness. Not in the built app. */
function DevSceneControls(p: {
  scene: string;
  opacity: string;
  onScene: (v: string) => void;
  onOpacity: (v: string) => void;
}) {
  const shown = p.opacity || getComputedStyle(document.documentElement).getPropertyValue("--scene-opacity").trim();
  return (
    <div className="dev-scene" role="group" aria-label="Scene preview (development only)">
      <label>
        Scene{" "}
        <select value={p.scene} onChange={(e) => p.onScene(e.target.value)}>
          <option value="">Today’s</option>
          {SCENES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}
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
