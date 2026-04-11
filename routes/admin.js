const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../database/db');
const config = require('../config');
const { requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// All admin routes require admin auth
router.use(requireAdmin);

// ── GET /api/admin/dashboard ─────────────────────────────────
router.get('/dashboard', (req, res) => {
  const totalPlayers = db.prepare('SELECT COUNT(*) as c FROM players WHERE is_admin=0').get().c;
  const activePlayers = db.prepare("SELECT COUNT(*) as c FROM players WHERE is_admin=0 AND status='active'").get().c;
  const totalWagered = db.prepare('SELECT COALESCE(SUM(total_wagered),0) as s FROM players WHERE is_admin=0').get().s;
  const totalWon = db.prepare('SELECT COALESCE(SUM(total_won),0) as s FROM players WHERE is_admin=0').get().s;
  const totalCredits = db.prepare('SELECT COALESCE(SUM(credits),0) as s FROM players WHERE is_admin=0').get().s;
  const jackpot = db.prepare('SELECT amount FROM jackpot WHERE id=1').get();
  const recentTx = db.prepare(`
    SELECT t.*, p.username FROM transactions t
    JOIN players p ON p.id = t.player_id
    ORDER BY t.created_at DESC LIMIT 20
  `).all();
  const todaySignups = db.prepare("SELECT COUNT(*) as c FROM players WHERE date(created_at)=date('now') AND is_admin=0").get().c;
  res.json({
    stats: { totalPlayers, activePlayers, totalWagered, totalWon, totalCredits, jackpot: jackpot?.amount || 0, houseEdge: totalWagered - totalWon, todaySignups },
    recentTransactions: recentTx
  });
});

// ── GET /api/admin/players ───────────────────────────────────
router.get('/players', (req, res) => {
  const { search, status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE is_admin = 0';
  const params = [];
  if (search) { where += ' AND (username LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  const players = db.prepare(`SELECT id, username, email, credits, total_wagered, total_won, vip_level, status, last_login, created_at FROM players ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as c FROM players ${where}`).get(...params).c;
  res.json({ players, total, page: Number(page), limit: Number(limit) });
});

// ── GET /api/admin/players/:id ──────────────────────────────
router.get('/players/:id', (req, res) => {
  const player = db.prepare('SELECT id, username, email, credits, total_wagered, total_won, vip_level, status, last_login, created_at FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const txs = db.prepare('SELECT * FROM transactions WHERE player_id = ? ORDER BY created_at DESC LIMIT 100').all(player.id);
  const sessions = db.prepare('SELECT * FROM game_sessions WHERE player_id = ? ORDER BY started_at DESC LIMIT 20').all(player.id);
  res.json({ player, transactions: txs, sessions });
});

// ── POST /api/admin/players/create ──────────────────────────
router.post('/players/create', [
  body('username').trim().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 6 }),
  body('credits').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { username, password, email, credits = 0 } = req.body;
  const exists = db.prepare('SELECT id FROM players WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Username taken' });
  const hash = await bcrypt.hash(password, 12);
  const result = db.prepare('INSERT INTO players (uuid, username, password, email, credits) VALUES (?,?,?,?,?)').run(uuidv4(), username, hash, email || null, credits);
  res.json({ success: true, playerId: result.lastInsertRowid });
});

// ── PATCH /api/admin/players/:id/credits ─────────────────────
router.patch('/players/:id/credits', [
  body('amount').isFloat(),
  body('reason').optional().isString().trim(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const { amount, reason = 'Admin adjustment' } = req.body;
  const player = db.prepare('SELECT id, credits FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const newBalance = Math.max(0, player.credits + amount);
  db.prepare('UPDATE players SET credits = ? WHERE id = ?').run(newBalance, player.id);
  db.prepare(`
    INSERT INTO transactions (player_id, type, amount, balance_before, balance_after, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(player.id, amount > 0 ? 'admin_add' : 'admin_remove', Math.abs(amount), player.credits, newBalance, reason);
  res.json({ success: true, newBalance });
});

// ── PATCH /api/admin/players/:id/status ──────────────────────
router.patch('/players/:id/status', [body('status').isIn(['active','banned','vip'])], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  db.prepare('UPDATE players SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

// ── PATCH /api/admin/players/:id/reset-password ──────────────
router.patch('/players/:id/reset-password', [body('newPassword').isLength({ min: 6 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  const hash = await bcrypt.hash(req.body.newPassword, 12);
  db.prepare('UPDATE players SET password = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ success: true });
});

// ── GET /api/admin/transactions ──────────────────────────────
router.get('/transactions', (req, res) => {
  const { type, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;
  let where = '';
  const params = [];
  if (type) { where = 'WHERE t.type = ?'; params.push(type); }
  const txs = db.prepare(`
    SELECT t.*, p.username FROM transactions t
    JOIN players p ON p.id = t.player_id
    ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  res.json({ transactions: txs });
});

// ── PATCH /api/admin/jackpot ─────────────────────────────────
router.patch('/jackpot', [body('amount').isFloat({ min: 0 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  db.prepare('UPDATE jackpot SET amount = ? WHERE id = 1').run(req.body.amount);
  res.json({ success: true, amount: req.body.amount });
});

// ── GET /api/admin/export/transactions ───────────────────────
router.get('/export/transactions', (req, res) => {
  const rows = db.prepare(`
    SELECT t.id, p.username, t.type, t.amount, t.balance_before, t.balance_after, t.description, t.fish_id, t.created_at
    FROM transactions t JOIN players p ON p.id = t.player_id ORDER BY t.created_at DESC
  `).all();
  let csv = 'ID,Username,Type,Amount,Balance Before,Balance After,Description,Fish,Date\n';
  rows.forEach(r => {
    csv += `${r.id},"${r.username}","${r.type}",${r.amount},${r.balance_before},${r.balance_after},"${r.description || ''}","${r.fish_id || ''}","${r.created_at}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(csv);
});

module.exports = router;
