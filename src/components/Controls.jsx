export default function Controls({ muted, onHint, onNewGame, onToggleSound }) {
  return (
    <div className="buttons">
      <button type="button" onClick={onHint}>💡 힌트</button>
      <button type="button" onClick={onNewGame}>🔄 새 게임</button>
      <button type="button" onClick={onToggleSound}>{muted ? '🔇 소리' : '🔊 소리'}</button>
    </div>
  );
}
