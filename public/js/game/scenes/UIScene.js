// ============================================================
// UIScene – Overlay HUD elements rendered on top of GameScene
// (Runs in parallel with GameScene for clean separation)
// ============================================================
class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UI', active: false }); }

  create() {
    // UIScene is optional – currently all HUD is in game.html DOM
    // This scene can be used for in-canvas popups / jackpot wheel
    // Launch it manually: this.scene.launch('UI')
    this._buildJackpotTicker();
    this._buildComboDisplay();
  }

  _buildJackpotTicker() {
    const { width } = this.scale;
    this.jpLabel = this.add.text(width / 2, 34, '🏆 JACKPOT: 50,000', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '11px',
      color: '#FF6600',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0.85).setDepth(50);
  }

  _buildComboDisplay() {
    const { width, height } = this.scale;
    this.comboText = this.add.text(width - 12, height / 2, '', {
      fontFamily: 'Orbitron, monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 4,
      align: 'right',
    }).setOrigin(1, 0.5).setDepth(50).setAlpha(0);
  }

  showCombo(count) {
    if (count < 2) return;
    this.comboText.setText(`🔥 x${count} COMBO`).setAlpha(1);
    this.tweens.add({
      targets: this.comboText,
      scaleX: 1.3, scaleY: 1.3,
      duration: 150, yoyo: true,
    });
    this.tweens.add({
      targets: this.comboText,
      alpha: 0,
      delay: 1500, duration: 600,
    });
  }

  updateJackpot(amount) {
    if (this.jpLabel) {
      this.jpLabel.setText(`🏆 JACKPOT: ${Math.floor(amount).toLocaleString()}`);
    }
  }
}

window.UIScene = UIScene;
