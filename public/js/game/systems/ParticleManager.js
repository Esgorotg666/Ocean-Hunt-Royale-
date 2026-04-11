// ============================================================
// ParticleManager – All particle FX (hits, explosions, coins)
// ============================================================
class ParticleManager {
  constructor(scene) {
    this.scene    = scene;
    this._pools   = {};
  }

  // ── Hit sparks (bullet impact) ───────────────────────────
  hitSparks(x, y, color = 0x00ffff) {
    const g = this.scene.add.graphics();
    const count = Phaser.Math.Between(5, 9);
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 50 + Math.random() * 120;
      particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, r: 2 + Math.random() * 3 });
    }
    const update = () => {
      g.clear();
      let alive = false;
      for (const p of particles) {
        p.life -= 0.06; if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.vy += 80 * 0.016;
        g.fillStyle(color, p.life);
        g.fillCircle(p.x, p.y, p.r * p.life);
      }
      if (!alive) { g.destroy(); this.scene.events.off('update', update); }
    };
    this.scene.events.on('update', update);
  }

  // ── Fish death explosion ─────────────────────────────────
  fishExplosion(x, y, color, radius = 40) {
    // Ring expand
    const ring = this.scene.add.graphics();
    let r = 0;
    const growRing = () => {
      ring.clear(); r += 4;
      ring.lineStyle(3 - r * 0.05, Phaser.Display.Color.HexStringToColor(color).color, 1 - r / radius);
      ring.strokeCircle(x, y, r);
      if (r >= radius) { ring.destroy(); this.scene.events.off('update', growRing); }
    };
    this.scene.events.on('update', growRing);

    // Debris
    this.hitSparks(x, y, Phaser.Display.Color.HexStringToColor(color).color);
    this.hitSparks(x, y, 0xffffff);

    // Screen shake
    this.scene.cameras.main.shake(120, 0.008);
  }

  // ── Big explosion (boss/bomb) ────────────────────────────
  bigExplosion(x, y) {
    const rings = [0xFF4500, 0xFF8C00, 0xFFD700, 0xFFFFFF];
    rings.forEach((col, i) => {
      this.scene.time.delayedCall(i * 60, () => this.fishExplosion(x, y, '#' + col.toString(16).padStart(6,'0'), 80 + i * 20));
    });
    this.scene.cameras.main.shake(250, 0.018);
    this._flashScreen(0.4);
  }

  // ── Coins scatter from dead fish ─────────────────────────
  coins(x, y, amount, color = '#FFD700') {
    const count = Math.min(Math.ceil(amount / 5), 18);
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 30, () => {
        const coin = this.scene.add.text(x, y, '💰', { fontSize: '14px' });
        coin.setDepth(25);
        const tx = x + Phaser.Math.Between(-60, 60);
        const ty = y + Phaser.Math.Between(-80, -20);
        this.scene.tweens.add({
          targets: coin,
          x: tx, y: ty,
          scaleX: 0, scaleY: 0,
          alpha: 0,
          duration: 700 + Math.random() * 400,
          ease: 'Quad.easeOut',
          onComplete: () => coin.destroy(),
        });
      });
    }
  }

  // ── Win number popup ─────────────────────────────────────
  winText(x, y, amount, isBoss = false) {
    const size   = isBoss ? '28px' : amount > 100 ? '22px' : '16px';
    const colHex = isBoss ? '#FFD700' : amount > 50 ? '#FF8C00' : '#00FFD1';
    const label  = this.scene.add.text(x, y, `+${Math.floor(amount)}`, {
      fontFamily: 'Orbitron, monospace',
      fontSize: size,
      fontStyle: 'bold',
      color: colHex,
      stroke: '#000000',
      strokeThickness: 4,
    }).setDepth(30).setOrigin(0.5, 1);

    this.scene.tweens.add({
      targets: label,
      y: y - 90,
      scaleX: isBoss ? 1.4 : 1,
      scaleY: isBoss ? 1.4 : 1,
      alpha: { from: 1, to: 0 },
      duration: 1400,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  // ── Jackpot flash ────────────────────────────────────────
  jackpotFlash(x, y) {
    const t = this.scene.add.text(x, y, '🏆 JACKPOT!! 🏆', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 6,
    }).setDepth(35).setOrigin(0.5, 0.5);

    this.scene.tweens.add({
      targets: t,
      scaleX: 1.5, scaleY: 1.5,
      alpha: { from: 1, to: 0 },
      duration: 2500,
      ease: 'Bounce.easeOut',
      onComplete: () => t.destroy(),
    });
    this.scene.cameras.main.flash(500, 255, 215, 0);
    this.scene.cameras.main.shake(400, 0.025);
  }

  // ── Laser beam ──────────────────────────────────────────
  laserBeam(x1, y1, x2, y2, color = 0xff00ff) {
    const g = this.scene.add.graphics().setDepth(20);
    let alpha = 1;
    const fade = () => {
      alpha -= 0.06; g.clear();
      if (alpha <= 0) { g.destroy(); this.scene.events.off('update', fade); return; }
      g.lineStyle(3, color, alpha); g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(1, 0xffffff, alpha * 0.5); g.lineBetween(x1, y1, x2, y2);
    };
    this.scene.events.on('update', fade);
  }

  // ── Lightning chain ──────────────────────────────────────
  lightningChain(points) {
    if (points.length < 2) return;
    const g = this.scene.add.graphics().setDepth(20);
    let alpha = 1;
    const fade = () => {
      alpha -= 0.07; g.clear();
      if (alpha <= 0) { g.destroy(); this.scene.events.off('update', fade); return; }
      g.lineStyle(2, 0xffffff, alpha);
      for (let i = 0; i < points.length - 1; i++) {
        const jx = points[i].x   + Phaser.Math.Between(-8, 8);
        const jy = points[i].y   + Phaser.Math.Between(-8, 8);
        const jx2 = points[i+1].x + Phaser.Math.Between(-8, 8);
        const jy2 = points[i+1].y + Phaser.Math.Between(-8, 8);
        g.lineBetween(jx, jy, jx2, jy2);
      }
    };
    this.scene.events.on('update', fade);
  }

  // ── Aoe ring ─────────────────────────────────────────────
  aoeRing(x, y, radius, color = 0xffd700) {
    const g = this.scene.add.graphics().setDepth(18);
    let r = 0;
    const expand = () => {
      r += 6; g.clear();
      g.lineStyle(4, color, 1 - r / radius);
      g.fillStyle(color, 0.04 * (1 - r / radius));
      g.strokeCircle(x, y, r);
      g.fillCircle(x, y, r);
      if (r >= radius) { g.destroy(); this.scene.events.off('update', expand); }
    };
    this.scene.events.on('update', expand);
  }

  // ── Screen flash ─────────────────────────────────────────
  _flashScreen(intensity = 0.3) {
    const { width, height } = this.scene.scale;
    const fl = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff, intensity).setDepth(50);
    this.scene.tweens.add({ targets: fl, alpha: 0, duration: 200, onComplete: () => fl.destroy() });
  }

  // ── Bubble trail for bullets ─────────────────────────────
  bulletTrail(x, y, color = 0x00bfff) {
    const dot = this.scene.add.circle(x, y, 2, color, 0.6).setDepth(12);
    this.scene.tweens.add({ targets: dot, alpha: 0, scaleX: 0, scaleY: 0, duration: 200, onComplete: () => dot.destroy() });
  }
}

window.ParticleManager = ParticleManager;
