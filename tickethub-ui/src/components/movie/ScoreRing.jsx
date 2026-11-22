export default function ScoreRing({ value, size = 56, label, sub }) {
  const pct = Math.max(0, Math.min(100, Number(value)));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const tone = pct >= 70 ? '#34d399' : pct >= 50 ? '#F59E0B' : '#E11D48';
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${Math.round(pct)} percent`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * c} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <span className="num absolute inset-0 grid place-items-center text-sm font-extrabold">{Math.round(pct)}</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold">{label}</p>
        {sub && <p className="num text-xs text-mute">{sub}</p>}
      </div>
    </div>
  );
}
