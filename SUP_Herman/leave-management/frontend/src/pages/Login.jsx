import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../api';
import { FirIcon } from '../components/Icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.must_change_password) navigate('/definir-mot-de-passe');
      else navigate('/');
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de se connecter."));
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
        <h2>Connexion</h2>
        <p className="auth-sub">Plateforme de gestion des congés et absences</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@supherman.fr" />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        </div>
        <p className="muted-text" style={{ marginTop: 18 }}>
          Les comptes sont créés par le service Ressources Humaines. Contactez votre RH si vous n'avez pas encore d'accès.
        </p>
      </div>
    </div>
  );
}
