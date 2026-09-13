const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { body, query, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { countBusinessDays, isValidDateStr } = require('../utils/dates');

const router = express.Router();
router.use(authenticate);

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error("Format de fichier non autorisé (pdf, jpg, png uniquement)."));
    }
    cb(null, true);
  }
});

const LEAVE_TYPES = ['CP', 'RTT', 'Sans Solde', 'Maladie', 'Formation', 'Autre'];

function isManagerOfEmployee(managerId, employeeId) {
  const emp = db.prepare('SELECT manager_id FROM users WHERE id = ?').get(employeeId);
  return emp && emp.manager_id === managerId;
}

router.get('/mine', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const leave = db.prepare(`
    SELECT lr.*, u.first_name, u.last_name, u.email, u.manager_id
    FROM leave_requests lr JOIN users u ON lr.user_id = u.id
    WHERE lr.id = ?
  `).get(req.params.id);
  if (!leave) return res.status(404).json({ message: "Demande introuvable." });

  const isOwner = leave.user_id === req.user.id;
  const isTeamManager = req.user.role === 'manager' && leave.manager_id === req.user.id;
  const isRh = req.user.role === 'rh';
  if (!isOwner && !isTeamManager && !isRh) {
    return res.status(403).json({ message: "Accès refusé à cette demande." });
  }
  res.json(leave);
});

router.post('/',
  upload.single('justificatif'),
  body('type').isIn(LEAVE_TYPES).withMessage('Type de congé invalide'),
  body('start_date').custom(isValidDateStr).withMessage('Date de début invalide'),
  body('end_date').custom(isValidDateStr).withMessage('Date de fin invalide'),
  body('comment').optional().isLength({ max: 1000 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { type, start_date, end_date, comment } = req.body;

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ message: "La date de fin doit être postérieure ou égale à la date de début." });
    }

    const overlap = db.prepare(`
      SELECT id FROM leave_requests
      WHERE user_id = ? AND status IN ('En attente', 'Validée')
      AND NOT (end_date < ? OR start_date > ?)
    `).get(req.user.id, start_date, end_date);
    if (overlap) {
      return res.status(400).json({ message: "Cette période chevauche une demande existante." });
    }

    const days = countBusinessDays(start_date, end_date);
    if (days <= 0) {
      return res.status(400).json({ message: "La période sélectionnée ne contient aucun jour ouvré." });
    }

    const justificatifPath = req.file ? `/uploads/${req.file.filename}` : null;

    const info = db.prepare(`
      INSERT INTO leave_requests (user_id, type, start_date, end_date, days_count, comment, justificatif_path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, type, start_date, end_date, days, comment || null, justificatifPath);

    const created = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  }
);

router.delete('/:id', (req, res) => {
  const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
  if (!leave) return res.status(404).json({ message: "Demande introuvable." });
  if (leave.user_id !== req.user.id) return res.status(403).json({ message: "Vous ne pouvez annuler que vos propres demandes." });
  if (leave.status !== 'En attente') return res.status(400).json({ message: "Seule une demande en attente peut être annulée." });

  db.prepare("UPDATE leave_requests SET status = 'Annulée', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ message: "Demande annulée." });
});

router.get('/',
  authorize('manager', 'rh'),
  (req, res) => {
    const { employee, status, type, start, end, search, page = 1, pageSize = 10, sort = 'created_at', order = 'DESC' } = req.query;

    const where = [];
    const params = {};

    if (req.user.role === 'manager') {
      where.push('u.manager_id = @managerId');
      params.managerId = req.user.id;
    }
    if (employee) { where.push('lr.user_id = @employee'); params.employee = employee; }
    if (status) { where.push('lr.status = @status'); params.status = status; }
    if (type) { where.push('lr.type = @type'); params.type = type; }
    if (start) { where.push('lr.end_date >= @start'); params.start = start; }
    if (end) { where.push('lr.start_date <= @end'); params.end = end; }
    if (search) {
      where.push('(u.first_name LIKE @search OR u.last_name LIKE @search OR u.email LIKE @search)');
      params.search = `%${search}%`;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const allowedSort = ['created_at', 'start_date', 'end_date', 'status', 'type', 'days_count', 'last_name'];
    const sortCol = allowedSort.includes(sort) ? (sort === 'last_name' ? 'u.last_name' : `lr.${sort}`) : 'lr.created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM leave_requests lr JOIN users u ON lr.user_id = u.id ${whereClause}
    `).get(params).count;

    const limit = Math.min(Number(pageSize) || 10, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const rows = db.prepare(`
      SELECT lr.*, u.first_name, u.last_name, u.email
      FROM leave_requests lr JOIN users u ON lr.user_id = u.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT @limit OFFSET @offset
    `).all({ ...params, limit, offset });

    res.json({ data: rows, total, page: Number(page), pageSize: limit, totalPages: Math.ceil(total / limit) });
  }
);

router.patch('/:id/status',
  authorize('manager', 'rh'),
  body('status').isIn(['Validée', 'Refusée', 'En attente']),
  body('manager_comment').optional({ nullable: true }).isLength({ max: 1000 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    if (!leave) return res.status(404).json({ message: "Demande introuvable." });

    if (req.user.role === 'manager') {
      if (!isManagerOfEmployee(req.user.id, leave.user_id)) {
        return res.status(403).json({ message: "Vous ne gérez pas cet employé." });
      }
      if (req.body.status === 'Refusée' && !req.body.manager_comment) {
        return res.status(400).json({ message: "Un commentaire est obligatoire en cas de refus." });
      }
    }

    db.prepare(`
      UPDATE leave_requests
      SET status = @status, manager_comment = @comment, reviewed_by = @reviewer, updated_at = datetime('now')
      WHERE id = @id
    `).run({
      status: req.body.status,
      comment: req.body.manager_comment || null,
      reviewer: req.user.id,
      id: req.params.id
    });

    if (req.body.status === 'Validée' && ['CP', 'RTT'].includes(leave.type)) {
      db.prepare('UPDATE users SET leave_balance = leave_balance - ? WHERE id = ?').run(leave.days_count, leave.user_id);
    }

    const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    res.json(updated);
  }
);

router.get('/calendar/all', (req, res) => {
  const { month, team } = req.query;
  const where = ["lr.status = 'Validée'"];
  const params = {};

  if (month) {
    where.push("lr.start_date <= @monthEnd AND lr.end_date >= @monthStart");
    params.monthStart = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    params.monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
  }
  if (req.user.role === 'manager' && team === 'mine') {
    where.push('u.manager_id = @managerId');
    params.managerId = req.user.id;
  }

  const rows = db.prepare(`
    SELECT lr.id, lr.type, lr.start_date, lr.end_date, u.first_name, u.last_name, u.id as user_id
    FROM leave_requests lr JOIN users u ON lr.user_id = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY lr.start_date
  `).all(params);

  res.json(rows);
});

module.exports = router;
