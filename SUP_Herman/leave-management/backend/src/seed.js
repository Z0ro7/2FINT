require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const DEFAULT_BALANCE = Number(process.env.DEFAULT_LEAVE_BALANCE || 25);

function upsertUser({ email, password, first_name, last_name, role, manager_id, must_change_password = 1 }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    console.log(`- Utilisateur déjà existant : ${email}`);
    return existing.id;
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, role, manager_id, leave_balance, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(email, hash, first_name, last_name, role, manager_id || null, DEFAULT_BALANCE, must_change_password);
  console.log(`- Utilisateur créé : ${email} (mot de passe initial : ${password})`);
  return info.lastInsertRowid;
}

console.log('Initialisation des données de démonstration...\n');

const rhId = upsertUser({
  email: 'rh@supherman.com',
  password: 'Suph3rm4n!',
  first_name: 'Alice',
  last_name: 'Martin',
  role: 'rh',
  must_change_password: 0
});

const managerId = upsertUser({
  email: 'manager@supherman.com',
  password: 'Manager123!',
  first_name: 'Bruno',
  last_name: 'Lefevre',
  role: 'manager',
  must_change_password: 0
});

const empId = upsertUser({
  email: 'employe@supherman.com',
  password: 'Employe123!',
  first_name: 'Chloé',
  last_name: 'Durand',
  role: 'employee',
  manager_id: managerId,
  must_change_password: 0
});

upsertUser({
  email: 'employe2@supherman.com',
  password: 'Employe123!',
  first_name: 'David',
  last_name: 'Petit',
  role: 'employee',
  manager_id: managerId,
  must_change_password: 0
});

const existingLeave = db.prepare('SELECT id FROM leave_requests LIMIT 1').get();
if (!existingLeave) {
  const insert = db.prepare(`
    INSERT INTO leave_requests (user_id, type, start_date, end_date, days_count, comment, status, reviewed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(empId, 'CP', '2026-09-10', '2026-09-12', 3, 'Vacances en famille', 'En attente', null);
  insert.run(empId, 'RTT', '2026-08-20', '2026-08-20', 1, null, 'Validée', managerId);
  console.log('- Demandes de congés de démonstration créées');
}

console.log('\nTerminé. Comptes de démonstration :');
console.log('  RH       : rh@supherman.com / Suph3rm4n!');
console.log('  Manager  : manager@supherman.com / Manager123!');
console.log('  Employé  : employe@supherman.com / Employe123!');
