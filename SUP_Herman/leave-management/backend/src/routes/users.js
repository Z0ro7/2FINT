const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function sanitizeUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    manager_id: u.manager_id,
    active: !!u.active,
    must_change_password: !!u.must_change_password,
    leave_balance: u.leave_balance,
    created_at: u.created_at
  };
}

router.get('/', authorize('rh'), (req, res) => {
  const rows = db.prepare(`
    SELECT u.*, m.first_name as manager_first_name, m.last_name as manager_last_name
    FROM users u LEFT JOIN users m ON u.manager_id = m.id
    ORDER BY u.last_name, u.first_name
  `).all();
  res.json(rows.map(u => ({
    ...sanitizeUser(u),
    manager_name: u.manager_first_name ? `${u.manager_first_name} ${u.manager_last_name}` : null
  })));
});

router.get('/managers', authorize('rh'), (req, res) => {
  const rows = db.prepare("SELECT id, first_name, last_name FROM users WHERE role = 'manager' AND active = 1").all();
  res.json(rows);
});

router.post('/',
  authorize('rh'),
  body('email').isEmail(),
  body('first_name').notEmpty(),
  body('last_name').notEmpty(),
  body('role').isIn(['employee', 'manager', 'rh']),
  body('manager_id').optional({ nullable: true }).isInt(),
  body('leave_balance').optional().isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const email = req.body.email.toLowerCase().trim();
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ message: "Un compte existe déjà avec cet email." });

    const tempPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'A1!';
    const hash = bcrypt.hashSync(tempPassword, 10);

    const info = db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, manager_id, leave_balance, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      email, hash, req.body.first_name.trim(), req.body.last_name.trim(), req.body.role,
      req.body.role === 'employee' ? (req.body.manager_id || null) : null,
      req.body.leave_balance ?? Number(process.env.DEFAULT_LEAVE_BALANCE || 25)
    );

    console.log(`[Nouvel utilisateur] ${email} -> mot de passe temporaire : ${tempPassword}`);

    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ user: sanitizeUser(created), tempPassword });
  }
);

router.put('/:id',
  authorize('rh'),
  body('first_name').optional().notEmpty(),
  body('last_name').optional().notEmpty(),
  body('role').optional().isIn(['employee', 'manager', 'rh']),
  body('manager_id').optional({ nullable: true }).isInt(),
  body('leave_balance').optional().isFloat({ min: 0 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    if (Number(req.params.id) === Number(req.body.manager_id)) {
      return res.status(400).json({ message: "Un utilisateur ne peut pas être son propre manager." });
    }

    const fields = ['first_name', 'last_name', 'role', 'manager_id', 'leave_balance'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];

    const setClause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    if (setClause) {
      db.prepare(`UPDATE users SET ${setClause} WHERE id = @id`).run({ ...updates, id: req.params.id });
    }
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json({ user: sanitizeUser(updated) });
  }
);

router.patch('/:id/status',
  authorize('rh'),
  body('active').isBoolean(),
  (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(req.body.active ? 1 : 0, req.params.id);
    res.json({ message: `Compte ${req.body.active ? 'activé' : 'désactivé'} avec succès.` });
  }
);

router.patch('/:id/reset-password', authorize('rh'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

  const tempPassword = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'A1!';
  const hash = bcrypt.hashSync(tempPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hash, req.params.id);

  console.log(`[Réinitialisation par RH] ${user.email} -> mot de passe temporaire : ${tempPassword}`);
  res.json({ message: "Mot de passe réinitialisé.", tempPassword });
});

module.exports = router;
