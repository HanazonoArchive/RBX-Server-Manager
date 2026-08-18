/**
 * RBX Server Manager - Sidebar & Game Profile Modal Controller
 * Pure Game-Agnostic Single-Page Edition
 */

const Sidebar = {
  init() {
    const sidebarHtml = `
      <div id="sidebar-backdrop" class="sidebar-backdrop" onclick="Sidebar.toggle(false)"></div>

      <aside id="sidebar-drawer" class="sidebar-drawer">
        <div class="sidebar-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <iconify-icon icon="lucide:menu" style="color: var(--accent-primary); font-size: 1.1rem;"></iconify-icon>
            <span style="font-weight: 800; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Menu & Settings</span>
          </div>
          <button onclick="Sidebar.toggle(false)" class="btn btn-icon btn-secondary" title="Close">
            <iconify-icon icon="lucide:x"></iconify-icon>
          </button>
        </div>

        <div class="sidebar-body">
          
          <!-- Themes Switcher (10 Aesthetic Palettes) -->
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            <span class="input-label" style="text-transform: uppercase;">Color Theme</span>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.35rem;">
              <button onclick="ThemeController.applyTheme('dark')" data-theme-btn="dark" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                🌙 Dark Void
              </button>
              <button onclick="ThemeController.applyTheme('cyber')" data-theme-btn="cyber" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                ⚡ Cyber Neon
              </button>
              <button onclick="ThemeController.applyTheme('emerald')" data-theme-btn="emerald" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                🌲 Emerald
              </button>
              <button onclick="ThemeController.applyTheme('synthwave')" data-theme-btn="synthwave" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                💜 Synthwave
              </button>
              <button onclick="ThemeController.applyTheme('sakura')" data-theme-btn="sakura" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                🌸 Sakura
              </button>
              <button onclick="ThemeController.applyTheme('solar')" data-theme-btn="solar" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                🔥 Solar Flare
              </button>
              <button onclick="ThemeController.applyTheme('ocean')" data-theme-btn="ocean" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                🌊 Ocean Abyss
              </button>
              <button onclick="ThemeController.applyTheme('dracula')" data-theme-btn="dracula" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                🧛 Dracula
              </button>
              <button onclick="ThemeController.applyTheme('monochrome')" data-theme-btn="monochrome" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                🖤 Monochrome
              </button>
              <button onclick="ThemeController.applyTheme('light')" data-theme-btn="light" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; justify-content: flex-start; padding: 0.35rem 0.55rem;">
                ☀️ Clean Light
              </button>
            </div>
          </div>

          <!-- Quick Navigation Links (SPA Switchers) -->
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            <span class="input-label" style="text-transform: uppercase;">Navigation</span>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.35rem;">
              <button onclick="App.switchTab('explorer'); Sidebar.toggle(false);" class="btn btn-secondary btn-sm" style="font-size: 0.75rem;">
                <iconify-icon icon="lucide:compass"></iconify-icon>
                <span>Explorer</span>
              </button>
              <button onclick="App.switchTab('saved'); Sidebar.toggle(false);" class="btn btn-secondary btn-sm" style="font-size: 0.75rem;">
                <iconify-icon icon="lucide:bookmark"></iconify-icon>
                <span>Bookmarks</span>
              </button>
            </div>
          </div>

          <!-- Multi-Device Cloud Sync Box -->
          <div class="card-panel" style="padding: 0.85rem; gap: 0.5rem; background: var(--bg-primary);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-primary); display: flex; align-items: center; gap: 0.35rem;">
                <iconify-icon icon="lucide:cloud"></iconify-icon>
                Cloud Sync (3-4 Devices)
              </span>
              <span class="badge badge-emerald" style="font-size: 0.6rem;">OPTIONAL</span>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.4;">
              Sync your bookmarks and game profiles across multiple devices in real-time.
            </p>
            <button onclick="AuthSync.showModal(); Sidebar.toggle(false);" class="btn btn-primary btn-sm" style="width: 100%;">
              <iconify-icon icon="lucide:user-check"></iconify-icon>
              <span>Account & Sync Settings</span>
            </button>
          </div>

          <!-- Session Bridge Setup Box -->
          <div class="card-panel" style="padding: 0.85rem; gap: 0.5rem; background: var(--bg-primary);">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.35rem;">
                <iconify-icon icon="lucide:zap"></iconify-icon>
                Session Bridge
              </span>
              <span class="badge badge-emerald" style="font-size: 0.6rem;">0MS LAG</span>
            </div>
            <p style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.4;">
              Bypass Cloudflare and fetch official game names & live servers directly using your browser's Roblox sign-in.
            </p>
            <button onclick="Bridge.showModal(); Sidebar.toggle(false);" class="btn btn-secondary btn-sm" style="width: 100%;">
              <iconify-icon icon="lucide:link"></iconify-icon>
              <span>Bridge Settings</span>
            </button>
          </div>

          <!-- Game Profiles Switcher -->
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span class="input-label" style="text-transform: uppercase;">Saved Game Profiles</span>
              <button onclick="Sidebar.showAddGameModal(); Sidebar.toggle(false);" class="btn btn-primary btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;">
                <iconify-icon icon="lucide:plus"></iconify-icon>
                <span>Add Game</span>
              </button>
            </div>
            <div id="sidebar-games-list" style="display: flex; flex-direction: column; gap: 0.35rem;">
              <!-- Rendered dynamically -->
            </div>
          </div>

        </div>

        <div class="sidebar-footer">
          RBX Server Manager • Single Page Suite
        </div>
      </aside>
    `;

    const container = document.createElement('div');
    container.id = 'sidebar-container';
    container.innerHTML = sidebarHtml;
    document.body.appendChild(container);

    this.refreshGamesList();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggle(false);
    });
  },

  toggle(open) {
    const backdrop = document.getElementById('sidebar-backdrop');
    const drawer = document.getElementById('sidebar-drawer');
    if (!backdrop || !drawer) return;

    if (open) {
      this.refreshGamesList();
      backdrop.classList.add('active');
      drawer.classList.add('active');
    } else {
      backdrop.classList.remove('active');
      drawer.classList.remove('active');
    }
  },

  selectGame(placeId, name) {
    const cleanId = String(placeId || '').trim();
    Storage.setActivePlaceId(cleanId);
    Storage.touchGameProfile(cleanId, name);
    this.refreshGamesList();
    this.toggle(false);

    if (typeof App !== 'undefined') {
      App.switchTab('explorer');
      App.renderPresetChips();
      App.syncPlaceIdUI();
      App.scanServers();
    }
  },

  showAddGameModal(initialPlaceId = '') {
    let modal = document.getElementById('add-game-modal');
    if (!modal) {
      const modalHtml = `
        <div id="add-game-modal" class="modal-backdrop active">
          <div class="modal-dialog">
            <button onclick="Sidebar.closeAddGameModal()" class="btn btn-icon btn-secondary" style="position: absolute; top: 1rem; right: 1rem;" title="Close">
              <iconify-icon icon="lucide:x"></iconify-icon>
            </button>

            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="badge badge-emerald" style="padding: 0.5rem; font-size: 1.2rem; border-radius: var(--radius-md);">
                <iconify-icon icon="lucide:gamepad-2"></iconify-icon>
              </div>
              <div>
                <h3 style="font-size: 1.1rem; font-weight: 800;">Add Game Profile</h3>
                <p style="font-size: 0.75rem; color: var(--text-muted);">Enter Place ID to automatically fetch the game name</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              
              <!-- Place ID Input -->
              <div class="input-group">
                <label class="input-label" for="modal-game-place-id">
                  <span>Place ID (Numbers Only)</span>
                </label>
                <div class="input-wrapper">
                  <input type="text" id="modal-game-place-id" placeholder="e.g. 13822889 or 189707" oninput="Sidebar.onModalPlaceIdInput(this.value)" class="input-control" />
                  <button onclick="Sidebar.triggerModalGameLookup()" class="btn btn-secondary btn-sm" id="modal-lookup-btn">
                    <iconify-icon icon="lucide:search"></iconify-icon>
                    <span>Lookup</span>
                  </button>
                </div>
              </div>

              <!-- Game Name Input & Live Preview -->
              <div class="input-group">
                <label class="input-label" for="modal-game-name">
                  <span>Game Name (Auto-Fetched)</span>
                  <span id="modal-fetch-status" style="font-size: 0.7rem; color: var(--accent-cyan);"></span>
                </label>
                <div class="input-wrapper">
                  <input type="text" id="modal-game-name" placeholder="Game name will appear here..." class="input-control" />
                </div>
              </div>

              <!-- Live Game Preview Box -->
              <div id="modal-game-preview" style="display: none; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.75rem; gap: 0.35rem; flex-direction: column;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <b style="color: var(--text-main); font-size: 0.85rem;" id="modal-preview-title"></b>
                  <span class="badge badge-emerald" id="modal-preview-creator"></span>
                </div>
                <p style="color: var(--text-muted); font-size: 0.72rem; line-height: 1.3;" id="modal-preview-desc"></p>
              </div>

            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
              <button onclick="Sidebar.closeAddGameModal()" class="btn btn-secondary btn-sm">Cancel</button>
              <button onclick="Sidebar.saveNewGameProfile()" class="btn btn-primary btn-sm" id="modal-save-game-btn">
                <iconify-icon icon="lucide:check"></iconify-icon>
                <span>Save Profile</span>
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

    const placeInput = document.getElementById('modal-game-place-id');
    const nameInput = document.getElementById('modal-game-name');
    const previewBox = document.getElementById('modal-game-preview');
    const statusEl = document.getElementById('modal-fetch-status');

    if (placeInput) placeInput.value = initialPlaceId || '';
    if (nameInput) nameInput.value = '';
    if (previewBox) previewBox.style.display = 'none';
    if (statusEl) statusEl.textContent = '';

    if (initialPlaceId) {
      this.triggerModalGameLookup();
    }
  },

  closeAddGameModal() {
    const modal = document.getElementById('add-game-modal');
    if (modal) modal.classList.remove('active');
  },

  modalLookupTimer: null,
  onModalPlaceIdInput(val) {
    clearTimeout(this.modalLookupTimer);
    const cleanId = String(val || '').trim().replace(/[^0-9]/g, '');
    if (!cleanId) return;

    this.modalLookupTimer = setTimeout(() => {
      this.triggerModalGameLookup();
    }, 600);
  },

  async triggerModalGameLookup() {
    const placeInput = document.getElementById('modal-game-place-id');
    const nameInput = document.getElementById('modal-game-name');
    const statusEl = document.getElementById('modal-fetch-status');
    const previewBox = document.getElementById('modal-game-preview');
    const previewTitle = document.getElementById('modal-preview-title');
    const previewCreator = document.getElementById('modal-preview-creator');
    const previewDesc = document.getElementById('modal-preview-desc');

    if (!placeInput) return;
    const placeId = String(placeInput.value || '').trim().replace(/[^0-9]/g, '');
    if (!placeId) return;

    if (statusEl) statusEl.textContent = 'Fetching game name...';

    const details = await RobloxApi.fetchGameDetails(placeId);
    if (statusEl) statusEl.textContent = '';

    if (details && details.name) {
      if (nameInput) nameInput.value = details.name;
      if (previewBox) {
        previewBox.style.display = 'flex';
        if (previewTitle) previewTitle.textContent = details.name;
        if (previewCreator) previewCreator.textContent = details.creatorName ? `by ${details.creatorName}` : 'Roblox';
        if (previewDesc) previewDesc.textContent = details.description ? (details.description.substring(0, 100) + '...') : 'No description provided.';
      }
    } else {
      if (nameInput && !nameInput.value) nameInput.value = `Game #${placeId}`;
    }
  },

  saveNewGameProfile() {
    const placeInput = document.getElementById('modal-game-place-id');
    const nameInput = document.getElementById('modal-game-name');

    if (!placeInput) return;
    const placeId = String(placeInput.value || '').trim().replace(/[^0-9]/g, '');
    if (!placeId) {
      Toast.show('Please enter a valid Place ID (numbers only)!', 'warning');
      return;
    }

    const name = (nameInput && String(nameInput.value || '').trim()) ? String(nameInput.value).trim() : `Game #${placeId}`;

    const list = Storage.getGameProfiles();
    const existingIdx = list.findIndex(g => String(g.id || '').trim() === placeId);
    if (existingIdx >= 0) {
      list[existingIdx].name = name;
      const [item] = list.splice(existingIdx, 1);
      list.unshift(item); // Move to front
    } else {
      list.unshift({ // Add to front
        id: placeId,
        name: name,
        icon: 'lucide:gamepad-2'
      });
    }

    Storage.saveGameProfiles(list);
    Storage.setActivePlaceId(placeId);

    this.refreshGamesList();
    if (typeof App !== 'undefined') {
      App.renderPresetChips();
      App.syncPlaceIdUI();
      App.scanServers();
    }

    this.closeAddGameModal();
    Toast.show(`Saved and activated "${name}"!`, 'success');
  },

  deleteGame(idx) {
    const list = Storage.getGameProfiles();
    const removed = list.splice(idx, 1);
    Storage.saveGameProfiles(list);
    this.refreshGamesList();
    if (typeof App !== 'undefined') App.renderPresetChips();
    if (removed[0]) Toast.show(`Removed profile "${removed[0].name}"`, 'info');
  },

  refreshGamesList() {
    const listEl = document.getElementById('sidebar-games-list');
    if (!listEl) return;
    const profiles = Storage.getGameProfiles();
    const activePlaceId = Storage.getActivePlaceId();

    if (profiles.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 1rem; color: var(--text-dim); font-size: 0.75rem;">
          No saved profiles. Click "+ Add Game" above.
        </div>
      `;
      return;
    }

    listEl.innerHTML = profiles.map((g, idx) => {
      const gId = String(g.id || '').trim();
      const isActive = gId === activePlaceId;
      return `
        <div class="sidebar-game-row">
          <button onclick="Sidebar.selectGame('${gId}', '${String(g.name || '').replace(/'/g, "\\'")}')" class="sidebar-game-btn" style="${isActive ? 'border-color: var(--accent-primary); background: var(--bg-hover);' : ''}" title="${g.name} (${g.id})">
            <div class="sidebar-game-info">
              <iconify-icon icon="${g.icon || 'lucide:gamepad-2'}" class="sidebar-game-icon" style="${isActive ? 'color: var(--accent-primary);' : ''}"></iconify-icon>
              <span class="sidebar-game-title" style="${isActive ? 'color: var(--accent-primary); font-weight: 700;' : ''}">${g.name}</span>
            </div>
            <span class="sidebar-game-id">${g.id}</span>
          </button>
          <button onclick="Sidebar.deleteGame(${idx})" class="btn-danger sidebar-game-delete-btn" title="Remove profile">
            <iconify-icon icon="lucide:trash-2"></iconify-icon>
          </button>
        </div>
      `;
    }).join('');
  }
};
