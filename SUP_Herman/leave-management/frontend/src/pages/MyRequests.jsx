import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatRange, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';

const COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'start_date', label: 'Début' },
  { key: 'end_date', label: 'Fin' },
  { key: 'days_count', label: 'Jours' },
  { key: 'status', label: 'Statut' }
];

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState({ field: 'start_date', order: 'DESC' });
  const { push } = useToast();

  function load() {
    setLoading(true);
    api.get('/leaves/mine').then((res) => setRequests(res.data)).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function toggleSort(field) {
    setSort((s) => (s.field === field ? { field, order: s.order === 'ASC' ? 'DESC' : 'ASC' } : { field, order: 'ASC' }));
  }

  const visibleRequests = useMemo(() => {
    let rows = requests;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    const { field, order } = sort;
    rows = [...rows].sort((a, b) => {
      const va = a[field], vb = b[field];
      if (va < vb) return order === 'ASC' ? -1 : 1;
      if (va > vb) return order === 'ASC' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [requests, statusFilter, sort]);

  async function handleCancel(id) {
    setCancelling(true);
    try {
      await api.delete(`/leaves/${id}`);
      push('Demande annulée avec succès.');
      setSelected(null);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <div className="page-actions">
        <Link to="/nouvelle-demande" className="btn btn-primary">+ Nouvelle demande</Link>
      </div>

      <div className="card">
        {requests.length > 0 && (
          <div className="toolbar">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="Validée">Validée</option>
              <option value="Refusée">Refusée</option>
              <option value="Annulée">Annulée</option>
            </select>
          </div>
        )}

        {loading ? (
          <p className="muted-text">Chargement...</p>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <h3>Aucune demande pour le moment</h3>
            <p>Créez votre première demande de congés pour qu'elle apparaisse ici.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="th-sortable" onClick={() => toggleSort(col.key)}>
                      {col.label}
                      <span className="sort-arrow">{sort.field === col.key ? (sort.order === 'ASC' ? ' ▲' : ' ▼') : ''}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((r) => (
                  <tr key={r.id} onClick={() => setSelected(r)}>
                    <td>{r.type}</td>
                    <td>{formatDate(r.start_date)}</td>
                    <td>{formatDate(r.end_date)}</td>
                    <td>{r.days_count}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <Modal title={`Demande de ${selected.type}`} onClose={() => setSelected(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><StatusBadge status={selected.status} /></div>
            <div><strong>Période :</strong> {formatRange(selected.start_date, selected.end_date)}</div>
            <div><strong>Nombre de jours :</strong> {selected.days_count}</div>
            {selected.comment && <div><strong>Commentaire :</strong> {selected.comment}</div>}
            {selected.justificatif_path && (
              <div>
                <strong>Justificatif :</strong>{' '}
                <a href={selected.justificatif_path} target="_blank" rel="noreferrer">Voir le fichier</a>
              </div>
            )}
            {selected.manager_comment && (
              <div className="alert alert-info">
                <strong>Commentaire du manager :</strong> {selected.manager_comment}
              </div>
            )}
            {selected.status === 'En attente' && (
              <button className="btn btn-danger" disabled={cancelling} onClick={() => handleCancel(selected.id)}>
                {cancelling ? 'Annulation...' : 'Annuler cette demande'}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
