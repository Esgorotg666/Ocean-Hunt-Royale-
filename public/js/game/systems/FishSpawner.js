// ============================================================
// FishSpawner – Manages wave-based fish spawning
// ============================================================
class FishSpawner {
  constructor(scene) {
    this.scene      = scene;
    this.spawnTimer = null;
    this.waveTimer  = null;
    this.isBossRound = false;
    this.bossActive  = false;
    this.waveNumber  = 1;
    this.normalFishDefs = GAME_CONFIG.fishDefs.filter(f => !f.boss && f.w > 0);
    this.rareFishDefs   = GAME_CONFIG.fishDefs.filter(f => f.rare && !f.boss);
    this.bossDefs       = GAME_CONFIG.fishDefs.filter(f => f.boss);
    this._bossPool      = [...this.bossDefs]; // shuffle for variety
  }

  start() {
    this._scheduleSpawn();
    // Boss round every ~8 min of real time (480s) → use shorter in dev: 120s for demo
    this.waveTimer = this.scene.time.addEvent({
      delay: 120000, // 2 min demo cycle (change to 480000 for full)
      callback: this._triggerBossRound,
      callbackScope: this,
      loop: true,
    });
    // Spawn an initial school right away
    this._spawnSchool(3);
  }

  stop() {
    if (this.spawnTimer) this.spawnTimer.remove();
    if (this.waveTimer)  this.waveTimer.remove();
  }

  _scheduleSpawn() {
    const delay = this.isBossRound
      ? Phaser.Math.Between(3000, 5000)   // slower during boss
      : Phaser.Math.Between(1200, 2400);
    this.spawnTimer = this.scene.time.delayedCall(delay, () => {
      if (!this.isBossRound) this._spawnNormal();
      this._scheduleSpawn();
    });
  }

  _spawnNormal() {
    if (this.scene.fishGroup && this.scene.fishGroup.countActive() >= 25) return;
    const rand = Math.random();
    // 6% rare, 15% school, rest single
    if (rand < 0.06) {
      this._spawnRare();
    } else if (rand < 0.21) {
      this._spawnSchool(Phaser.Math.Between(3, 7));
    } else {
      this._spawnSingle(this._pickWeightedFish());
    }
  }

  _pickWeightedFish() {
    const total = this.normalFishDefs.reduce((s, f) => s + f.w, 0);
    let r = Math.random() * total;
    for (const f of this.normalFishDefs) {
      r -= f.w; if (r <= 0) return f;
    }
    return this.normalFishDefs[0];
  }

  _spawnSingle(def, xOverride = null, yOverride = null) {
    const { width, height } = this.scene.scale;
    const fromLeft  = Math.random() < 0.5;
    const x = xOverride !== null ? xOverride : (fromLeft ? -60 : width + 60);
    const y = yOverride !== null ? yOverride : Phaser.Math.Between(60, height - 120);
    const fish = new Fish(this.scene, x, y, def, fromLeft);
    this.scene.fishGroup.add(fish, true);
    return fish;
  }

  _spawnSchool(count) {
    const def  = this._pickWeightedFish();
    const { width, height } = this.scene.scale;
    const fromLeft = Math.random() < 0.5;
    const baseX = fromLeft ? -60 : width + 60;
    const baseY = Phaser.Math.Between(80, height - 140);
    for (let i = 0; i < count; i++) {
      const dx = fromLeft ? -(i * 35) : (i * 35);
      const dy = Phaser.Math.Between(-25, 25);
      this._spawnSingle(def, baseX + dx, baseY + dy);
    }
  }

  _spawnRare() {
    const def = Phaser.Utils.Array.GetRandom(this.rareFishDefs);
    this._spawnSingle(def);
  }

  _triggerBossRound() {
    if (this.bossActive) return;
    this.isBossRound = true;
    this.waveNumber++;

    // Pick boss
    if (this._bossPool.length === 0) this._bossPool = [...this.bossDefs];
    const bossIdx = Math.floor(Math.random() * this._bossPool.length);
    const bossDef = this._bossPool.splice(bossIdx, 1)[0];

    // Notify game scene
    this.scene.events.emit('boss:spawn', bossDef);
    if (typeof showBossAlert === 'function') showBossAlert(true);
    if (typeof showGameToast === 'function') showGameToast(`⚠️ ${bossDef.name} APPEARS!`);

    // Spawn the boss
    const boss = new Boss(this.scene, bossDef);
    this.scene.bossGroup.add(boss, true);
    this.bossActive = true;

    // Also spawn escort fish
    for (let i = 0; i < 4; i++) {
      const escort = this._pickWeightedFish();
      this._spawnSingle({ ...escort, hp: escort.hp * 2 });
    }

    // Boss round ends after 90s or when boss dies
    this.scene.time.delayedCall(90000, () => this._endBossRound());
  }

  _endBossRound() {
    this.isBossRound = false;
    this.bossActive  = false;
    if (typeof showBossAlert === 'function') showBossAlert(false);
    // Clean remaining boss
    if (this.scene.bossGroup) {
      this.scene.bossGroup.clear(true, true);
    }
  }

  onBossDead() {
    this.bossActive = false;
    this.isBossRound = false;
    if (typeof showBossAlert === 'function') showBossAlert(false);
  }
}

window.FishSpawner = FishSpawner;
