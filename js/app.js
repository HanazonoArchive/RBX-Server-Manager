/**
 * RBX Server Manager - Application Orchestrator (js/app.js)
 * Single Responsibility: Application Bootstrap, SPA Tab Switching & Global Event Routing
 */

const App = {
  activeTab: 'explorer',

  init() {
    // 1. Initialize Subsystem Modules
    if (typeof Sidebar !== 'undefined') Sidebar.init();
    if (typeof QuickJoiner !== 'undefined') QuickJoiner.init();
    if (typeof PresetsCarousel !== 'undefined') PresetsCarousel.init();
    if (typeof FilterEngine !== 'undefined') FilterEngine.init();
    if (typeof ServerExplorer !== 'undefined') ServerExplorer.init();

    // Check query params for placeId
    const params = new URLSearchParams(window.location.search);
    const qPlaceId = params.get('placeId');
    if (qPlaceId && typeof QuickJoiner !== 'undefined') {
      QuickJoiner.onPlaceIdChange(qPlaceId);
    }
  },

  // Instant SPA Tab Router (0ms reload, zero network lag)
  switchTab(tab) {
    this.activeTab = tab;
    const tabExplorer = document.getElementById('tab-explorer');
    const tabSaved = document.getElementById('tab-saved');
    const btnExplorer = document.getElementById('tab-btn-explorer');
    const btnSaved = document.getElementById('tab-btn-saved');
    const presetsBar = document.getElementById('presets-bar');

    if (tab === 'explorer') {
      if (presetsBar) presetsBar.style.display = 'flex';
      if (tabExplorer) tabExplorer.classList.remove('hidden');
      if (tabSaved) tabSaved.classList.add('hidden');
      if (btnExplorer) btnExplorer.classList.add('active');
      if (btnSaved) btnSaved.classList.remove('active');
    } else {
      if (presetsBar) presetsBar.style.display = 'none';
      if (tabExplorer) tabExplorer.classList.add('hidden');
      if (tabSaved) tabSaved.classList.remove('hidden');
      if (btnExplorer) btnExplorer.classList.remove('active');
      if (btnSaved) btnSaved.classList.add('active');
      
      if (typeof BookmarkManager !== 'undefined') {
        BookmarkManager.render();
      }
    }
  },

  // Seamless backwards-compatible delegations for inline HTML event handlers
  onSelectPreset(placeId) { if (typeof PresetsCarousel !== 'undefined') PresetsCarousel.select(placeId); },
  renderPresetChips() { if (typeof PresetsCarousel !== 'undefined') PresetsCarousel.render(); },
  syncPlaceIdUI() { if (typeof QuickJoiner !== 'undefined') QuickJoiner.syncUI(); },
  onPlaceIdInput(val) { if (typeof QuickJoiner !== 'undefined') QuickJoiner.onPlaceIdInput(val); },
  onPlaceIdChange(val) { if (typeof QuickJoiner !== 'undefined') QuickJoiner.onPlaceIdChange(val); },
  handleQuickJoin() { if (typeof QuickJoiner !== 'undefined') QuickJoiner.handleLaunch(); },
  scanServers() { if (typeof ServerExplorer !== 'undefined') ServerExplorer.scan(); },
  stopStreaming() { if (typeof ServerExplorer !== 'undefined') ServerExplorer.stopStreaming(); },
  renderExplorer(resetPage) { if (typeof ServerExplorer !== 'undefined') ServerExplorer.render(resetPage); },
  goToPage(page) { if (typeof ServerExplorer !== 'undefined') ServerExplorer.goToPage(page); },
  copyCode(code) { if (typeof ServerExplorer !== 'undefined') ServerExplorer.copyCode(code); },
  setFilter(mode) { if (typeof FilterEngine !== 'undefined') FilterEngine.setMode(mode); },
  toggleAdvancedFilters() { if (typeof FilterEngine !== 'undefined') FilterEngine.toggleAdvanced(); },
  onAdvancedFilterChange() { if (typeof FilterEngine !== 'undefined') FilterEngine.onAdvancedChange(); },
  resetAdvancedFilters() { if (typeof FilterEngine !== 'undefined') FilterEngine.resetAdvanced(); },
  renderBookmarks() { if (typeof BookmarkManager !== 'undefined') BookmarkManager.render(); },
  setBookmarkGameFilter(filter) { if (typeof BookmarkManager !== 'undefined') BookmarkManager.setGameFilter(filter); },
  onBookmarkSortChange(sort) { if (typeof BookmarkManager !== 'undefined') BookmarkManager.setSort(sort); },
  showAddBookmarkModal(placeId, jobId) { if (typeof BookmarkManager !== 'undefined') BookmarkManager.showAddModal(placeId, jobId); },
  closeBookmarkModal() { if (typeof BookmarkManager !== 'undefined') BookmarkManager.closeAddModal(); },
  onModalBmPlaceInput(val) { if (typeof BookmarkManager !== 'undefined') BookmarkManager.onModalPlaceInput(val); },
  onModalBmJobInput(val) { if (typeof BookmarkManager !== 'undefined') BookmarkManager.onModalJobInput(val); },
  saveBookmarkFromModal() { if (typeof BookmarkManager !== 'undefined') BookmarkManager.saveFromModal(); },
  showDeleteBookmarkModal(idx) { if (typeof BookmarkManager !== 'undefined') BookmarkManager.showDeleteModal(idx); },
  closeDeleteBookmarkModal() { if (typeof BookmarkManager !== 'undefined') BookmarkManager.closeDeleteModal(); },
  confirmDeleteBookmark(idx) { if (typeof BookmarkManager !== 'undefined') BookmarkManager.confirmDelete(idx); }
};

window.addEventListener('DOMContentLoaded', () => App.init());
