/**
 * RBX Server Manager - Filter Engine (js/filterEngine.js)
 * Single Responsibility: Advanced Filtering, Search Matching & Intelligent Server Sorting
 */

const FilterEngine = {
  mode: 'lowest-players',
  isAdvancedOpen: false,
  advanced: {
    maxPlayers: 'all',
    maxPing: 'all',
    searchQuery: ''
  },

  init() {
    this.updateBadge();
  },

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('[data-filter-btn]').forEach(btn => {
      if (btn.getAttribute('data-filter-btn') === mode) {
        btn.className = 'btn btn-primary btn-sm';
      } else {
        btn.className = 'btn btn-secondary btn-sm';
      }
    });

    if (typeof ServerExplorer !== 'undefined') {
      ServerExplorer.currentPage = 1;
      ServerExplorer.render(true);
    }
  },

  toggleAdvanced() {
    this.isAdvancedOpen = !this.isAdvancedOpen;
    const panel = document.getElementById('advanced-filters-panel');
    const btn = document.getElementById('adv-filter-toggle-btn');
    if (panel) {
      panel.style.display = this.isAdvancedOpen ? 'grid' : 'none';
    }
    if (btn) {
      if (this.isAdvancedOpen) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    }
  },

  onAdvancedChange() {
    const playerSelect = document.getElementById('filter-max-players');
    const pingSelect = document.getElementById('filter-max-ping');
    const searchInput = document.getElementById('filter-search-query');

    if (playerSelect) this.advanced.maxPlayers = playerSelect.value;
    if (pingSelect) this.advanced.maxPing = pingSelect.value;
    if (searchInput) this.advanced.searchQuery = String(searchInput.value || '').trim();

    this.updateBadge();
    if (typeof ServerExplorer !== 'undefined') {
      ServerExplorer.currentPage = 1;
      ServerExplorer.render(true);
    }
  },

  resetAdvanced() {
    this.advanced = {
      maxPlayers: 'all',
      maxPing: 'all',
      searchQuery: ''
    };

    const playerSelect = document.getElementById('filter-max-players');
    const pingSelect = document.getElementById('filter-max-ping');
    const searchInput = document.getElementById('filter-search-query');

    if (playerSelect) playerSelect.value = 'all';
    if (pingSelect) pingSelect.value = 'all';
    if (searchInput) searchInput.value = '';

    this.updateBadge();
    if (typeof ServerExplorer !== 'undefined') {
      ServerExplorer.currentPage = 1;
      ServerExplorer.render(true);
    }
    Toast.show('Filters reset', 'info');
  },

  updateBadge() {
    const badge = document.getElementById('adv-filter-badge');
    if (!badge) return;

    let activeCount = 0;
    if (this.advanced.maxPlayers !== 'all') activeCount++;
    if (this.advanced.maxPing !== 'all') activeCount++;
    if (this.advanced.searchQuery) activeCount++;

    if (activeCount > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = activeCount.toString();
    } else {
      badge.style.display = 'none';
    }
  },

  // Pure filtering and sorting pipeline
  process(rawServers = []) {
    let list = [...rawServers];

    // 1. Apply Advanced Constraints
    if (this.advanced.maxPlayers !== 'all') {
      if (this.advanced.maxPlayers === 'not-full') {
        list = list.filter(s => (s.playing || 0) < (s.maxPlayers || 99));
      } else {
        const max = parseInt(this.advanced.maxPlayers, 10);
        list = list.filter(s => (s.playing || 0) <= max);
      }
    }

    if (this.advanced.maxPing !== 'all') {
      const maxPing = parseInt(this.advanced.maxPing, 10);
      list = list.filter(s => (s.ping || 999) <= maxPing);
    }

    if (this.advanced.searchQuery) {
      const q = String(this.advanced.searchQuery).toLowerCase().replace(/[^a-z0-9]/g, '');
      list = list.filter(s => {
        const sId = String(s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return sId.includes(q);
      });
    }

    // 2. Apply Sorting Algorithm
    if (this.mode === 'lowest-players') {
      list.sort((a, b) => (a.playing || 0) - (b.playing || 0));
    } else if (this.mode === 'highest-players') {
      list.sort((a, b) => (b.playing || 0) - (a.playing || 0));
    } else if (this.mode === 'best-ping' || this.mode === 'lowest-ping') {
      list.sort((a, b) => (a.ping || 999) - (b.ping || 999));
    } else if (this.mode === 'smart-dupe' || this.mode === 'smart-match') {
      list.sort((a, b) => {
        const pingA = a.ping || 120;
        const pingB = b.ping || 120;
        const playA = a.playing || 0;
        const playB = b.playing || 0;
        const scoreA = (pingA * 0.35) + (playA * 12);
        const scoreB = (pingB * 0.35) + (playB * 12);
        return scoreA - scoreB;
      });
    }

    // 3. Always prioritize Friend servers at Rank #1 (Top of list)
    list.sort((a, b) => {
      const hasFriendA = (a.friends && a.friends.length > 0) ? 1 : 0;
      const hasFriendB = (b.friends && b.friends.length > 0) ? 1 : 0;
      return hasFriendB - hasFriendA;
    });

    return list;
  }
};
