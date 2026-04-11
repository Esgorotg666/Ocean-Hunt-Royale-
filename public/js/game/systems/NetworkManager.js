// ============================================================
// NetworkManager – Handles all API + Socket.io communication
// ============================================================
class NetworkManager {
  constructor() {
    this.token     = localStorage.getItem('ks_token') || '';
    this.player    = JSON.parse(localStorage.getItem('ks_player') || '{}');
    this.sessionId = null;
    this.socket    = null;
    this._shotQueue = [];
    this._processing = false;
  }

  async init() {
    // Start a game session on the server
    try {
      const d = await this._post('/api/game/session/start', {});
      this.sessionId = d.sessionId;
    } catch (e) { console.warn('[Net] Session start failed:', e.message); }

    // Socket.io
    if (typeof io !== 'undefined') {
      this.socket = io({ auth: { token: this.token }, reconnectionAttempts: 5 });
      this.socket.on('jackpot:update', ({ amount }) => {
        if (typeof updateJackpot === 'function') updateJackpot(amount);
      });
      this.socket.on('players:online', ({ count }) => {
        const el = document.getElementById('online-count');
        if (el) el.textContent = `● ${count} online`;
      });
      this.socket.on('game:bigwin', ({ fishName, amount, playerName }) => {
        if (typeof showGameToast === 'function') showGameToast(`🎉 ${playerName} won ${amount} on ${fishName}!`);
      });
    }
  }

  // Shoot – queued to prevent out-of-order requests
  async shoot(fishId, bet, weapon, angle) {
    return new Promise((resolve) => {
      this._shotQueue.push({ fishId, bet, weapon, angle, resolve });
      this._processQueue();
    });
  }

  async _processQueue() {
    if (this._processing || this._shotQueue.length === 0) return;
    this._processing = true;
    const { fishId, bet, weapon, angle, resolve } = this._shotQueue.shift();
    try {
      const result = await this._post('/api/game/shoot', { fishId, bet, weapon, angle, sessionId: this.sessionId });
      // Update stored player balance
      this.player.credits = result.balance;
      localStorage.setItem('ks_player', JSON.stringify(this.player));
      resolve({ ok: true, ...result });
    } catch (err) {
      resolve({ ok: false, error: err.message, balance: this.player.credits });
    } finally {
      this._processing = false;
      this._processQueue();
    }
  }

  async endSession() {
    if (!this.sessionId) return;
    try { await this._post('/api/game/session/end', { sessionId: this.sessionId }); } catch {}
  }

  async fetchMe() {
    const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + this.token } });
    if (!res.ok) throw new Error('Auth failed');
    return res.json();
  }

  async _post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
}

window.NetworkManager = NetworkManager;
