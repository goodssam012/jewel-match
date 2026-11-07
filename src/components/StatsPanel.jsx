function Stat({ label, value }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <b>{value.toLocaleString()}</b>
    </div>
  );
}

export default function StatsPanel({ score, level, best }) {
  return (
    <div className="stats">
      <Stat label="점수" value={score} />
      <Stat label="레벨" value={level} />
      <Stat label="최고 점수" value={best} />
    </div>
  );
}
