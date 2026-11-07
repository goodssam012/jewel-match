// 판 크기, 보석 종류 수, 칸 크기(px)
export const N = 8;
export const TYPES = 7;
export const S = 64;

// 보석별 [밝은색, 중간색, 어두운색]
export const COLORS = [
  ['#ff8a8a', '#e01828', '#6e0010'], // 빨강 사각형
  ['#ffffff', '#cfd3dd', '#737a8a'], // 흰색 원
  ['#b2e4ff', '#2196ff', '#0a3b94'], // 파랑 다이아몬드
  ['#b6ffaa', '#2fc42a', '#0a6012'], // 초록 팔각형
  ['#fff8aa', '#f5d10c', '#8f7200'], // 노랑 마름모
  ['#ffd09a', '#ff7f12', '#9a3a00'], // 주황 육각형
  ['#f3b4ff', '#b52fe0', '#55087a'], // 보라 삼각형
];

// 애니메이션 수치 (PRD 6.2)
export const SWAP_SPEED = 7; // 칸/초
export const GRAVITY = 45; // 칸/초²
export const CLEAR_DELAY = 230; // ms
export const HINT_IDLE = 7; // 초
export const MAX_DT = 0.05; // 초

// 레벨 목표 점수 (PRD 2.5)
export const FIRST_TARGET = 1000;
export const nextTarget = (prevTarget, newLevel) => prevTarget + 1000 + (newLevel - 1) * 800;
