import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../api';
import { FirIcon } from '../components/Icons';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (data.devToken) setDevToken(data.devToken);
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
        <h2>Mot de passe oublié</h2>
        <p className="auth-sub">Un lien de réinitialisation vous sera envoyé par email.</p>

        {error && <div className="alert alert-error">{error}</div>}

        {sent ? (
          <div className="alert alert-success">
            Si ce compte existe, un email de réinitialisation a été envoyé.
            {devToken && (
              <>
                <br /><br />
                <span className="muted-text">Mode démo — pas de serveur email configuré. Lien direct :</span><br />
                <Link to={`/reinitialiser-mot-de-passe?token=${devToken}`}>Réinitialiser mon mot de passe</Link>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Adresse email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <div className="auth-links">
          <Link to="/login">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
