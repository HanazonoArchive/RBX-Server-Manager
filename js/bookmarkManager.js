/**
 * RBX Server Manager - Bookmark Manager (js/bookmarkManager.js)
 * Single Responsibility: Saved Server Bookmarks, Dynamic Game Categories, Add & Delete Confirmation Modals
 */

const BookmarkManager = {
  gameFilter: 'all',
  sort: 'recent',
  modalPlaceTimer: null,
  modalJobTimer: null,

  init() {
    // Initial setup if needed
  },

  setGameFilter(placeId) {
    this.gameFilter = placeId;
    this.render();
  },

  setSort(sortMode) {
    this.sort = sortMode;
    this.render();
  },

  render() {
    const grid = document.getElementById('saved-servers-grid');
    const toolbar = document.getElementById('bookmarks-toolbar');
    const gameFiltersContainer = document.getElementById('bookmarks-game-filters');
    const list = Storage.getSavedServers();
    if (!grid) return;

    if (list.length === 0) {
      if (toolbar) toolbar.style.display = 'none';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: var(--text-dim);">
          <iconify-icon icon="lucide:bookmark-x" style="font-size: 2.8rem; margin-bottom: 0.5rem; color: var(--accent-indigo);"></iconify-icon>
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-main);">No saved bookmarks yet</div>
          <div style="font-size: 0.78rem; margin-top: 0.25rem; color: var(--text-muted);">
            Click <b>"+ Add Server"</b> or bookmark any server from the Explorer to save it here.
          </div>
          <div style="margin-top: 1rem;">
            <button onclick="BookmarkManager.showAddModal()" class="btn btn-primary btn-sm">
              <iconify-icon icon="lucide:plus"></iconify-icon>
              <span>Add Your First Server</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (toolbar) toolbar.style.display = 'flex';

    // 1. Dynamic Game Category Counts
    const gameCounts = {};
    list.forEach(s => {
      const pId = String(s.placeId || 'unknown').trim();
      gameCounts[pId] = (gameCounts[pId] || 0) + 1;
    });

    if (gameFiltersContainer) {
      let filtersHtml = `
        <button onclick="BookmarkManager.setGameFilter('all')" class="btn btn-sm ${this.gameFilter === 'all' ? 'btn-primary' : 'btn-secondary'}">
          <span>All (${list.length})</span>
        </button>
      `;

      Object.keys(gameCounts).forEach(pId => {
        const title = (typeof QuickJoiner !== 'undefined' && QuickJoiner.gameTitlesCache[pId]) || `Place #${pId}`;
        const active = this.gameFilter === pId;
        filtersHtml += `
          <button onclick="BookmarkManager.setGameFilter('${pId}')" class="btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}" title="${title}">
            <span style="max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle;">${title}</span>
            <span class="badge ${active ? 'badge-cyan' : 'badge-emerald'}" style="padding: 0 0.3rem; font-size: 0.65rem;">${gameCounts[pId]}</span>
          </button>
        `;
      });

      gameFiltersContainer.innerHTML = filtersHtml;
    }

    // 2. Filter list by selected game
    let filtered = [...list];
    if (this.gameFilter !== 'all') {
      filtered = filtered.filter(s => String(s.placeId || '').trim() === this.gameFilter);
    }

    // 3. Sort list
    if (this.sort === 'game-title') {
      filtered.sort((a, b) => {
        const cache = (typeof QuickJoiner !== 'undefined') ? QuickJoiner.gameTitlesCache : {};
        const nameA = cache[String(a.placeId).trim()] || a.name || '';
        const nameB = cache[String(b.placeId).trim()] || b.name || '';
        return nameA.localeCompare(nameB);
      });
    }

    // 4. Render Bento Grid Cards
    grid.innerHTML = filtered.map((s, idx) => {
      const pId = String(s.placeId || '').trim();
      const gameTitle = (typeof QuickJoiner !== 'undefined' && QuickJoiner.gameTitlesCache[pId]) || (pId ? `Game #${pId}` : 'Roblox Game');
      const shortCode = s.jobId ? RobloxApi.formatShortCode(s.jobId) : 'No Job ID';

      return `
        <div class="server-card">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.45rem;">
            <div class="bookmark-title-wrap">
              <iconify-icon icon="lucide:bookmark" style="color: var(--accent-primary); flex-shrink: 0;"></iconify-icon>
              <span class="bookmark-title-text" title="${s.name}">${s.name}</span>
            </div>
            
            <span class="badge badge-indigo bookmark-game-badge" title="${gameTitle}">
              <span class="bookmark-badge-text">${gameTitle}</span>
            </span>
          </div>

          <!-- Place ID & Tag Info -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem;">
            <span class="badge badge-secondary" style="border: 1px solid var(--border-color); font-size: 0.68rem;">
              <iconify-icon icon="lucide:bookmark-check" style="color: var(--accent-primary);"></iconify-icon>
              <span>Saved Instance</span>
            </span>
            <span style="font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-dim); flex-shrink: 0;">ID: ${pId}</span>
          </div>

          <div class="server-code-box">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span class="server-short-code" style="font-size: 0.95rem;">${shortCode}</span>
              <button onclick="ServerExplorer.copyCode('${shortCode}')" class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.62rem;" title="Copy Code">
                <iconify-icon icon="lucide:copy"></iconify-icon>
                <span>Copy</span>
              </button>
            </div>
            <span class="server-full-uuid">${s.jobId || ''}</span>
          </div>

          ${s.notes ? `<p style="font-size: 0.7rem; color: var(--text-muted); background: var(--bg-primary); padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.notes}">${s.notes}</p>` : ''}

          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.35rem; border-top: 1px solid var(--border-color); gap: 0.4rem;">
            <button onclick="BookmarkManager.showDeleteModal(${idx})" class="btn btn-danger btn-sm" style="padding: 0.35rem 0.5rem;" title="Delete bookmark">
              <iconify-icon icon="lucide:trash-2"></iconify-icon>
            </button>
            <button onclick="RobloxApi.launch('${pId}', '${s.jobId}')" class="btn btn-primary btn-sm" style="flex: 1;">
              <iconify-icon icon="lucide:play"></iconify-icon>
              <span>Join Server</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  showAddModal(initialPlaceId = '', initialJobId = '') {
    const activePlaceId = String(initialPlaceId || Storage.getActivePlaceId() || '').trim();
    const shortCode = initialJobId ? RobloxApi.formatShortCode(initialJobId) : '';

    let modal = document.getElementById('bookmark-modal');
    if (!modal) {
      const modalHtml = `
        <div id="bookmark-modal" class="modal-backdrop active">
          <div class="modal-dialog">
            <button onclick="BookmarkManager.closeAddModal()" class="btn btn-icon btn-secondary" style="position: absolute; top: 1rem; right: 1rem;" title="Close">
              <iconify-icon icon="lucide:x"></iconify-icon>
            </button>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="badge badge-emerald" style="padding: 0.5rem; font-size: 1.2rem; border-radius: var(--radius-md);">
                <iconify-icon icon="lucide:bookmark-plus"></iconify-icon>
              </div>
              <div>
                <h3 style="font-size: 1.1rem; font-weight: 800;">Add Server Bookmark</h3>
                <p style="font-size: 0.75rem; color: var(--text-muted);">Save and label a server with instant 1-click launch</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              
              <!-- Place ID Input -->
              <div class="input-group">
                <label class="input-label" for="modal-bm-place-id">
                  <span>Place ID</span>
                  <span id="modal-bm-game-name" style="color: var(--accent-primary); font-weight: 600; font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;"></span>
                </label>
                <div class="input-wrapper">
                  <input type="text" id="modal-bm-place-id" placeholder="Enter Place ID..." oninput="BookmarkManager.onModalPlaceInput(this.value)" class="input-control" />
                </div>
              </div>

              <!-- Server ID / Short Code Input -->
              <div class="input-group">
                <label class="input-label" for="modal-bm-job-id">
                  <span>Server Code or Full UUID</span>
                  <span id="modal-bm-server-status" style="color: var(--accent-cyan); font-weight: 600; font-size: 0.72rem;"></span>
                </label>
                <div class="input-wrapper">
                  <input type="text" id="modal-bm-job-id" placeholder="e.g. 27eb-4606 or UUID..." oninput="BookmarkManager.onModalJobInput(this.value)" class="input-control" />
                </div>
              </div>

              <!-- Bookmark Label / Name -->
              <div class="input-group">
                <label class="input-label" for="modal-bm-name">
                  <span>Bookmark Label / Name</span>
                </label>
                <div class="input-wrapper">
                  <input type="text" id="modal-bm-name" placeholder="e.g. Server (27eb-4606)" class="input-control" />
                </div>
              </div>

              <!-- Notes -->
              <div class="input-group">
                <label class="input-label" for="modal-bm-notes">
                  <span>Notes (Optional)</span>
                </label>
                <div class="input-wrapper">
                  <input type="text" id="modal-bm-notes" placeholder="e.g. Low players, fast dupe spot" class="input-control" />
                </div>
              </div>

            </div>

            <!-- Modal Action Buttons -->
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
              <button onclick="BookmarkManager.closeAddModal()" class="btn btn-secondary btn-sm">Cancel</button>
              <button onclick="BookmarkManager.saveFromModal()" class="btn btn-primary btn-sm" id="modal-bm-save-btn">
                <iconify-icon icon="lucide:check"></iconify-icon>
                <span>Save Bookmark</span>
              </button>
            </div>
          </div>
        </div>
      `;
      const div = document.createElement('div');
      div.innerHTML = modalHtml;
      document.body.appendChild(div);
    } else {
      modal.classList.add('active');
    }

    const placeInput = document.getElementById('modal-bm-place-id');
    const jobInput = document.getElementById('modal-bm-job-id');
    const nameInput = document.getElementById('modal-bm-name');
    const notesInput = document.getElementById('modal-bm-notes');
    const gameNameStatus = document.getElementById('modal-bm-game-name');
    const serverStatus = document.getElementById('modal-bm-server-status');

    if (placeInput) placeInput.value = activePlaceId;
    if (jobInput) jobInput.value = initialJobId || '';
    if (notesInput) notesInput.value = '';
    if (nameInput) {
      nameInput.value = shortCode ? `Server (${shortCode})` : (activePlaceId ? `Server for Place #${activePlaceId}` : '');
    }

    if (gameNameStatus) gameNameStatus.textContent = '';
    if (serverStatus) serverStatus.textContent = shortCode ? `Code: ${shortCode}` : '';

    if (activePlaceId) {
      this.onModalPlaceInput(activePlaceId);
    }
  },

  closeAddModal() {
    const modal = document.getElementById('bookmark-modal');
    if (modal) modal.classList.remove('active');
  },

  onModalPlaceInput(val) {
    clearTimeout(this.modalPlaceTimer);
    const clean = String(val || '').trim().replace(/[^0-9]/g, '');
    const gameNameStatus = document.getElementById('modal-bm-game-name');
    if (!clean) {
      if (gameNameStatus) gameNameStatus.textContent = '';
      return;
    }

    this.modalPlaceTimer = setTimeout(async () => {
      if (gameNameStatus) gameNameStatus.textContent = 'Resolving game...';
      const details = await RobloxApi.fetchGameDetails(clean);
      if (gameNameStatus) {
        gameNameStatus.textContent = details && details.name ? details.name : `Place #${clean}`;
      }
    }, 400);
  },

  onModalJobInput(val) {
    clearTimeout(this.modalJobTimer);
    const raw = String(val || '').trim();
    const serverStatus = document.getElementById('modal-bm-server-status');
    const nameInput = document.getElementById('modal-bm-name');
    if (!raw) {
      if (serverStatus) serverStatus.textContent = '';
      return;
    }

    const shortCode = RobloxApi.formatShortCode(raw);
    if (serverStatus) serverStatus.textContent = shortCode ? `Code: ${shortCode}` : '';
    if (nameInput && (!nameInput.value || nameInput.value.startsWith('Server'))) {
      nameInput.value = `Server (${shortCode || raw})`;
    }
  },

  saveFromModal() {
    const placeInput = document.getElementById('modal-bm-place-id');
    const jobInput = document.getElementById('modal-bm-job-id');
    const nameInput = document.getElementById('modal-bm-name');
    const notesInput = document.getElementById('modal-bm-notes');

    const placeId = (placeInput ? String(placeInput.value || '').trim().replace(/[^0-9]/g, '') : '') || Storage.getActivePlaceId();
    const jobId = jobInput ? String(jobInput.value || '').trim() : '';
    const name = nameInput && String(nameInput.value || '').trim() ? String(nameInput.value).trim() : (jobId ? `Server (${RobloxApi.formatShortCode(jobId)})` : 'Saved Server');
    const notes = notesInput ? String(notesInput.value || '').trim() : '';

    if (!placeId && !jobId) {
      Toast.show('Please enter at least a Place ID or Server Code!', 'warning');
      return;
    }

    const list = Storage.getSavedServers();
    list.unshift({
      id: `srv-${Date.now()}`,
      name: name,
      placeId: placeId,
      jobId: jobId,
      tag: 'Saved',
      notes: notes
    });

    Storage.saveSavedServers(list);
    this.render();
    this.closeAddModal();
    Toast.show(`Saved bookmark "${name}"!`, 'success');
  },

  showDeleteModal(idx) {
    const list = Storage.getSavedServers();
    const bookmark = list[idx];
    if (!bookmark) return;

    const pId = String(bookmark.placeId || '').trim();
    const gameTitle = (typeof QuickJoiner !== 'undefined' && QuickJoiner.gameTitlesCache[pId]) || (pId ? `Game #${pId}` : 'Roblox Game');
    const shortCode = bookmark.jobId ? RobloxApi.formatShortCode(bookmark.jobId) : 'No Job ID';

    let modal = document.getElementById('delete-bookmark-modal');
    const modalContent = `
      <div class="modal-dialog" style="max-width: 420px;">
        <button onclick="BookmarkManager.closeDeleteModal()" class="btn btn-icon btn-secondary" style="position: absolute; top: 1rem; right: 1rem;" title="Close">
          <iconify-icon icon="lucide:x"></iconify-icon>
        </button>

        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div class="badge badge-rose" style="padding: 0.55rem; font-size: 1.3rem; border-radius: var(--radius-md);">
            <iconify-icon icon="lucide:trash-2"></iconify-icon>
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--accent-rose);">Delete Bookmark</h3>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Are you sure you want to remove this saved server?</p>
          </div>
        </div>

        <!-- Bookmark Preview Card -->
        <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${bookmark.name || 'Unnamed Bookmark'}</span>
            <span class="badge badge-indigo" style="font-size: 0.68rem;">${gameTitle}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
            <span>Code: <b style="color: var(--accent-primary);">${shortCode}</b></span>
            <span>Place: ${pId}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
          <button onclick="BookmarkManager.closeDeleteModal()" class="btn btn-secondary btn-sm">
            <span>Cancel</span>
          </button>
          <button onclick="BookmarkManager.confirmDelete(${idx})" class="btn btn-danger btn-sm">
            <iconify-icon icon="lucide:trash-2"></iconify-icon>
            <span>Delete Bookmark</span>
          </button>
        </div>
      </div>
    `;

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'delete-bookmark-modal';
      modal.className = 'modal-backdrop active';
      modal.innerHTML = modalContent;
      document.body.appendChild(modal);
    } else {
      modal.innerHTML = modalContent;
      modal.classList.add('active');
    }
  },

  closeDeleteModal() {
    const modal = document.getElementById('delete-bookmark-modal');
    if (modal) modal.classList.remove('active');
  },

  confirmDelete(idx) {
    const list = Storage.getSavedServers();
    if (idx >= 0 && idx < list.length) {
      const removed = list.splice(idx, 1);
      Storage.saveSavedServers(list);
      this.render();
      this.closeDeleteModal();
      Toast.show(`Deleted bookmark "${removed[0]?.name || 'Server'}"`, 'info');
    }
  }
};
