// 현재 레벨 안에서 목표 점수까지 얼마나 왔는지 (0~1)
export default function ProgressBar({ progress }) {
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
      <div style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
