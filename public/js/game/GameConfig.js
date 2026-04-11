// ============================================================
// KirinStorm777 – Client Game Config (mirrors server config.js)
// ============================================================
const GAME_CONFIG = {
  fishDefs: [
    // id, name, hp, multiplier, speed (px/s), color, glowColor, size, emoji, spawnWeight, rare, boss
    { id:'clownfish',  name:'Clown Fish',      hp:1,  mult:2,   spd:130, col:'#FF6B35', glow:'#FF8C00', sz:0.55, em:'🟠', w:30 },
    { id:'smallfish',  name:'Small Fish',      hp:1,  mult:2,   spd:145, col:'#00C8FF', glow:'#00FFFF', sz:0.50, em:'🔵', w:28 },
    { id:'angelfish',  name:'Angel Fish',      hp:2,  mult:3,   spd:100, col:'#FF69B4', glow:'#FF1493', sz:0.60, em:'🌸', w:22 },
    { id:'blowfish',   name:'Blow Fish',       hp:2,  mult:4,   spd:75,  col:'#98FB98', glow:'#00FF7F', sz:0.65, em:'🟢', w:18 },
    { id:'crab',       name:'Crab',            hp:4,  mult:8,   spd:60,  col:'#DC143C', glow:'#FF4500', sz:0.70, em:'🦀', w:14 },
    { id:'pufferfish', name:'Puffer Fish',     hp:5,  mult:10,  spd:65,  col:'#FFD700', glow:'#FFA500', sz:0.75, em:'💛', w:12 },
    { id:'stingray',   name:'Stingray',        hp:6,  mult:12,  spd:95,  col:'#9370DB', glow:'#8A2BE2', sz:0.85, em:'🟣', w:10 },
    { id:'lobster',    name:'Lobster',         hp:7,  mult:15,  spd:55,  col:'#FF4500', glow:'#FF6347', sz:0.80, em:'🦞', w:9  },
    { id:'turtle',     name:'Sea Turtle',      hp:12, mult:25,  spd:50,  col:'#228B22', glow:'#00FF00', sz:1.05, em:'🐢', w:6  },
    { id:'jellyfish',  name:'Jellyfish',       hp:8,  mult:20,  spd:90,  col:'#EE82EE', glow:'#FF00FF', sz:0.95, em:'🪼', w:7  },
    { id:'shark',      name:'Shark',           hp:20, mult:40,  spd:160, col:'#708090', glow:'#B0C4DE', sz:1.25, em:'🦈', w:4  },
    { id:'swordfish',  name:'Sword Fish',      hp:15, mult:35,  spd:185, col:'#4682B4', glow:'#00BFFF', sz:1.15, em:'🐟', w:5  },
    { id:'goldfish',   name:'Golden Fish',     hp:10, mult:50,  spd:105, col:'#FFD700', glow:'#FFD700', sz:0.88, em:'✨', w:3,  rare:true },
    { id:'octopus',    name:'Octopus',         hp:18, mult:60,  spd:95,  col:'#8B008B', glow:'#DA70D6', sz:1.15, em:'🐙', w:2,  rare:true },
    { id:'seahorse',   name:'Royal Seahorse',  hp:6,  mult:45,  spd:55,  col:'#FFD700', glow:'#FFA500', sz:0.65, em:'🐠', w:3,  rare:true },
    { id:'dolphin',    name:'Dolphin',         hp:25, mult:80,  spd:200, col:'#87CEEB', glow:'#00CED1', sz:1.35, em:'🐬', w:2,  rare:true },
    // Bosses
    { id:'firekirin',     name:'Fire Kirin',      hp:200, mult:500,  spd:90,  col:'#FF4500', glow:'#FF0000', sz:2.4, em:'🐉', w:0, boss:true },
    { id:'mermaid',       name:'Mermaid Queen',   hp:150, mult:300,  spd:80,  col:'#00CED1', glow:'#00FFFF', sz:2.1, em:'🧜', w:0, boss:true },
    { id:'thunderdragon', name:'Thunder Dragon',  hp:250, mult:600,  spd:70,  col:'#9B59B6', glow:'#8A2BE2', sz:2.7, em:'⚡', w:0, boss:true },
    { id:'icewhale',      name:'Ice Whale',       hp:300, mult:800,  spd:55,  col:'#00BFFF', glow:'#87CEFA', sz:3.0, em:'🐋', w:0, boss:true },
  ],

  weapons: {
    standard:  { name:'Standard',  dmg:1,   cost:1,   aoe:0,    cd:220,  col:'#00BFFF', pierce:false },
    fishnet:   { name:'Fish Net',  dmg:1.5, cost:3,   aoe:85,   cd:850,  col:'#FFD700', pierce:false },
    torpedo:   { name:'Torpedo',   dmg:5,   cost:10,  aoe:130,  cd:1600, col:'#FF4500', pierce:false },
    laser:     { name:'Laser',     dmg:3,   cost:5,   aoe:0,    cd:90,   col:'#FF00FF', pierce:true  },
    lightning: { name:'Lightning', dmg:2,   cost:8,   aoe:220,  cd:1200, col:'#FFFFFF', pierce:false },
    bomb:      { name:'Bomb',      dmg:8,   cost:20,  aoe:210,  cd:3200, col:'#FF6600', pierce:false },
  },

  vipNames: ['Bronze','Silver','Gold','Platinum','Diamond','Kirin'],

  // Colour palette helpers
  colors: {
    background:  '#020B18',
    water1:      '#0a1f3a',
    water2:      '#041428',
    neonGold:    '#FFD700',
    neonTeal:    '#00FFD1',
    neonOrange:  '#FF6B00',
    neonPurple:  '#9B59B6',
  },

  // Movement patterns
  patterns: {
    linear:    'linear',
    wave:      'wave',
    zigzag:    'zigzag',
    spiral:    'spiral',
    dive:      'dive',
    circle:    'circle',
  },

  // Assign movement pattern by fish id
  fishPatterns: {
    clownfish:  'wave',
    smallfish:  'linear',
    angelfish:  'wave',
    blowfish:   'linear',
    crab:       'zigzag',
    pufferfish: 'linear',
    stingray:   'wave',
    lobster:    'zigzag',
    turtle:     'linear',
    jellyfish:  'dive',
    shark:      'linear',
    swordfish:  'linear',
    goldfish:   'circle',
    octopus:    'spiral',
    seahorse:   'wave',
    dolphin:    'wave',
    firekirin:  'wave',
    mermaid:    'circle',
    thunderdragon: 'zigzag',
    icewhale:   'linear',
  },
};

// Freeze for safety
Object.freeze(GAME_CONFIG);
