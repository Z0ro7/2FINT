const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const user = req.user;

  const pendingCount = db.prepare(`
    SELECT COUNT(*) as c FROM leave_requests WHERE user_id = ? AND status = 'En attente'
  `).get(user.id).c;

  const recent = db.prepare(`
    SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
  `).all(user.id);

  const upcoming = db.prepare(`
    SELECT * FROM leave_requests
    WHERE user_id = ? AND status = 'Validée' AND end_date >= date('now')
    ORDER BY start_date ASC LIMIT 10
  `).all(user.id);

  const payload = {
    leave_balance: user.leave_balance,
    pending_count: pendingCount,
    recent_requests: recent,
    upcoming_leaves: upcoming
  };

  if (user.role === 'manager') {
    payload.team_pending_count = db.prepare(`
      SELECT COUNT(*) as c FROM leave_requests lr JOIN users u ON lr.user_id = u.id
      WHERE u.manager_id = ? AND lr.status = 'En attente'
    `).get(user.id).c;

    payload.team_size = db.prepare(`SELECT COUNT(*) as c FROM users WHERE manager_id = ? AND active = 1`).get(user.id).c;
  }

  if (user.role === 'rh') {
    payload.company_pending_count = db.prepare(`SELECT COUNT(*) as c FROM leave_requests WHERE status = 'En attente'`).get().c;
    payload.total_employees = db.prepare(`SELECT COUNT(*) as c FROM users WHERE active = 1`).get().c;
    payload.total_on_leave_today = db.prepare(`
      SELECT COUNT(*) as c FROM leave_requests
      WHERE status = 'Validée' AND start_date <= date('now') AND end_date >= date('now')
    `).get().c;
  }

  res.json(payload);
});

module.exports = router;
