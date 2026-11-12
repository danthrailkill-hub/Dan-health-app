import { useRef, useState } from 'react';
import { fmtG, useWidth } from '../../lib/glucose';

const H = 280;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

function hourLabel(h) {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function fmtMinute(min) {
  const h = Math.floor(min / 60) % 24;
  const m = String(Math.round(min % 60)).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${m}${h < 12 ? 'am' : 'pm'}`;
}

// Ambulatory Glucose Profile: every day overlaid on one 24-hour axis.
// Outer band = 5th–95th percentile, inner band = 25th–75th, line = median.
export default function AgpChart({ agp, settings }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const [hover, setHover] = useState(null);
  const u = settings.units;

  const valid = agp.filter((b) => b.p50 != null);
  if (valid.length < 10) {
    return <div ref={ref} className="empty-state">Not enough CGM data to draw a glucose profile yet.</div>;
  }

  const maxP95 = Math.max(...valid.map((b) => b.p95));
  const yMax = Math.min(400, Math.max(300, Math.ceil(maxP95 / 50) * 50));
  const yMin = 40;
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (minute) => PAD.left + (minute / 1440) * iw;
  const y = (mgdl) => PAD.top + ih - ((Math.min(yMax, Math.max(yMin, mgdl)) - yMin) / (yMax - yMin)) * ih;

  // Close the loop at 24:00 using the midnight bucket.
  const pts = [...valid.map((b) => ({ ...b, minute: b.minute + 7.5 }))];
  const area = (lo, hi) =>
    `M${pts.map((b) => `${x(b.minute)},${y(b[hi])}`).join('L')}L${[...pts]
      .reverse()
      .map((b) => `${x(b.minute)},${y(b[lo])}`)
      .join('L')}Z`;
  const line = `M${pts.map((b) => `${x(b.minute)},${y(b.p50)}`).join('L')}`;

  const ticks = settings.units === 'mmol/L' ? [54, 72, 180, 252, 360].filter((t) => t <= yMax) : [54, 70, 180, 250, 300, 350, 400].filter((t) => t <= yMax);
  const yTicks = [...new Set([settings.very_low, settings.target_low, settings.target_high, settings.very_high, ...ticks.filter((t) => t > settings.very_high + 30)])].filter(
    (t) => t <= yMax && t >= yMin
  );

  // The very-low label crowds the target-low label on short charts; keep its gridline, drop its label.
  const tickLabels = yTicks.filter((t) => !(t === settings.very_low && y(settings.very_low) - y(settings.target_low) < 14));

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = ((e.clientX - rect.left - PAD.left) / iw) * 1440;
    if (minute < 0 || minute > 1440) return setHover(null);
    let best = pts[0];
    for (const b of pts) if (Math.abs(b.minute - minute) < Math.abs(best.minute - minute)) best = b;
    setHover(best);
  }

  const tipLeft = hover ? Math.min(width - 190, Math.max(0, x(hover.minute) + 12)) : 0;

  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Ambulatory glucose profile">
        {/* target range band */}
        <rect x={PAD.left} y={y(settings.target_high)} width={iw} height={y(settings.target_low) - y(settings.target_high)} fill="#0ca30c" opacity="0.07" />
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={PAD.left + iw}
              y1={y(t)}
              y2={y(t)}
              stroke={t === settings.target_low || t === settings.target_high ? '#0ca30c' : '#e1e0d9'}
              strokeDasharray={t === settings.target_low || t === settings.target_high ? '4 3' : undefined}
              strokeWidth="1"
            />
            {tickLabels.includes(t) && (
              <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" className="axis-text">
                {fmtG(t, u)}
              </text>
            )}
          </g>
        ))}
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <text key={h} x={x(h * 60)} y={H - 8} textAnchor="middle" className="axis-text">
            {width < 480 && h % 6 ? '' : hourLabel(h)}
          </text>
        ))}
        <path d={area('p5', 'p95')} fill="#b7d3f6" opacity="0.75" />
        <path d={area('p25', 'p75')} fill="#6da7ec" opacity="0.8" />
        <path d={line} fill="none" stroke="#0d366b" strokeWidth="2" strokeLinejoin="round" />
        {hover && (
          <g>
            <line x1={x(hover.minute)} x2={x(hover.minute)} y1={PAD.top} y2={PAD.top + ih} stroke="#898781" strokeWidth="1" />
            <circle cx={x(hover.minute)} cy={y(hover.p50)} r="4.5" fill="#0d366b" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div className="chart-tip" style={{ left: tipLeft, top: 8 }}>
          <div className="tip-title">{fmtMinute(hover.minute - 7.5)}–{fmtMinute(hover.minute + 7.5)}</div>
          <div>Median <strong>{fmtG(hover.p50, u)}</strong></div>
          <div>Middle 50%: {fmtG(hover.p25, u)}–{fmtG(hover.p75, u)}</div>
          <div>Middle 90%: {fmtG(hover.p5, u)}–{fmtG(hover.p95, u)}</div>
          <div className="muted">{hover.n} readings · {u}</div>
        </div>
      )}
      <div className="chart-legend">
        <span><i style={{ background: '#0d366b', height: 2 }} /> Median</span>
        <span><i style={{ background: '#6da7ec' }} /> 25th–75th percentile</span>
        <span><i style={{ background: '#b7d3f6' }} /> 5th–95th percentile</span>
        <span><i style={{ background: '#0ca30c', opacity: 0.25 }} /> Target range</span>
      </div>
    </div>
  );
}
