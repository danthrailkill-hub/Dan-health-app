import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fileUrl } from '../../lib/api';
import { fmtDate } from '../../lib/glucose';

function ResultSummary({ result }) {
  if (!result) return null;
  const parts = Object.entries(result)
    .filter(([, r]) => r.added || r.skipped)
    .map(([k, r]) => `${r.added.toLocaleString()} ${k}${r.skipped ? ` (${r.skipped.toLocaleString()} duplicates skipped)` : ''}`);
  return <div className="success-banner">Imported {parts.join(', ') || 'nothing new'}.</div>;
}

const ORIGIN_LABELS = { manual: 'Logged by hand', dexcom: 'Dexcom Clarity import', libre: 'LibreView import', csv: 'CSV import', nightscout: 'Nightscout sync', demo: 'Demo data' };

export default function ImportSync() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('auto');
  const [dateOrder, setDateOrder] = useState('auto');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [origins, setOrigins] = useState([]);
  const [nsDays, setNsDays] = useState(14);
  const [settings, setSettings] = useState(null);

  const loadOrigins = () => api.get('/api/diabetes/origins').then(setOrigins).catch(() => {});
  useEffect(() => {
    loadOrigins();
    api.get('/api/diabetes/settings').then(setSettings).catch(() => {});
  }, []);

  async function run(label, fn) {
    setBusy(label);
    setError('');
    setResult(null);
    try {
      const res = await fn();
      setResult(res);
      loadOrigins();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function importFile(e) {
    e.preventDefault();
    if (!file) return setError('Choose a file first.');
    const form = new FormData();
    form.append('file', file);
    form.append('format', format);
    form.append('dateOrder', dateOrder);
    run('import', async () => {
      const res = await api.post('/api/diabetes/import', form);
      return { ...res, message: `Detected ${res.format} format.` };
    });
  }

  async function removeOrigin(origin) {
    if (!window.confirm(`Delete all data from "${ORIGIN_LABELS[origin] || origin}"? This cannot be undone.`)) return;
    await api.del(`/api/diabetes/data?origin=${encodeURIComponent(origin)}`);
    loadOrigins();
  }

  return (
    <div className="dm-page">
      <div className="page-header">
        <h2>Import & Sync</h2>
        <p>Bring in CGM, pump and meter data. Re-importing the same file is safe: duplicates are skipped.</p>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {result && <ResultSummary result={result.result} />}

      <section className="card">
        <h3 className="card-title">Upload a CSV export</h3>
        <ul className="help-list">
          <li><strong>Dexcom:</strong> clarity.dexcom.com → Export (top right) → choose dates → Export.</li>
          <li><strong>FreeStyle Libre:</strong> libreview.com → Glucose History → Download glucose data.</li>
          <li><strong>Anything else</strong> (meter, pen, spreadsheet): use the <a href={fileUrl('/api/diabetes/import/template.csv')}>CSV template</a>.</li>
        </ul>
        <form className="form-grid" onSubmit={importFile}>
          <div className="form-field full">
            <label htmlFor="imp-file">File</label>
            <input id="imp-file" type="file" accept=".csv,.txt,text/csv" onChange={(e) => setFile(e.target.files[0] || null)} />
          </div>
          <div className="form-field">
            <label htmlFor="imp-fmt">Format</label>
            <select id="imp-fmt" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="auto">Detect automatically</option>
              <option value="dexcom">Dexcom Clarity</option>
              <option value="libre">Abbott LibreView</option>
              <option value="generic">Generic template</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="imp-order">Date order (for dates like 03-04-2026)</label>
            <select id="imp-order" value={dateOrder} onChange={(e) => setDateOrder(e.target.value)}>
              <option value="auto">Detect automatically</option>
              <option value="MDY">Month-Day-Year (US)</option>
              <option value="DMY">Day-Month-Year</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={!!busy}>{busy === 'import' ? 'Importing...' : 'Import file'}</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3 className="card-title">Sync from Nightscout</h3>
        <p className="muted small">
          Nightscout is a free, open-source CGM cloud. Dexcom Share, Libre (via xDrip+ or Juggluco), Omnipod 5, Loop, AndroidAPS and Tandem
          can all upload to it, so it is the easiest way to get near-live data here.
        </p>
        {settings?.nightscout_url ? (
          <div className="toolbar">
            <span className="small">Site: <code>{settings.nightscout_url}</code></span>
            <select className="date-input" value={nsDays} onChange={(e) => setNsDays(Number(e.target.value))}>
              <option value={1}>Last 24 hours</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button className="btn" disabled={!!busy} onClick={() => run('ns', () => api.post('/api/diabetes/nightscout/sync', { days: nsDays }))}>
              {busy === 'ns' ? 'Syncing...' : 'Sync now'}
            </button>
          </div>
        ) : (
          <p className="small">Add your Nightscout URL and token in <Link to="/diabetes/settings">Diabetes Settings</Link> to enable sync.</p>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Your data sources</h3>
        {origins.length ? (
          <table className="data-table">
            <thead>
              <tr><th>Source</th><th className="num">Records</th><th>Dates</th><th /></tr>
            </thead>
            <tbody>
              {origins.map((o) => (
                <tr key={o.origin}>
                  <td>{ORIGIN_LABELS[o.origin] || o.origin}</td>
                  <td className="num">{o.n.toLocaleString()}</td>
                  <td className="small">{fmtDate(o.first.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })} – {fmtDate(o.last.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="num"><button className="btn danger small" onClick={() => removeOrigin(o.origin)}>Delete all</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted small">No data yet.</p>
        )}
        <div className="toolbar" style={{ marginTop: 14 }}>
          <a className="btn secondary" href={fileUrl('/api/diabetes/export.csv?days=90')}>Export last 90 days (CSV)</a>
          <button className="btn secondary" disabled={!!busy} onClick={() => run('demo', () => api.post('/api/diabetes/demo', {}))}>
            {busy === 'demo' ? 'Loading...' : 'Load demo data'}
          </button>
        </div>
      </section>
    </div>
  );
}
