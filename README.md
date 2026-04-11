# 🐉 KirinStorm777 – Fish Shooting Arcade Game

A complete, production-ready fish-table arcade game inspired by Fire Kirin and VBlink.777.  
Zero external dependencies. Runs entirely on Node.js with SQLite.

---

## 🚀 Quick Start (1-Click Setup)

```bash
# 1. Install dependencies
npm install

# 2. Start development server (auto-reload)
npm run dev

# 3. Open in browser
# Game:  http://localhost:3000
# Admin: http://localhost:3000/admin
```

---

## 🔐 Default Credentials

| Role  | Username | Password        |
|-------|----------|-----------------|
| Admin | admin    | KirinStorm2026  |

> Change admin password from the Admin Panel → Players → Manage Admin → Reset Password

---

## 📁 Folder Structure

```
KirinStorm777/
├── server.js              ← Express + Socket.io server
├── config.js              ← ALL game parameters (RTP, fish values, etc.)
├── package.json
├── .env.example           ← Copy to .env and set JWT_SECRET
├── database/
│   └── db.js              ← SQLite schema + auto-seed
├── routes/
│   ├── auth.js            ← Login / Register / JWT
│   ├── game.js            ← Shoot / Sessions / Leaderboard
│   └── admin.js           ← Full admin CRUD
├── middleware/
│   ├── auth.js            ← JWT middleware
│   └── rateLimiter.js     ← Anti-bot rate limiting
└── public/
    ├── login.html         ← Login / Register page
    ├── game.html          ← Main game (Phaser 3)
    ├── admin.html         ← Admin dashboard
    └── js/game/
        ├── main.js        ← Phaser boot
        ├── GameConfig.js  ← Client-side fish/weapon defs
        ├── scenes/
        │   ├── BootScene.js    ← Texture generation
        │   ├── PreloadScene.js ← Loading screen
        │   ├── GameScene.js    ← Core gameplay
        │   └── UIScene.js      ← HUD overlay
        ├── entities/
        │   ├── Fish.js    ← All fish types
        │   ├── Boss.js    ← Epic bosses
        │   ├── Cannon.js  ← Player cannon
        │   └── Bullet.js  ← Projectiles
        └── systems/
            ├── FishSpawner.js    ← Wave management
            ├── ParticleManager.js ← All visual FX
            └── NetworkManager.js  ← API + Socket.io
```

---

## ⚙️ Configuration (config.js)

Edit `config.js` to tune without touching any game code:

```js
rtp: { target: 0.94 }          // RTP: 0.92–0.97
jackpot: { seedAmount: 50000 } // Starting jackpot pool
credits: { newPlayerBonus: 1000 } // Welcome credits
spawn: { baseSpawnRate: 1800 } // ms between fish spawns
```

---

## 🐟 Fish Types & Multipliers

| Category | Fish          | Multiplier | HP  |
|----------|---------------|-----------|-----|
| Small    | Clown Fish    | 2×        | 1   |
| Small    | Angel Fish    | 3×        | 2   |
| Small    | Blow Fish     | 4×        | 2   |
| Medium   | Crab          | 8×        | 4   |
| Medium   | Puffer Fish   | 10×       | 5   |
| Medium   | Stingray      | 12×       | 6   |
| Medium   | Lobster       | 15×       | 7   |
| Large    | Sea Turtle    | 25×       | 12  |
| Large    | Jellyfish     | 20×       | 8   |
| Large    | Shark         | 40×       | 20  |
| Rare ✨  | Golden Fish   | 50×       | 10  |
| Rare ✨  | Octopus       | 60×       | 18  |
| Rare ✨  | Dolphin       | 80×       | 25  |
| Boss 🔥  | Fire Kirin    | 500×      | 200 |
| Boss 🔥  | Mermaid Queen | 300×      | 150 |
| Boss ⚡  | Thunder Dragon| 600×      | 250 |
| Boss 🐋  | Ice Whale     | 800×      | 300 |

---

## 🔫 Weapons

