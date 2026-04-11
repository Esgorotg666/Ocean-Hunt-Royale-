// ============================================================
// KirinStorm777 – Central Configuration File
// Edit values here to tune gameplay without touching any code.
// ============================================================
module.exports = {
  // ── Server ──────────────────────────────────────────────
  server: {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'KirinStorm777_SuperSecret_ChangeMe_In_Production',
    jwtExpiry: '24h',
    adminUsername: 'admin',
    adminPasswordDefault: 'KirinStorm2026',
  },

  // ── Database ────────────────────────────────────────────
  database: {
    path: './data/kirinstorm.db',
  },

  // ── Credits & Economy ──────────────────────────────────
  credits: {
    newPlayerBonus: 1000,          // Free credits on registration
    dailyLoginBonus: 100,          // Daily login reward
    betLevels: [1, 2, 5, 10, 20, 50, 100],  // Available bet amounts
    creditsPerDollar: 10,          // Display ratio
  },

  // ── RTP (Return to Player) ──────────────────────────────
  rtp: {
    target: 0.94,                  // 94% – tunable 0.92–0.97
    houseEdge: 0.06,
  },

  // ── Progressive Jackpot ─────────────────────────────────
  jackpot: {
    seedAmount: 50000,             // Starting jackpot value
    contributionRate: 0.01,        // 1% of each bet goes to jackpot
    triggerMultiplier: 1000,       // Jackpot triggers if win >= bet * this
  },

  // ── Fish Definitions ────────────────────────────────────
  // hp: shots to kill at bet×1; multiplier: credits returned per bet unit
  // speed: movement speed category; points: base score
  fish: [
    // Small fish
    { id: 'clownfish',   name: 'Clown Fish',     hp: 1,  multiplier: 2,   speed: 'fast',   points: 10,  color: '#FF6B35', glowColor: '#FF8C00', size: 0.6, spawnWeight: 30 },
    { id: 'smallfish',   name: 'Small Fish',     hp: 1,  multiplier: 2,   speed: 'fast',   points: 10,  color: '#00C8FF', glowColor: '#00FFFF', size: 0.55, spawnWeight: 28 },
    { id: 'angelfish',   name: 'Angel Fish',     hp: 2,  multiplier: 3,   speed: 'medium', points: 15,  color: '#FF69B4', glowColor: '#FF1493', size: 0.65, spawnWeight: 22 },
    { id: 'blowfish',    name: 'Blow Fish',      hp: 2,  multiplier: 4,   speed: 'slow',   points: 20,  color: '#98FB98', glowColor: '#00FF7F', size: 0.7,  spawnWeight: 18 },
    // Medium fish
    { id: 'crab',        name: 'Crab',           hp: 4,  multiplier: 8,   speed: 'slow',   points: 40,  color: '#DC143C', glowColor: '#FF4500', size: 0.75, spawnWeight: 14 },
    { id: 'pufferfish',  name: 'Puffer Fish',    hp: 5,  multiplier: 10,  speed: 'slow',   points: 50,  color: '#FFD700', glowColor: '#FFA500', size: 0.8,  spawnWeight: 12 },
    { id: 'stingray',    name: 'Stingray',       hp: 6,  multiplier: 12,  speed: 'medium', points: 60,  color: '#9370DB', glowColor: '#8A2BE2', size: 0.9,  spawnWeight: 10 },
    { id: 'lobster',     name: 'Lobster',        hp: 7,  multiplier: 15,  speed: 'slow',   points: 75,  color: '#FF4500', glowColor: '#FF6347', size: 0.85, spawnWeight: 9 },
    // Large fish
    { id: 'turtle',      name: 'Sea Turtle',     hp: 12, multiplier: 25,  speed: 'slow',   points: 125, color: '#228B22', glowColor: '#00FF00', size: 1.1,  spawnWeight: 6 },
    { id: 'jellyfish',   name: 'Jellyfish',      hp: 8,  multiplier: 20,  speed: 'medium', points: 100, color: '#EE82EE', glowColor: '#FF00FF', size: 1.0,  spawnWeight: 7 },
    { id: 'shark',       name: 'Shark',          hp: 20, multiplier: 40,  speed: 'fast',   points: 200, color: '#708090', glowColor: '#B0C4DE', size: 1.3,  spawnWeight: 4 },
    { id: 'swordfish',   name: 'Sword Fish',     hp: 15, multiplier: 35,  speed: 'vfast',  points: 175, color: '#4682B4', glowColor: '#00BFFF', size: 1.2,  spawnWeight: 5 },
    // Rare fish
    { id: 'goldfish',    name: 'Golden Fish',    hp: 10, multiplier: 50,  speed: 'medium', points: 250, color: '#FFD700', glowColor: '#FFD700', size: 0.9,  spawnWeight: 3, rare: true },
    { id: 'octopus',     name: 'Octopus',        hp: 18, multiplier: 60,  speed: 'medium', points: 300, color: '#8B008B', glowColor: '#DA70D6', size: 1.2,  spawnWeight: 2, rare: true },
    { id: 'seahorse',    name: 'Royal Seahorse', hp: 6,  multiplier: 45,  speed: 'slow',   points: 225, color: '#FFD700', glowColor: '#FFA500', size: 0.7,  spawnWeight: 3, rare: true },
    { id: 'dolphin',     name: 'Dolphin',        hp: 25, multiplier: 80,  speed: 'vfast',  points: 400, color: '#87CEEB', glowColor: '#00CED1', size: 1.4,  spawnWeight: 2, rare: true },
    // Bosses (spawned separately via boss system)
    { id: 'firekirin',   name: 'Fire Kirin',     hp: 200, multiplier: 500, speed: 'medium', points: 5000, color: '#FF4500', glowColor: '#FF0000', size: 2.5,  spawnWeight: 0, boss: true },
    { id: 'mermaid',     name: 'Mermaid Queen',  hp: 150, multiplier: 300, speed: 'medium', points: 3000, color: '#00CED1', glowColor: '#00FFFF', size: 2.2,  spawnWeight: 0, boss: true },
    { id: 'thunderdragon', name: 'Thunder Dragon', hp: 250, multiplier: 600, speed: 'slow', points: 6000, color: '#9B59B6', glowColor: '#8A2BE2', size: 2.8,  spawnWeight: 0, boss: true },
    { id: 'icewhale',    name: 'Ice Whale',      hp: 300, multiplier: 800, speed: 'slow',  points: 8000, color: '#00BFFF', glowColor: '#87CEFA', size: 3.0,  spawnWeight: 0, boss: true },
  ],

  // ── Weapon Definitions ──────────────────────────────────
  weapons: {
    standard:  { name: 'Standard',  damage: 1,   cost: 1,   aoe: 0,    cooldown: 250 },
    fishnet:   { name: 'Fish Net',  damage: 1.5, cost: 3,   aoe: 80,   cooldown: 800 },
    torpedo:   { name: 'Torpedo',   damage: 5,   cost: 10,  aoe: 120,  cooldown: 1500 },
    laser:     { name: 'Laser',     damage: 3,   cost: 5,   aoe: 0,    cooldown: 100, penetrating: true },
    lightning: { name: 'Lightning', damage: 2,   cost: 8,   aoe: 200,  cooldown: 1200, chain: 5 },
    bomb:      { name: 'Bomb',      damage: 8,   cost: 20,  aoe: 200,  cooldown: 3000 },
  },

  // ── Spawn Settings ──────────────────────────────────────
  spawn: {
    normalWaveDuration: 480000,   // 8 minutes between boss rounds
    bossRoundDuration: 120000,    // 2-minute boss window
    baseSpawnRate: 1800,          // ms between fish spawns
    maxFishOnScreen: 25,
    schoolChance: 0.15,           // 15% chance of school spawn
    schoolSize: [3, 7],           // min/max fish in a school
    rareChance: 0.06,             // 6% chance of rare spawn
  },

  // ── VIP Levels ──────────────────────────────────────────
  vip: [
    { level: 0, name: 'Bronze',   threshold: 0,       bonusRate: 0 },
    { level: 1, name: 'Silver',   threshold: 10000,   bonusRate: 0.02 },
    { level: 2, name: 'Gold',     threshold: 50000,   bonusRate: 0.05 },
    { level: 3, name: 'Platinum', threshold: 200000,  bonusRate: 0.10 },
    { level: 4, name: 'Diamond',  threshold: 1000000, bonusRate: 0.15 },
    { level: 5, name: 'Kirin',    threshold: 5000000, bonusRate: 0.20 },
  ],
};
