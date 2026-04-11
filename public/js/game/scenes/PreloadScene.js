// ============================================================
// PreloadScene – Loading screen, refreshes player balance
// ============================================================
class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  create() {
    const { width, height } = this.scale;
    this._drawLoadScreen(width, height);
    // Fetch fresh balance then start game
    this._initPlayer();
  }

  _drawLoadScreen(W, H) {
    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x020B18, 1);

    // Animated rings
    const ringGfx = this.add.graphics();
    let r = 0, alpha = 1;
    this.time.addEvent({
      delay: 16,
      callback: () => {
        ringGfx.clear();
        r += 1.5; alpha = 1 - r / 120;
        if (r > 120) { r = 0; alpha = 1; }
        ringGfx.lineStyle(2, 0x00FFD1, alpha * 0.5);
        ringGfx.strokeCircle(W / 2, H / 2, r);
        ringGfx.lineStyle(1, 0xFFD700, alpha * 0.3);
        ringGfx.strokeCircle(W / 2, H / 2, r * 0.6);
      },
      loop: true,
    });

    // Logo
    this.add.text(W / 2, H / 2 - 60, '🐉', { fontSize: '64px' }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 10, 'KIRINSTORM', {
      fontFamily: 'Orbitron, monospace', fontSize: '32px', fontStyle: 'bold',
      color: '#FFD700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 + 46, '777', {
      fontFamily: 'Orbitron, monospace', fontSize: '22px',
      color: '#00FFD1', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Loading bar
    const barW = 260;
    this.add.rectangle(W / 2, H / 2 + 100, barW + 4, 14, 0x1a3a5c, 1).setOrigin(0.5);
    this.loadBar = this.add.rectangle(W / 2 - barW / 2, H / 2 + 100, 0, 10, 0x00FFD1, 1).setOrigin(0, 0.5);
    this.loadText = this.add.text(W / 2, H / 2 + 122, 'INITIALIZING...', {
      fontFamily: 'Orbitron, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.5)',
      letterSpacing: 3,
    }).setOrigin(0.5);

    // Animate bar
    this.tweens.add({
      targets: this.loadBar,
      width: barW * 0.6,
      duration: 800,
      ease: 'Quad.easeOut',
    });
  }

  async _initPlayer() {
    try {
      this.loadText.setText('CONNECTING TO SERVER...');
      const net = new NetworkManager();
      const me  = await net.fetchMe();

      // Update local storage with fresh data
      localStorage.setItem('ks_player', JSON.stringify(me.player));

      // Animate bar to 100%
      this.tweens.add({
        targets: this.loadBar,
        width: 260,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.loadText.setText('READY!');
          this.time.delayedCall(300, () => this.scene.start('Game', { player: me.player, jackpot: me.jackpot }));
        },
      });
    } catch (err) {
      console.warn('[Preload] Server error, starting offline:', err.message);
      const player = JSON.parse(localStorage.getItem('ks_player') || '{"username":"Guest","credits":1000}');
      this.tweens.add({
        targets: this.loadBar,
        width: 260,
        duration: 300,
        onComplete: () => {
          this.loadText.setText('OFFLINE MODE');
          this.time.delayedCall(400, () => this.scene.start('Game', { player, jackpot: 50000 }));
        },
      });
    }
  }
}

window.PreloadScene = PreloadScene;
