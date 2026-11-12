import { useState } from 'react';
import { api } from '../../lib/api';
import { EVENT_LABELS, fmtDate, fmtG, fmtTime, rangeColor } from '../../lib/glucose';

// Merged, time-ordered list of logbook entries. CGM readings are hidden by default
// (there are 288 a day); fingersticks, doses, carbs and events are always shown.
export default function EntryList({ entries, settings, onChange, showDates = false }) {
  const [showCgm, setShowCgm] = useState(false);
  const u = settings.units;

  const rows = [
    ...entries.glucose
      .filter((g) => showCgm || g.source === 'meter')
      .map((g) => ({
        kind: 'glucose',
        id: g.id,
        ts: g.ts,
        origin: g.origin,
        label: g.source === 'meter' ? 'Fingerstick' : 'CGM',
        value: fmtG(g.mgdl, u, { unit: true }),
        dot: rangeColor(g.mgdl, settings),
        note: g.note,
      })),
    ...entries.insulin.map((d) => ({
      kind: 'insulin',
      id: d.id,
      ts: d.ts,
      origin: d.origin,
      label: d.kind === 'basal' ? 'Basal insulin' : d.kind === 'correction' ? 'Correction' : 'Bolus',
      value: `${d.units} u`,
      note: [d.insulin, d.note].filter(Boolean).join(' · '),
    })),
    ...entries.carbs.map((c) => ({ kind: 'carbs', id: c.id, ts: c.ts, origin: c.origin, label: 'Carbs', value: `${c.grams} g`, note: c.description })),
    ...entries.events.map((e) => ({
      kind: 'events',
      id: e.id,
      ts: e.ts,
      origin: e.origin,
      label: EVENT_LABELS[e.kind] || e.kind,
      value: e.duration_min ? `${e.duration_min} min` : e.value != null ? String(e.value) : '',
      note: e.note,
    })),
  ].sort((a, b) => b.ts.localeCompare(a.ts));

  async function remove(row) {
    if (!window.confirm(`Delete this ${row.label.toLowerCase()} entry?`)) return;
    await api.del(`/api/diabetes/${row.kind}/${row.id}`);
    onChange?.();
  }

  return (
    <div>
      <label className="check-inline">
        <input type="checkbox" checked={showCgm} onChange={(e) => setShowCgm(e.target.checked)} /> Show every CGM reading
      </label>
      {!rows.length ? (
        <div className="empty-state">No entries.</div>
      ) : (
        <div className="entry-list">
          {rows.map((r, i) => {
            const day = r.ts.slice(0, 10);
            const header = showDates && (i === 0 || rows[i - 1].ts.slice(0, 10) !== day) ? day : null;
            return (
              <div key={`${r.kind}${r.id}`}>
                {header && <div className="entry-date">{fmtDate(header, { weekday: 'long', month: 'short', day: 'numeric' })}</div>}
                <div className="entry-row">
                  <span className="entry-time">{fmtTime(r.ts)}</span>
                  <span className={`entry-kind k-${r.kind}`}>{r.label}</span>
                  <span className="entry-value">
                    {r.dot && <span className="swatch" style={{ background: r.dot }} />}
                    {r.value}
                  </span>
                  <span className="entry-note">{r.note}{r.origin !== 'manual' && <span className="origin-tag">{r.origin}</span>}</span>
                  <button className="btn danger small" onClick={() => remove(r)} aria-label="Delete entry">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
