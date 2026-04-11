// ============================================================
// Fish Entity – Procedurally drawn fish with Phaser Graphics
// ============================================================
class Fish extends Phaser.GameObjects.Container {
  constructor(scene, x, y, def, fromLeft = true) {
    super(scene, x, y);
    this.def       = def;
    this.fromLeft  = fromLeft;
    this.hp        = def.hp;
    this.maxHp     = def.hp;
    this.isDead    = false;
    this.pattern   = GAME_CONFIG.fishPatterns[def.id] || 'linear';
    this.speed     = def.spd * (0.85 + Math.random() * 0.3);
    this.baseY     = y;
    this.angle_t   = Math.random() * Math.PI * 2;
    this.circleR   = 40 + Math.random() * 40;
    this.circleDir = Math.random() < 0.5 ? 1 : -1;
    this._glowAlpha = 0;
    this._glowDir   = 1;
    this._hitFlash  = 0;

    this._build();
    scene.add.existing(this);
    this.setDepth(10);
    this.setActive(true).setVisible(true);
  }

  // ── Build graphic ────────────────────────────────────────
  _build() {
    const sz = (this.def.sz || 0.8) * 36;
    const col = Phaser.Display.Color.HexStringToColor(this.def.col || '#00BFFF');
    const glw = Phaser.Display.Color.HexStringToColor(this.def.glow || '#00FFFF');

    // Glow halo (behind fish)
    this.glowGfx = this.scene.add.graphics();
    this.add(this.glowGfx);

    // Fish body drawn with graphics
    this.bodyGfx = this.scene.add.graphics();
    this._drawFish(this.bodyGfx, sz, col, glw);
    this.add(this.bodyGfx);

    // HP bar (hidden for small fish)
    if (this.maxHp > 3) {
      this.hpBg  = this.scene.add.rectangle(0, sz + 8, sz * 1.6, 5, 0x000000, 0.7).setOrigin(0.5);
      this.hpBar = this.scene.add.rectangle(-sz * 0.8, sz + 8, sz * 1.6, 5, 0x00ff66, 1).setOrigin(0, 0.5);
      this.add(this.hpBg);
      this.add(this.hpBar);
    }

    // Name label for rare / boss
    if (this.def.rare || this.def.boss) {
      const labelCol = this.def.boss ? '#FFD700' : '#00FFD1';
      this.label = this.scene.add.text(0, -(sz + 10), this.def.name, {
        fontFamily: 'Orbitron, monospace',
        fontSize:   this.def.boss ? '13px' : '10px',
        color:      labelCol,
        stroke:     '#000',
        strokeThickness: 3,
      }).setOrigin(0.5, 1);
      this.add(this.label);
    }

    // Emoji overlay for quick recognition
    this.emoji = this.scene.add.text(0, 0, this.def.em || '🐟', {
      fontSize: `${Math.round(sz * 1.2)}px`,
    }).setOrigin(0.5).setAlpha(0.9);
    this.add(this.emoji);

    // Flip direction
    if (!this.fromLeft) this.setScale(-1, 1);
  }

  _drawFish(g, sz, col, glw) {
    const r = col.color;
    // Body ellipse
    g.fillStyle(r, 1);
    g.fillEllipse(0, 0, sz * 2, sz * 1.2);
    // Lighter belly
    g.fillStyle(0xffffff, 0.15);
    g.fillEllipse(0, sz * 0.15, sz * 1.4, sz * 0.7);
    // Tail
    g.fillStyle(r, 0.85);
    g.fillTriangle(-sz, 0, -sz * 0.55, -sz * 0.6, -sz * 0.55, sz * 0.6);
    // Fin
    g.fillStyle(r, 0.7);
    g.fillTriangle(0, -sz * 0.3, sz * 0.3, -sz * 0.8, sz * 0.5, -sz * 0.2);
    // Eye
    g.fillStyle(0xffffff, 1);
    g.fillCircle(sz * 0.5, -sz * 0.1, sz * 0.14);
    g.fillStyle(0x000000, 1);
    g.fillCircle(sz * 0.52, -sz * 0.1, sz * 0.07);
    // Specular
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(sz * 0.1, -sz * 0.25, sz * 0.5, sz * 0.2);
  }