| Weapon    | Damage | Cost | AOE | Cooldown |
|-----------|--------|------|-----|----------|
| Standard  | 1×     | 1×   | —   | 220ms    |
| Fish Net  | 1.5×   | 3×   | 85  | 850ms    |
| Torpedo   | 5×     | 10×  | 130 | 1600ms   |
| Laser     | 3×     | 5×   | —   | 90ms     |
| Lightning | 2×     | 8×   | 220 | 1200ms   |
| Bomb      | 8×     | 20×  | 210 | 3200ms   |

---

## 🗄️ Database Schema

**players** – id, uuid, username, password, email, credits, total_wagered, total_won, vip_level, status, is_admin, last_login, daily_bonus_date, created_at

**transactions** – id, player_id, type (bet/win/bonus/admin_add/admin_remove/jackpot), amount, balance_before, balance_after, description, fish_id, weapon, multiplier, created_at

**game_sessions** – id, player_id, shots_fired, fish_killed, credits_wagered, credits_won, started_at, ended_at

**jackpot** – id, amount, last_won_by, last_won_at

**achievements** – id, player_id, achievement, earned_at

---

## 👑 Admin Panel Features

- **Dashboard**: Real-time stats (players, wagered, house profit, jackpot pool)
- **Players**: Search, filter, view full history
- **Manage Player**: Add/remove any credits, ban/unban, reset password
- **Transactions**: Full log with CSV export
- **Jackpot**: Set jackpot amount manually
- **Create Player**: Instant account creation with starting credits

---

## 🔒 Security

- bcrypt (cost 12) password hashing
- JWT HS256, 24h expiry
- Rate limiting: auth (20/15min), game shots (20/sec), API (200/min)
- Helmet.js security headers
- Input sanitization via express-validator
- Server-side shot validation (no client-side cheating)
- All RNG server-side seeded

---

## 📈 Scaling Notes

1. **Single VPS** (≤500 concurrent): this setup runs fine as-is.
2. **Horizontal scaling**: Replace SQLite with PostgreSQL (change `better-sqlite3` → `pg`, update `db.js`).
3. **4-player table mode**: Uncomment Socket.io room code in `server.js` and add `table:join` events in `NetworkManager.js`.
4. **CDN assets**: Move `/public/assets/` to S3/CloudFront; update paths in `GameConfig.js`.

---

## 🎨 Asset Generation Prompts (Midjourney / Grok Imagine)

For professional boss sprites, use these exact prompts:

**Fire Kirin Dragon:**
> `2K PNG sprite, Fire Kirin dragon fish, fantasy underwater game character, glowing orange and red scales, golden horns, transparent background, side view, ultra-detailed, neon glow, game art style`

**Mermaid Queen:**
> `2K PNG sprite, Mermaid Queen boss character, turquoise and gold color scheme, glowing crown, transparent background, side view, fantasy ocean game, ultra-detailed neon glow`

**Thunder Dragon:**
> `2K PNG sprite, Thunder Dragon sea monster boss, purple and white lightning scales, glowing yellow eyes, transparent background, side view, epic fantasy game art, ultra-detailed`

---

## 🎵 Recommended Free Sound Assets

| Sound         | Source                        | Filename              |
|---------------|-------------------------------|-----------------------|
| Underwater BGM| freesound.org #414658         | underwater_loop.ogg   |
| Cannon fire   | freesound.org #146725         | cannon_shot.wav       |
| Fish die      | freesound.org #341695         | splash_pop.wav        |
| Big win       | freesound.org #270402         | fanfare_win.wav       |
| Boss appear   | freesound.org #399934         | boss_roar.wav         |
| Coin collect  | freesound.org #341695         | coins.wav             |

Drop `.ogg`/`.wav` files into `/public/assets/sounds/` and wire up in `PreloadScene.js`.

---

## 📝 License

MIT – Free for personal and commercial use.

---

*Built with ❤️ using Phaser 3 · Node.js · SQLite · Socket.io*
