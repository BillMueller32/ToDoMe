import { daysBetween, type DateStr } from "./dates";
import { Sketch, type Drawing } from "./fieldsketch";

/**
 * The faint pencil sketch at the bottom of the page: field-notes style scenes, one per day in
 * turn. Each is drawn in a 390 × 300 box (viewBox "0 40 390 300") with the engine in
 * fieldsketch.ts; the note sits bottom-left. Add a scene by appending to SCENES.
 */
export interface Scene {
  name: string;
  draw: () => Drawing;
}

function sailboat(s: Sketch, x: number, y: number, k: number) {
  s.line([[x - 14 * k, y - 3 * k], [x - 8 * k, y + 1 * k], [x + 10 * k, y + 1 * k], [x + 16 * k, y - 3 * k]], 0.6);
  s.seg(x - 14 * k, y - 3 * k, x + 16 * k, y - 3 * k, 0.5);
  s.seg(x, y - 3 * k, x, y - 40 * k, 0.55);
  s.line([[x + 1, y - 38 * k], [x + 13 * k, y - 6 * k], [x + 1, y - 6 * k]], 0.5);
  s.line([[x - 1, y - 34 * k], [x - 11 * k, y - 6 * k], [x - 1, y - 6 * k]], 0.45);
  for (let i = 0; i < 6; i++) s.seg(x + 2 + i * 1.6 * k, y - 8 * k - i * 3 * k, x + 2 + i * 1.6 * k, y - 7 * k, 0.3);
  s.reflection(x, y + 2, 12 * k, 22 * k);
}

function house(s: Sketch, x: number, y: number, w: number) {
  s.line([[x, y], [x, y - w * 0.7], [x + w / 2, y - w * 1.15], [x + w, y - w * 0.7], [x + w, y]], 0.45, 0.15);
  s.seg(x + w * 0.35, y - w * 0.45, x + w * 0.35, y - w * 0.2, 0.4);
}

