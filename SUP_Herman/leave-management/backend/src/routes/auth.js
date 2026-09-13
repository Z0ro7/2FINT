const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Trop de tentatives de connexion. Réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false
});

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

function sanitizeUser(u) {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    manager_id: u.manager_id,
    must_change_password: !!u.must_change_password,
    leave_balance: u.leave_balance
  };
}

router.post('/login',
  loginLimiter,
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ message: "Identifiants incorrects." });
    if (!user.active) return res.status(403).json({ message: "Ce compte a été désactivé. Contactez les RH." });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: "Identifiants incorrects." });

    try {
      db.prepare('INSERT INTO login_history (user_id, ip_address) VALUES (?, ?)').run(user.id, req.ip);
    } catch (e) { }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  }
);

router.post('/set-password',
  authenticate,
  body('newPassword').isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères'),
  body('currentPassword').optional(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const full = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!full.must_change_password) {
      if (!req.body.currentPassword || !bcrypt.compareSync(req.body.currentPassword, full.password_hash)) {
        return res.status(400).json({ message: "Mot de passe actuel incorrect." });
      }
    }
    const hash = bcrypt.hashSync(req.body.newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, req.user.id);
    res.json({ message: "Mot de passe mis à jour avec succès." });
  }
);

router.post('/forgot-password',
  body('email').isEmail(),
  (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email.toLowerCase().trim());
    const generic = { message: "Si ce compte existe, un lien de réinitialisation a été généré." };
    if (!user) return res.json(generic);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

    console.log(`[Réinitialisation mot de passe] ${user.email} -> token: ${token} (valide 1h)`);

    res.json({ ...generic, devToken: token });
  }
);

router.post('/reset-password',
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Requête invalide." });

    const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(req.body.token);
    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ message: "Lien de réinitialisation invalide ou expiré." });
    }
    const hash = bcrypt.hashSync(req.body.newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hash, user.id);
    res.json({ message: "Mot de passe réinitialisé avec succès. Vous pouvez vous connecter." });
  }
);

router.get('/me', authenticate, (req, res) => {
  const full = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitizeUser(full) });
});

router.get('/login-history', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT logged_at, ip_address FROM login_history
    WHERE user_id = ? ORDER BY logged_at DESC LIMIT 10
  `).all(req.user.id);
  res.json(rows);
});

module.exports = router;
