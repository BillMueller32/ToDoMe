/**
 * A tiny field-notes sketch engine. Scenes are built from a few observational marks (ridge lines
 * with shade hatching, pines, tree clumps, water, rocks, grass, birds) using a seeded random
 * source, so each scene draws the same way every time. Output: stroke paths grouped by pen
 * width, plus small notes written in the corner. Drawing box: 390 × 300 (viewBox "0 40 390 300").
 */

export interface Note {
  x: number;
  y: number;
  text: string;
  size?: number;
  anchor?: "start" | "end";
}

export interface Drawing {
  strokes: [d: string, width: number][];
  notes: Note[];
}

type Pt = [number, number];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

export class Sketch {
  r: () => number;
  private buckets = new Map<number, string[]>();
  notes: Note[] = [];

  constructor(seed: number) {
    this.r = rng(seed);
  }

  rand(a: number, b: number) {
    return a + (b - a) * this.r();
  }

  /** Smooth 1-D noise in 0..1, sampled by x in px. */
  noise(scale: number, octaves = 2): (x: number) => number {
    const layers = Array.from({ length: octaves }, (_, o) => {
      const n = 24;
      const v = Array.from({ length: n + 2 }, () => this.r());
      const span = scale / 2 ** o;
      return (x: number) => {
        const t = (x + 20) / span;
        const i = Math.floor(t) % n;
        const u = (1 - Math.cos((t - Math.floor(t)) * Math.PI)) / 2;
        return v[i] * (1 - u) + v[i + 1] * u;
      };
    });
    return (x) => {
      let sum = 0;
      let w = 0;
      layers.forEach((l, o) => {
        const k = 1 / 2 ** o;
        sum += l(x) * k;
        w += k;
      });
      return sum / w;
    };
  }

  /** A pen line through points, with a little hand wobble. */
  line(pts: Pt[], w: number, wobble = 0.35) {
    const d = pts
      .map(([x, y], i) => `${i ? "L" : "M"}${f(x + this.rand(-wobble, wobble))} ${f(y + this.rand(-wobble, wobble))}`)
      .join("");
    const list = this.buckets.get(w) ?? [];
    list.push(d);
    this.buckets.set(w, list);
  }

  seg(x1: number, y1: number, x2: number, y2: number, w: number) {
    this.line([[x1, y1], [x2, y2]], w, 0.15);
  }

  note(x: number, y: number, text: string, size = 9, anchor: "start" | "end" = "start") {
    this.notes.push({ x, y, text, size, anchor });
  }

