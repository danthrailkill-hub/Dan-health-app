import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useDiabetesSettings } from '../../lib/glucose';
import QuickLog from '../../components/diabetes/QuickLog';
import EntryList from '../../components/diabetes/EntryList';

export default function Logbook() {
  const settings = useDiabetesSettings();
  const [days, setDays] = useState(7);
  const [entries, setEntries] = useState(null);

  const load = useCallback(() => {
    api.get(`/api/diabetes/entries?days=${days}`).then(setEntries).catch(() => {});
  }, [days]);
  useEffect(load, [load]);

  if (!settings) return <p>Loading...</p>;

  return (
    <div className="dm-page">
      <div className="page-header">
        <h2>Logbook</h2>
        <p>Log fingersticks, insulin, carbs and events. CGM and pump data come in through Import & Sync.</p>
      </div>
      <QuickLog settings={settings} onSaved={load} />
      <section className="card">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h3 className="card-title" style={{ margin: 0 }}>Recent entries</h3>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="date-input">
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
        {entries ? <EntryList entries={entries} settings={settings} onChange={load} showDates /> : <p>Loading...</p>}
      </section>
    </div>
  );
}
