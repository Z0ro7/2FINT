import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user } = useAuth();
  const { push } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/auth/login-history').then((res) => setHistory(res.data)).catch(() => {});
  }, []);

  const roleLabel = { employee: 'Employé', manager: 'Manager', rh: 'Ressources Humaines' }[user.role];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    if (next !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setSaving(true);
    try {
      await api.post('/auth/set-password', { currentPassword: current, newPassword: next });
      push('Mot de passe mis à jour avec succès.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="profile-section">
        <h2 className="panel-title">Informations personnelles</h2>
        <div className="profile-info-grid">
          <div>
            <span className="muted-text">Nom</span>
            <div>{user.first_name} {user.last_name}</div>
          </div>
          <div>
            <span className="muted-text">Email</span>
            <div>{user.email}</div>
          </div>
          <div>
            <span className="muted-text">Rôle</span>
            <div>{roleLabel}</div>
          </div>
          {user.role !== 'rh' && (
            <div>
              <span className="muted-text">Solde de congés</span>
              <div>{user.leave_balance} jours</div>
            </div>
          )}
        </div>
      </div>

      <div className="divider" />

      <div className="profile-section">
        <h2 className="panel-title">Changer de mot de passe</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Mot de passe actuel</label>
            <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="form-grid-2">
            <div className="field">
              <label>Nouveau mot de passe</label>
              <input type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <div className="field">
              <label>Confirmer le nouveau mot de passe</label>
              <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>

      {history.length > 0 && (
        <>
          <div className="divider" />
          <div className="profile-section">
            <h2 className="panel-title">Historique des connexions</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Adresse IP</th></tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                      <td>{new Date(h.logged_at.replace(' ', 'T') + 'Z').toLocaleString('fr-FR')}</td>
                      <td>{h.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
