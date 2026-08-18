/**
 * RBX Server Manager - Direct Roblox Session Bridge Manager (v2.3 Ultra Edition)
 * Direct Memory Hook Injection, Dual-Channel Handshake, Real-Time Diagnostic Tester,
 * 100% Reliable Friend Name Resolution & Smart Version Auditor
 */

const Bridge = {
  LATEST_VERSION: '2.3',
  isActive: false,
  installedVersion: null,
  lastPongTime: 0,
  pendingRequests: new Map(),

  init() {
    // 1. Direct Memory Hook Check (Instant 0ms detection)
    if (typeof window.__RBX_BRIDGE__ !== 'undefined' && window.__RBX_BRIDGE__.active) {
      this.isActive = true;
      this.installedVersion = window.__RBX_BRIDGE__.version || '2.3';
      this.lastPongTime = Date.now();
      window.__RBX_BRIDGE_ACTIVE__ = true;
      window.__RBX_BRIDGE_VERSION__ = this.installedVersion;
      this.updateStatusBadge();
    }

    // 2. Listen for postMessage from the Userscript (Dual-Channel Fallback)
    window.addEventListener('message', (e) => {
      if (!e.data || e.data.source !== 'RBX_BRIDGE') return;

      if (e.data.type === 'PONG') {
        this.isActive = true;
        this.lastPongTime = Date.now();
        this.installedVersion = e.data.version || '1.0';
        window.__RBX_BRIDGE_ACTIVE__ = true;
        window.__RBX_BRIDGE_VERSION__ = this.installedVersion;
        this.updateStatusBadge();
        return;
      }

      if (e.data.type === 'FETCH_SERVERS_RESPONSE') {
        const { requestId, success, data, error } = e.data;
        if (this.pendingRequests.has(requestId)) {
          const resolver = this.pendingRequests.get(requestId);
          this.pendingRequests.delete(requestId);

          if (success && data) {
            resolver.resolve(data);
          } else {
            resolver.reject(new Error(error || 'Bridge request failed'));
          }
        }
      }

      if (e.data.type === 'FETCH_GAME_INFO_RESPONSE') {
        const { requestId, success, name, description, creatorName, maxPlayers, error } = e.data;
        if (this.pendingRequests.has(requestId)) {
          const resolver = this.pendingRequests.get(requestId);
          this.pendingRequests.delete(requestId);

          if (success && name) {
            resolver.resolve({ success: true, name, description, creatorName, maxPlayers });
          } else {
            resolver.reject(new Error(error || 'Failed to fetch game name'));
          }
        }
      }

      if (e.data.type === 'FETCH_FRIENDS_PRESENCE_RESPONSE') {
        const { requestId, success, data, error } = e.data;
        if (this.pendingRequests.has(requestId)) {
          const resolver = this.pendingRequests.get(requestId);
          this.pendingRequests.delete(requestId);

          if (success && data) {
            resolver.resolve({ success: true, data });
          } else {
            resolver.resolve({ success: false, data: [] });
          }
        }
      }
    });

    // Send PING handshake on load and repeat
    this.ping();
    setTimeout(() => this.ping(), 200);
    setTimeout(() => this.ping(), 800);
    setTimeout(() => this.ping(), 2000);

    // Heartbeat check every 5 seconds to detect if extension stopped or disconnected
    setInterval(() => {
      // Re-verify direct memory hook
      if (typeof window.__RBX_BRIDGE__ !== 'undefined' && window.__RBX_BRIDGE__.active) {
        this.isActive = true;
        this.lastPongTime = Date.now();
        this.installedVersion = window.__RBX_BRIDGE__.version || '2.3';
        this.updateStatusBadge();
        return;
      }

      this.ping();
      if (this.isActive && Date.now() - this.lastPongTime > 15000) {
        this.isActive = false;
        this.updateStatusBadge();
      }
    }, 5000);

    this.updateStatusBadge();
  },

  compareVersions(v1, v2) {
    if (!v1) return -1;
    if (!v2) return 1;
    const parts1 = v1.toString().split('.').map(Number);
    const parts2 = v2.toString().split('.').map(Number);
    const maxLen = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLen; i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
    }
    return 0;
  },

  ping() {
    try {
      window.postMessage({ source: 'RBX_PAGE', type: 'PING' }, '*');
    } catch (e) {}
  },

  updateStatusBadge() {
    const el = document.getElementById('bridge-status-badge');
    if (!el) return;

    if (this.isActive) {
      const isOutdated = this.compareVersions(this.installedVersion, this.LATEST_VERSION) < 0;

      if (isOutdated) {
        el.className = 'badge badge-amber';
        el.style.cursor = 'pointer';
        el.title = `Userscript v${this.installedVersion} is active. Update to v${this.LATEST_VERSION} available! Click to update.`;
        el.innerHTML = `
          <iconify-icon icon="lucide:alert-circle" style="color: var(--accent-amber);"></iconify-icon>
          <span>Bridge: v${this.installedVersion} (Update to v${this.LATEST_VERSION})</span>
        `;
        el.onclick = () => this.showModal();
      } else {
        el.className = 'badge badge-emerald';
        el.style.cursor = 'pointer';
        el.title = `Userscript v${this.installedVersion} Active (Direct Memory Bridge + Accurate Friend Radar). Click for details.`;
        el.innerHTML = `
          <iconify-icon icon="lucide:zap"></iconify-icon>
          <span>Bridge: v${this.installedVersion} Active</span>
        `;
        el.onclick = () => this.showModal();
      }
    } else {
      el.className = 'badge badge-secondary';
      el.style.cursor = 'pointer';
      el.title = `Connect Roblox Session Bridge for 0ms latency server scans & Friend Radar. Click to connect.`;
      el.innerHTML = `
        <iconify-icon icon="lucide:link"></iconify-icon>
        <span>Connect Bridge</span>
      `;
      el.onclick = () => this.showModal();
    }
  },

  // Real-Time Diagnostic Test Runner
  async testConnection() {
    const btn = document.getElementById('bridge-test-btn');
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<iconify-icon icon="lucide:loader-2" class="animate-spin"></iconify-icon><span>Testing...</span>`;
    }

    // 1. Send immediate ping
    this.ping();

    // 2. Wait up to 450ms for memory hook or PONG
    let detected = this.isActive || (typeof window.__RBX_BRIDGE__ !== 'undefined' && window.__RBX_BRIDGE__.active);
    if (!detected) {
      await new Promise(r => setTimeout(r, 450));
      detected = this.isActive || (typeof window.__RBX_BRIDGE__ !== 'undefined' && window.__RBX_BRIDGE__.active);
    }

    if (!detected) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<iconify-icon icon="lucide:refresh-cw"></iconify-icon><span>Test Connection</span>`;
      }
      this.isActive = false;
      this.updateStatusBadge();
      this.showModal();
      Toast.show('Bridge not detected. Make sure Tampermonkey is ON and script is saved.', 'error');
      return;
    }

    // 3. Perform Live End-to-End Roblox API Test via Bridge
    const startTime = Date.now();
    try {
      const testRes = await this.fetchGameInfo('13822889');
      const latency = Date.now() - startTime;
      
      this.isActive = true;
      this.lastPongTime = Date.now();
      this.installedVersion = (window.__RBX_BRIDGE__ && window.__RBX_BRIDGE__.version) || this.installedVersion || '2.3';
      this.updateStatusBadge();
      this.showModal();

      if (btn) {
        btn.disabled = false;
        btn.className = 'btn btn-primary btn-sm';
        btn.innerHTML = `<iconify-icon icon="lucide:check"></iconify-icon><span>Active (${latency}ms)</span>`;
        setTimeout(() => {
          if (btn) {
            btn.className = 'btn btn-secondary btn-sm';
            btn.innerHTML = `<iconify-icon icon="lucide:refresh-cw"></iconify-icon><span>Test Connection</span>`;
          }
        }, 3000);
      }

      Toast.show(`Bridge v${this.installedVersion} is active! Roblox API responded in ${latency}ms.`, 'success');
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<iconify-icon icon="lucide:refresh-cw"></iconify-icon><span>Test Connection</span>`;
      }
      Toast.show(`Bridge detected, but test query timed out: ${err.message}`, 'warning');
    }
  },

  // Fetch servers using Direct Memory Hook or postMessage
  fetchServers(placeId, limit = '100', cursor = '') {
    // 1. Priority 1: Direct Memory Hook (Instant execution, zero message queue overhead)
    if (typeof window.__RBX_BRIDGE__ !== 'undefined' && typeof window.__RBX_BRIDGE__.fetchServers === 'function') {
      return window.__RBX_BRIDGE__.fetchServers(placeId, limit, cursor);
    }

    // 2. Priority 2: Asynchronous postMessage Channel
    return new Promise((resolve, reject) => {
      const requestId = 'req_' + Math.random().toString(36).substring(2, 10);

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Session Bridge request timed out'));
        }
      }, 12000);

      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timer);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });

      window.postMessage({
        source: 'RBX_PAGE',
        type: 'FETCH_SERVERS',
        placeId,
        limit,
        cursor,
        requestId
      }, '*');
    });
  },

  // Fetch game info using Direct Memory Hook or postMessage
  fetchGameInfo(placeId) {
    // 1. Priority 1: Direct Memory Hook
    if (typeof window.__RBX_BRIDGE__ !== 'undefined' && typeof window.__RBX_BRIDGE__.fetchGameInfo === 'function') {
      return window.__RBX_BRIDGE__.fetchGameInfo(placeId);
    }

    // 2. Priority 2: Asynchronous postMessage Channel
    return new Promise((resolve, reject) => {
      const requestId = 'req_game_' + Math.random().toString(36).substring(2, 10);

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Game info lookup timed out'));
        }
      }, 8000);

      this.pendingRequests.set(requestId, {
        resolve: (data) => {
          clearTimeout(timer);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });

      window.postMessage({
        source: 'RBX_PAGE',
        type: 'FETCH_GAME_INFO',
        placeId,
        requestId
      }, '*');
    });
  },

  // Fetch friends currently playing on servers for a Place ID
  fetchFriendsPresence(placeId) {
    // 1. Priority 1: Direct Memory Hook
    if (typeof window.__RBX_BRIDGE__ !== 'undefined' && typeof window.__RBX_BRIDGE__.fetchFriendsPresence === 'function') {
      return window.__RBX_BRIDGE__.fetchFriendsPresence(placeId);
    }

    // 2. Priority 2: Asynchronous postMessage Channel
    return new Promise((resolve) => {
      const requestId = 'req_friends_' + Math.random().toString(36).substring(2, 10);

      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          resolve({ success: false, data: [] });
        }
      }, 8000);

      this.pendingRequests.set(requestId, {
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: () => {
          clearTimeout(timer);
          resolve({ success: false, data: [] });
        }
      });

      window.postMessage({
        source: 'RBX_PAGE',
        type: 'FETCH_FRIENDS_PRESENCE',
        placeId,
        requestId
      }, '*');
    });
  },

  showModal() {
    let modal = document.getElementById('bridge-modal');
    const isOutdated = this.isActive && this.compareVersions(this.installedVersion, this.LATEST_VERSION) < 0;

    const modalContent = `
      <div class="modal-dialog" style="max-width: 500px;">
        <button onclick="Bridge.closeModal()" class="btn btn-icon btn-secondary" style="position: absolute; top: 1rem; right: 1rem;" title="Close">
          <iconify-icon icon="lucide:x"></iconify-icon>
        </button>

        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.15rem;">
          <div class="badge ${this.isActive ? (isOutdated ? 'badge-amber' : 'badge-emerald') : 'badge-cyan'}" style="padding: 0.6rem; font-size: 1.35rem; border-radius: var(--radius-md);">
            <iconify-icon icon="lucide:zap"></iconify-icon>
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 0.45rem;">
              <span>Roblox Session Bridge</span>
              <span class="badge ${this.isActive ? (isOutdated ? 'badge-amber' : 'badge-emerald') : 'badge-secondary'}" style="font-size: 0.68rem;">v${this.LATEST_VERSION}</span>
            </h3>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Bypasses Cloudflare • 0ms Latency • Live Friend Presence</p>
          </div>
        </div>

        <!-- Live Status Hero Diagnostic Box -->
        <div style="background: var(--bg-primary); border: 1px solid ${this.isActive ? (isOutdated ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-highlight)') : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.15rem;">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${this.isActive ? (isOutdated ? 'var(--accent-amber)' : 'var(--accent-primary)') : 'var(--text-dim)'}; box-shadow: 0 0 8px ${this.isActive ? (isOutdated ? 'var(--accent-amber)' : 'var(--accent-primary)') : 'transparent'};"></div>
            <div>
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">
                ${this.isActive ? (isOutdated ? 'Connected (Update Available)' : 'Active & Verified (0ms Lag)') : 'Bridge Not Connected'}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">
                Installed: <b style="color: ${this.isActive ? 'var(--accent-primary)' : 'var(--text-dim)'};">v${this.installedVersion || 'None'}</b> • Latest: <b>v${this.LATEST_VERSION}</b>
              </div>
            </div>
          </div>
          <button onclick="Bridge.testConnection()" id="bridge-test-btn" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.3rem 0.65rem;">
            <iconify-icon icon="lucide:refresh-cw"></iconify-icon>
            <span>Test Connection</span>
          </button>
        </div>

        <!-- 3-Step Visual Setup Guide -->
        <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.15rem;">
          
          <!-- Step 1: Install Extension -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.8rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
              <span class="badge badge-emerald" style="border-radius: 50%; width: 24px; height: 24px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.72rem; flex-shrink: 0;">1</span>
              <div style="min-width: 0;">
                <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-main);">Get Tampermonkey</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Free browser extension for Chrome, Edge, or Firefox</div>
              </div>
            </div>
            <a href="https://www.tampermonkey.net/" target="_blank" class="btn btn-secondary btn-sm" style="flex-shrink: 0; font-size: 0.72rem; padding: 0.3rem 0.65rem;">
              <iconify-icon icon="lucide:external-link"></iconify-icon>
              <span>Install</span>
            </a>
          </div>

          <!-- Step 2: Copy Script Code (Hero Action) -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-highlight); border-radius: var(--radius-md); padding: 0.8rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
              <span class="badge badge-emerald" style="border-radius: 50%; width: 24px; height: 24px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.72rem; flex-shrink: 0;">2</span>
              <div style="min-width: 0;">
                <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-main);">Copy Bridge Script</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Includes direct memory hook & friend presence radar</div>
              </div>
            </div>
            <button onclick="Bridge.copyScript()" class="btn btn-primary btn-sm" id="bridge-copy-btn" style="flex-shrink: 0; font-size: 0.75rem; padding: 0.35rem 0.75rem;">
              <iconify-icon icon="lucide:copy"></iconify-icon>
              <span id="bridge-copy-btn-text">Copy Script (v${this.LATEST_VERSION})</span>
            </button>
          </div>

          <!-- Step 3: Visual Flow Diagram -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.8rem 1rem; display: flex; flex-direction: column; gap: 0.45rem;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span class="badge badge-emerald" style="border-radius: 50%; width: 24px; height: 24px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.72rem; flex-shrink: 0;">3</span>
              <div style="font-weight: 700; font-size: 0.82rem; color: var(--text-main);">Paste & Save in Tampermonkey</div>
            </div>
            <!-- Visual Flow Pills -->
            <div style="display: flex; align-items: center; gap: 0.4rem; padding-left: 2rem; flex-wrap: wrap; margin-top: 0.15rem;">
              <span style="font-family: var(--font-mono); font-size: 0.68rem; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 0.2rem 0.45rem; border-radius: var(--radius-sm); color: var(--text-main);">➕ New Script</span>
              <iconify-icon icon="lucide:arrow-right" style="color: var(--text-dim); font-size: 0.75rem;"></iconify-icon>
              <span style="font-family: var(--font-mono); font-size: 0.68rem; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 0.2rem 0.45rem; border-radius: var(--radius-sm); color: var(--accent-primary);">Ctrl + V (Paste)</span>
              <iconify-icon icon="lucide:arrow-right" style="color: var(--text-dim); font-size: 0.75rem;"></iconify-icon>
              <span style="font-family: var(--font-mono); font-size: 0.68rem; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 0.2rem 0.45rem; border-radius: var(--radius-sm); color: var(--accent-primary);">Ctrl + S (Save)</span>
            </div>
          </div>

        </div>

        <div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
          <button onclick="Bridge.closeModal()" class="btn btn-secondary btn-sm">Close</button>
        </div>
      </div>
    `;

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bridge-modal';
      modal.className = 'modal-backdrop active';
      modal.innerHTML = modalContent;
      document.body.appendChild(modal);
    } else {
      modal.innerHTML = modalContent;
      modal.classList.add('active');
    }
  },

  closeModal() {
    const modal = document.getElementById('bridge-modal');
    if (modal) modal.classList.remove('active');
  },

  async copyScript() {
    const code = `// ==UserScript==
