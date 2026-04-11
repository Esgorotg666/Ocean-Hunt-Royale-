// ============================================================
// BootScene – First scene, generates all textures procedurally
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Load CDN font (via CSS already loaded)
    // Generate all textures using Canvas API
  }

  create() {
    this._genBubbleTexture();
    this._genCausticTextures();
    this._genCoinTexture();
    this._genStarTexture();
    this._genShockwaveTexture();
    this.scene.start('Preload');
  }

  _genBubbleTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(1.5, 0xaaddff, 0.7);
    g.fillStyle(0xaaddff, 0.08);
    g.fillCircle(8, 8, 8);
    g.strokeCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(5, 5, 2);
    g.generateTexture('bubble', 16, 16);
    g.destroy();
  }

  _genCausticTextures() {
    // 4 slightly different caustic frames for animation
    for (let f = 0; f < 4; f++) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const size = 64;
      g.fillStyle(0x003366, 0);
      g.fillRect(0, 0, size, size);
      // Random caustic pattern
      const rng = (n) => Math.sin(n * 127.1 + f * 31.41) * 0.5 + 0.5;
      for (let y = 0; y < size; y += 4) {
        for (let x = 0; x < size; x += 4) {
          const v = rng(x * 0.1 + y * 0.07 + f * 0.3) * rng(x * 0.05 - y * 0.09);
          if (v > 0.6) {
            g.fillStyle(0x00aaff, v * 0.15);
            g.fillRect(x, y, 4, 4);
          }
        }
      }
      g.generateTexture('caustic' + f, size, size);
      g.destroy();
    }
  }

  _genCoinTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFFD700, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xFFA500, 0.6);
    g.fillCircle(8, 8, 6);
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillCircle(5, 5, 2.5);
    g.lineStyle(1, 0xCC8800, 0.8);
    g.strokeCircle(8, 8, 8);
    g.generateTexture('coin', 16, 16);
    g.destroy();
  }

  _genStarTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    // 5-point star path
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r  = i % 2 === 0 ? 8 : 3;
      const a  = (i * Math.PI / 5) - Math.PI / 2;
      pts.push({ x: 8 + Math.cos(a) * r, y: 8 + Math.sin(a) * r });
    }
    g.fillPoints(pts, true);
    g.generateTexture('star', 16, 16);
    g.destroy();
  }

  _genShockwaveTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(32, 32, 30);
    g.lineStyle(1, 0xaaddff, 0.4);
    g.strokeCircle(32, 32, 20);
    g.generateTexture('shockwave', 64, 64);
    g.destroy();
  }
}

window.BootScene = BootScene;
