import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { DOW, monthLabel } from '../utils/format';

const TYPE_COLORS = {
  CP: 'var(--sapin-100)',
  RTT: '#EFE6D0',
  'Sans Solde': '#EAE2F0',
  Maladie: 'var(--danger-bg)',
  Formation: '#DCEAF3',
  Autre: 'var(--muted-bg)'
};

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startOffset; i > 0; i--) cells.push({ day: prevDays - i + 1, muted: true, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, muted: false, dateStr });
  }
  while (cells.length % 7 !== 0) cells.push({ day: cells.length, muted: true, dateStr: null });
  return cells;
}

export default function GlobalCalendar() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [teamOnly, setTeamOnly] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    api.get('/leaves/calendar/all', { params: { month: monthStr, team: teamOnly ? 'mine' : undefined } })
      .then((res) => setLeaves(res.data))
      .finally(() => setLoading(false));
  }, [year, month, teamOnly]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  function leavesForDay(dateStr) {
    if (!dateStr) return [];
    return leaves.filter((l) => l.start_date <= dateStr && l.end_date >= dateStr);
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div className="cal-nav" style={{ marginBottom: 0 }}>
          <button onClick={prevMonth} aria-label="Mois précédent">‹</button>
          <span className="cal-title">{monthLabel(year, month)}</span>
          <button onClick={nextMonth} aria-label="Mois suivant">›</button>
        </div>
        {user.role === 'manager' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={teamOnly} onChange={(e) => setTeamOnly(e.target.checked)} />
            Mon équipe uniquement
          </label>
        )}
      </div>

      {loading ? (
        <p className="muted-text">Chargement...</p>
      ) : (
        <div className="cal-grid" style={{ marginTop: 16 }}>
          {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => (
            <div key={d} className="cal-dow">{d}</div>
          ))}
          {cells.map((cell, idx) => {
            const dayLeaves = leavesForDay(cell.dateStr);
            return (
              <div key={idx} className={`cal-cell${cell.muted ? ' muted' : ''}`}>
                <div className="cal-date">{cell.day}</div>
                {dayLeaves.slice(0, 3).map((l) => (
                  <div key={l.id} className="cal-chip" style={{ background: TYPE_COLORS[l.type] || 'var(--sapin-100)' }} title={`${l.first_name} ${l.last_name} — ${l.type}`}>
                    {l.first_name} {l.last_name[0]}.
                  </div>
                ))}
                {dayLeaves.length > 3 && <div className="muted-text" style={{ fontSize: 10.5 }}>+{dayLeaves.length - 3} autre(s)</div>}
              </div>
            );
          })}
        </div>
      )}

      <div className="legend">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type}><span className="legend-dot" style={{ background: color }} />{type}</span>
        ))}
      </div>
    </div>
  );
}