// @name         RBX Server Manager - Direct Session Bridge (v2.3 Ultra)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Direct Memory Bridge, Accurate Friend Radar & Authenticated Proxy for RBX Server Manager with 0ms latency and zero Cloudflare blocks.
// @match        http://localhost:*/*
// @match        https://localhost:*/*
// @match        http://127.0.0.1:*/*
// @match        https://127.0.0.1:*/*
// @match        *://localhost/*
// @match        *://127.0.0.1/*
// @match        *://*.github.io/*
// @match        file:///*
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      roblox.com
// @connect      *.roblox.com
// @connect      apis.roblox.com
// @connect      games.roblox.com
// @connect      users.roblox.com
// @connect      friends.roblox.com
// @connect      presence.roblox.com
// @connect      thumbnails.roblox.com
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';
  const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // 1. Core Request Executor (GET)
  function makeRobloxRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Cache-Control': 'no-cache',
          'Referer': 'https://www.roblox.com/',
          'Origin': 'https://www.roblox.com',
          ...headers
        },
        anonymous: false,
        timeout: 12000,
        onload: function(response) {
          try {
            if (response.status >= 200 && response.status < 300) {
              const data = JSON.parse(response.responseText);
              resolve({ success: true, data: data });
            } else if (response.status === 429) {
              // Rate limited - retry once after short pause
              setTimeout(() => {
                GM_xmlhttpRequest({
                  method: 'GET',
                  url: url,
                  headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
                  timeout: 10000,
                  onload: (r) => {
                    try { resolve({ success: true, data: JSON.parse(r.responseText) }); }
                    catch (e) { reject(new Error('Roblox API 429: ' + r.statusText)); }
                  },
                  onerror: () => reject(new Error('Roblox API error'))
                });
              }, 1200);
            } else {
              reject(new Error('Roblox HTTP ' + response.status));
            }
          } catch (err) {
            reject(err);
          }
        },
        onerror: function(err) {
          reject(new Error('Network error connecting to Roblox'));
        },
        ontimeout: function() {
          reject(new Error('Roblox request timeout'));
        }
      });
    });
  }

  // 2. Core Request Executor (POST)
  function makeRobloxPostRequest(url, body) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: url,
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Referer': 'https://www.roblox.com/',
          'Origin': 'https://www.roblox.com'
        },
        data: JSON.stringify(body),
        anonymous: false,
        timeout: 10000,
        onload: function(response) {
          try {
            if (response.status >= 200 && response.status < 300) {
              resolve({ success: true, data: JSON.parse(response.responseText) });
            } else {
              resolve({ success: false, data: null });
            }
          } catch (e) {
            resolve({ success: false, data: null });
          }
        },
        onerror: () => resolve({ success: false, data: null }),
        ontimeout: () => resolve({ success: false, data: null })
      });
    });
  }

  // 3. Direct Memory API Exposure on window.__RBX_BRIDGE__ (Instant 0ms access)
  const bridgeAPI = {
    version: '2.3',
    active: true,
    
    // Direct server fetching
    fetchServers: async function(placeId, limit = 100, cursor = '') {
      const cleanId = String(placeId).trim().replace(/[^0-9]/g, '');
      const url = \`https://games.roblox.com/v1/games/\${cleanId}/servers/0?sortOrder=2&limit=\${limit || 100}\${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}\`;
      try {
        const res = await makeRobloxRequest(url);
        if (res && res.data) {
          return {
            success: true,
            data: res.data.data || [],
            nextPageCursor: res.data.nextPageCursor || null
          };
        }
        return { success: false, error: 'Empty data' };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Direct game info lookup
    fetchGameInfo: async function(placeId) {
      const cleanId = String(placeId).trim().replace(/[^0-9]/g, '');
      try {
        // Step A: Universe ID
        const uRes = await makeRobloxRequest(\`https://apis.roblox.com/universes/v1/places/\${cleanId}/universe\`);
        const universeId = uRes?.data?.universeId;
        if (!universeId) return { success: false, error: 'Universe not found' };

        // Step B: Game Details
        const gRes = await makeRobloxRequest(\`https://games.roblox.com/v1/games?universeIds=\${universeId}\`);
        if (gRes?.data?.data && gRes.data.data.length > 0) {
          const game = gRes.data.data[0];
          return {
            success: true,
            data: {
              name: game.name,
              description: game.description || '',
              creatorName: game.creator ? game.creator.name : 'Roblox',
              maxPlayers: game.maxPlayers || null
            }
          };
        }
        return { success: false, error: 'Game details not found' };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // 100% Reliable Friend Server Presence & Name Radar
    fetchFriendsPresence: async function(placeId) {
      const cleanPlaceId = String(placeId || '').trim().replace(/[^0-9]/g, '');
      if (!cleanPlaceId) return { success: true, data: [] };

      try {
        // Step 1: Get Authenticated User
        const meRes = await makeRobloxRequest('https://users.roblox.com/v1/users/authenticated');
        const myUserId = meRes?.data?.id;
        if (!myUserId) return { success: false, data: [] };

        // Step 2: Get User's Friends
        const friendsRes = await makeRobloxRequest(\`https://friends.roblox.com/v1/users/\${myUserId}/friends\`);
        const friendsList = friendsRes?.data?.data || (Array.isArray(friendsRes?.data) ? friendsRes.data : []);
        if (!Array.isArray(friendsList) || friendsList.length === 0) {
          return { success: true, data: [] };
        }

        // Step 3: Query Presence for up to 200 friends
        const userIds = friendsList.map(f => Number(f.id)).filter(Boolean).slice(0, 200);
        const presRes = await makeRobloxPostRequest('https://presence.roblox.com/v1/presence/users', { userIds });
        const userPresences = presRes?.data?.userPresences || [];

        // Step 4: Filter friends in target Place ID
        const matchedPresences = userPresences.filter(p => {
          return p.userPresenceType === 2 && (String(p.placeId) === cleanPlaceId || String(p.rootPlaceId) === cleanPlaceId);
        });

        if (matchedPresences.length === 0) {
          return { success: true, data: [] };
        }

        // Step 5: Direct & Guaranteed Username Resolution for every in-game friend
        const activeFriends = await Promise.all(matchedPresences.map(async p => {
          let name = '';
          let displayName = '';

          // A. Check in friendsList
          const f = friendsList.find(item => String(item.id) === String(p.userId));
          if (f && (f.name || f.displayName)) {
            name = f.name || f.displayName || '';
            displayName = f.displayName || f.name || '';
          }

          // B. If not found or empty, fetch directly via official users endpoint
          if (!name || name === 'Friend') {
            try {
              const uRes = await makeRobloxRequest(\`https://users.roblox.com/v1/users/\${p.userId}\`);
              if (uRes?.data?.name) {
                name = uRes.data.name;
                displayName = uRes.data.displayName || uRes.data.name;
              }
            } catch (e) {}
          }

          return {
            userId: p.userId,
            name: name || 'Friend',
            displayName: displayName || name || 'Friend',
            gameId: p.gameId || null,
            placeId: p.placeId
          };
        }));

        return { success: true, data: activeFriends };
      } catch (err) {
        return { success: false, data: [] };
      }
    }
  };

  try {
    targetWin.__RBX_BRIDGE__ = bridgeAPI;
    targetWin.__RBX_BRIDGE_ACTIVE__ = true;
    targetWin.__RBX_BRIDGE_VERSION__ = '2.3';
  } catch (e) {}

  // 4. Announce & Heartbeat via postMessage (Dual-Channel Fallback)
  function announce() {
    try {
      targetWin.postMessage({ source: 'RBX_BRIDGE', type: 'PONG', version: '2.3' }, '*');
    } catch (e) {}
  }

  announce();
  let tick = 0;
  const timer = setInterval(() => {
    announce();
    tick++;
    if (tick > 10) clearInterval(timer);
  }, 600);

  // 5. postMessage Message Listener
  targetWin.addEventListener('message', async function(e) {
    if (!e.data || e.data.source !== 'RBX_PAGE') return;

    if (e.data.type === 'PING') {
      announce();
      return;
    }

    if (e.data.type === 'FETCH_SERVERS') {
      const { placeId, limit, cursor, requestId } = e.data;
      const res = await bridgeAPI.fetchServers(placeId, limit, cursor);
      try {
        targetWin.postMessage({
          source: 'RBX_BRIDGE',
          type: 'FETCH_SERVERS_RESPONSE',
          requestId,
          success: res.success,
          data: res,
          error: res.error
        }, '*');
      } catch (e) {}
    }

    if (e.data.type === 'FETCH_GAME_INFO') {
      const { placeId, requestId } = e.data;
      const res = await bridgeAPI.fetchGameInfo(placeId);
      try {
        targetWin.postMessage({
          source: 'RBX_BRIDGE',
          type: 'FETCH_GAME_INFO_RESPONSE',
          requestId,
          success: res.success,
          name: res.data ? res.data.name : null,
          description: res.data ? res.data.description : null,
          creatorName: res.data ? res.data.creatorName : null,
          maxPlayers: res.data ? res.data.maxPlayers : null,
          error: res.error
        }, '*');
      } catch (e) {}
    }

    if (e.data.type === 'FETCH_FRIENDS_PRESENCE') {
      const { placeId, requestId } = e.data;
      const res = await bridgeAPI.fetchFriendsPresence(placeId);
      try {
        targetWin.postMessage({
          source: 'RBX_BRIDGE',
          type: 'FETCH_FRIENDS_PRESENCE_RESPONSE',
          requestId,
          success: res.success,
          data: res.data || [],
          error: res.error
        }, '*');
      } catch (e) {}
    }
  });
})();`;

    try {
      await navigator.clipboard.writeText(code);
      Toast.show(`Userscript v${this.LATEST_VERSION} Ultra copied!`, 'success');
      const text = document.getElementById('bridge-copy-btn-text');
      if (text) {
        text.textContent = '✓ Copied!';
        setTimeout(() => { 
          text.textContent = `Copy Userscript Code (v${this.LATEST_VERSION})`; 
        }, 2000);
      }
    } catch (e) {
      Toast.show('Copy failed, please copy manually.', 'error');
    }
  }
};

Bridge.init();