  /**
   * A ridge or hill line from x0 to x1 around baseline y. Shade hatching hangs below the slopes
   * that face away from the light (light from the upper left). Returns the height function.
   */
  ridge(o: {
    y: number;
    amp: number;
    scale?: number;
    x0?: number;
    x1?: number;
    w?: number;
    peaky?: boolean;
    hatch?: number;
    density?: number;
  }): (x: number) => number {
    const { y, amp, scale = 260, x0 = -6, x1 = 396, w = 0.9, peaky = false, hatch = 9, density = 0.75 } = o;
    const n = this.noise(scale, peaky ? 3 : 2);
    // Stretch the noise to use its full range across the drawing, so hills really rise and fall.
    let lo = Infinity;
    let hi = -Infinity;
    for (let x = x0; x <= x1; x += 2) {
      const v = n(x);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const span = hi - lo || 1;
    const h = (x: number) => {
      let v = (n(x) - lo) / span;
      if (peaky) v = Math.pow(v, 1.5);
      return y - amp * v;
    };
    const pts: Pt[] = [];
    for (let x = x0; x <= x1; x += 4) pts.push([x, h(x)]);
    this.line(pts, w);
    // a lighter second pass over part of the line, the way a pencil goes back over itself
    const a = Math.floor(this.rand(0, pts.length * 0.4));
    const b = Math.min(pts.length, a + Math.floor(this.rand(pts.length * 0.3, pts.length * 0.6)));
    this.line(pts.slice(a, b).map(([x, yy]) => [x, yy + 0.8] as Pt), w * 0.5, 0.5);
    if (hatch > 0) {
      for (let x = x0 + 2; x < x1 - 2; x += this.rand(2.6, 4.6)) {
        const slope = h(x + 3) - h(x - 3);
        const shaded = slope > 0.4;
        if (this.r() > (shaded ? density : density * 0.18)) continue;
        const len = hatch * (shaded ? this.rand(0.6, 1.2) * Math.min(1.6, 0.6 + slope / 3) : this.rand(0.2, 0.45));
        const top = h(x) + 1.2;
        this.seg(x, top, x - len * 0.45, top + len, 0.4);
      }
    }
    return h;
  }

  /** A pine: trunk and layered, down-swept branch strokes. */
  pine(x: number, base: number, height: number, w = 0.55) {
    const top = base - height;
    this.seg(x, base, x + this.rand(-0.4, 0.4), top, w);
    const levels = Math.max(4, Math.round(height / 3.2));
    for (let i = 1; i <= levels; i++) {
      const t = i / levels;
      const yy = top + t * height * 0.92;
      const hw = height * 0.28 * t + this.rand(-0.6, 0.6);
      this.seg(x, yy - 1, x - hw, yy + this.rand(1.2, 2.6), w * 0.8);
      this.seg(x, yy - 1, x + hw, yy + this.rand(1.2, 2.6), w * 0.8);
      if (t > 0.35 && this.r() < 0.6) this.seg(x + hw * 0.2, yy + 0.5, x + hw * 0.75, yy + 2.2, 0.35);
    }
  }

  /** A row of pines along a ridge. */
  pinesAlong(h: (x: number) => number, x0: number, x1: number, minH: number, maxH: number, gap: [number, number]) {
    for (let x = x0; x < x1; x += this.rand(gap[0], gap[1])) this.pine(x, h(x) + 1, this.rand(minH, maxH), 0.5);
  }

  /** A rounded tree clump: scalloped outline, shade on the right, a short trunk. */
  clump(cx: number, cy: number, rad: number, trunk = true) {
    const n = Math.max(7, Math.round(rad / 2.2));
    const pts: Pt[] = [];
    for (let i = 0; i <= n * 3; i++) {
      const a = Math.PI * (0.9 + (2 * i) / (n * 3));
      const bump = i % 3 === 1 ? 1.12 : 0.94;
      const rr = rad * bump * this.rand(0.92, 1.06);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82]);
    }
    this.line(pts, 0.6, 0.25);
    for (let k = 0; k < rad * 0.9; k++) {
      const a = this.rand(-0.6, 1.3);
      const rr = this.rand(rad * 0.25, rad * 0.85);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.8;
      this.seg(x, y, x - 2.2, y + 2.6, 0.35);
    }
    if (trunk) {
      this.seg(cx - 0.8, cy + rad * 0.75, cx - 0.6, cy + rad * 1.35, 0.6);
      this.seg(cx + 1.2, cy + rad * 0.75, cx + 1, cy + rad * 1.35, 0.6);
    }
  }

  /** Open water: broken horizontal strokes, longer and further apart toward the viewer. */
  water(top: number, bottom: number, x0 = -6, x1 = 396) {
    let y = top + 2;
    let step = 3;
    while (y < bottom) {
      let x = x0 + this.rand(0, 30);
      while (x < x1) {
        const len = this.rand(6, 18) * (1 + (y - top) / 60);
        if (this.r() < 0.62) this.seg(x, y, Math.min(x1, x + len), y + this.rand(-0.3, 0.3), 0.4);
        x += len + this.rand(6, 26);
      }
      y += step;
      step *= 1.12;
    }
  }

  /** A short wavering vertical reflection under something on the water. */
  reflection(x: number, y: number, len: number, width = 4) {
    for (let i = 0; i < len; i += 2.6) this.seg(x - width / 2 + this.rand(-1, 1), y + i, x + width / 2 + this.rand(-1, 1), y + i, 0.35);
  }

  rock(x: number, y: number, s: number) {
    const pts: Pt[] = [
      [x - s, y],
      [x - s * 0.7, y - s * 0.55],
      [x - s * 0.1, y - s * 0.8],
      [x + s * 0.6, y - s * 0.5],
      [x + s, y],
    ];
    this.line(pts, 0.65, 0.3);
    for (let i = 0; i < s; i += 1.8) this.seg(x + i * 0.5, y - s * 0.45 + i * 0.2, x + i * 0.5 + 1.6, y - 0.6, 0.35);
    this.seg(x - s - 2, y + 0.4, x + s + 3, y + 0.4, 0.4);
  }

  grass(x: number, y: number, s = 6) {
    for (let i = -2; i <= 2; i++) this.seg(x + i * 0.9, y, x + i * this.rand(1.4, 2.4), y - s * this.rand(0.6, 1.1), 0.4);
  }

  grassField(y0: number, y1: number, count: number, x0 = 0, x1 = 390) {
    for (let i = 0; i < count; i++) this.grass(this.rand(x0, x1), this.rand(y0, y1), this.rand(3, 7));
  }

  bird(x: number, y: number, s = 4) {
    this.line([[x - s, y - s * 0.35], [x - s * 0.4, y - s * 0.55], [x, y]], 0.5, 0.1);
    this.line([[x, y], [x + s * 0.4, y - s * 0.6], [x + s, y - s * 0.4]], 0.5, 0.1);
  }

  /** A sun or moon as a light, broken circle. */
  disc(cx: number, cy: number, rad: number) {
    const pts: Pt[] = [];
    const start = this.rand(0, 6);
    for (let a = 0; a <= Math.PI * 1.9; a += 0.25) pts.push([cx + Math.cos(start + a) * rad, cy + Math.sin(start + a) * rad]);
    this.line(pts, 0.55, 0.2);
  }

  /** Little stipple dots, e.g. sand in a bunker. */
  stipple(cx: number, cy: number, rx: number, ry: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = this.rand(0, Math.PI * 2);
      const rr = Math.sqrt(this.r());
      const x = cx + Math.cos(a) * rx * rr;
      const y = cy + Math.sin(a) * ry * rr;
      this.seg(x, y, x + 0.4, y + 0.2, 0.6);
    }
  }

  done(): Drawing {
    return {
      strokes: [...this.buckets].map(([w, ds]) => [ds.join(""), w] as [string, number]),
      notes: this.notes,
    };
  }
}
