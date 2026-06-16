import { useEffect, useState } from 'react';
import { api, fileUrl } from '../lib/api';

const CATEGORIES = ['Lab report', 'Imaging', 'Discharge summary', 'Insurance', 'Other'];

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setDocs(await api.get('/api/documents'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('category', category);
      await api.post('/api/documents', formData);
      setTitle('');
      setCategory('');
      setFile(null);
      e.target.reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this document?')) return;
    await api.del(`/api/documents/${id}`);
    await load();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Documents</h2>
        <p>Upload PDFs and images of reports, scans, and other records.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <form className="form-grid doc-row" onSubmit={handleUpload}>
          <div className="form-field">
            <label htmlFor="doc-title">Title</label>
            <input id="doc-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="doc-category">Category</label>
            <select id="doc-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field full">
            <label htmlFor="doc-file">File (PDF, image, or text — up to 20MB)</label>
            <input
              id="doc-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </div>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : docs.length === 0 ? (
        <div className="empty-state">No documents uploaded yet.</div>
      ) : (
        <div className="record-list">
          {docs.map((doc) => (
            <div className="record-row" key={doc.id}>
              <div>
                <div className="primary">{doc.title}</div>
                <div className="secondary">
                  {[doc.category, formatSize(doc.size_bytes)].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="actions">
                <a className="btn secondary small" href={fileUrl(`/api/documents/${doc.id}/file`)} target="_blank" rel="noreferrer">
                  View
                </a>
                <button className="btn danger small" onClick={() => handleDelete(doc.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
