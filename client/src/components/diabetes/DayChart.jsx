import { useRef, useState } from 'react';
import { EVENT_LABELS, SERIES, fmtG, fmtTime, minutesOfDay, rangeColor, useWidth } from '../../lib/glucose';

const PAD = { left: 52, right: 14 };
const G_H = 230; // glucose lane
const LANE_H = 54; // insulin and carbs lanes
const EV_H = 26;
const AXIS_H = 24;

// One letter per event type inside the marker; the tooltip shows the full name.
const EVENT_GLYPH = { exercise: 'E', site_change: 'P', sensor_change: 'S', illness: 'I', stress: '!', alcohol: 'A', ketones: 'K', note: 'N' };

function hourLabel(h) {
  if (h % 24 === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

// One day on a shared time axis: glucose on top, then insulin, carbs and events
// in their own lanes (each with its own scale; never a second y-axis on the glucose plot).
export default function DayChart({ entries, settings }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const [hoverMin, setHoverMin] = useState(null);
  const u = settings.units;
  const { glucose, insulin, carbs, events } = entries;

  const cgm = glucose.filter((g) => g.source === 'cgm');
  const meter = glucose.filter((g) => g.source === 'meter');
  const boluses = insulin.filter((d) => d.kind !== 'basal');
  const basal = insulin.filter((d) => d.kind === 'basal');

  const iw = width - PAD.left - PAD.right;
  const x = (ts) => PAD.left + (minutesOfDay(ts) / 1440) * iw;
  const yMax = Math.min(400, Math.max(300, ...glucose.map((g) => g.mgdl + 20)));
  const yMin = 40;
  const gTop = 10;
  const yG = (v) => gTop + G_H - ((Math.min(yMax, Math.max(yMin, v)) - yMin) / (yMax - yMin)) * G_H;

  const insTop = gTop + G_H + 16;
  const carbTop = insTop + LANE_H + 10;
  const evTop = carbTop + LANE_H + 10;
  const axisTop = evTop + EV_H + 4;
  const H = axisTop + AXIS_H;

  const maxUnits = Math.max(5, ...boluses.map((b) => b.units));
  const maxCarbs = Math.max(30, ...carbs.map((c) => c.grams));
  const barW = Math.max(4, Math.min(8, iw / 200));

  // Break the CGM line where readings are more than 15 minutes apart.
  const segments = [];
  let seg = [];
  for (let i = 0; i < cgm.length; i++) {
    if (seg.length && minutesOfDay(cgm[i].ts) - minutesOfDay(cgm[i - 1].ts) > 15) {
      segments.push(seg);
      seg = [];
    }
    seg.push(cgm[i]);
  }
  if (seg.length) segments.push(seg);

  const yTicks = [settings.very_low, settings.target_low, settings.target_high, settings.very_high, 300, 400].filter(
    (t, i, a) => t <= yMax && a.indexOf(t) === i
  );

  // The very-low label crowds the target-low label on short charts; keep its gridline, drop its label.
  const tickLabels = yTicks.filter((t) => !(t === settings.very_low && yG(settings.very_low) - yG(settings.target_low) < 14));

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const minute = ((e.clientX - rect.left - PAD.left) / iw) * 1440;
    setHoverMin(minute >= 0 && minute <= 1440 ? minute : null);
  }

  let tip = null;
  if (hoverMin != null) {
    const near = (rows, win) => rows.filter((r) => Math.abs(minutesOfDay(r.ts) - hoverMin) <= win);
    let g = null;
    for (const r of glucose) if (!g || Math.abs(minutesOfDay(r.ts) - hoverMin) < Math.abs(minutesOfDay(g.ts) - hoverMin)) g = r;
    if (g && Math.abs(minutesOfDay(g.ts) - hoverMin) > 15) g = null;
    tip = { g, ins: near(insulin, 10), carbs: near(carbs, 10), events: near(events, 15) };
  }
  const hx = hoverMin != null ? PAD.left + (hoverMin / 1440) * iw : 0;

  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={H} onMouseMove={onMove} onMouseLeave={() => setHoverMin(null)} role="img" aria-label="Daily glucose, insulin and carbs">
        {/* Glucose lane */}
        <rect x={PAD.left} y={yG(settings.target_high)} width={iw} height={yG(settings.target_low) - yG(settings.target_high)} fill="#0ca30c" opacity="0.08" />
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + iw} y1={yG(t)} y2={yG(t)} stroke="#e1e0d9" />
            {tickLabels.includes(t) && (
              <text x={PAD.left - 6} y={yG(t) + 4} textAnchor="end" className="axis-text">
                {fmtG(t, u)}
              </text>
            )}
          </g>
        ))}
        {[3, 6, 9, 12, 15, 18, 21].map((h) => (
          <line key={h} x1={PAD.left + (h / 24) * iw} x2={PAD.left + (h / 24) * iw} y1={gTop} y2={evTop + EV_H} stroke="#f0efec" />
        ))}
        {segments.map((s, i) =>
          s.length === 1 ? (
            <circle key={i} cx={x(s[0].ts)} cy={yG(s[0].mgdl)} r="2" fill={SERIES.glucose} />
          ) : (
            <path
              key={i}
              d={`M${s.map((r) => `${x(r.ts)},${yG(r.mgdl)}`).join('L')}`}
              fill="none"
              stroke={SERIES.glucose}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )
        )}
        {/* Mark lows and highs on the line so out-of-range spans are visible without colour alone. */}
        {cgm
          .filter((r) => r.mgdl < settings.target_low)
          .map((r) => (
            <circle key={`l${r.id}`} cx={x(r.ts)} cy={yG(r.mgdl)} r="2.5" fill={rangeColor(r.mgdl, settings)} />
          ))}
        {meter.map((r) => (
          <circle key={`m${r.id}`} cx={x(r.ts)} cy={yG(r.mgdl)} r="5" fill={SERIES.meter} stroke="#fff" strokeWidth="2" />
        ))}

        {/* Insulin lane */}
        <text x={PAD.left - 6} y={insTop + LANE_H / 2 + 4} textAnchor="end" className="lane-label">Insulin</text>
        <line x1={PAD.left} x2={PAD.left + iw} y1={insTop + LANE_H} y2={insTop + LANE_H} stroke="#c3c2b7" />
        {boluses.map((b) => {
          const h = Math.max(4, (b.units / maxUnits) * (LANE_H - 14));
          return (
            <g key={`b${b.id}`}>
              <rect x={x(b.ts) - barW / 2} y={insTop + LANE_H - h} width={barW} height={h} rx="2" fill={SERIES.bolus} />
              <text x={x(b.ts)} y={insTop + LANE_H - h - 3} textAnchor="middle" className="mark-label">
                {b.units}
              </text>
            </g>
          );
        })}
        {basal.map((b) => (
          <g key={`ba${b.id}`}>
            <rect x={x(b.ts) - 5} y={insTop + LANE_H - 10} width={10} height={10} rx="2" fill={SERIES.basal} />
            <text x={x(b.ts) + 8} y={insTop + LANE_H - 2} className="mark-label">
              {b.units}u basal
            </text>
          </g>
        ))}

        {/* Carbs lane */}
        <text x={PAD.left - 6} y={carbTop + LANE_H / 2 + 4} textAnchor="end" className="lane-label">Carbs</text>
        <line x1={PAD.left} x2={PAD.left + iw} y1={carbTop + LANE_H} y2={carbTop + LANE_H} stroke="#c3c2b7" />
        {carbs.map((c) => {
          const h = Math.max(4, (c.grams / maxCarbs) * (LANE_H - 14));
          return (
            <g key={`c${c.id}`}>
              <rect x={x(c.ts) - barW / 2} y={carbTop + LANE_H - h} width={barW} height={h} rx="2" fill={SERIES.carbs} />
              <text x={x(c.ts)} y={carbTop + LANE_H - h - 3} textAnchor="middle" className="mark-label">
                {Math.round(c.grams)}g
              </text>
            </g>
          );
        })}

        {/* Events lane */}
        <text x={PAD.left - 6} y={evTop + 16} textAnchor="end" className="lane-label">Events</text>
        {events.map((ev) => (
          <g key={`e${ev.id}`}>
            {ev.kind === 'exercise' && ev.duration_min ? (
              <rect x={x(ev.ts)} y={evTop + 6} width={(ev.duration_min / 1440) * iw} height={12} rx="3" fill="#1baf7a" opacity="0.5" />
            ) : null}
            <circle cx={x(ev.ts)} cy={evTop + 12} r="7" fill="#fff" stroke="#52514e" strokeWidth="1.5" />
            <text x={x(ev.ts)} y={evTop + 15} textAnchor="middle" className="ev-glyph">
              {EVENT_GLYPH[ev.kind] || '•'}
            </text>
          </g>
        ))}

        {/* Time axis */}
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <text key={h} x={PAD.left + (h / 24) * iw} y={axisTop + 14} textAnchor="middle" className="axis-text">
            {width < 480 && h % 6 ? '' : hourLabel(h)}
          </text>
        ))}

        {hoverMin != null && <line x1={hx} x2={hx} y1={gTop} y2={evTop + EV_H} stroke="#898781" />}
        {tip?.g && <circle cx={x(tip.g.ts)} cy={yG(tip.g.mgdl)} r="5" fill={SERIES.glucose} stroke="#fff" strokeWidth="2" />}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: Math.min(width - 200, Math.max(0, hx + 12)), top: 8 }}>
          <div className="tip-title">{tip.g ? fmtTime(tip.g.ts) : fmtTime(`0000-00-00T${String(Math.floor(hoverMin / 60)).padStart(2, '0')}:${String(Math.floor(hoverMin % 60)).padStart(2, '0')}`)}</div>
          {tip.g && (
            <div>
              {tip.g.source === 'meter' ? 'Fingerstick' : 'Glucose'} <strong>{fmtG(tip.g.mgdl, u, { unit: true })}</strong>
            </div>
          )}
          {tip.ins.map((d) => (
            <div key={`i${d.id}`}>
              {d.kind === 'basal' ? 'Basal' : d.kind === 'correction' ? 'Correction' : 'Bolus'} <strong>{d.units} u</strong> at {fmtTime(d.ts)}
            </div>
          ))}
          {tip.carbs.map((c) => (
            <div key={`c${c.id}`}>
              Carbs <strong>{c.grams} g</strong> {c.description ? `· ${c.description}` : ''}
            </div>
          ))}
          {tip.events.map((ev) => (
            <div key={`e${ev.id}`}>
              {EVENT_LABELS[ev.kind]} {ev.duration_min ? `· ${ev.duration_min} min` : ''} {ev.note ? `· ${ev.note}` : ''}
            </div>
          ))}
        </div>
      )}
      <div className="chart-legend">
        <span><i style={{ background: SERIES.glucose, height: 2 }} /> CGM</span>
        <span><i style={{ background: SERIES.meter, borderRadius: 6 }} /> Fingerstick</span>
        <span><i style={{ background: SERIES.bolus }} /> Bolus (units)</span>
        <span><i style={{ background: SERIES.basal }} /> Basal</span>
        <span><i style={{ background: SERIES.carbs }} /> Carbs (g)</span>
      </div>
    </div>
  );
}
