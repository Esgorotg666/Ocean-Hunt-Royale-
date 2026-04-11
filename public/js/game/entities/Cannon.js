// ============================================================
// Cannon – Player weapon, tracks pointer, supports touch
// ============================================================
class Cannon extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.angle_deg = -90; // pointing up by default
    this._muzzleFlash = 0;
    this._build();
    scene.add.existing(this);
    this.setDepth(22);
  }

  _build() {
    // Platform base
    this.base = this.scene.add.graphics();
    this._drawBase();
    this.add(this.base);

    // Barrel
    this.barrel = this.scene.add.graphics();
    this._drawBarrel();
    this.add(this.barrel);

    // Muzzle flash overlay
    this.flashGfx = this.scene.add.graphics();
    this.add(this.flashGfx);
  }

  _drawBase() {
    const g = this.base;
    g.clear();
    // Platform
    g.fillStyle(0x1a3a5c, 1);
    g.fillRoundedRect(-35, -14, 70, 28, 8);
    g.lineStyle(2, 0x00BFFF, 0.7);
    g.strokeRoundedRect(-35, -14, 70, 28, 8);
    // Neon ring
    g.fillStyle(0x00BFFF, 0.2);
    g.fillCircle(0, 0, 22);
    g.lineStyle(2, 0x00FFD1, 0.6);
    g.strokeCircle(0, 0, 22);
    // Center jewel
    g.fillStyle(0xFFD700, 1);
    g.fillCircle(0, 0, 5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(-1, -2, 2);
  }

  _drawBarrel(weapon = 'standard') {
    const g = this.barrel;
    g.clear();

    const colors = {
      standard:  { body: 0x2a5a8c, accent: 0x00BFFF },
      fishnet:   { body: 0x3a6a2c, accent: 0xFFD700 },
      torpedo:   { body: 0x5a2a2c, accent: 0xFF4500 },
      laser:     { body: 0x5a2a5a, accent: 0xFF00FF },
      lightning: { body: 0x3a3a5a, accent: 0xFFFFFF },
      bomb:      { body: 0x4a2a1a, accent: 0xFF6600 },
    };
    const c = colors[weapon] || colors.standard;

    // Main barrel body
    g.fillStyle(c.body, 1);
    g.fillRoundedRect(-8, -46, 16, 46, 4);
    // Accent stripes
    g.lineStyle(2, c.accent, 0.8);
    g.lineBetween(-6, -40, -6, -10);
    g.lineBetween(6, -40, 6, -10);
    // Muzzle
    g.fillStyle(c.accent, 0.9);
    g.fillRoundedRect(-10, -50, 20, 10, 3);
    g.lineStyle(2, 0xffffff, 0.4);
    g.strokeRoundedRect(-10, -50, 20, 10, 3);
    // Side grips
    g.fillStyle(c.body, 0.7);
    g.fillRoundedRect(-16, -28, 8, 16, 3);
    g.fillRoundedRect(8, -28, 8, 16, 3);
  }

  // ── Aim at screen coordinates ─────────────────────────────
  aimAt(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    this.angle_deg = Phaser.Math.RadToDeg(Math.atan2(dy, dx)) + 90;
    this.angle_deg = Phaser.Math.Clamp(this.angle_deg, -160, -20); // clamp upward arc
    this.barrel.setAngle(this.angle_deg);
  }

  // ── Get muzzle world position ─────────────────────────────
  getMuzzlePos() {
    const rad = Phaser.Math.DegToRad(this.angle_deg - 90);
    const len = 50;
    return {
      x: this.x + Math.cos(rad) * len,
      y: this.y + Math.sin(rad) * len,
    };
  }

  // ── Fire animation ────────────────────────────────────────
  fire() {
    this._muzzleFlash = 1;
    this.scene.tweens.add({
      targets: this,
      y: this.y + 4,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this._drawMuzzleFlash();
  }

  _drawMuzzleFlash() {
    const g  = this.flashGfx;
    g.clear();
    const mp = this.getMuzzlePos();
    const lx = mp.x - this.x, ly = mp.y - this.y;
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillCircle(lx, ly, 10);
    g.fillStyle(0xFFD700, 0.7);
    g.fillCircle(lx, ly, 6);
    this.scene.time.delayedCall(80, () => { if (this.flashGfx) g.clear(); });
  }

  changeWeapon(weapon) {
    this._drawBarrel(weapon);
  }
}

window.Cannon = Cannon;
