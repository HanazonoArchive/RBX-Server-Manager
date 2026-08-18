/**
 * RBX Server Manager - Quick Joiner (js/quickJoiner.js)
 * Single Responsibility: Instant Server Launch Execution & Header Title Sync
 */

const QuickJoiner = {
  gameTitlesCache: {},
  placeInputTimer: null,

  init() {
    // Populate cache from saved game profiles
    const profiles = Storage.getGameProfiles();
    profiles.forEach(p => {
      if (p.id && p.name) {
        this.gameTitlesCache[String(p.id).trim()] = p.name;
      }
    });

    this.syncUI();

    // Bind Enter key on Place ID input
    const input = document.getElementById('quick-place-id');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.onPlaceIdChange(input.value);
        }
      });
    }

    // Bind Enter key on Server ID input
    const jobInput = document.getElementById('quick-job-id');
    if (jobInput) {
      jobInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleLaunch();
        }
      });
    }
  },

  async syncUI() {
    let placeId = Storage.getActivePlaceId();
    const input = document.getElementById('quick-place-id');
    if (input && String(input.value || '').trim() && !placeId) {
      placeId = String(input.value || '').trim().replace(/[^0-9]/g, '');
      Storage.setActivePlaceId(placeId);
    }
    if (input && input.value !== placeId) input.value = placeId;

    const subtitleEl = document.getElementById('header-brand-subtitle');
    const nameEl = document.getElementById('header-game-name');
    const idEl = document.getElementById('header-place-id');

    const cleanPlaceId = String(placeId || '').trim();

    if (!cleanPlaceId) {
      if (subtitleEl) subtitleEl.style.display = 'none';
      if (nameEl) nameEl.textContent = '';
      if (idEl) idEl.textContent = '';
      return;
    }

    // Show subtitle immediately
    if (subtitleEl) subtitleEl.style.display = 'flex';
    if (idEl) idEl.textContent = `ID: ${cleanPlaceId}`;

    // Check if cached
    if (this.gameTitlesCache[cleanPlaceId]) {
      if (nameEl) nameEl.textContent = this.gameTitlesCache[cleanPlaceId];
      return;
    }

    // Check if saved in profile
    const profiles = Storage.getGameProfiles();
    const match = profiles.find(g => String(g.id || '').trim() === cleanPlaceId);
    if (match && match.name) {
      this.gameTitlesCache[cleanPlaceId] = match.name;
      if (nameEl) nameEl.textContent = match.name;
      return;
    }

    if (nameEl) nameEl.textContent = `Loading game name...`;

    const details = await RobloxApi.fetchGameDetails(cleanPlaceId);
    if (details && details.name) {
      this.gameTitlesCache[cleanPlaceId] = details.name;
      if (nameEl) nameEl.textContent = details.name;
    } else {
      if (nameEl) nameEl.textContent = `Place #${cleanPlaceId}`;
    }
  },

  onPlaceIdInput(val) {
    clearTimeout(this.placeInputTimer);
    const clean = String(val || '').trim().replace(/[^0-9]/g, '');

    this.placeInputTimer = setTimeout(() => {
      this.onPlaceIdChange(clean);
    }, 300);
  },

  onPlaceIdChange(val) {
    const clean = String(val || '').trim().replace(/[^0-9]/g, '');
    Storage.setActivePlaceId(clean);
    if (clean) Storage.touchGameProfile(clean);
    
    if (typeof PresetsCarousel !== 'undefined') PresetsCarousel.render();
    if (typeof Sidebar !== 'undefined') Sidebar.refreshGamesList();
    this.syncUI();
    
    if (typeof ServerExplorer !== 'undefined') {
      ServerExplorer.currentPage = 1;
      if (clean) {
        ServerExplorer.scan();
      } else {
        ServerExplorer.stopStreaming();
        ServerExplorer.servers = [];
        ServerExplorer.render();
      }
    }
  },

  async handleLaunch() {
    const input = document.getElementById('quick-place-id');
    const placeId = (input ? String(input.value || '').trim() : '') || Storage.getActivePlaceId();
    if (!placeId) {
      Toast.show('Please enter a Place ID first!', 'warning');
      return;
    }

    Storage.setActivePlaceId(placeId);
    this.syncUI();

    const jobInput = document.getElementById('quick-job-id');
    const jobId = jobInput ? String(jobInput.value || '').trim() : '';
    const statusEl = document.getElementById('quick-status');

    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.className = 'badge badge-cyan';
      statusEl.innerHTML = `<iconify-icon icon="lucide:loader-2" class="animate-spin"></iconify-icon><span>Resolving server "${jobId}" & launching...</span>`;
    }

    await RobloxApi.launch(placeId, jobId, (st) => {
      if (!statusEl) return;
      if (st.loading) {
        statusEl.className = 'badge badge-cyan';
        statusEl.innerHTML = `<iconify-icon icon="lucide:loader-2" class="animate-spin"></iconify-icon><span>${st.message}</span>`;
      } else if (st.success) {
        statusEl.className = 'badge badge-emerald';
        statusEl.innerHTML = `<iconify-icon icon="lucide:check-circle-2"></iconify-icon><span>${st.message}</span>`;
        Toast.show('Launching Roblox server...', 'success');
      } else if (st.warning) {
        statusEl.className = 'badge badge-amber';
        statusEl.innerHTML = `<iconify-icon icon="lucide:alert-triangle"></iconify-icon><span>${st.message}</span>`;
      }
    });
  }
};
