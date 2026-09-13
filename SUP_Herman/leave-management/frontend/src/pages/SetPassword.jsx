import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { FirIcon } from '../components/Icons';

export default function SetPassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (newPassword !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      await api.post('/auth/set-password', { newPassword });
      await refreshUser();
      navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <FirIcon size={34} />
          <span className="brand-name">SUP Herman</span>
        </div>
        <h2>Bienvenue{user ? `, ${user.first_name}` : ''}</h2>
        <p className="auth-sub">Pour votre première connexion, veuillez définir un mot de passe personnel.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="np">Nouveau mot de passe</label>
            <input id="np" type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <span className="hint">8 caractères minimum</span>
          </div>
          <div className="field">
            <label htmlFor="cp">Confirmer le mot de passe</label>
            <input id="cp" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Définir le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
