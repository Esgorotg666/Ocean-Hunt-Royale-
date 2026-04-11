// ============================================================
// Boss Entity – Epic boss with phase behaviour & HP shield
// ============================================================
class Boss extends Phaser.GameObjects.Container {
  constructor(scene, def) {
    const { width, height } = scene.scale;
    const side = Math.random() < 0.5;
    super(scene, side ? -200 : width + 200, height * 0.35 + Math.random() * height * 0.25);

    this.def      = def;
    this.fromLeft = side;
    this.hp       = def.hp;
    this.maxHp    = def.hp;
    this.isDead   = false;
    this.phase    = 1;  // 1 = entering, 2 = patrolling, 3 = enraged (<30% HP)
    this.speed    = def.spd;
    this.angle_t  = 0;
    this.baseY    = this.y;
    this.targetX  = side ? width * 0.65 : width * 0.35;
    this._hitFlash = 0;

    this._build();
    scene.add.existing(this);
    this.setDepth(15);
  }

  _build() {
    const sz = this.def.sz * 36;
    const col = Phaser.Display.Color.HexStringToColor(this.def.col);

    // Outer glow
    this.outerGlow = this.scene.add.graphics();
    this.add(this.outerGlow);

    // Body
    this.bodyGfx = this.scene.add.graphics();
    this._drawBossBody(this.bodyGfx, sz, col);
    this.add(this.bodyGfx);

    // HP shield ring
    this.shieldGfx = this.scene.add.graphics();
    this.add(this.shieldGfx);

    // Big emoji
    this.emoji = this.scene.add.text(0, 0, this.def.em || '🐉', {
      fontSize: `${Math.round(sz * 1.8)}px`,
    }).setOrigin(0.5).setAlpha(0.85);
    this.add(this.emoji);

    // Name
    this.nameLabel = this.scene.add.text(0, -(sz * 1.2), this.def.name.toUpperCase(), {
      fontFamily: 'Orbitron, monospace',
      fontSize: '15px', fontStyle: 'bold',
      color: '#FFD700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 1);
    this.add(this.nameLabel);

    // Multiplier badge
    this.multLabel = this.scene.add.text(0, sz * 1.2 + 14, `×${this.def.mult}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: '13px', color: '#FF6600',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0);
    this.add(this.multLabel);

    // HP bar
    const barW = sz * 2.2;
    this.hpBgBar = this.scene.add.rectangle(0, sz + 4, barW, 8, 0x000000, 0.8).setOrigin(0.5);
    this.hpBarFg = this.scene.add.rectangle(-barW / 2, sz + 4, barW, 8, 0x00ff66, 1).setOrigin(0, 0.5);
    this.add(this.hpBgBar);
    this.add(this.hpBarFg);

    if (!this.fromLeft) this.setScale(-1, 1);
  }

  _drawBossBody(g, sz, col) {
    const r = col.color;
    // Main body
    g.fillStyle(r, 1);
    g.fillEllipse(0, 0, sz * 2.8, sz * 1.8);
    // Highlights
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(0, -sz * 0.2, sz * 2, sz);
    // Tail / fins
    g.fillStyle(r, 0.8);
    g.fillTriangle(-sz * 1.4, 0, -sz * 0.8, -sz * 0.9, -sz * 0.8, sz * 0.9);
    g.fillTriangle(sz * 0.2, -sz * 0.5, sz * 0.9, -sz * 1.4, sz * 0.7, -sz * 0.2);
    // Eye
    g.fillStyle(0xffffff, 1);
    g.fillCircle(sz * 0.7, -sz * 0.15, sz * 0.22);
    g.fillStyle(0xff0000, 1);
    g.fillCircle(sz * 0.73, -sz * 0.15, sz * 0.11);
    g.fillStyle(0x000000, 1);
    g.fillCircle(sz * 0.75, -sz * 0.14, sz * 0.05);
    // Spikes (boss feature)
    for (let i = -2; i <= 2; i++) {
      g.fillStyle(r, 0.6);
      g.fillTriangle(i * sz * 0.35, -sz * 0.6, i * sz * 0.35 - sz * 0.1, -sz * 1.0, i * sz * 0.35 + sz * 0.1, -sz * 1.0);
    }
  }

  update(delta) {
    if (this.isDead) return;
    const dt = delta / 1000;
    const { width, height } = this.scene.scale;
    this.angle_t += dt;

    if (this.phase === 1) {
      // Entering – move to target
      const dx = this.targetX - this.x;
      if (Math.abs(dx) < 5) { this.phase = 2; }
      this.x += Math.sign(dx) * this.speed * dt;
    } else if (this.phase === 2) {
      // Patrol – figure-8 / wave
      this.x  = this.targetX + Math.sin(this.angle_t * 0.6) * (width * 0.18);
      this.y  = this.baseY   + Math.sin(this.angle_t * 1.2) * 50;
      this.y  = Phaser.Math.Clamp(this.y, 60, height - 140);
    } else if (this.phase === 3) {
      // Enraged – faster + more erratic
      this.x  = this.targetX + Math.sin(this.angle_t * 1.4) * (width * 0.25);
      this.y  = this.baseY   + Math.sin(this.angle_t * 2.2) * 70;
      this.y  = Phaser.Math.Clamp(this.y, 60, height - 140);
    }

    // Glow pulse
    this._updateGlow();
    this._updateShield();

    // Hit flash
    if (this._hitFlash > 0) {
      this._hitFlash -= 0.1;
      this.alpha = 1 + this._hitFlash * 0.4;
    } else {
      this.alpha = 1;
    }
  }

  _updateGlow() {
    const sz = this.def.sz * 36;
    const glw = Phaser.Display.Color.HexStringToColor(this.def.glow);
    const pulse = 0.15 + 0.12 * Math.sin(this.angle_t * 3);
    this.outerGlow.clear();
    this.outerGlow.fillStyle(glw.color, pulse);
    this.outerGlow.fillEllipse(0, 0, sz * 5, sz * 4);
    this.outerGlow.fillStyle(0xffffff, pulse * 0.4);
    this.outerGlow.fillEllipse(0, 0, sz * 3, sz * 2.5);
  }

  _updateShield() {
    if (this.hp <= 0) return;
    const sz  = this.def.sz * 36;
    const pct = this.hp / this.maxHp;
    this.shieldGfx.clear();
    const glw = Phaser.Display.Color.HexStringToColor(this.def.glow);
    this.shieldGfx.lineStyle(3, glw.color, 0.5 * pct);
    this.shieldGfx.strokeCircle(0, 0, sz * 1.7);
    this.shieldGfx.lineStyle(1, 0xffffff, 0.2 * pct);
    this.shieldGfx.strokeCircle(0, 0, sz * 1.5);
  }

  takeDamage(dmg = 1) {
    if (this.isDead) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this._hitFlash = 1;
    this.scene.cameras.main.shake(60, 0.005);

    // Update HP bar
    const pct = this.hp / this.maxHp;
    this.hpBarFg.scaleX = pct;
    const r = Math.round(255 * (1 - pct));
    const g = Math.round(255 * pct);
    this.hpBarFg.setFillStyle(Phaser.Display.Color.GetColor(r, g, 0));

    // Phase transitions
    if (pct < 0.3 && this.phase < 3) {
      this.phase = 3;
      this.speed *= 1.5;
      this.scene.cameras.main.shake(200, 0.012);
      if (typeof showGameToast === 'function') showGameToast(`⚡ ${this.def.name} IS ENRAGED!`);
    }

    if (this.hp <= 0) { this._die(); return true; }
    return false;
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.setActive(false);
    this.scene.cameras.main.shake(350, 0.022);
    this.scene.tweens.add({
      targets: this,
      scaleX: 2, scaleY: 2,
      alpha: 0,
      angle: 30,
      duration: 600,
      ease: 'Expo.easeOut',
      onComplete: () => { if (this.scene) this.destroy(); },
    });
  }

  isAlive() { return !this.isDead && this.active; }
  getBounds() {
    const sz = this.def.sz * 36;
    return new Phaser.Geom.Circle(this.x, this.y, sz * 1.5);
  }
}

window.Boss = Boss;