export const SCENES: Scene[] = [
  {
    name: "Lake",
    draw() {
      const s = new Sketch(11);
      s.disc(318, 90, 10);
      s.bird(120, 96, 4);
      s.bird(134, 104, 3);
      s.ridge({ y: 182, amp: 92, peaky: true, scale: 170, w: 0.8, hatch: 13, density: 0.9 });
      const mid = s.ridge({ y: 210, amp: 26, scale: 300, w: 0.75, hatch: 6, density: 0.45 });
      s.pinesAlong(mid, -2, 150, 7, 15, [5, 10]);
      s.pinesAlong(mid, 250, 392, 7, 16, [5, 10]);
      s.ridge({ y: 216, amp: 3, scale: 120, w: 0.6, hatch: 0 });
      s.water(218, 292);
      s.line([[150, 252], [158, 256], [184, 256], [194, 252]], 0.6);
      s.seg(150, 252, 194, 252, 0.5);
      s.seg(166, 252, 178, 246, 0.45);
      s.reflection(172, 258, 8, 26);
      s.ridge({ y: 304, amp: 9, scale: 200, w: 0.85, hatch: 5, density: 0.4 });
      s.rock(40, 300, 10);
      s.rock(62, 302, 6);
      s.rock(334, 298, 9);
      s.grassField(292, 304, 12);
      s.note(10, 322, "Alpine lake · 6:40 am · still");
      return s.done();
    },
  },
  {
    name: "Fairway",
    draw() {
      const s = new Sketch(23);
      s.disc(302, 94, 10);
      s.bird(200, 100, 4);
      s.bird(214, 108, 3);
      const far = s.ridge({ y: 172, amp: 28, scale: 420, w: 0.7, hatch: 6, density: 0.5 });
      s.pinesAlong(far, 300, 392, 5, 10, [4, 8]);
      s.pinesAlong(far, -2, 40, 5, 9, [4, 8]);
      const mid = s.ridge({ y: 218, amp: 26, scale: 340, w: 0.85, hatch: 8, density: 0.6 });
      s.clump(70, mid(70) - 14, 13);
      s.clump(94, mid(94) - 9, 8);
      const b = mid(270);
      const green: [number, number][] = [];
      for (let a = 0; a <= Math.PI * 2.05; a += 0.3) green.push([270 + Math.cos(a) * 26, b + 1 + Math.sin(a) * 4]);
      s.line(green, 0.45);
      s.seg(270, b, 270.4, b - 32, 0.6);
      s.line([[270.4, b - 32], [285, b - 28], [270.4, b - 24]], 0.5);
      for (let i = 0; i < 4; i++) s.seg(272 + i * 3, b - 30 + i, 272 + i * 3, b - 26 - i * 0.2, 0.3);
      const near = s.ridge({ y: 262, amp: 16, scale: 300, w: 0.85, hatch: 7, density: 0.5 });
      const by = near(170) + 16;
      const bunker: [number, number][] = [];
      for (let a = 0; a <= Math.PI * 2.05; a += 0.3) bunker.push([170 + Math.cos(a) * 24, by + Math.sin(a) * 5]);
      s.line(bunker, 0.5);
      s.stipple(170, by, 20, 3.6, 40);
      s.grassField(288, 304, 14);
      s.note(10, 322, "No. 7 · par 4 · wind from the SW");
      return s.done();
    },
  },
  {
    name: "Coast",
    draw() {
      const s = new Sketch(37);
      s.disc(300, 112, 12);
      s.bird(190, 104, 4);
      s.bird(206, 116, 3.5);
      s.bird(176, 122, 3);
      s.seg(130, 198, 396, 198.5, 0.6);
      s.water(200, 304, 128, 396);
      s.reflection(300, 202, 30, 16);
      const edge = (y: number) => 118 + (y - 160) * 0.22 + Math.sin(y / 9) * 3;
      const top: [number, number][] = [];
      for (let x = -6; x <= 118; x += 4) top.push([x, 156 + Math.sin(x / 23) * 3 - (x / 118) * 4]);
      s.line(top, 0.9);
      const face: [number, number][] = [];
      for (let y = 152; y <= 304; y += 4) face.push([edge(y), y]);
      s.line(face, 0.9);
      for (let y = 160; y < 300; y += s.rand(2.6, 4)) s.seg(edge(y) - 1.5, y, edge(y) - s.rand(8, 26), y + 2.5, 0.4);
      for (let x = 4; x < 110; x += s.rand(6, 12)) s.grass(x, 156 + Math.sin(x / 23) * 3 - (x / 118) * 4, 4);
      // lighthouse
      s.seg(52, 154, 55, 110, 0.6);
      s.seg(66, 154, 63, 110, 0.6);
      s.seg(53.5, 132, 64.5, 132, 0.45);
      s.seg(54.3, 121, 63.7, 121, 0.45);
      s.line([[54, 110], [54, 101], [64, 101], [64, 110], [54, 110]], 0.5);
      s.line([[52, 101], [59, 94], [66, 101]], 0.5);
      s.seg(66, 104, 84, 100, 0.35);
      s.seg(66, 106, 84, 109, 0.35);
      s.line([[57, 154], [57, 146], [61, 146], [61, 154]], 0.4);
      s.rock(156, 300, 8);
      s.rock(180, 303, 5);
      for (let i = 0; i < 6; i++) s.seg(146 + i * 8, 294 + s.rand(-2, 2), 150 + i * 8, 292, 0.35);
      s.note(10, 322, "The point · low tide · gulls");
      return s.done();
    },
  },
  {
    name: "Desert",
    draw() {
      const s = new Sketch(41);
      s.disc(250, 98, 13);
      s.bird(120, 92, 4);
      const mesa: [number, number][] = [[-6, 196], [28, 196], [38, 156], [44, 150], [124, 150], [130, 156], [144, 196], [262, 196], [270, 176], [276, 172], [330, 172], [336, 177], [346, 196], [396, 196]];
      s.line(mesa, 0.9);
      for (let y = 158; y < 194; y += s.rand(5, 7)) {
        const l = 40 + (y - 156) * 0.12;
        const r = 130 + (y - 156) * 0.32;
        for (let x = l; x < r; x += s.rand(10, 26)) s.seg(x, y, Math.min(r, x + s.rand(6, 18)), y + s.rand(-0.3, 0.3), 0.35);
      }
      for (let y = 156; y < 196; y += 2.6) s.seg(129 + (y - 156) * 0.35, y, 120 + (y - 156) * 0.3, y + 1.5, 0.4);
      for (let y = 178; y < 196; y += 2.6) s.seg(336 + (y - 176) * 0.5, y, 330 + (y - 176) * 0.5, y + 1.5, 0.4);
      s.ridge({ y: 236, amp: 6, scale: 200, w: 0.5, hatch: 0, x0: -6, x1: 150 });
      s.ridge({ y: 236, amp: 6, scale: 200, w: 0.5, hatch: 0, x0: 252, x1: 396 });
      s.seg(150, 340, 196, 198, 0.75);
      s.seg(250, 340, 204, 198, 0.75);
      for (let y = 330, l = 12; y > 206 && l > 1.5; y -= l * 1.8, l *= 0.85) s.seg(200 + (y - 198) * 0.14, y, 200 + (y - 198 - l) * 0.14, y - l, 0.6);
      // saguaro
      const cx = 322;
      s.line([[cx - 5, 304], [cx - 5, 238], [cx - 4, 232], [cx + 4, 232], [cx + 5, 238], [cx + 5, 304]], 0.7, 0.2);
      for (let i = -3; i <= 3; i += 2) s.seg(cx + i, 238, cx + i, 302, 0.3);
      s.line([[cx - 5, 272], [cx - 16, 272], [cx - 18, 268], [cx - 18, 250], [cx - 14, 247], [cx - 11, 250], [cx - 11, 265], [cx - 5, 265]], 0.6, 0.2);
      s.line([[cx + 5, 262], [cx + 15, 262], [cx + 17, 258], [cx + 17, 242], [cx + 13, 239], [cx + 10, 242], [cx + 10, 255], [cx + 5, 255]], 0.6, 0.2);
      for (let i = 0; i < 9; i++) s.grass(s.rand(20, 140), s.rand(250, 302), s.rand(3, 6));
      for (let i = 0; i < 5; i++) s.grass(s.rand(250, 390), s.rand(270, 304), s.rand(3, 6));
      s.note(10, 322, "Mesa, late afternoon · heat on the road");
      return s.done();
    },
  },
  {
    name: "Forest",
    draw() {
      const s = new Sketch(53);
      s.disc(92, 90, 9);
      const r1 = s.ridge({ y: 168, amp: 42, scale: 300, w: 0.6, hatch: 5, density: 0.4 });
      s.pinesAlong(r1, -4, 396, 4, 7, [3, 6]);
      const r2 = s.ridge({ y: 220, amp: 30, scale: 260, w: 0.75, hatch: 6, density: 0.5 });
      s.pinesAlong(r2, -4, 396, 8, 14, [5, 9]);
      // cabin
      const x = 186;
      const b = 292;
      s.line([[x, b], [x, b - 24], [x + 40, b - 24], [x + 40, b]], 0.7, 0.2);
      s.line([[x - 6, b - 22], [x + 20, b - 42], [x + 46, b - 22]], 0.7, 0.2);
      for (let y = b - 20; y < b; y += 4) s.seg(x + 1, y, x + 39, y + 0.2, 0.35);
      s.line([[x + 16, b], [x + 16, b - 13], [x + 24, b - 13], [x + 24, b]], 0.5);
      s.line([[x + 29, b - 18], [x + 36, b - 18], [x + 36, b - 12], [x + 29, b - 12], [x + 29, b - 18]], 0.45);
      s.line([[x + 32, b - 32], [x + 32, b - 42], [x + 37, b - 42], [x + 37, b - 28]], 0.5);
      s.line([[x + 34, b - 45], [x + 30, b - 52], [x + 36, b - 58], [x + 31, b - 66], [x + 37, b - 74]], 0.4);
      s.line([[x + 20, b], [x + 14, b + 14], [x + 22, b + 30]], 0.45);
      s.line([[x + 24, b], [x + 30, b + 14], [x + 34, b + 30]], 0.45);
      s.pine(38, 304, 74);
      s.pine(66, 306, 52);
      s.pine(344, 304, 78);
      s.pine(372, 302, 52);
      s.seg(-6, 300, 396, 301, 0.5);
      s.grassField(292, 306, 14);
      s.note(10, 322, "Ridge trail, mile 4 · woodsmoke");
      return s.done();
    },
  },
  {
    name: "Farm",
    draw() {
      const s = new Sketch(67);
      s.disc(322, 94, 10);
      s.bird(232, 98, 4);
      s.bird(246, 108, 3);
      const r1 = s.ridge({ y: 184, amp: 22, scale: 380, w: 0.7, hatch: 5, density: 0.4 });
      s.clump(110, r1(110) - 11, 10);
      s.clump(128, r1(128) - 7, 7);
      const r2 = s.ridge({ y: 228, amp: 20, scale: 320, w: 0.85, hatch: 6, density: 0.5 });
      // barn
      const x = 256;
      const b = r2(276) + 2;
      s.line([[x, b], [x, b - 26], [x + 40, b - 26], [x + 40, b]], 0.7, 0.2);
      s.line([[x - 3, b - 25], [x + 6, b - 40], [x + 20, b - 47], [x + 34, b - 40], [x + 43, b - 25]], 0.7, 0.2);
      s.line([[x + 13, b], [x + 13, b - 16], [x + 27, b - 16], [x + 27, b]], 0.5);
      s.seg(x + 13, b - 16, x + 27, b, 0.4);
      s.seg(x + 27, b - 16, x + 13, b, 0.4);
      s.line([[x + 16, b - 28], [x + 24, b - 28], [x + 24, b - 34], [x + 16, b - 34], [x + 16, b - 28]], 0.4);
      for (let i = 0; i < 9; i++) s.seg(x + 41 + i * 0.2, b - 24 + i * 2.8, x + 46 + i * 0.2, b - 22 + i * 2.8, 0.35);
      // windmill
      s.seg(330, b + 2, 336, b - 46, 0.5);
      s.seg(342, b + 2, 336, b - 46, 0.5);
      s.seg(332, b - 14, 340, b - 14, 0.35);
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4 + 0.2;
        s.seg(336, b - 48, 336 + Math.cos(ang) * 11, b - 48 + Math.sin(ang) * 11, 0.4);
      }
      // furrows
      for (let i = 0; i < 9; i++) {
        const pts: [number, number][] = [];
        for (let xx = -6 + i * 6; xx <= 240 - i * 10; xx += 8) {
          const yy = r2(xx) + 10 + i * (6 + i * 0.8) + xx * 0.04;
          if (yy < 286) pts.push([xx, yy]);
        }
        if (pts.length > 1) s.line(pts, 0.4, 0.4);
      }
      for (let px = 6; px < 170; px += 19) s.seg(px, 304, px + 0.5, 290, 0.6);
      s.seg(0, 293, 172, 291, 0.45);
      s.seg(0, 299, 172, 297, 0.45);
      s.note(10, 322, "Fields after harvest");
      return s.done();
    },
  },
  {
    name: "Harbour",
    draw() {
      const s = new Sketch(79);
      s.disc(330, 98, 9);
      s.bird(110, 108, 4);
      s.bird(126, 118, 3.5);
      const hills = s.ridge({ y: 184, amp: 30, scale: 300, w: 0.7, hatch: 6, density: 0.45 });
      for (let x = 30; x < 160; x += s.rand(11, 17)) house(s, x, hills(x + 4) + 2, s.rand(6, 9));
      s.clump(186, hills(186) - 6, 6, false);
      s.seg(-6, 204, 396, 204.5, 0.65);
      s.water(206, 304);
      sailboat(s, 120, 228, 1);
      sailboat(s, 200, 216, 0.6);
      s.seg(236, 244, 396, 244, 0.7);
      s.seg(236, 250, 396, 250, 0.7);
      for (let x = 240; x < 396; x += 6) s.seg(x, 244, x + 0.8, 250, 0.35);
      for (let x = 246; x < 396; x += 28) {
        s.seg(x, 250, x, 290, 0.6);
        s.reflection(x, 292, 10, 3);
      }
      s.note(10, 322, "Harbour · morning, light fog");
      return s.done();
    },
  },
];

const cache = new Map<string, Drawing>();

/** A scene's drawing, worked out once and kept. */
export function drawingOf(scene: Scene): Drawing {
  let d = cache.get(scene.name);
  if (!d) cache.set(scene.name, (d = scene.draw()));
  return d;
}

/** Today's scene: the next one in the list each day, round and round. */
export function sceneFor(day: DateStr): Scene {
  const n = SCENES.length;
  const i = daysBetween("2026-01-01", day) % n;
  return SCENES[(i + n) % n];
}
