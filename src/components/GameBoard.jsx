import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { GameEngine } from '../game/engine.js';
import Banner from './Banner.jsx';

// 캔버스와 게임 엔진을 연결한다. 부모는 ref로 newGame(), hint()를 부를 수 있다.
const GameBoard = forwardRef(function GameBoard({ banner, onStats, onBanner }, ref) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // 최신 콜백을 엔진이 늘 쓰도록 ref에 담아 둔다.
  const callbacks = useRef({ onStats, onBanner });
  callbacks.current = { onStats, onBanner };

  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, {
      onStats: (s) => callbacks.current.onStats(s),
      onBanner: (t) => callbacks.current.onBanner(t),
    });
    engineRef.current = engine;
    if (import.meta.env.DEV) window.__engine = engine; // 개발 중 확인용
    const up = () => engine.pointerUp();
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointerup', up);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    newGame: () => engineRef.current?.newGame(),
    hint: () => engineRef.current?.hint(),
  }));

  return (
    <div className="board">
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => engineRef.current?.pointerDown(e)}
        onPointerMove={(e) => engineRef.current?.pointerMove(e)}
      />
      <Banner text={banner} />
    </div>
  );
});

export default GameBoard;