  // ── Update (called every frame by GameScene) ─────────────
  update(delta) {
    if (this.isDead) return;
    const dt = delta / 1000;
    const { width, height } = this.scene.scale;

    this.angle_t += dt;

    // Movement pattern
    switch (this.pattern) {
      case 'linear':
        this.x += (this.fromLeft ? 1 : -1) * this.speed * dt;
        break;
      case 'wave':
        this.x += (this.fromLeft ? 1 : -1) * this.speed * dt;
        this.y  = this.baseY + Math.sin(this.angle_t * 1.8) * 30;
        break;
      case 'zigzag':
        this.x += (this.fromLeft ? 1 : -1) * this.speed * dt;
        this.y  = this.baseY + Math.sin(this.angle_t * 3.5) * 22;
        break;
      case 'dive':
        this.x += (this.fromLeft ? 1 : -1) * this.speed * 0.6 * dt;
        this.y += Math.sin(this.angle_t * 1.2) * this.speed * 0.5 * dt;
        this.y = Phaser.Math.Clamp(this.y, 60, height - 120);
        break;
      case 'circle':
        this.circleCenter = this.circleCenter || { x: this.x, y: this.y };
        this.circleCenter.x += (this.fromLeft ? 0.4 : -0.4) * this.speed * dt;
        this.x = this.circleCenter.x + Math.cos(this.angle_t * 1.5) * this.circleR;
        this.y = this.circleCenter.y + Math.sin(this.angle_t * 1.5) * this.circleR * this.circleDir;
        this.y = Phaser.Math.Clamp(this.y, 60, height - 120);
        break;
      case 'spiral':
        this.circleR *= 0.9995;
        this.x += (this.fromLeft ? 1 : -1) * this.speed * 0.5 * dt;
        this.y  = this.baseY + Math.sin(this.angle_t * 2.5) * this.circleR;
        break;
      default:
        this.x += (this.fromLeft ? 1 : -1) * this.speed * dt;
    }

    // Cull out-of-bounds
    if (this.x > width + 120 || this.x < -120) { this._cull(); return; }

    // Glow pulse
    this._glowAlpha += 0.04 * this._glowDir;
    if (this._glowAlpha > 0.35) this._glowDir = -1;
    if (this._glowAlpha < 0.05) this._glowDir = 1;
    this._drawGlow();

    // Hit flash decay
    if (this._hitFlash > 0) {
      this._hitFlash -= 0.15;
      this.bodyGfx.setAlpha(1 + this._hitFlash * 0.5);
    }
  }

  _drawGlow() {
    this.glowGfx.clear();
    const sz  = this.def.sz * 36;
    const glw = Phaser.Display.Color.HexStringToColor(this.def.glow || this.def.col);
    this.glowGfx.fillStyle(glw.color, this._glowAlpha);
    this.glowGfx.fillEllipse(0, 0, sz * 3, sz * 2.4);
  }

  // ── Take damage ──────────────────────────────────────────
  takeDamage(dmg = 1) {
    if (this.isDead) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this._hitFlash = 1;

    // Update HP bar
    if (this.hpBar) {
      const pct = this.hp / this.maxHp;
      this.hpBar.scaleX = pct;
      const r = Math.round(255 * (1 - pct));
      const g = Math.round(255 * pct);
      this.hpBar.setFillStyle(Phaser.Display.Color.GetColor(r, g, 0));
    }

    if (this.hp <= 0) { this._die(); return true; }
    return false;
  }

  _die() {
    if (this.isDead) return;
    this.isDead = true;
    this.setActive(false);

    // Death tween
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5, scaleY: 1.5,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => { if (this.scene) this.destroy(); },
    });
  }

  _cull() {
    this.isDead = true;
    this.setActive(false);
    this.destroy();
  }

  // ── Accessors ────────────────────────────────────────────
  isAlive() { return !this.isDead && this.active; }
  getBounds() {
    const sz = this.def.sz * 36;
    return new Phaser.Geom.Circle(this.x, this.y, sz * 0.9);
  }
}

window.Fish = Fish;
