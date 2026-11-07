import { useCallback, useRef, useState } from 'react';
import StatsPanel from './components/StatsPanel.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import GameBoard from './components/GameBoard.jsx';
import Controls from './components/Controls.jsx';
import { setMuted } from './game/sound.js';

export default function App() {
  const boardRef = useRef(null);
  const [stats, setStats] = useState({ score: 0, level: 1, best: 0, progress: 0 });
  const [banner, setBanner] = useState(null);
  const [muted, setMutedState] = useState(false);

  const toggleSound = useCallback(() => {
    setMutedState((m) => {
      setMuted(!m);
      return !m;
    });
  }, []);

  return (
    <div className="wrap">
      <h1>💎 보석 매치</h1>
      <StatsPanel score={stats.score} level={stats.level} best={stats.best} />
      <ProgressBar progress={stats.progress} />
      <GameBoard ref={boardRef} banner={banner} onStats={setStats} onBanner={setBanner} />
      <Controls
        muted={muted}
        onHint={() => boardRef.current?.hint()}
        onNewGame={() => boardRef.current?.newGame()}
        onToggleSound={toggleSound}
      />
      <p className="help">보석을 클릭하거나 드래그해서 옆 보석과 바꾸세요. 같은 보석 3개 이상을 한 줄로, 또는 2×2 사각형으로!</p>
    </div>
  );
}
