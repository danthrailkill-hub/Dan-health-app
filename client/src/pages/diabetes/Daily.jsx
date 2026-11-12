import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { addDays, fmtDate, fmtG, fmtNum, fmtPct, todayLocal, useDiabetesSettings, classify } from '../../lib/glucose';
import DayChart from '../../components/diabetes/DayChart';
import EntryList from '../../components/diabetes/EntryList';

export default function Daily() {
  const { date: paramDate } = useParams();
  const navigate = useNavigate();
  const date = paramDate || todayLocal();
  const settings = useDiabetesSettings();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get(`/api/diabetes/entries?from=${date}&to=${date}`)
      .then(setEntries)
      .catch((e) => setError(e.message));
  }, [date]);
  useEffect(load, [load]);

  const go = (d) => navigate(`/diabetes/day/${d}`);
  const isToday = date >= todayLocal();

  if (error) return <div className="error-banner">{error}</div>;
  if (!settings || !entries) return <p>Loading...</p>;

  const u = settings.units;
  const cgm = entries.glucose.filter((g) => g.source === 'cgm');
  const vals = (cgm.length ? cgm : entries.glucose).map((g) => g.mgdl);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const inRange = vals.length ? (vals.filter((v) => classify(v, settings) === 'in_range').length / vals.length) * 100 : null;
  const below = vals.length ? (vals.filter((v) => v < settings.target_low).length / vals.length) * 100 : null;
  const bolus = entries.insulin.filter((d) => d.kind !== 'basal').reduce((a, d) => a + d.units, 0);
  const basal = entries.insulin.filter((d) => d.kind === 'basal').reduce((a, d) => a + d.units, 0);
  const carbs = entries.carbs.reduce((a, c) => a + c.grams, 0);

  return (
    <div className="dm-page">
      <div className="page-header row-between">
        <div>
          <h2>{fmtDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
          <p>Daily view: glucose, insulin, carbs and events on one timeline.</p>
        </div>
        <div className="toolbar">
          <button className="btn secondary" onClick={() => go(addDays(date, -1))} aria-label="Previous day">‹ Prev</button>
          <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && go(e.target.value)} className="date-input" />
          <button className="btn secondary" onClick={() => go(addDays(date, 1))} disabled={isToday} aria-label="Next day">Next ›</button>
        </div>
      </div>

      <div className="tile-grid compact">
        <div className="stat-tile"><div className="label">Average</div><div className="value">{fmtG(avg, u)}</div><div className="sub">{u}</div></div>
        <div className="stat-tile"><div className="label">In range</div><div className="value">{fmtPct(inRange)}</div></div>
        <div className="stat-tile"><div className="label">Below range</div><div className="value">{fmtPct(below, 1)}</div></div>
        <div className="stat-tile"><div className="label">Insulin</div><div className="value">{fmtNum(bolus + basal)} u</div><div className="sub">{fmtNum(bolus)} bolus · {fmtNum(basal)} basal</div></div>
        <div className="stat-tile"><div className="label">Carbs</div><div className="value">{Math.round(carbs)} g</div><div className="sub">{entries.carbs.length} entries</div></div>
      </div>

      <section className="card">
        {entries.glucose.length || entries.insulin.length || entries.carbs.length ? (
          <DayChart entries={entries} settings={settings} />
        ) : (
          <div className="empty-state">Nothing logged on this day.</div>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Entries</h3>
        <EntryList entries={entries} settings={settings} onChange={load} />
      </section>
    </div>
  );
}
