import { useState } from 'react';
import { RANGES, fmtG } from '../../lib/glucose';

function thresholdText(key, s) {
  const u = s.units;
  switch (key) {
    case 'very_high':
      return `> ${fmtG(s.very_high, u)}`;
    case 'high':
      return `${fmtG(s.target_high + 1, u)}–${fmtG(s.very_high, u)}`;
    case 'in_range':
      return `${fmtG(s.target_low, u)}–${fmtG(s.target_high, u)}`;
    case 'low':
      return `${fmtG(s.very_low, u)}–${fmtG(s.target_low - 1, u)}`;
    default:
      return `< ${fmtG(s.very_low, u)}`;
  }
}

const GOALS = {
  very_high: '< 5%',
  high: '',
  in_range: '> 70%',
  low: '< 4%',
  very_low: '< 1%',
};

function duration(pct) {
  const minutes = Math.round((pct / 100) * 1440);
  if (minutes < 60) return `${minutes} min/day`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m/day`;
}

// Time-in-range: one stacked bar (low on the left, high on the right) plus a labelled legend.
export default function RangeBar({ ranges, settings }) {
  const [hover, setHover] = useState(null);
  const order = [...RANGES].reverse(); // very_low → very_high, left to right
  return (
    <div className="range-bar-wrap">
      <div className="range-bar" role="img" aria-label="Time in range breakdown">
        {order.map((r) =>
          ranges[r.key] > 0 ? (
            <div
              key={r.key}
              className="range-seg"
              style={{ flexGrow: ranges[r.key], background: r.color, opacity: hover && hover !== r.key ? 0.45 : 1 }}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
              title={`${r.label}: ${ranges[r.key].toFixed(1)}%`}
            />
          ) : null
        )}
      </div>
      <table className="range-legend">
        <tbody>
          {RANGES.map((r) => (
            <tr
              key={r.key}
              className={hover === r.key ? 'hover' : ''}
              onMouseEnter={() => setHover(r.key)}
              onMouseLeave={() => setHover(null)}
            >
              <td>
                <span className="swatch" style={{ background: r.color }} />
                {r.label}
              </td>
              <td className="muted">{thresholdText(r.key, settings)} {settings.units}</td>
              <td className="num strong">{ranges[r.key].toFixed(r.key === 'in_range' ? 0 : 1)}%</td>
              <td className="muted num">{duration(ranges[r.key])}</td>
              <td className="muted num">{GOALS[r.key] && `goal ${GOALS[r.key]}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
