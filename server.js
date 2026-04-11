// ============================================================
// KirinStorm777 – Main Server
// Node.js 20+ | Express | SQLite | Socket.io | JWT
// ============================================================
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const path       = require('path');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

const config     = require('./config');
const db         = require('./database/db');
const { apiLimiter, authLimiter, gameLimiter } = require('./middleware/rateLimiter');

const authRoutes  = require('./routes/auth');
const gameRoutes  = require('./routes/game');
const adminRoutes = require('./routes/admin');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ── Security & Middleware ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net"],
      fontSrc:    ["'self'", "fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    }
  }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',  authLimiter,  authRoutes);
app.use('/api/game',  gameLimiter,  gameRoutes);
app.use('/api/admin', apiLimiter,   adminRoutes);

// ── Serve HTML pages ─────────────────────────────────────────
app.get('/',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/game',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ── Socket.io – Real-time Events ─────────────────────────────
// Jackpot ticker: broadcasts current jackpot every 5 seconds
setInterval(() => {
  const jackpot = db.prepare('SELECT amount FROM jackpot WHERE id = 1').get();
  if (jackpot) io.emit('jackpot:update', { amount: jackpot.amount });
}, 5000);

// Online player count
const onlinePlayers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const payload = jwt.verify(token, config.server.jwtSecret);
    socket.playerId   = payload.id;
    socket.playerName = payload.username;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  onlinePlayers.set(socket.playerId, socket.playerName);
  io.emit('players:online', { count: onlinePlayers.size });
  console.log(`[Socket] ${socket.playerName} connected  (${onlinePlayers.size} online)`);

  socket.on('disconnect', () => {
    onlinePlayers.delete(socket.playerId);
    io.emit('players:online', { count: onlinePlayers.size });
    console.log(`[Socket] ${socket.playerName} disconnected (${onlinePlayers.size} online)`);
  });

  // ── Big-win broadcast (triggered by game route via socket) ─
  socket.on('game:bigwin', ({ fishName, amount, playerName }) => {
    io.emit('game:bigwin', { fishName, amount, playerName });
  });
});

// Expose io to routes
app.set('io', io);

// ── 404 & Error Handling ─────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────
const PORT = config.server.port;
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🐉  KirinStorm777 Server  🐉            ║');
  console.log(`║   http://localhost:${PORT}                  ║`);
  console.log(`║   Admin: http://localhost:${PORT}/admin     ║`);
  console.log('║   Default: admin / KirinStorm2026         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

module.exports = { app, io };
