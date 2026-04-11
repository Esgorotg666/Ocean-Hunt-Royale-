// ============================================================
// GameScene – Core gameplay: ocean, fish, cannon, bullets, FX
// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.playerData = data.player || { username: 'Guest', credits: 1000 };
    this.jackpot    = data.jackpot || 50000;
    this.credits    = this.playerData.credits;
    this.score      = 0;
    this.betLevel   = 1;
    this.weapon     = 'standard';
    this.autoFire   = false;
    this.lastShot   = 0;
    this.lastAutoAim = null;
    this.sessionId  = null;
    this.combo      = 0;
    this.comboTimer = null;
    this._shootCooldown = 0;
  }

  create() {
    const { width, height } = this.scale;

    // ── Networking ──────────────────────────────────────────
    this.net = new NetworkManager();
    this.net.init().then(()=>{ this.sessionId = this.net.sessionId; });
    window.particleManager = new ParticleManager(this);

    // ── Background layers ───────────────────────────────────
    this._buildOceanBG();

    // ── Groups ──────────────────────────────────────────────
    this.fishGroup   = this.add.group();
    this.bossGroup   = this.add.group();
    this.bulletGroup = this.add.group();

    // ── Cannon ──────────────────────────────────────────────
    this.cannon = new Cannon(this, width / 2, height - 28);

    // ── Spawner ─────────────────────────────────────────────
    this.spawner = new FishSpawner(this);
    this.spawner.start();

    // ── Water surface ────────────────────────────────────────
    this._buildWaterSurface();

    // ── Bubbles ──────────────────────────────────────────────
    this._startBubbles();

    // ── UI HUD update ────────────────────────────────────────
    this._updateHUD();

    // ── Input ────────────────────────────────────────────────
    this._setupInput();

    // ── Listen to game events from HTML ──────────────────────
    this.game.events.on('weapon:change', (w) => { this.weapon = w; this.cannon.changeWeapon(w); });
    this.game.events.on('bet:change',    (b) => { this.betLevel = b; });
    this.game.events.on('manual:fire',   ()  => { this._fireAtBestTarget(); });
    this.game.events.on('autofire:toggle', (on) => { this.autoFire = on; });

    // ── Boss events ───────────────────────────────────────────
    this.events.on('boss:spawn', (def) => { /* handled in spawner */ });

    // ── Page visibility (pause on tab hide) ──────────────────
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.scene.pause();
      else this.scene.resume();
    });

    console.log('[Game] Scene started for', this.playerData.username);
  }

  // ── Update loop ──────────────────────────────────────────
  update(time, delta) {
    this._updateOceanBG(delta);
    this._updateBubbles(delta);

    // Cannon aim at pointer
    const p = this.input.activePointer;
    if (p.isDown || this.autoFire) {
      this.cannon.aimAt(p.x, p.y);
    }

    // Update fish
    const allFish = [...this.fishGroup.getChildren(), ...this.bossGroup.getChildren()];
    for (const fish of allFish) { if (fish && fish.active) fish.update(delta); }

    // Update bullets
    const bullets = this.bulletGroup.getChildren();
    for (const b of bullets) { if (b && b.active) b.update(delta); }

    // Collision detection
    this._checkCollisions();

    // Auto-fire
    if (this.autoFire) {
      this._shootCooldown -= delta;
      if (this._shootCooldown <= 0) {
        this._fireAtBestTarget();
      }
    }

    // Water caustic animation
    if (this.causticSprites) {
      this._causticFrame = ((this._causticFrame || 0) + delta / 220) % 4;
      this.causticSprites.forEach((s, i) => {
        s.setTexture('caustic' + Math.floor(this._causticFrame));
        s.setAlpha(0.06 + Math.sin(Date.now() / 1400 + i) * 0.02);
      });
    }
  }

  // ── Ocean background ────────────────────────────────────
  _buildOceanBG() {
    const { width, height } = this.scale;

    // Deep gradient background
    const bg = this.add.graphics().setDepth(-10);
    for (let y = 0; y < height; y += 2) {
      const t = y / height;
      const r = Math.round(Phaser.Math.Linear(0x02, 0x00, t));
      const g = Math.round(Phaser.Math.Linear(0x0B, 0x03, t));
      const b = Math.round(Phaser.Math.Linear(0x18, 0x0a, t));
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      bg.fillRect(0, y, width, 2);
    }

    // Parallax mid layer (darker teal shapes = underwater formations)
    this.midBG = this.add.graphics().setDepth(-9);
    this._drawMidBG(this.midBG);

    // Caustic light patches (tiling)
    this.causticSprites = [];
    for (let i = 0; i < 6; i++) {
      const cs = this.add.image(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height * 0.7),
        'caustic0'
      ).setAlpha(0.07).setScale(4 + Math.random() * 4).setDepth(-7);
      this.causticSprites.push(cs);
    }

    // Seafloor coral silhouettes
    this._buildSeafloor();

    // Parallax scroll amounts
    this._bgScrollX = 0;
    this._bgScrollSpeed = 0.3;
  }

  _drawMidBG(g) {
    const { width, height } = this.scale;
    g.clear();
    // Volumetric light rays
    for (let i = 0; i < 8; i++) {
      const lx = (width / 8) * i + width / 16;
      const alpha = 0.03 + Math.random() * 0.04;
      g.fillStyle(0x00aaff, alpha);
      g.fillTriangle(lx, 0, lx - 40, height * 0.6, lx + 40, height * 0.6);
    }
    // Distant rock silhouettes
    for (let i = 0; i < 5; i++) {
      const rx = (width / 5) * i + Phaser.Math.Between(-30, 30);
      const rh = Phaser.Math.Between(50, 130);
      g.fillStyle(0x011020, 0.7);
      g.fillEllipse(rx, height - rh / 2, Phaser.Math.Between(60, 120), rh);
    }
  }

  _buildSeafloor() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(-8);

    // Seafloor base
    g.fillStyle(0x010e1f, 1);
    g.fillRect(0, height - 22, width, 22);
    g.fillStyle(0x02152b, 1);
    g.fillRect(0, height - 18, width, 18);

    // Sand detail
    g.fillStyle(0x1a3a50, 0.5);
    for (let x = 0; x < width; x += Phaser.Math.Between(18, 40)) {
      g.fillEllipse(x, height - 14, Phaser.Math.Between(15, 35), 8);
    }

    // Coral
    const coralColors = [0xFF4500, 0xFF69B4, 0xFF8C00, 0x00CED1, 0x9370DB];
    for (let i = 0; i < 14; i++) {
      const cx = (width / 14) * i + Phaser.Math.Between(-15, 15);
      const ch = Phaser.Math.Between(18, 45);
      const cc = coralColors[i % coralColors.length];
      g.fillStyle(cc, 0.7);
      // Main stalk
      g.fillRect(cx - 2, height - 18 - ch, 4, ch);
      // Branches
      g.fillEllipse(cx, height - 18 - ch, 22, 14);
      g.fillEllipse(cx - 12, height - 18 - ch * 0.6, 14, 10);
      g.fillEllipse(cx + 12, height - 18 - ch * 0.6, 14, 10);
    }

    // Seaweed
    for (let i = 0; i < 10; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sh = Phaser.Math.Between(30, 70);
      g.fillStyle(0x00aa44, 0.5);
      for (let j = 0; j < sh; j += 8) {
        const ox = Math.sin(j * 0.25) * 8;
        g.fillEllipse(sx + ox, height - 18 - j, 8, 12);
      }
    }
  }

  _updateOceanBG(delta) {
    // Parallax scroll the mid layer
    this._bgScrollX = (this._bgScrollX + this._bgScrollSpeed * delta / 16) % 100;
    if (this.midBG) this.midBG.x = -this._bgScrollX;

    // Light ray animation
    if (this._rayTimer) {
      this._rayTimer -= delta;
    } else {
      this._rayTimer = 3000 + Math.random() * 4000;
      this._drawMidBG(this.midBG);
    }
  }

  _buildWaterSurface() {
    const { width } = this.scale;
    this.waterSurface = this.add.graphics().setDepth(2);
    this._waterT = 0;
    this._drawWaterSurface();
  }

  _drawWaterSurface() {
    const { width } = this.scale;
    const g = this.waterSurface;
    g.clear();
    // Animated wavy top edge
    g.lineStyle(2, 0x00aaff, 0.3);
    g.beginPath();
    g.moveTo(0, 12);
    for (let x = 0; x <= width; x += 8) {
      const y = 10 + Math.sin((x / 60 + this._waterT) * Math.PI * 2) * 4;
      g.lineTo(x, y);
    }
    g.strokePath();
    // Subtle surface sheen
    g.fillStyle(0x003366, 0.08);
    g.fillRect(0, 0, width, 18);
  }

  _startBubbles() {
    this.bubbles = [];
    const { width, height } = this.scale;
    this.time.addEvent({
      delay: 800,
      callback: () => {
        if (this.bubbles.length > 30) return;
        const b = this.add.image(
          Phaser.Math.Between(20, width - 20),
          height - 30,
          'bubble'
        ).setDepth(3).setAlpha(Phaser.Math.FloatBetween(0.3, 0.7))
         .setScale(Phaser.Math.FloatBetween(0.5, 1.8));
        b._vy = Phaser.Math.FloatBetween(30, 80);
        b._vx = Phaser.Math.FloatBetween(-12, 12);
        b._wobble = Math.random() * Math.PI * 2;
        this.bubbles.push(b);
      },
      loop: true,
    });
  }

  _updateBubbles(delta) {
    const dt = delta / 1000;
    this._waterT += dt * 0.3;
    if (this.waterSurface) this._drawWaterSurface();

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (!b || !b.active) { this.bubbles.splice(i, 1); continue; }
      b._wobble += dt * 2.5;
      b.x += Math.sin(b._wobble) * 0.6;
      b.y -= b._vy * dt;
      b.setAlpha(b.alpha - 0.003);
      if (b.y < -20 || b.alpha <= 0) {
        b.destroy();
        this.bubbles.splice(i, 1);
      }
    }
  }

  // ── Input ─────────────────────────────────────────────────
  _setupInput() {
    const { width, height } = this.scale;

    // Pointer (mouse + touch)
    this.input.on('pointerdown', (ptr) => {
      // Don't fire if clicking on HUD/controls areas
      if (ptr.y < 50 || ptr.y > height - 60) return;
      this.cannon.aimAt(ptr.x, ptr.y);
      this._shootAt(ptr.x, ptr.y);
    });

    this.input.on('pointermove', (ptr) => {
      if (ptr.isDown) {
        if (ptr.y < 50 || ptr.y > this.scale.height - 60) return;
        this.cannon.aimAt(ptr.x, ptr.y);
      }
    });
  }

  // ── Fire at explicit coordinates ─────────────────────────
  _shootAt(tx, ty) {
    const now = Date.now();
    const wDef = GAME_CONFIG.weapons[this.weapon];
    if (!wDef) return;

    const cd = wDef.cd;
    if (now - this.lastShot < cd) return;
    this.lastShot = now;
    this._shootCooldown = cd;

    const cost = this.betLevel * wDef.cost;
    if (this.credits < cost) {
      if (typeof showGameToast === 'function') showGameToast('❌ Not enough credits!');
      return;
    }

    // Deduct locally (server will confirm)
    this.credits -= cost;
    this._updateHUD();

    // Spawn bullet
    const mp   = this.cannon.getMuzzlePos();
    const bull = new Bullet(this, mp.x, mp.y, tx, ty, this.weapon);
    this.bulletGroup.add(bull, true);
    this.cannon.fire();

    // Server validation (async, non-blocking)
    const nearestFish = this._findFishAt(tx, ty, 120);
    if (nearestFish) {
      this.net.shoot(nearestFish.def.id, this.betLevel, this.weapon, 0)
        .then(result => { this._handleShotResult(result, nearestFish, tx, ty); })
        .catch(() => {});
    }

    // Weapon special effects
    if (this.weapon === 'lightning' || this.weapon === 'fishnet' || this.weapon === 'bomb') {
      this.time.delayedCall(wDef.cd * 0.8, () => {
        this._aoeEffect(tx, ty, wDef.aoe);
      });
    }
  }

  _shootAtBestTarget_internal(tx, ty) { this._shootAt(tx, ty); }

  _fireAtBestTarget() {
    // Prioritise bosses > rares > nearest
    const allFish = [
      ...this.bossGroup.getChildren().filter(f => f && f.active && f.isAlive && f.isAlive()),
      ...this.fishGroup.getChildren().filter(f => f && f.active && f.isAlive && f.isAlive()),
    ];
    if (allFish.length === 0) {
      // Fire forward if no targets
      this._shootAt(this.cannon.x, 100);
      return;
    }
    // Pick highest-value visible fish
    allFish.sort((a, b) => (b.def.mult || 0) - (a.def.mult || 0));
    const target = allFish[0];
    this._shootAt(target.x, target.y);
  }

  // ── Shot result handler ──────────────────────────────────
  _handleShotResult(result, fish, tx, ty) {
    if (!result.ok) {
      // Server rejected – restore credit (approx)
      return;
    }

    // Server is authoritative for credits
    this.credits = result.balance;
    this._updateHUD();

    if (result.hit && fish && fish.isAlive && fish.isAlive()) {
      const wDef = GAME_CONFIG.weapons[this.weapon];
      const killed = fish.takeDamage(wDef ? wDef.dmg : 1);

      // Hit FX
      const col = Phaser.Display.Color.HexStringToColor(fish.def.col || '#00BFFF').color;
      window.particleManager.hitSparks(fish.x, fish.y, col);

      if (result.killed || killed) {
        this._onFishKilled(fish, result.payout, tx, ty);
      }
    }

    if (result.jackpotWon > 0) {
      window.particleManager.jackpotFlash(this.scale.width / 2, this.scale.height / 2);
      if (typeof showBigWin === 'function') showBigWin(fish ? fish.def.name : 'JACKPOT', result.jackpotWon, '🏆');
    }
  }

  _onFishKilled(fish, payout, tx, ty) {
    const def = fish.def;

    // FX
    window.particleManager.fishExplosion(fish.x, fish.y, def.col, def.boss ? 80 : 45);
    window.particleManager.coins(fish.x, fish.y, payout);
    window.particleManager.winText(fish.x, fish.y, payout, def.boss);

    // Score
    this.score += def.points || 0;
    this.combo++;
    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => { this.combo = 0; }, 3000);

    // Big win check
    if (payout >= 200 && typeof showBigWin === 'function') {
      showBigWin(def.name, payout, def.em || '🐟');
    } else if (payout > 0 && typeof showGameToast === 'function') {
      showGameToast(`${def.em || '🐟'} ${def.name} +${payout}`);
    }

    // Boss death
    if (def.boss) {
      this.spawner.onBossDead();
      window.particleManager.bigExplosion(fish.x, fish.y);
    }

    this._updateHUD();

    // Broadcast big win to others (Socket.io)
    if (payout >= 500 && this.net.socket) {
      this.net.socket.emit('game:bigwin', {
        fishName: def.name, amount: payout,
        playerName: this.playerData.username,
      });
    }
  }

  // ── Collision detection ──────────────────────────────────
  _checkCollisions() {
    const bullets = this.bulletGroup.getChildren();
    const allFish = [
      ...this.bossGroup.getChildren(),
      ...this.fishGroup.getChildren(),
    ];

    for (const bullet of bullets) {
      if (!bullet || !bullet.active || bullet.isDead) continue;

      for (const fish of allFish) {
        if (!fish || !fish.active || fish.isDead) continue;

        const fishBounds   = fish.getBounds();
        const bulletRadius = bullet.getRadius();
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, fishBounds.x, fishBounds.y);

        if (dist < fishBounds.radius + bulletRadius) {
          // Hit! Let server resolve outcome (already done in _shootAt)
          // Local visual hit:
          const col = Phaser.Display.Color.HexStringToColor(fish.def.col || '#00BFFF').color;
          window.particleManager.hitSparks(bullet.x, bullet.y, col);

          // For laser: pierce through
          if (!bullet.isPiercing()) { bullet._kill(); }

          // AOE splash
          if (bullet.getAoeRadius() > 0) {
            this._aoeEffect(bullet.x, bullet.y, bullet.getAoeRadius());
          }

          if (bullet.isPiercing()) continue; // laser keeps going
          break;
        }
      }
    }
  }

  _aoeEffect(cx, cy, radius) {
    if (radius <= 0) return;
    const col = GAME_CONFIG.weapons[this.weapon]?.col || '#FFD700';
    window.particleManager.aoeRing(cx, cy, radius,
      Phaser.Display.Color.HexStringToColor(col).color);

    // Damage all fish in AOE radius
    const allFish = [
      ...this.bossGroup.getChildren(),
      ...this.fishGroup.getChildren(),
    ];
    for (const fish of allFish) {
      if (!fish || !fish.active || fish.isDead) continue;
      const d = Phaser.Math.Distance.Between(cx, cy, fish.x, fish.y);
      if (d < radius) {
        const col2 = Phaser.Display.Color.HexStringToColor(fish.def.col || '#00BFFF').color;
        window.particleManager.hitSparks(fish.x, fish.y, col2);
        fish.takeDamage(0.5); // AOE splash damage (visual only, server is authoritative)
      }
    }
  }

  _findFishAt(x, y, maxDist = 100) {
    const allFish = [
      ...this.bossGroup.getChildren().filter(f => f && f.active && !f.isDead),
      ...this.fishGroup.getChildren().filter(f => f && f.active && !f.isDead),
    ];
    let best = null, bestDist = maxDist;
    for (const fish of allFish) {
      const d = Phaser.Math.Distance.Between(x, y, fish.x, fish.y);
      if (d < bestDist) { bestDist = d; best = fish; }
    }
    return best;
  }

  // ── HUD ──────────────────────────────────────────────────
  _updateHUD() {
    if (typeof updateHUD === 'function') updateHUD(this.credits, this.score);
  }
}

window.GameScene = GameScene;
