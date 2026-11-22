// Curved screen with a soft cone of light falling over the first rows.
export default function ScreenCurve() {
  return (
    <div className="relative mx-auto w-full max-w-3xl" aria-hidden>
      <svg viewBox="0 0 800 150" className="w-full overflow-visible">
        <defs>
          <linearGradient id="screenStroke" x1="0" x2="1">
            <stop offset="0" stopColor="#E11D48" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="#FAFAFA" />
            <stop offset="1" stopColor="#E11D48" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FAFAFA" stopOpacity="0.2" />
            <stop offset="1" stopColor="#FAFAFA" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <path d="M40 62 Q400 -8 760 62 L930 150 L-130 150 Z" fill="url(#cone)" />
        <path d="M40 62 Q400 -8 760 62" fill="none" stroke="#E11D48" strokeWidth="14" strokeLinecap="round" opacity="0.7" filter="url(#glow)" />
        <path d="M40 62 Q400 -8 760 62" fill="none" stroke="url(#screenStroke)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <p className="-mt-3 text-center text-xs font-semibold text-faint">Screen</p>
    </div>
  );
}
