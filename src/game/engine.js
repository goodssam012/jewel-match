// 캔버스 애니메이션과 게임 진행 흐름을 담당한다.
// 매 프레임 바뀌는 보석 위치는 React 상태가 아니라 이 엔진 안에서 관리하고,
// 점수·레벨·알림처럼 화면 UI에 필요한 값만 콜백으로 React에 알려 준다.
import {
  N, S, COLORS, SWAP_SPEED, GRAVITY, CLEAR_DELAY, HINT_IDLE, MAX_DT, FIRST_TARGET, nextTarget,
} from './constants.js';
import { getSprites } from './sprites.js';
import { sfx } from './sound.js';
import { randType, makeTypes, findMove, findMatches, baseScore } from './logic.js';

const BEST_KEY = 'jewelBest';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // 저장할 수 없는 환경이면 넘어간다 (PRD 5).
  }
}

function newGem(type, r, c, y) {
  return { type, r, c, x: c, y: y ?? r, vy: 0, scale: 1, slide: false };
}

export class GameEngine {
  constructor(canvas, { onStats, onBanner }) {
    this.canvas = canvas;
    this.onStats = onStats;
    this.onBanner = onBanner;
    this.sprites = getSprites();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = N * S * dpr;
    canvas.height = N * S * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);

    this.best = loadBest();
    this.settleWaiters = [];
    this.alive = true;
    this.newGame();

    this.last = performance.now();
    const loop = (now) => {
      if (!this.alive) return;
      const dt = Math.min(MAX_DT, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
  }

  // ---------- 상태 ----------
  newGame() {
    if (this.busy) return;
    this.score = 0;
    this.level = 1;
    this.levelStart = 0;
    this.target = FIRST_TARGET;
    this.sel = null;
    this.drag = null;
    this.hintPair = null;
    this.idle = 0;
    this.dying = [];
    this.particles = [];
    this.floaters = [];
    const t = makeTypes();
    // 열마다 시간차를 두고 위에서 떨어진다.
    this.grid = t.map((row, r) => row.map((v, c) => newGem(v, r, c, r - N - 1 - c * 0.3)));
    this.emitStats();
    this.busy = true;
    this.settle().then(() => {
      this.busy = false;
    });
  }

  emitStats() {
    const progress = Math.min(1, (this.score - this.levelStart) / (this.target - this.levelStart));
    this.onStats({ score: this.score, level: this.level, best: this.best, progress });
  }

  typeGrid() {
    return this.grid.map((row) => row.map((g) => g.type));
  }

  settle() {
    return new Promise((r) => this.settleWaiters.push(r));
  }

  hint() {
    if (this.busy) return;
    this.hintPair = findMove(this.typeGrid());
    sfx.hint();
  }

  // ---------- 진행 ----------
  swapCells(a, b) {
    const g1 = this.grid[a.r][a.c];
    const g2 = this.grid[b.r][b.c];
    this.grid[a.r][a.c] = g2;
    this.grid[b.r][b.c] = g1;
    [g1.r, g1.c, g2.r, g2.c] = [b.r, b.c, a.r, a.c];
    g1.slide = g2.slide = true;
  }

  async doSwap(a, b) {
    this.busy = true;
    this.hintPair = null;
    this.idle = 0;
    this.swapCells(a, b);
    sfx.swap();
    await this.settle();

    let m = findMatches(this.grid);
    if (!m.set.size) {
      this.swapCells(a, b);
      sfx.fail();
      await this.settle();
      this.busy = false;
      return;
    }

    let combo = 1;
    while (m.set.size) {
      this.clearMatches(m, combo);
      await sleep(CLEAR_DELAY);
      this.gravity();
      await this.settle();
      m = findMatches(this.grid);
      combo++;
    }
    await this.checkLevel();
    if (!findMove(this.typeGrid())) await this.reshuffle();
    this.busy = false;
  }

  clearMatches(m, combo) {
    let gained = 0;
    for (const g of m.groups) {
      const pts = baseScore(g) * combo * this.level;
      gained += pts;
      const cx = g.reduce((s, x) => s + x.c, 0) / g.length;
      const cy = g.reduce((s, x) => s + x.r, 0) / g.length;
      this.floaters.push({
        x: (cx + 0.5) * S, y: (cy + 0.5) * S, life: 1,
        text: (g.square ? '사각형! +' : '+') + pts, color: COLORS[g[0].type][0],
      });
    }
    if (combo > 1) {
      this.floaters.push({ x: (N * S) / 2, y: (N * S) / 2, text: `콤보 x${combo}!`, life: 1.2, color: '#ffcf4a', big: true });
    }
    for (const g of m.set) {
      this.grid[g.r][g.c] = null;
      g.dying = true;
      this.dying.push(g);
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 160;
        this.particles.push({
          x: (g.c + 0.5) * S, y: (g.r + 0.5) * S,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
          life: 0.6 + Math.random() * 0.3, color: COLORS[g.type][1],
        });
      }
    }
    this.addScore(gained);
    sfx.match(combo);
  }

