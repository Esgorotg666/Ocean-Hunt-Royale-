const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../database/db');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 6, max: 64 }),
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { username, password, email } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM players WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 12);
    const uuid = uuidv4();
    const bonus = config.credits.newPlayerBonus;

    const stmt = db.prepare(`
      INSERT INTO players (uuid, username, password, email, credits, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `);
    const result = stmt.run(uuid, username, hash, email || null, bonus);
    const playerId = result.lastInsertRowid;

    // Record bonus transaction
    db.prepare(`
      INSERT INTO transactions (player_id, type, amount, balance_before, balance_after, description)
      VALUES (?, 'bonus', ?, 0, ?, 'Welcome bonus')
    `).run(playerId, bonus, bonus);

    const token = jwt.sign({ id: playerId, username }, config.server.jwtSecret, { expiresIn: config.server.jwtExpiry });

    res.json({
      token,
      player: { id: playerId, username, credits: bonus, vip_level: 0, is_admin: 0 }
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', [
  body('username').trim().notEmpty(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

  const { username, password } = req.body;

  try {
    const player = db.prepare('SELECT * FROM players WHERE username = ?').get(username);
    if (!player) return res.status(401).json({ error: 'Invalid credentials' });
    if (player.status === 'banned') return res.status(403).json({ error: 'Account banned. Contact support.' });

    const valid = await bcrypt.compare(password, player.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Daily login bonus
    let bonusAwarded = 0;
    const today = new Date().toISOString().slice(0, 10);
    if (player.daily_bonus_date !== today) {
      const bonus = config.credits.dailyLoginBonus;
      db.prepare('UPDATE players SET credits = credits + ?, daily_bonus_date = ?, last_login = datetime("now") WHERE id = ?').run(bonus, today, player.id);
      db.prepare(`
        INSERT INTO transactions (player_id, type, amount, balance_before, balance_after, description)
        VALUES (?, 'bonus', ?, ?, ?, 'Daily login bonus')
      `).run(player.id, bonus, player.credits, player.credits + bonus);
      bonusAwarded = bonus;
    } else {
      db.prepare('UPDATE players SET last_login = datetime("now") WHERE id = ?').run(player.id);
    }

    const freshPlayer = db.prepare('SELECT id, username, credits, vip_level, is_admin, status FROM players WHERE id = ?').get(player.id);
    const token = jwt.sign({ id: player.id, username: player.username }, config.server.jwtSecret, { expiresIn: config.server.jwtExpiry });

    res.json({ token, player: freshPlayer, dailyBonus: bonusAwarded });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const player = db.prepare('SELECT id, username, credits, vip_level, is_admin, status, total_wagered, total_won, created_at, last_login FROM players WHERE id = ?').get(req.player.id);
  const jackpot = db.prepare('SELECT amount FROM jackpot WHERE id = 1').get();
  res.json({ player, jackpot: jackpot ? jackpot.amount : 0 });
});

// ── POST /api/auth/change-password ──────────────────────────
router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6, max: 64 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { currentPassword, newPassword } = req.body;
  const player = db.prepare('SELECT password FROM players WHERE id = ?').get(req.player.id);
  const valid = await bcrypt.compare(currentPassword, player.password);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE players SET password = ? WHERE id = ?').run(hash, req.player.id);
  res.json({ success: true });
});

module.exports = router;
