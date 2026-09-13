import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import MiniCalendar from '../components/MiniCalendar';
import { formatRange } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted-text">Chargement...</p>;
  if (!data) return <p className="muted-text">Impossible de charger le tableau de bord.</p>;

  const hero = user.role === 'rh'
    ? {
        label: "Demandes en attente pour l'entreprise",
        value: data.company_pending_count,
        unit: data.company_pending_count > 1 ? 'demandes' : 'demande'
      }
    : {
        label: 'Solde de congés restant',
        value: data.leave_balance,
        unit: data.leave_balance > 1 ? 'jours' : 'jour'
      };

  const miniStats = [];
  if (user.role !== 'rh') {
    miniStats.push({ label: 'Mes demandes en attente', value: data.pending_count });
  }
  if (user.role === 'manager') {
    miniStats.push({ label: "Demandes de l'équipe en attente", value: data.team_pending_count });
    miniStats.push({ label: 'Collaborateurs dans mon équipe', value: data.team_size });
  }
  if (user.role === 'rh') {
    miniStats.push({ label: 'Collaborateurs actifs', value: data.total_employees });
    miniStats.push({ label: "Absents aujourd'hui", value: data.total_on_leave_today });
  }

  return (
    <div>
      <div className="dash-summary">
        <div>
          <div className="dash-hero-label">{hero.label}</div>
          <div className="dash-hero">
            <span className="dash-hero-value">{hero.value}</span>
            <span className="dash-hero-unit">{hero.unit}</span>
          </div>
        </div>

        {miniStats.length > 0 && (
          <div className="mini-stats">
            {miniStats.map((s) => (
              <div className="mini-stat" key={s.label}>
                <span className="mini-stat-value">{s.value}</span>
                <span className="mini-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-columns">
        <div>
          <div className="panel-header">
            <h2 className="panel-title">Historique récent</h2>
            <Link to="/mes-demandes" className="muted-text">Voir tout</Link>
          </div>
          {data.recent_requests.length === 0 ? (
            <div className="empty-state">
              <h3>Aucune demande</h3>
              <p>Vos demandes de congés apparaîtront ici.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Type</th><th>Période</th><th>Jours</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {data.recent_requests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.type}</td>
                      <td>{formatRange(r.start_date, r.end_date)}</td>
                      <td>{r.days_count}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dash-side">
          <div className="panel-header"><h2 className="panel-title">Prochains congés</h2></div>
          <MiniCalendar leaves={data.upcoming_leaves} />
          {data.upcoming_leaves.length === 0 ? (
            <p className="muted-text">Aucun congé validé à venir.</p>
          ) : (
            <div className="upcoming-list">
              {data.upcoming_leaves.map((l) => (
                <div key={l.id} className="upcoming-item">
                  <div>
                    <div className="upcoming-type">{l.type}</div>
                    <div className="muted-text">{formatRange(l.start_date, l.end_date)}</div>
                  </div>
                  <div className="muted-text">{l.days_count} j</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