  gravity() {
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        const g = this.grid[r][c];
        if (g) {
          if (r !== w) {
            this.grid[w][c] = g;
            this.grid[r][c] = null;
            g.r = w;
          }
          w--;
        }
      }
      const empty = w + 1;
      for (let r = 0; r <= w; r++) this.grid[r][c] = newGem(randType(), r, c, r - empty - 0.2);
    }
  }

  async reshuffle() {
    this.onBanner('섞는 중...');
    await sleep(500);
    const t = makeTypes();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        this.grid[r][c].type = t[r][c];
        this.grid[r][c].scale = 0;
      }
    }
    await sleep(600);
    this.onBanner(null);
  }

  addScore(n) {
    this.score += n;
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
    this.emitStats();
  }

  async checkLevel() {
    if (this.score < this.target) return;
    this.level++;
    this.levelStart = this.target;
    this.target = nextTarget(this.levelStart, this.level);
    this.emitStats();
    this.onBanner(`레벨 ${this.level}!`);
    sfx.levelUp();
    await sleep(1100);
    this.onBanner(null);
  }

  // ---------- 입력 ----------
  cellAt(e) {
    const rect = this.canvas.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * N);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * N);
    return r >= 0 && r < N && c >= 0 && c < N ? { r, c } : null;
  }

  pointerDown(e) {
    if (this.busy) return;
    const p = this.cellAt(e);
    if (!p) return;
    this.idle = 0;
    const sel = this.sel;
    if (sel && Math.abs(sel.r - p.r) + Math.abs(sel.c - p.c) === 1) {
      this.sel = null;
      this.doSwap(sel, p);
      return;
    }
    this.sel = sel && sel.r === p.r && sel.c === p.c ? null : p;
    this.drag = { x: e.clientX, y: e.clientY, cell: p };
    sfx.select();
  }

  pointerMove(e) {
    if (!this.drag || this.busy) return;
    const rect = this.canvas.getBoundingClientRect();
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < (rect.width / N) * 0.4) return;
    const a = this.drag.cell;
    const b = Math.abs(dx) > Math.abs(dy) ? { r: a.r, c: a.c + Math.sign(dx) } : { r: a.r + Math.sign(dy), c: a.c };
    this.drag = null;
    if (b.r < 0 || b.r >= N || b.c < 0 || b.c >= N) return;
    this.sel = null;
    this.doSwap(a, b);
  }

  pointerUp() {
    this.drag = null;
  }

  // ---------- 프레임 ----------
  update(dt) {
    let moving = false;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        if (g.slide) {
          const sp = SWAP_SPEED * dt;
          g.x += Math.sign(g.c - g.x) * Math.min(Math.abs(g.c - g.x), sp);
          g.y += Math.sign(g.r - g.y) * Math.min(Math.abs(g.r - g.y), sp);
          if (g.x === g.c && g.y === g.r) g.slide = false;
          else moving = true;
        } else if (g.y < g.r) {
          g.vy += GRAVITY * dt;
          g.y += g.vy * dt;
          if (g.y >= g.r) {
            g.y = g.r;
            g.vy = 0;
          } else moving = true;
        }
        if (g.scale < 1) g.scale = Math.min(1, g.scale + dt * 3);
      }
    }
    if (!moving && this.settleWaiters.length) {
      const w = this.settleWaiters;
      this.settleWaiters = [];
      w.forEach((f) => f());
    }
    this.dying = this.dying.filter((g) => (g.scale -= dt * 5) > 0);
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
      return p.life > 0;
    });
    this.floaters = this.floaters.filter((f) => {
      f.y -= 40 * dt;
      f.life -= dt;
      return f.life > 0;
    });
    if (!this.busy) {
      this.idle += dt;
      if (this.idle > HINT_IDLE && !this.hintPair) this.hintPair = findMove(this.typeGrid());
    }
  }

  drawGem(g, extra = 1) {
    const size = S * 0.88 * g.scale * extra;
    this.ctx.drawImage(this.sprites[g.type], g.x * S + S / 2 - size / 2, g.y * S + S / 2 - size / 2, size, size);
  }

  render(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, N * S, N * S);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        ctx.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.025)';
        ctx.fillRect(c * S, r * S, S, S);
      }
    }

    const pulse = (Math.sin(time / 150) + 1) / 2;
    const ring = (p, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(p.c * S + 3, p.r * S + 3, S - 6, S - 6, 10);
      ctx.stroke();
    };
    if (this.hintPair) this.hintPair.forEach((p) => ring(p, `rgba(255,220,80,${0.3 + pulse * 0.7})`));
    if (this.sel) ring(this.sel, '#fff');

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, N * S, N * S);
    ctx.clip();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        const isSel = this.sel && this.sel.r === r && this.sel.c === c && !g.slide;
        this.drawGem(g, isSel ? 1 + Math.sin(time / 120) * 0.07 : 1);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    this.dying.forEach((g) => this.drawGem(g, 1.3 - g.scale * 0.3));
    this.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.floaters.forEach((f) => {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = `900 ${f.big ? 40 : 22}px system-ui, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
  }
}
