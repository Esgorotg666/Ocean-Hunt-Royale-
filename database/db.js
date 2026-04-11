const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('../config');

const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(config.database.path);

// Enable WAL for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid        TEXT    NOT NULL UNIQUE,
    username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT    NOT NULL,
    email       TEXT    UNIQUE,
    credits     REAL    NOT NULL DEFAULT 0,
    total_wagered REAL  NOT NULL DEFAULT 0,
    total_won   REAL    NOT NULL DEFAULT 0,
    vip_level   INTEGER NOT NULL DEFAULT 0,
    status      TEXT    NOT NULL DEFAULT 'active',  -- active | banned | vip
    is_admin    INTEGER NOT NULL DEFAULT 0,
    last_login  TEXT,
    daily_bonus_date TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id),
    type        TEXT    NOT NULL,  -- bet | win | bonus | admin_add | admin_remove | jackpot
    amount      REAL    NOT NULL,
    balance_before REAL NOT NULL,
    balance_after  REAL NOT NULL,
    description TEXT,
    fish_id     TEXT,
    weapon      TEXT,
    multiplier  REAL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id),
    shots_fired INTEGER NOT NULL DEFAULT 0,
    fish_killed INTEGER NOT NULL DEFAULT 0,
    credits_wagered REAL NOT NULL DEFAULT 0,
    credits_won REAL NOT NULL DEFAULT 0,
    started_at  TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS jackpot (
    id      INTEGER PRIMARY KEY CHECK (id = 1),
    amount  REAL NOT NULL DEFAULT 50000,
    last_won_by TEXT,
    last_won_at TEXT
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id),
    achievement TEXT    NOT NULL,
    earned_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(player_id, achievement)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(created_at);
  CREATE INDEX IF NOT EXISTS idx_game_sessions_player ON game_sessions(player_id);
`);

// ── Seed jackpot if empty ────────────────────────────────────
const jackpotRow = db.prepare('SELECT id FROM jackpot WHERE id = 1').get();
if (!jackpotRow) {
  db.prepare('INSERT INTO jackpot (id, amount) VALUES (1, ?)').run(config.jackpot.seedAmount);
}

// ── Seed admin account ───────────────────────────────────────
const adminExists = db.prepare('SELECT id FROM players WHERE username = ?').get(config.server.adminUsername);
if (!adminExists) {
  const hash = bcrypt.hashSync(config.server.adminPasswordDefault, 12);
  const { v4: uuidv4 } = require('uuid');
  db.prepare(`
    INSERT INTO players (uuid, username, password, credits, is_admin, status)
    VALUES (?, ?, ?, ?, 1, 'active')
  `).run(uuidv4(), config.server.adminUsername, hash, 999999);
  console.log(`[DB] Admin account created: ${config.server.adminUsername} / ${config.server.adminPasswordDefault}`);
}

module.exports = db;
