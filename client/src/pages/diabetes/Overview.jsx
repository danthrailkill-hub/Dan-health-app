import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { RANGES, fmtDate, fmtG, fmtNum, fmtPct, useDiabetesSettings } from '../../lib/glucose';
import RangeBar from '../../components/diabetes/RangeBar';
import AgpChart from '../../components/diabetes/AgpChart';

const PRESETS = [7, 14, 30, 90];

function Tile({ label, value, sub, status }) {
  return (
    <div className="stat-tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && (
        <div className={`sub ${status || ''}`}>
          {status === 'ok' && '✓ '}
          {status === 'warn' && '▲ '}
          {sub}
        </div>
      )}
    </div>
  );
}

function MiniRange({ pct }) {
  if (pct == null) return <span className="muted">–</span>;
  return (
    <span className="mini-range" title={`${pct.toFixed(0)}% in range`}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

export function EmptyDiabetes({ onDemo }) {
  return (
    <div className="no-goals-banner">
      <p style={{ marginTop: 0 }}><strong>No glucose data yet.</strong></p>
      <p>
        Import a CSV from Dexcom Clarity or LibreView, connect Nightscout, or start logging fingersticks, insulin and carbs.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn" to="/diabetes/import">Import or sync data</Link>
        <Link className="btn secondary" to="/diabetes/log">Log an entry</Link>
        {onDemo && <button className="btn secondary" onClick={onDemo}>Load 14 days of demo data</button>}
      </div>
    </div>
  );
}

export default function Overview() {
  const settings = useDiabetesSettings();
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    api.get(`/api/diabetes/summary?days=${days}`).then(setData).catch((e) => setError(e.message));
  }, [days]);

  useEffect(load, [load]);

  async function loadDemo() {
    await api.post('/api/diabetes/demo', {});
    load();
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (!data || !settings) return <p>Loading...</p>;

  const s = data.settings;
  const u = s.units;
  const st = data.stats;
  const tbr = st.ranges.very_low + st.ranges.low;
  const tar = st.ranges.high + st.ranges.very_high;

  return (
    <div className="dm-page">
      <div className="page-header row-between">
        <div>
          <h2>Diabetes Overview</h2>
          <p>
            {fmtDate(data.from, { month: 'short', day: 'numeric', year: 'numeric' })} – {fmtDate(data.daily.at(-1).date, { month: 'short', day: 'numeric', year: 'numeric' })} · {st.days} days
          </p>
        </div>
        <div className="toolbar no-print">
          <div className="segmented" role="group" aria-label="Date range">
            {PRESETS.map((d) => (
              <button key={d} className={d === days ? 'active' : ''} onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
          <button className="btn secondary" onClick={() => window.print()}>Print report</button>
        </div>
      </div>

      {!st.count ? (
        <EmptyDiabetes onDemo={loadDemo} />
      ) : (
        <>
          <div className="tile-grid">
            <Tile label="Time in range" value={fmtPct(st.ranges.in_range)} sub="goal > 70%" status={st.ranges.in_range >= 70 ? 'ok' : 'warn'} />
            <Tile label="Average glucose" value={fmtG(st.mean, u)} sub={u} />
            <Tile label="GMI (est. A1c)" value={fmtPct(st.gmi, 1)} sub="goal < 7%" status={st.gmi < 7 ? 'ok' : 'warn'} />
            <Tile label="Variability (CV)" value={fmtPct(st.cv, 1)} sub="goal ≤ 36%" status={st.cv <= 36 ? 'ok' : 'warn'} />
            <Tile label="Time below range" value={fmtPct(tbr, 1)} sub={`${st.low_episodes} lows · goal < 4%`} status={tbr < 4 ? 'ok' : 'warn'} />
            <Tile label="Time above range" value={fmtPct(tar, 0)} sub="goal < 25%" status={tar < 25 ? 'ok' : 'warn'} />
          </div>
          <p className="muted small" style={{ margin: '-6px 0 18px' }}>
            {st.source === 'cgm' ? `CGM active ${fmtPct(st.coverage_pct)} of the time` : 'Based on fingerstick readings'} · {st.count.toLocaleString()} readings · SD {fmtG(st.sd, u)} {u}
          </p>

          <div className="two-col">
            <section className="card">
              <h3 className="card-title">Time in ranges</h3>
              <RangeBar ranges={st.ranges} settings={s} />
            </section>
            <section className="card">
              <h3 className="card-title">Insights</h3>
              {data.insights.length ? (
                <ul className="insights">
                  {data.insights.map((i, idx) => (
                    <li key={idx} className={`insight ${i.severity}`}>
                      <span className="insight-tag">{i.severity === 'warning' ? 'Review' : i.severity === 'good' ? 'On target' : 'Note'}</span>
                      <div>
                        <div className="insight-title">{i.title}</div>
                        <div className="insight-detail">{i.detail}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No patterns found for this period.</p>
              )}
            </section>
          </div>

          <section className="card">
            <h3 className="card-title">Glucose profile (AGP)</h3>
            <p className="muted small" style={{ marginTop: -6 }}>All {st.days_with_data} days overlaid on one 24-hour clock. Hover for the spread at any time of day.</p>
            <AgpChart agp={data.agp} settings={s} />
          </section>

          <div className="two-col">
            <section className="card">
              <h3 className="card-title">Time of day</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="num">Avg</th>
                    <th className="num">In range</th>
                    <th className="num">Low</th>
                    <th className="num">High</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map((p) => (
                    <tr key={p.key}>
                      <td>{p.label}</td>
                      <td className="num">{fmtG(p.mean, u)}</td>
                      <td className="num">{p.count ? fmtPct(p.ranges.in_range) : '–'}</td>
                      <td className="num">{p.count ? fmtPct(p.ranges.low + p.ranges.very_low, 1) : '–'}</td>
                      <td className="num">{p.count ? fmtPct(p.ranges.high + p.ranges.very_high) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card">
              <h3 className="card-title">Insulin & carbs (daily averages)</h3>
              <div className="kv-grid">
                <div><span>Total daily insulin</span><strong>{data.insulin.avg_total != null ? `${fmtNum(data.insulin.avg_total)} u` : '–'}</strong></div>
                <div><span>Basal / bolus split</span><strong>{data.insulin.basal_pct != null ? `${data.insulin.basal_pct.toFixed(0)}% / ${(100 - data.insulin.basal_pct).toFixed(0)}%` : '–'}</strong></div>
                <div><span>Bolus insulin</span><strong>{data.insulin.avg_bolus != null ? `${fmtNum(data.insulin.avg_bolus)} u` : '–'}</strong></div>
                <div><span>Basal insulin</span><strong>{data.insulin.avg_basal != null ? `${fmtNum(data.insulin.avg_basal)} u` : '–'}</strong></div>
                <div><span>Boluses per day</span><strong>{fmtNum(data.insulin.boluses_per_day)}</strong></div>
                <div><span>Carbs</span><strong>{data.carbs.avg_daily != null ? `${Math.round(data.carbs.avg_daily)} g` : '–'}</strong></div>
                <div><span>Fingersticks per day</span><strong>{fmtNum(st.meter_checks_per_day)}</strong></div>
                <div><span>Days with insulin logged</span><strong>{data.insulin.days_logged} / {st.days}</strong></div>
              </div>
            </section>
          </div>

          <section className="card">
            <h3 className="card-title">Day by day</h3>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Avg</th>
                    <th>In range</th>
                    <th className="num">Lows</th>
                    <th className="num">Bolus</th>
                    <th className="num">Basal</th>
                    <th className="num">Carbs</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().map((d) => (
                    <tr key={d.date}>
                      <td><Link to={`/diabetes/day/${d.date}`}>{fmtDate(d.date)}</Link></td>
                      <td className="num">{fmtG(d.mean, u)}</td>
                      <td>
                        <MiniRange pct={d.in_range_pct} /> <span className="small">{d.in_range_pct != null ? `${d.in_range_pct.toFixed(0)}%` : ''}</span>
                      </td>
                      <td className="num">{d.lows || ''}</td>
                      <td className="num">{d.bolus ? `${fmtNum(d.bolus)} u` : ''}</td>
                      <td className="num">{d.basal ? `${fmtNum(d.basal)} u` : ''}</td>
                      <td className="num">{d.carbs ? `${Math.round(d.carbs)} g` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="disclaimer-box">
            Ranges: {RANGES.map((r) => r.label).join(', ')}, using your targets from Diabetes Settings. GMI estimates A1c from average CGM glucose and can differ from a lab A1c. Insights are automated pattern observations, not medical advice. Review any changes to insulin dosing with your diabetes care team.
          </div>
        </>
      )}
    </div>
  );
}
