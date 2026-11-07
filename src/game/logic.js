// 판 규칙만 담은 순수 함수들. 화면이나 React와 상관없이 동작한다.
import { N, TYPES } from './constants.js';

export const randType = () => Math.floor(Math.random() * TYPES);

// 칸 (r, c)가 한 줄 3개 이상 또는 2x2 사각형 매치에 들어가는지 (t: 보석 종류 2차원 배열)
export function matchAt(t, r, c) {
  const v = t[r][c];
  let h = 1, w = 1;
  for (let k = c - 1; k >= 0 && t[r][k] === v; k--) h++;
  for (let k = c + 1; k < N && t[r][k] === v; k++) h++;
  for (let k = r - 1; k >= 0 && t[k][c] === v; k--) w++;
  for (let k = r + 1; k < N && t[k][c] === v; k++) w++;
  if (h >= 3 || w >= 3) return true;
  for (const [dr, dc] of [[0, 0], [0, -1], [-1, 0], [-1, -1]]) {
    const r0 = r + dr, c0 = c + dc;
    if (r0 < 0 || c0 < 0 || r0 + 1 >= N || c0 + 1 >= N) continue;
    if (t[r0][c0] === v && t[r0][c0 + 1] === v && t[r0 + 1][c0] === v && t[r0 + 1][c0 + 1] === v) return true;
  }
  return false;
}

// 바꿔서 매치가 생기는 이웃 두 칸을 하나 찾는다. 없으면 null.
export function findMove(t) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 >= N || c2 >= N) continue;
        [t[r][c], t[r2][c2]] = [t[r2][c2], t[r][c]];
        const ok = matchAt(t, r, c) || matchAt(t, r2, c2);
        [t[r][c], t[r2][c2]] = [t[r2][c2], t[r][c]];
        if (ok) return [{ r, c }, { r: r2, c: c2 }];
      }
    }
  }
  return null;
}

// 미리 맞춰진 보석이 없고, 바꿀 수 있는 수가 하나 이상 있는 판을 만든다.
export function makeTypes() {
  let t;
  do {
    t = [];
    for (let r = 0; r < N; r++) {
      t.push([]);
      for (let c = 0; c < N; c++) {
        let v;
        do {
          v = randType();
        } while (
          (c >= 2 && t[r][c - 1] === v && t[r][c - 2] === v) ||
          (r >= 2 && t[r - 1][c] === v && t[r - 2][c] === v) ||
          (r >= 1 && c >= 1 && t[r - 1][c] === v && t[r][c - 1] === v && t[r - 1][c - 1] === v)
        );
        t[r].push(v);
      }
    }
  } while (!findMove(t));
  return t;
}

// 판 전체에서 매치 그룹을 찾는다. grid는 { type } 객체의 2차원 배열.
// 반환: { groups: 그룹 배열(사각형은 square=true), set: 터질 보석 전체 }
export function findMatches(grid) {
  const groups = [];
  for (let r = 0; r < N; r++) {
    let c = 0;
    while (c < N) {
      const t = grid[r][c].type;
      let e = c + 1;
      while (e < N && grid[r][e].type === t) e++;
      if (e - c >= 3) groups.push(grid[r].slice(c, e));
      c = e;
    }
  }
  for (let c = 0; c < N; c++) {
    let r = 0;
    while (r < N) {
      const t = grid[r][c].type;
      let e = r + 1;
      while (e < N && grid[e][c].type === t) e++;
      if (e - r >= 3) {
        const g = [];
        for (let k = r; k < e; k++) g.push(grid[k][c]);
        groups.push(g);
      }
      r = e;
    }
  }
  for (let r = 0; r + 1 < N; r++) {
    for (let c = 0; c + 1 < N; c++) {
      const t = grid[r][c].type;
      if (grid[r][c + 1].type === t && grid[r + 1][c].type === t && grid[r + 1][c + 1].type === t) {
        const g = [grid[r][c], grid[r][c + 1], grid[r + 1][c], grid[r + 1][c + 1]];
        g.square = true;
        groups.push(g);
      }
    }
  }
  const set = new Set();
  groups.forEach((g) => g.forEach((x) => set.add(x)));
  return { groups, set };
}

// 그룹 하나의 기본 점수 (PRD 2.4)
export function baseScore(group) {
  if (group.square) return 100;
  if (group.length === 3) return 30;
  if (group.length === 4) return 90;
  return group.length * 50;
}
