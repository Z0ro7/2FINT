import { useEffect, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatRange } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const TYPES = ['CP', 'RTT', 'Sans Solde', 'Maladie', 'Formation', 'Autre'];
const STATUSES = ['En attente', 'Validée', 'Refusée', 'Annulée'];

const COLUMNS = [
  { key: 'last_name', label: 'Employé' },
  { key: 'type', label: 'Type' },
  { key: 'start_date', label: 'Période' },
  { key: 'days_count', label: 'Jours' },
  { key: 'status', label: 'Statut' }
];

export default function ManageRequests() {
  const { user } = useAuth();
  const { push } = useToast();
  const [result, setResult] = useState({ data: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '', employee: '', start: '', end: '', search: '' });
  const [sort, setSort] = useState({ field: 'created_at', order: 'DESC' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectFor, setShowRejectFor] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {
      page, pageSize: 10, sort: sort.field, order: sort.order,
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    };
    api.get('/leaves', { params }).then((res) => setResult(res.data)).finally(() => setLoading(false));
  }, [page, filters, sort]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (user.role === 'rh') {
      api.get('/users').then((res) => setEmployees(res.data.filter((u) => u.role !== 'rh')));
    }
  }, [user.role]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function toggleSort(field) {
    setPage(1);
    setSort((s) => (s.field === field ? { field, order: s.order === 'ASC' ? 'DESC' : 'ASC' } : { field, order: 'ASC' }));
  }

  async function handleApprove(id) {
    setActing(true);
    try {
      await api.patch(`/leaves/${id}/status`, { status: 'Validée' });
      push('Demande validée.');
      setSelected(null);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  async function handleReject(id) {
    if (!rejectComment.trim()) { push('Un commentaire est obligatoire pour refuser une demande.', 'error'); return; }
    setActing(true);
    try {
      await api.patch(`/leaves/${id}/status`, { status: 'Refusée', manager_comment: rejectComment });
      push('Demande refusée.');
      setSelected(null);
      setShowRejectFor(null);
      setRejectComment('');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            style={{ minWidth: 200 }}
          />
          <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
            <option value="">Tous les types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {user.role === 'rh' && (
            <select value={filters.employee} onChange={(e) => updateFilter('employee', e.target.value)}>
              <option value="">Tous les employés</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          )}
          <label className="muted-text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Du
            <input type="date" value={filters.start} onChange={(e) => updateFilter('start', e.target.value)} style={{ minWidth: 140 }} />
          </label>
          <label className="muted-text" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            au
            <input type="date" value={filters.end} onChange={(e) => updateFilter('end', e.target.value)} style={{ minWidth: 140 }} />
          </label>
        </div>

        {loading ? (
          <p className="muted-text">Chargement...</p>
        ) : result.data.length === 0 ? (
          <div className="empty-state"><h3>Aucune demande</h3><p>Aucune demande ne correspond à ces filtres.</p></div>
        ) : (
          <>
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
                  {result.data.map((r) => (
                    <tr key={r.id} onClick={() => setSelected(r)}>
                      <td>{r.first_name} {r.last_name}</td>
                      <td>{r.type}</td>
                      <td>{formatRange(r.start_date, r.end_date)}</td>
                      <td>{r.days_count}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Page {result.page} / {result.totalPages} — {result.total} résultat(s)</span>
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</button>
              <button className="btn btn-outline btn-sm" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
            </div>
          </>
        )}
      </div>

      {selected && (
        <Modal title={`Demande de ${selected.first_name} ${selected.last_name}`} onClose={() => { setSelected(null); setShowRejectFor(null); setRejectComment(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><StatusBadge status={selected.status} /></div>
            <div><strong>Type :</strong> {selected.type}</div>
            <div><strong>Période :</strong> {formatRange(selected.start_date, selected.end_date)}</div>
            <div><strong>Jours :</strong> {selected.days_count}</div>
            {selected.comment && <div><strong>Commentaire de l'employé :</strong> {selected.comment}</div>}
            {selected.justificatif_path && (
              <div><strong>Justificatif :</strong> <a href={selected.justificatif_path} target="_blank" rel="noreferrer">Voir le fichier</a></div>
            )}
            {selected.manager_comment && (
              <div className="alert alert-info"><strong>Commentaire du manager :</strong> {selected.manager_comment}</div>
            )}

            {selected.status === 'En attente' && (
              showRejectFor === selected.id ? (
                <div className="field">
                  <label>Motif du refus (obligatoire)</label>
                  <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <button className="btn btn-danger" disabled={acting} onClick={() => handleReject(selected.id)}>Confirmer le refus</button>
                    <button className="btn btn-outline" onClick={() => setShowRejectFor(null)}>Annuler</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" disabled={acting} onClick={() => handleApprove(selected.id)}>Valider</button>
                  <button className="btn btn-danger" disabled={acting} onClick={() => setShowRejectFor(selected.id)}>Refuser</button>
                </div>
              )
            )}

            {user.role === 'rh' && selected.status !== 'En attente' && (
              <div className="field">
                <label>Modifier le statut (RH)</label>
                <select
                  value={selected.status}
                  onChange={async (e) => {
                    try {
                      await api.patch(`/leaves/${selected.id}/status`, { status: e.target.value, manager_comment: selected.manager_comment });
                      push('Statut mis à jour.');
                      setSelected(null);
                      load();
                    } catch (err) {
                      push(apiErrorMessage(err), 'error');
                    }
                  }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
