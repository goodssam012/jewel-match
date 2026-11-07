import { COLORS, TYPES } from './constants.js';

function poly(n, r, rot = 0, cy = 0) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n;
    p.push([Math.cos(a) * r, Math.sin(a) * r + cy]);
  }
  return p;
}

function shape(t) {
  switch (t) {
    case 0: {
      const a = 0.78, b = 0.55;
      return [[-b, -a], [b, -a], [a, -b], [a, b], [b, a], [-b, a], [-a, b], [-a, -b]];
    }
    case 1: return poly(10, 0.84, -Math.PI / 2);
    case 2: return [[-0.45, -0.72], [0.45, -0.72], [0.88, -0.2], [0, 0.85], [-0.88, -0.2]];
    case 3: return poly(8, 0.88, Math.PI / 8);
    case 4: return poly(4, 0.92, -Math.PI / 2);
    case 5: return poly(6, 0.9, 0);
    case 6: return poly(3, 0.98, -Math.PI / 2, 0.18);
    default: return poly(6, 0.9);
  }
}

// 보석 하나를 128px 캔버스에 미리 그려 둔다.
function makeSprite(t) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.scale((size / 2) * 0.95, (size / 2) * 0.95);

  const [light, mid, dark] = COLORS[t];
  const outer = shape(t);
  const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length;
  const cy = outer.reduce((s, p) => s + p[1], 0) / outer.length;
  const inner = outer.map(([x, y]) => [cx + (x - cx) * 0.52, cy + (y - cy) * 0.52 - 0.04]);
  const path = (pts) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };

  // 그림자
  g.save();
  g.translate(0.04, 0.07);
  path(outer);
  g.fillStyle = 'rgba(0,0,0,.35)';
  g.fill();
  g.restore();

  // 몸체
  const grad = g.createLinearGradient(-1, -1, 1, 1);
  grad.addColorStop(0, light);
  grad.addColorStop(0.5, mid);
  grad.addColorStop(1, dark);
  path(outer);
  g.fillStyle = grad;
  g.fill();

  // 면 음영
  for (let i = 0; i < outer.length; i++) {
    const j = (i + 1) % outer.length;
    const mx = (outer[i][0] + outer[j][0]) / 2 - cx;
    const my = (outer[i][1] + outer[j][1]) / 2 - cy;
    const len = Math.hypot(mx, my) || 1;
    const d = (-mx * 0.7 - my * 0.7) / len;
    g.beginPath();
    g.moveTo(...outer[i]);
    g.lineTo(...outer[j]);
    g.lineTo(...inner[j]);
    g.lineTo(...inner[i]);
    g.closePath();
    g.fillStyle = d > 0 ? `rgba(255,255,255,${d * 0.35})` : `rgba(0,0,0,${-d * 0.35})`;
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.lineWidth = 0.02;
    g.stroke();
  }

  // 윗면
  const ig = g.createLinearGradient(-0.5, -0.5, 0.5, 0.5);
  ig.addColorStop(0, light);
  ig.addColorStop(1, mid);
  path(inner);
  g.fillStyle = ig;
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,.4)';
  g.lineWidth = 0.025;
  g.stroke();

  // 테두리
  path(outer);
  g.strokeStyle = dark;
  g.lineWidth = 0.05;
  g.stroke();

  // 반짝임
  g.beginPath();
  g.ellipse(cx - 0.22, cy - 0.3, 0.2, 0.1, -0.6, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.fill();
  g.beginPath();
  g.arc(cx + 0.25, cy + 0.25, 0.05, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.fill();
  return c;
}

let cache = null;
export function getSprites() {
  if (!cache) cache = Array.from({ length: TYPES }, (_, t) => makeSprite(t));
  return cache;
}
