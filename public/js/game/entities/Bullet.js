// ============================================================
// Bullet – Projectile entity with weapon-specific visuals
// ============================================================
class Bullet extends Phaser.GameObjects.Container {
  constructor(scene, x, y, targetX, targetY, weapon = 'standard') {
    super(scene, x, y);
    this.weaponDef = GAME_CONFIG.weapons[weapon] || GAME_CONFIG.weapons.standard;
    this.weapon    = weapon;
    this.isDead    = false;
    this.speed     = this._getSpeed();
    this._trailTimer = 0;

    // Direction vector (normalised)
    const dx = targetX - x, dy = targetY - y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / len) * this.speed;
    this.vy = (dy / len) * this.speed;

    this._build();
    scene.add.existing(this);
    this.setDepth(20);
  }

  _getSpeed() {
    const speeds = { standard:720, fishnet:480, torpedo:380, laser:1000, lightning:600, bomb:320 };
    return speeds[this.weapon] || 700;
  }

  _build() {
    const col = Phaser.Display.Color.HexStringToColor(this.weaponDef.col || '#00BFFF');
    this.gfx   = this.scene.add.graphics();
    this.add(this.gfx);
    this._draw(col);
  }

  _draw(col) {
    const g = this.gfx;
    g.clear();
    switch (this.weapon) {
      case 'standard':
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(0, 0, 5);
        g.fillStyle(col.color, 1);
        g.fillCircle(0, 0, 3.5);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(-1, -1, 1.5);
        break;

      case 'fishnet':
        // Green net ball
        g.lineStyle(2, 0xFFD700, 0.9);
        g.strokeCircle(0, 0, 10);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          g.lineBetween(0, 0, Math.cos(a) * 10, Math.sin(a) * 10);
        }
        g.fillStyle(0xFFD700, 0.2);
        g.fillCircle(0, 0, 10);
        break;

      case 'torpedo':
        // Elongated rocket
        g.fillStyle(0xFF4500, 1);
        g.fillEllipse(0, 0, 10, 24);
        g.fillStyle(0xFF8C00, 0.8);
        g.fillEllipse(0, -4, 6, 12);
        g.fillStyle(0xFFFFFF, 0.4);
        g.fillEllipse(-1, -6, 3, 8);
        break;

      case 'laser':
        // Magenta beam dot
        g.fillStyle(0xFF00FF, 1);
        g.fillCircle(0, 0, 4);
        g.lineStyle(2, 0xFF88FF, 0.7);
        g.strokeCircle(0, 0, 7);
        break;

      case 'lightning':
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(0, 0, 6);
        g.fillStyle(0xCCCCFF, 0.6);
        g.fillCircle(0, 0, 10);
        break;

      case 'bomb':
        g.fillStyle(0x222222, 1);
        g.fillCircle(0, 0, 12);
        g.fillStyle(0xFF6600, 1);
        g.fillCircle(0, 0, 9);
        g.lineStyle(2, 0xFFD700, 0.8);
        g.strokeCircle(0, 0, 12);
        g.fillStyle(0xFFFFFF, 0.3);
        g.fillCircle(-2, -4, 4);
        break;

      default:
        g.fillStyle(col.color, 1);
        g.fillCircle(0, 0, 4);
    }
  }

  update(delta) {
    if (this.isDead) return;
    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Trail effect (every 2 frames)
    this._trailTimer += delta;
    if (this._trailTimer > 32 && window.particleManager) {
      this._trailTimer = 0;
      const c = Phaser.Display.Color.HexStringToColor(this.weaponDef.col || '#00BFFF').color;
      window.particleManager.bulletTrail(this.x, this.y, c);
    }

    // Cull off-screen
    const { width, height } = this.scene.scale;
    if (this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20) {
      this._kill();
    }
  }

  _kill() {
    if (this.isDead) return;
    this.isDead = true;
    this.setActive(false);
    this.destroy();
  }

  getRadius() {
    const r = { standard:6, fishnet:11, torpedo:13, laser:5, lightning:7, bomb:13 };
    return r[this.weapon] || 6;
  }

  getAoeRadius() { return this.weaponDef.aoe || 0; }
  getDamage()    { return this.weaponDef.dmg || 1; }
  isPiercing()   { return this.weaponDef.pierce || false; }
}

window.Bullet = Bullet;
