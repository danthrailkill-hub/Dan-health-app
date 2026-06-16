import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { schemas } from '../lib/schemas';
import RecordForm from '../components/RecordForm';

export default function RecordsPage({ table: tableProp }) {
  const params = useParams();
  const table = tableProp || params.table;
  const schema = schemas[table];

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | record

  async function load() {
    setLoading(true);
    try {
      const data = await api.get(`/api/${table}`);
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEditing(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  async function handleSave(values) {
    if (editing === 'new') {
      await api.post(`/api/${table}`, values);
    } else {
      await api.put(`/api/${table}/${editing.id}`, values);
    }
    setEditing(null);
    await load();
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this record?')) return;
    await api.del(`/api/${table}/${id}`);
    await load();
  }

  if (!schema) return <div className="error-banner">Unknown record type.</div>;

  return (
    <div>
      <div className="page-header">
        <h2>{schema.title}</h2>
        <p>{schema.description}</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {editing && (
        <div className="card">
          <RecordForm
            fields={schema.fields}
            initialValues={editing === 'new' ? {} : editing}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {!editing && (
        <button className="btn" onClick={() => setEditing('new')} style={{ marginBottom: 16 }}>
          + Add {schema.title.replace(/s$/, '')}
        </button>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : records.length === 0 ? (
        <div className="empty-state">No records yet. Add your first one above.</div>
      ) : (
        <div className="record-list">
          {records.map((record) => (
            <div className="record-row" key={record.id}>
              <div>
                <div className="primary">
                  {typeof schema.primary === 'function' ? schema.primary(record) : record[schema.primary]}
                </div>
                <div className="secondary">{schema.secondary(record)}</div>
              </div>
              <div className="actions">
                <button className="btn secondary small" onClick={() => setEditing(record)}>
                  Edit
                </button>
                <button className="btn danger small" onClick={() => handleDelete(record.id)}>
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
