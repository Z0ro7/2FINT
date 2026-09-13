import { useEffect, useMemo, useState } from 'react';
import api, { apiErrorMessage } from '../api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

const ROLES = [
  { value: 'employee', label: 'Employé' },
  { value: 'manager', label: 'Manager' },
  { value: 'rh', label: 'Ressources Humaines' }
];

const COLUMNS = [
  { key: 'last_name', label: 'Nom' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Rôle' },
  { key: 'leave_balance', label: 'Solde' },
  { key: 'active', label: 'Statut' }
];

const emptyForm = { email: '', first_name: '', last_name: '', role: 'employee', manager_id: '', leave_balance: 25 };

export default function UserManagement() {
  const { push } = useToast();
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [credentialInfo, setCredentialInfo] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'last_name', order: 'ASC' });

  function toggleSort(field) {
    setSort((s) => (s.field === field ? { field, order: s.order === 'ASC' ? 'DESC' : 'ASC' } : { field, order: 'ASC' }));
  }

  const visibleUsers = useMemo(() => {
    let rows = users;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((u) =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    const { field, order } = sort;
    rows = [...rows].sort((a, b) => {
      const va = a[field], vb = b[field];
      if (va < vb) return order === 'ASC' ? -1 : 1;
      if (va > vb) return order === 'ASC' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [users, search, sort]);

  function load() {
    setLoading(true);
    Promise.all([api.get('/users'), api.get('/users/managers')])
      .then(([u, m]) => { setUsers(u.data); setManagers(m.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({
      email: u.email, first_name: u.first_name, last_name: u.last_name,
      role: u.role, manager_id: u.manager_id || '', leave_balance: u.leave_balance
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name, last_name: form.last_name, role: form.role,
        manager_id: form.role === 'employee' && form.manager_id ? Number(form.manager_id) : null,
        leave_balance: Number(form.leave_balance)
      };
      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
        push('Utilisateur mis à jour.');
        setShowForm(false);
        load();
      } else {
        const { data } = await api.post('/users', { ...payload, email: form.email });
        push('Utilisateur créé.');
        setShowForm(false);
        setCredentialInfo({ email: form.email, tempPassword: data.tempPassword });
        load();
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u) {
    try {
      await api.patch(`/users/${u.id}/status`, { active: !u.active });
      push(`Compte ${u.active ? 'désactivé' : 'activé'}.`);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  async function resetPassword(u) {
    try {
      const { data } = await api.patch(`/users/${u.id}/reset-password`);
      setCredentialInfo({ email: u.email, tempPassword: data.tempPassword });
      push('Mot de passe réinitialisé.');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  return (
    <div>
      <div className="page-actions">
        <button className="btn btn-primary" onClick={openCreate}>+ Créer un utilisateur</button>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted-text">Chargement...</p>
        ) : (
          <>
            <div className="toolbar">
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: 240 }}
              />
            </div>
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
                    <th>Manager</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u) => (
                    <tr key={u.id} style={{ cursor: 'default' }}>
                      <td>{u.first_name} {u.last_name}</td>
                      <td>{u.email}</td>
                      <td>{ROLES.find((r) => r.value === u.role)?.label}</td>
                      <td>{u.leave_balance} j</td>
                      <td><span className={`badge ${u.active ? 'badge-approved' : 'badge-cancelled'}`}>{u.active ? 'Actif' : 'Désactivé'}</span></td>
                      <td>{u.manager_name || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Modifier</button>
                          <button className="btn btn-outline btn-sm" onClick={() => resetPassword(u)}>Réinitialiser MDP</button>
                          <button className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-outline'}`} onClick={() => toggleActive(u)}>
                            {u.active ? 'Désactiver' : 'Activer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleUsers.length === 0 && (
              <div className="empty-state"><h3>Aucun utilisateur</h3><p>Aucun utilisateur ne correspond à cette recherche.</p></div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'} onClose={() => setShowForm(false)}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" required disabled={!!editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <div className="field">
                <label>Prénom</label>
                <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Nom</label>
                <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Rôle</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.role === 'employee' && (
              <div className="field">
                <label>Manager responsable</label>
                <select value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                  <option value="">Aucun</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label>Solde de congés (jours)</label>
              <input type="number" min="0" step="0.5" value={form.leave_balance} onChange={(e) => setForm({ ...form, leave_balance: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}
            </button>
          </form>
        </Modal>
      )}

      {credentialInfo && (
        <Modal title="Identifiants générés" onClose={() => setCredentialInfo(null)}>
          <p className="muted-text" style={{ marginBottom: 12 }}>
            Communiquez ces identifiants temporaires à l'utilisateur. Un changement de mot de passe lui sera demandé à la première connexion.
          </p>
          <div className="alert alert-info">
            <strong>Email :</strong> {credentialInfo.email}<br />
            <strong>Mot de passe temporaire :</strong> {credentialInfo.tempPassword}
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setCredentialInfo(null)}>Fermer</button>
        </Modal>
      )}
    </div>
  );
}
