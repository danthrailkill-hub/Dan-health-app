import { useEffect, useState } from 'react';
import { api, fileUrl } from '../lib/api';

export default function AdminEmployees() {
  const [employees, setEmployees] = useState(null);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [mode, setMode] = useState('replace');
  const [search, setSearch] = useState('');
  const [file, setFile] = useState(null);

  function load() {
    api
      .get('/api/admin/employees')
      .then((data) => {
        setEmployees(data.employees);
        setTotal(data.total);
        setActive(data.active);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError('');
    setUploadResult(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mode', mode);
      const data = await api.post('/api/admin/employees/upload', form);
      setUploadResult(data);
      setFile(null);
      e.target.reset();
      load();
    } catch (err) {
      setError(err.message);
      if (err.details) setUploadResult({ warnings: err.details, imported: 0 });
    } finally {
      setUploading(false);
    }
  }

  const filtered = (employees || []).filter((emp) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      emp.employee_id?.toLowerCase().includes(q) ||
      emp.first_name?.toLowerCase().includes(q) ||
      emp.last_name?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.work_location_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="section-header">
        <h1>Employee Roster</h1>
        <a className="btn btn-ghost" href={fileUrl('/api/admin/employees/template.csv')}>
          Download CSV Template
        </a>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Upload roster</h2>
        <p className="hint" style={{ marginBottom: 16 }}>
          Upload a CSV with columns for Employee ID, name, department, location, and the other demographic
          fields you track. <strong>Replace</strong> clears the roster and loads this file as the full active
          list — use it each time you upload a fresh export so anyone no longer included can't take the
          survey. <strong>Merge</strong> adds/updates rows by Employee ID without removing anyone else.
        </p>
        <form onSubmit={handleUpload}>
          <div className="field">
            <label htmlFor="file">CSV file</label>
            <input
              id="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          <div className="field">
            <label htmlFor="mode">Upload mode</label>
            <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="replace">Replace entire roster (recommended)</option>
              <option value="merge">Merge into existing roster</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!file || uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>

        {uploadResult && (
          <div className={uploadResult.imported > 0 ? 'success-banner' : 'error-banner'} style={{ marginTop: 16 }}>
            {uploadResult.imported > 0 && <div>Imported {uploadResult.imported} employees.</div>}
            {uploadResult.warnings?.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                {uploadResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="section-header">
          <h2 style={{ margin: 0 }}>
            Current roster — {total} total, {active} active
          </h2>
          <input
            type="text"
            placeholder="Search by name, ID, department, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320, padding: '8px 10px', border: '1px solid var(--gray-200)', borderRadius: 8 }}
          />
        </div>
        {employees === null && <p>Loading…</p>}
        {employees && employees.length === 0 && <p>No employees uploaded yet.</p>}
        {employees && employees.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Job Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((emp) => (
                  <tr key={emp.employee_id}>
                    <td>{emp.employee_id}</td>
                    <td>
                      {emp.last_name}, {emp.first_name}
                    </td>
                    <td>{emp.department}</td>
                    <td>{emp.work_location_name}</td>
                    <td>{emp.job_title}</td>
                    <td>
                      <span className={`badge ${emp.active ? 'badge-open' : 'badge-closed'}`}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && (
              <p className="hint">Showing first 500 of {filtered.length} matching employees.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
