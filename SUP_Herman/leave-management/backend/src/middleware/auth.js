const jwt = require('jsonwebtoken');
const db = require('../db');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Authentification requise." });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, email, first_name, last_name, role, manager_id, active, must_change_password, leave_balance FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ message: "Compte introuvable ou désactivé." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé : privilèges insuffisants." });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
