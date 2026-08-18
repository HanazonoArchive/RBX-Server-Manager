/**
 * RBX Server Manager - Storage Controller
 * Game-Agnostic LocalStorage Manager with Cloud Sync Hooks & MRU Sorting
 */

const STORAGE_KEYS = {
  ACTIVE_PLACE_ID: 'rbx_active_place_id',
  SAVED_SERVERS: 'rbx_saved_servers',
  GAME_PROFILES: 'rbx_game_profiles',
  THEME: 'rbx_theme'
};

const Storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      return localStorage.getItem(key) || defaultValue;
    }
  },

  set(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('Storage set failed:', e);
    }
  },

  getActivePlaceId() {
    const val = this.get(STORAGE_KEYS.ACTIVE_PLACE_ID, '');
    return (val !== null && val !== undefined) ? String(val).trim() : '';
  },

  setActivePlaceId(placeId) {
    const clean = (placeId !== null && placeId !== undefined) ? String(placeId).trim() : '';
    this.set(STORAGE_KEYS.ACTIVE_PLACE_ID, clean);
  },

  getSavedServers() {
    const list = this.get(STORAGE_KEYS.SAVED_SERVERS, []);
    return Array.isArray(list) ? list : [];
  },

  saveSavedServers(servers, triggerSync = true) {
    this.set(STORAGE_KEYS.SAVED_SERVERS, Array.isArray(servers) ? servers : []);
    if (triggerSync && typeof AuthSync !== 'undefined' && typeof AuthSync.onLocalDataChanged === 'function') {
      AuthSync.onLocalDataChanged();
    }
  },

  getGameProfiles() {
    const profiles = this.get(STORAGE_KEYS.GAME_PROFILES, INITIAL_GAME_PROFILES);
    return Array.isArray(profiles) ? profiles : [];
  },

  saveGameProfiles(profiles, triggerSync = true) {
    this.set(STORAGE_KEYS.GAME_PROFILES, Array.isArray(profiles) ? profiles : []);
    if (triggerSync && typeof AuthSync !== 'undefined' && typeof AuthSync.onLocalDataChanged === 'function') {
      AuthSync.onLocalDataChanged();
    }
  },

  // Most Recently Used (MRU) sorting: Moves the active/selected game profile to index 0 (top/first)
  touchGameProfile(placeId, name = '') {
    const cleanId = String(placeId || '').trim();
    if (!cleanId) return;
    const list = this.getGameProfiles();
    const idx = list.findIndex(g => String(g.id || '').trim() === cleanId);
    if (idx >= 0) {
      const [item] = list.splice(idx, 1);
      if (name && name !== `Game #${cleanId}` && !name.startsWith('Place #')) {
        item.name = name;
      }
      list.unshift(item); // Move to first position
      this.saveGameProfiles(list);
    } else if (name) {
      list.unshift({ // Add as first position
        id: cleanId,
        name: name,
        icon: 'lucide:gamepad-2'
      });
      this.saveGameProfiles(list);
    }
  },

  getTheme() {
    return String(this.get(STORAGE_KEYS.THEME, 'dark'));
  },

  setTheme(theme, triggerSync = true) {
    this.set(STORAGE_KEYS.THEME, String(theme || 'dark'));
    if (triggerSync && typeof AuthSync !== 'undefined' && typeof AuthSync.onLocalDataChanged === 'function') {
      AuthSync.onLocalDataChanged();
    }
  }
};
