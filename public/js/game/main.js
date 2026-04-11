// ============================================================
// main.js – Phaser 3 game bootstrap for KirinStorm777
// ============================================================
(function() {
  'use strict';

  // Guard: don't run if not on game page
  if (!document.getElementById('game-container')) return;

  const config = {
    type: Phaser.AUTO,
    backgroundColor: '#020B18',
    parent: 'game-container',
    width:  1920,
    height: 1080,
    scale: {
      mode:            Phaser.Scale.FIT,
      autoCenter:      Phaser.Scale.CENTER_BOTH,
      width:           1920,
      height:          1080,
    },
    render: {
      antialias:       true,
      pixelArt:        false,
      roundPixels:     false,
    },
    physics: {
      default: 'arcade',
      arcade:  { gravity: { y: 0 }, debug: false },
    },
    fps: {
      target:     60,
      forceSetTimeOut: false,
    },
    scene: [BootScene, PreloadScene, GameScene, UIScene],
  };

  const game = new Phaser.Game(config);
  window.gameInstance = game;

  // ── Relay HTML control events to the active GameScene ─────
  const relay = (evtName) => (data) => {
    game.events.emit(evtName, data);
  };

  // These are triggered from game.html control buttons
  game.events.on('weapon:change', relay('weapon:change'));
  game.events.on('bet:change',    relay('bet:change'));
  game.events.on('manual:fire',   relay('manual:fire'));
  game.events.on('autofire:toggle', relay('autofire:toggle'));

  // ── Window resize: already handled by Phaser Scale Manager ─

  // ── Expose fire helper ────────────────────────────────────
  window.triggerManualFire = () => game.events.emit('manual:fire');

  // ── Cleanup on page leave ─────────────────────────────────
  window.addEventListener('beforeunload', () => {
    const scene = game.scene.getScene('Game');
    if (scene && scene.net) scene.net.endSession();
  });

  console.log('[KirinStorm777] Phaser game booted ✅');
})();
