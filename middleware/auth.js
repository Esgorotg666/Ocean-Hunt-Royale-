const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database/db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.server.jwtSecret);
    const player = db.prepare('SELECT id, username, credits, vip_level, is_admin, status FROM players WHERE id = ?').get(payload.id);
    if (!player) return res.status(401).json({ error: 'User not found' });
    if (player.status === 'banned') return res.status(403).json({ error: 'Account banned' });
    req.player = player;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.player.is_admin) return res.status(403).json({ error: 'Admin access required' });
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
