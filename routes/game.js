const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

// ── Server-side RNG (seeded, auditable) ─────────────────────
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Determine if a shot kills a fish based on RTP + fish HP
function resolveShot(fishId, betAmount, shotNumber, playerId) {
  const fishDef = config.fish.find(f => f.id === fishId);
  if (!fishDef) return { hit: false, killed: false, payout: 0 };

  const seed = Date.now() + playerId + shotNumber;
  const rand = seededRandom(seed);

  // Base hit probability tuned to RTP
  const hitChance = (config.rtp.target / fishDef.multiplier) * betAmount * 2;
  const hit = rand < Math.min(hitChance * 3, 0.92);

  // Kill check (separate RNG call)
  const killSeed = seed + 999;
  const killRand = seededRandom(killSeed);
  const killChance = hit ? (1 / fishDef.hp) : 0;
  const killed = hit && killRand < killChance;

  const payout = killed ? Math.floor(betAmount * fishDef.multiplier) : 0;

  return { hit, killed, payout, fishDef };
}

// ── POST /api/game/shoot ─────────────────────────────────────
router.post('/shoot', requireAuth, [
  body('fishId').isString().notEmpty(),
  body('bet').isFloat({ min: 0.1 }).toFloat(),
  body('weapon').isString().default('standard'),
  body('angle').isFloat().toFloat(),
  body('sessionId').optional().isInt(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  const { fishId, bet, weapon, angle, sessionId } = req.body;
  const player = req.player;

  // Validate bet level
  const weaponDef = config.weapons[weapon] || config.weapons.standard;
  const actualCost = bet * weaponDef.cost;

  if (player.credits < actualCost) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }

  // Deduct bet cost
  const balanceBefore = player.credits;
  const balanceAfter = balanceBefore - actualCost;
  db.prepare('UPDATE players SET credits = ?, total_wagered = total_wagered + ? WHERE id = ?').run(balanceAfter, actualCost, player.id);

  // Log bet transaction
  db.prepare(`
    INSERT INTO transactions (player_id, type, amount, balance_before, balance_after, description, fish_id, weapon)
    VALUES (?, 'bet', ?, ?, ?, ?, ?, ?)
  `).run(player.id, -actualCost, balanceBefore, balanceAfter, `Shot at ${fishId}`, fishId, weapon);

  // Resolve shot outcome
  const shotNumber = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE player_id = ?').get(player.id).c;
  const result = resolveShot(fishId, bet, shotNumber, player.id);

  // Jackpot contribution
  const jackpotContrib = actualCost * config.jackpot.contributionRate;
  db.prepare('UPDATE jackpot SET amount = amount + ? WHERE id = 1').run(jackpotContrib);

  let finalBalance = balanceAfter;
  let jackpotWon = 0;

  if (result.killed && result.payout > 0) {
    // Credit winnings
    finalBalance = balanceAfter + result.payout;
    db.prepare('UPDATE players SET credits = ?, total_won = total_won + ? WHERE id = ?').run(finalBalance, result.payout, player.id);

    db.prepare(`
      INSERT INTO transactions (player_id, type, amount, balance_before, balance_after, description, fish_id, multiplier)
      VALUES (?, 'win', ?, ?, ?, ?, ?, ?)
    `).run(player.id, result.payout, balanceAfter, finalBalance, `Killed ${fishId}`, fishId, result.fishDef ? result.fishDef.multiplier : 1);

    // Update VIP level
    const totalWagered = db.prepare('SELECT total_wagered FROM players WHERE id = ?').get(player.id).total_wagered;
    const vipLevels = config.vip;
    let newVip = 0;
    for (const v of vipLevels) { if (totalWagered >= v.threshold) newVip = v.level; }
    db.prepare('UPDATE players SET vip_level = ? WHERE id = ?').run(newVip, player.id);

    // Jackpot trigger check
    const jackpot = db.prepare('SELECT amount FROM jackpot WHERE id = 1').get();
    if (result.payout >= bet * config.jackpot.triggerMultiplier && jackpot.amount > 10000) {
      jackpotWon = jackpot.amount;
      finalBalance += jackpotWon;
      db.prepare('UPDATE players SET credits = credits + ? WHERE id = ?').run(jackpotWon, player.id);
      db.prepare('UPDATE jackpot SET amount = ?, last_won_by = ?, last_won_at = datetime("now") WHERE id = 1').run(config.jackpot.seedAmount, player.username, player.id);
      db.prepare(`
        INSERT INTO transactions (player_id, type, amount, balance_before, balance_after, description)
        VALUES (?, 'jackpot', ?, ?, ?, 'JACKPOT WIN!')
      `).run(player.id, jackpotWon, balanceAfter + result.payout, finalBalance);
    }
  }

  // Update session stats
  if (sessionId) {
    db.prepare('UPDATE game_sessions SET shots_fired = shots_fired + 1, credits_wagered = credits_wagered + ?, credits_won = credits_won + ? WHERE id = ? AND player_id = ?')
      .run(actualCost, result.killed ? result.payout : 0, sessionId, player.id);
  }

  res.json({
    hit: result.hit,
    killed: result.killed,
    payout: result.payout,
    jackpotWon,
    balance: finalBalance,
    weapon,
    fishId,
  });
});

// ── POST /api/game/session/start ─────────────────────────────
router.post('/session/start', requireAuth, (req, res) => {
  const result = db.prepare('INSERT INTO game_sessions (player_id) VALUES (?)').run(req.player.id);
  res.json({ sessionId: result.lastInsertRowid });
});

// ── POST /api/game/session/end ───────────────────────────────
router.post('/session/end', requireAuth, [
  body('sessionId').isInt(),
], (req, res) => {
  const { sessionId } = req.body;
  db.prepare('UPDATE game_sessions SET ended_at = datetime("now") WHERE id = ? AND player_id = ?').run(sessionId, req.player.id);
  const session = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(sessionId);
  res.json({ session });
});

// ── GET /api/game/leaderboard ────────────────────────────────
router.get('/leaderboard', requireAuth, (req, res) => {
  const leaders = db.prepare(`
    SELECT username, total_won, vip_level, credits
    FROM players
    WHERE status != 'banned' AND is_admin = 0
    ORDER BY total_won DESC LIMIT 20
  `).all();
  res.json({ leaders });
});

// ── GET /api/game/history ────────────────────────────────────
router.get('/history', requireAuth, (req, res) => {
  const history = db.prepare(`
    SELECT type, amount, balance_after, description, fish_id, multiplier, created_at
    FROM transactions WHERE player_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.player.id);
  res.json({ history });
});

// ── GET /api/game/jackpot ────────────────────────────────────
router.get('/jackpot', requireAuth, (req, res) => {
  const jackpot = db.prepare('SELECT amount, last_won_by, last_won_at FROM jackpot WHERE id = 1').get();
  res.json(jackpot);
});

// ── GET /api/game/achievements ───────────────────────────────
router.get('/achievements', requireAuth, (req, res) => {
  const earned = db.prepare('SELECT achievement, earned_at FROM achievements WHERE player_id = ?').all(req.player.id);
  res.json({ achievements: earned });
});

module.exports = router;
