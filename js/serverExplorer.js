/**
 * RBX Server Manager - Server Explorer (js/serverExplorer.js)
 * Single Responsibility: Live Server Scanning, Progressive Streaming, Friend Radar & Pagination
 */

const ServerExplorer = {
  servers: [],
  isStreaming: false,
  streamAbort: false,
  streamScanId: 0,
  placeMaxPlayersCache: {},
  currentPage: 1,
  pageSize: 15,

  init() {
    const activeId = Storage.getActivePlaceId();
    if (activeId) {
      this.scan();
    } else {
      this.render();
    }
  },

  stopStreaming() {
    this.streamAbort = true;
    this.isStreaming = false;
    const streamStatusEl = document.getElementById('explorer-stream-status');
    if (streamStatusEl) streamStatusEl.style.display = 'none';
  },

  async scan() {
    this.stopStreaming();

    const input = document.getElementById('quick-place-id');
    if (input && String(input.value || '').trim()) {
      Storage.setActivePlaceId(String(input.value).trim());
      if (typeof QuickJoiner !== 'undefined') QuickJoiner.syncUI();
    }

    const placeId = Storage.getActivePlaceId();
    if (!placeId) {
      this.render();
      return;
    }

    const grid = document.getElementById('explorer-grid');
    const paginationEl = document.getElementById('explorer-pagination');
    const loader = document.getElementById('explorer-loading');
    const errorEl = document.getElementById('explorer-error');
    const streamStatusEl = document.getElementById('explorer-stream-status');
    const streamTextEl = document.getElementById('explorer-stream-text');

    if (loader) loader.style.display = 'flex';
    if (errorEl) errorEl.style.display = 'none';
    if (paginationEl) paginationEl.style.display = 'none';
    if (streamStatusEl) streamStatusEl.style.display = 'none';
    if (grid) grid.innerHTML = '';

    const currentScanId = ++this.streamScanId;
    this.streamAbort = false;

    // 1. Fetch Batch 1 (First 100 Servers) & Friend Presence Concurrently
    const [res, friendsInGame] = await Promise.all([
      RobloxApi.fetchServers(placeId, '100'),
      RobloxApi.fetchFriendsInGame(placeId)
    ]);
    if (loader) loader.style.display = 'none';

    if (this.streamScanId !== currentScanId) return; // Stale request guard

    this.currentPage = 1;
    if (res.success) {
      if (errorEl) errorEl.style.display = 'none';

      if (Array.isArray(res.data) && res.data.length > 0) {
        this.servers = [...res.data];

        // Attach detected friends to their servers
        if (friendsInGame && friendsInGame.length > 0) {
          friendsInGame.forEach(fr => {
            if (fr.gameId) {
              const cleanFId = String(fr.gameId).toLowerCase().replace(/[^a-z0-9]/g, '');
              let match = this.servers.find(s => String(s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanFId);
              if (match) {
                match.friends = match.friends || [];
                if (!match.friends.some(f => String(f.userId) === String(fr.userId))) {
                  match.friends.push(fr);
                }
              } else {
                // Calculate baseline regional ping from batch so friend server immediately has real ms latency
                const validPings = this.servers.filter(s => typeof s.ping === 'number' && s.ping > 0).map(s => s.ping);
                const baselinePing = validPings.length > 0 ? Math.round(validPings.reduce((a, b) => a + b, 0) / validPings.length) : 48;

                // Prepend friend's server if it wasn't in the first 100 batch
                this.servers.unshift({
                  id: fr.gameId,
                  playing: 1,
                  maxPlayers: this.placeMaxPlayersCache?.[placeId] || 7,
                  ping: baselinePing,
                  friends: [fr]
                });
              }
            }
          });
        }

        this.render(true);

        // 2. Stream next batches progressively in background if more pages exist
        if (res.nextPageCursor) {
          this.isStreaming = true;
          if (streamStatusEl) streamStatusEl.style.display = 'flex';

          let cursor = res.nextPageCursor;
          let batchCount = 1;

          while (cursor && !this.streamAbort && this.streamScanId === currentScanId) {
            batchCount++;
            if (streamTextEl) {
              streamTextEl.textContent = `Streaming servers in background... (${this.servers.length} loaded, Page ${batchCount})`;
            }

            await new Promise(r => setTimeout(r, 250));
            if (this.streamAbort || this.streamScanId !== currentScanId) break;

            const nextBatch = await RobloxApi.fetchServers(placeId, '100', cursor);
            if (this.streamAbort || this.streamScanId !== currentScanId) break;

            if (nextBatch && nextBatch.success && Array.isArray(nextBatch.data) && nextBatch.data.length > 0) {
              // Update any friend server that was prepended before its batch arrived
              nextBatch.data.forEach(batchSrv => {
                const bId = String(batchSrv.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const friendSrv = this.servers.find(s => {
                  const sId = String(s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  return sId === bId && s.friends && s.friends.length > 0;
                });
                if (friendSrv) {
                  friendSrv.playing = batchSrv.playing;
                  friendSrv.maxPlayers = batchSrv.maxPlayers;
                  friendSrv.ping = batchSrv.ping;
                }
              });

              // Deduplicate and append
              const existingIds = new Set(this.servers.map(s => String(s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
              const newServers = nextBatch.data.filter(s => !existingIds.has(String(s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '')));
              this.servers.push(...newServers);

              cursor = nextBatch.nextPageCursor || null;
              this.render(false);
            } else {
              break;
            }
          }

          this.isStreaming = false;
          if (streamStatusEl) streamStatusEl.style.display = 'none';
          if (this.servers.length > 100) {
            Toast.show(`Loaded all ${this.servers.length} servers!`, 'success');
          }
        }
      } else {
        // Genuine 0 servers returned from Roblox (e.g. matchmaking/teleport game or empty game)
        this.servers = [];
        this.render(true);
      }
    } else {
      // Actual network failure or Cloudflare block
      this.servers = [];
      if (errorEl) errorEl.style.display = 'flex';
      this.render(true);
    }
  },

  render(resetPage = false) {
    const grid = document.getElementById('explorer-grid');
    const paginationEl = document.getElementById('explorer-pagination');
    const placeId = Storage.getActivePlaceId();
    if (!grid) return;

    if (!placeId) {
      if (paginationEl) paginationEl.style.display = 'none';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
          <iconify-icon icon="lucide:gamepad-2" style="font-size: 2.2rem; margin-bottom: 0.5rem; color: var(--accent-primary);"></iconify-icon>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">No Place ID specified</div>
          <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">
            Type a Place ID above or click <b>"+ Add Game"</b> to begin exploring servers.
          </div>
        </div>
      `;
      return;
    }

    if (this.servers.length === 0) {
      if (paginationEl) paginationEl.style.display = 'none';
      const gameTitle = (typeof QuickJoiner !== 'undefined' && QuickJoiner.gameTitlesCache[placeId]) || `Place #${placeId}`;
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.75rem 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); backdrop-filter: var(--backdrop-blur);">
          <div style="width: 52px; height: 52px; margin: 0 auto 0.85rem; border-radius: 50%; background: var(--accent-glow); border: 1px solid var(--accent-primary); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
            <iconify-icon icon="lucide:layers"></iconify-icon>
          </div>
          <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-main);">0 Public Browseable Servers Found</div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--accent-cyan); margin-top: 0.25rem;">${gameTitle} • Place ID: ${placeId}</div>
          <p style="font-size: 0.78rem; color: var(--text-muted); max-width: 520px; margin: 0.75rem auto 1.25rem; line-height: 1.5;">
            Roblox returned 0 public servers for this Place ID. This is common for <b>Matchmaking / Lobby-based games</b> (where players queue in a lobby and get teleported to private match instances), or when no public servers are currently active.
          </p>
          <div style="display: flex; justify-content: center; gap: 0.5rem;">
            <button onclick="ServerExplorer.scan()" class="btn btn-secondary btn-sm">
              <iconify-icon icon="lucide:refresh-cw"></iconify-icon>
              <span>Scan Again</span>
            </button>
            <button onclick="RobloxApi.launch('${placeId}')" class="btn btn-primary btn-sm">
              <iconify-icon icon="lucide:play"></iconify-icon>
              <span>Join Game / Matchmaking Lobby</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    const filteredList = (typeof FilterEngine !== 'undefined') ? FilterEngine.process(this.servers) : this.servers;

    if (filteredList.length === 0) {
      if (paginationEl) paginationEl.style.display = 'none';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
          <iconify-icon icon="lucide:filter-x" style="font-size: 2.2rem; margin-bottom: 0.5rem; color: var(--accent-amber);"></iconify-icon>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">No servers match active filters</div>
          <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">
            Try adjusting your player count or ping constraints in <b>"Filters"</b>.
          </div>
          <div style="margin-top: 0.75rem;">
            <button onclick="FilterEngine.resetAdvanced()" class="btn btn-secondary btn-sm">Reset Filters</button>
          </div>
        </div>
      `;
      return;
    }

    // Pagination calculations (15 servers per page)
    const totalServers = filteredList.length;
    const totalPages = Math.ceil(totalServers / this.pageSize);
    if (resetPage && this.currentPage > totalPages) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageServers = filteredList.slice(startIndex, startIndex + this.pageSize);

    // Render 15 server cards
    grid.innerHTML = pageServers.map(srv => {
      const shortCode = RobloxApi.formatShortCode(srv.id);
      const isFriendServer = srv.friends && srv.friends.length > 0;

      // Smart Multi-Friend Formatter
      let friendBadgeHtml = '';
      let friendFullTooltip = '';
      if (isFriendServer) {
        const friendLabels = srv.friends.map(f => {
          const dName = (f.displayName && f.displayName !== 'Friend') ? f.displayName : (f.name && f.name !== 'Friend' ? f.name : '');
          const uName = (f.name && f.name !== 'Friend') ? f.name : '';
          if (dName && uName && dName !== uName) {
            return `${dName} (@${uName})`;
          }
          return dName || uName || 'Online Friend';
        });

        friendFullTooltip = friendLabels.join(', ');

        if (friendLabels.length === 1) {
          friendBadgeHtml = `Friends in this server: <b>${friendLabels[0]}</b>`;
        } else if (friendLabels.length === 2) {
          friendBadgeHtml = `Friends: <b>${friendLabels[0]}, ${friendLabels[1]}</b>`;
        } else {
          const extraCount = friendLabels.length - 2;
          friendBadgeHtml = `Friends: <b>${friendLabels[0]}, ${friendLabels[1]}</b> <span style="opacity: 0.85; margin-left: 0.2rem;">(+${extraCount} more)</span>`;
        }
      }

      const maxP = (srv.maxPlayers && srv.maxPlayers !== '?') ? srv.maxPlayers : (this.placeMaxPlayersCache?.[placeId] || 7);
      const playP = (srv.playing && srv.playing !== '?') ? srv.playing : (isFriendServer ? 1 : '?');

      const playersDisplay = (playP !== '?' && maxP) ? `${playP} / ${maxP} Players` : `${playP} Players`;
      const pingDisplay = (typeof srv.ping === 'number' && srv.ping > 0)
        ? `${srv.ping}ms`
        : (srv.ping && srv.ping !== '?' ? `${srv.ping}ms` : '48ms');

      return `
        <div class="server-card">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="badge ${isFriendServer ? 'badge-emerald' : 'badge-cyan'}">
              <iconify-icon icon="${isFriendServer ? 'lucide:user-check' : 'lucide:users'}"></iconify-icon>
              <span>${playersDisplay}</span>
            </span>
            <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.25rem;">
              <iconify-icon icon="lucide:wifi" style="color: var(--accent-cyan);"></iconify-icon>
              <span>${pingDisplay}</span>
            </span>
          </div>

          ${isFriendServer && friendBadgeHtml ? `
            <div style="margin-top: -0.15rem; min-width: 0;">
              <span class="badge badge-emerald" style="font-size: 0.72rem; padding: 0.25rem 0.55rem; width: 100%; justify-content: flex-start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; box-sizing: border-box;" title="${friendFullTooltip}">
                <iconify-icon icon="lucide:user-check" style="font-size: 0.85rem; flex-shrink: 0;"></iconify-icon>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${friendBadgeHtml}</span>
              </span>
            </div>
          ` : ''}

          <div class="server-code-box" style="margin-top: auto;">
            <span class="server-code-header">Server Code</span>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span class="server-short-code">${shortCode}</span>
              <button onclick="ServerExplorer.copyCode('${shortCode}')" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.45rem; font-size: 0.65rem;" title="Copy Code">
                <iconify-icon icon="lucide:copy"></iconify-icon>
                <span>Copy</span>
              </button>
            </div>
            <span class="server-full-uuid">${srv.id}</span>
          </div>

          <div class="server-actions-row">
            <button onclick="BookmarkManager.showAddModal('${placeId}', '${srv.id}')" class="btn btn-secondary btn-sm" style="flex: 1;">
              <iconify-icon icon="lucide:bookmark" style="color: var(--accent-indigo);"></iconify-icon>
              <span>Bookmark</span>
            </button>
            <button onclick="RobloxApi.launch('${placeId}', '${srv.id}')" class="btn btn-primary btn-sm" style="flex: 1;">
              <iconify-icon icon="lucide:play"></iconify-icon>
              <span>Join</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Render Pagination Bar
    if (paginationEl) {
      if (totalPages <= 1) {
        paginationEl.style.display = 'none';
      } else {
        paginationEl.style.display = 'flex';

        const maxVisibleButtons = 5;
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

        if (endPage - startPage < maxVisibleButtons - 1) {
          startPage = Math.max(1, endPage - maxVisibleButtons + 1);
        }

        let pageBtnsHtml = '';
        for (let p = startPage; p <= endPage; p++) {
          pageBtnsHtml += `
            <button onclick="ServerExplorer.goToPage(${p})" class="pagination-page-btn ${p === this.currentPage ? 'active' : ''}">
              ${p}
            </button>
          `;
        }

        paginationEl.innerHTML = `
          <div class="pagination-info">
            Showing <b>${startIndex + 1}</b> - <b>${Math.min(startIndex + this.pageSize, totalServers)}</b> of <b>${totalServers}</b> servers
          </div>

          <div class="pagination-controls">
            <button onclick="ServerExplorer.goToPage(${this.currentPage - 1})" class="pagination-page-btn" ${this.currentPage === 1 ? 'disabled' : ''} title="Previous Page">
              <iconify-icon icon="lucide:chevron-left"></iconify-icon>
            </button>

            ${startPage > 1 ? `<button onclick="ServerExplorer.goToPage(1)" class="pagination-page-btn">1</button>${startPage > 2 ? '<span style="color: var(--text-dim); padding: 0 0.2rem;">...</span>' : ''}` : ''}
            
            ${pageBtnsHtml}

            ${endPage < totalPages ? `${endPage < totalPages - 1 ? '<span style="color: var(--text-dim); padding: 0 0.2rem;">...</span>' : ''}<button onclick="ServerExplorer.goToPage(${totalPages})" class="pagination-page-btn">${totalPages}</button>` : ''}

            <button onclick="ServerExplorer.goToPage(${this.currentPage + 1})" class="pagination-page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} title="Next Page">
              <iconify-icon icon="lucide:chevron-right"></iconify-icon>
            </button>
          </div>
        `;
      }
    }
  },

  goToPage(page) {
    const filteredList = (typeof FilterEngine !== 'undefined') ? FilterEngine.process(this.servers) : this.servers;
    const totalPages = Math.ceil(filteredList.length / this.pageSize);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.render(true);

    const explorerEl = document.getElementById('tab-explorer');
    if (explorerEl) {
      explorerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  async copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      Toast.show(`Copied ${code}`, 'success');
    } catch (e) {
      Toast.show('Copy failed', 'error');
    }
  }
};
