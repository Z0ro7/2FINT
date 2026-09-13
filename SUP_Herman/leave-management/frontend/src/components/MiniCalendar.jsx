import { useMemo } from 'react';
import { monthLabel } from '../utils/format';

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

export default function MiniCalendar({ leaves = [] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayStr = today.toISOString().slice(0, 10);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  function hasLeave(dateStr) {
    if (!dateStr) return false;
    return leaves.some((l) => l.start_date <= dateStr && l.end_date >= dateStr);
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-title">{monthLabel(year, month)}</div>
      <div className="mini-cal-grid">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="mini-cal-dow">{d}</div>
        ))}
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={[
              'mini-cal-cell',
              cell.muted ? 'muted' : '',
              cell.dateStr === todayStr ? 'today' : '',
              hasLeave(cell.dateStr) ? 'has-leave' : ''
            ].filter(Boolean).join(' ')}
          >
            {cell.day}
          </div>
        ))}
      </div>
      <div className="mini-cal-legend">
        <span className="legend-dot" style={{ background: 'var(--wood)' }} />Congé validé à venir
      </div>
    </div>
  );
}
