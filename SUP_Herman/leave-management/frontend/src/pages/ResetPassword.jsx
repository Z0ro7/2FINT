import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../api';
import { FirIcon } from '../components/Icons';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (newPassword !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
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
        <h2>Réinitialiser le mot de passe</h2>
        <p className="auth-sub">Choisissez un nouveau mot de passe pour votre compte.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success ? (
          <div className="alert alert-success">Mot de passe réinitialisé. Redirection vers la connexion...</div>
        ) : (
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
            <button className="btn btn-primary btn-block" type="submit" disabled={loading || !token}>
              {loading ? 'Enregistrement...' : 'Réinitialiser'}
            </button>
            {!token && <p className="alert alert-error" style={{ marginTop: 12 }}>Lien invalide : jeton manquant.</p>}
          </form>
        )}
        <div className="auth-links">
          <Link to="/login">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
