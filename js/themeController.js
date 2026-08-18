/**
 * RBX Server Manager - Theme Controller
 * Multi-Theme management with HTML data-theme attribute
 */

const THEMES = ['dark', 'cyber', 'emerald', 'synthwave', 'sakura', 'solar', 'ocean', 'dracula', 'monochrome', 'light'];

const ThemeController = {
  init() {
    const saved = Storage.getTheme();
    this.applyTheme(saved);
  },

  applyTheme(theme) {
    const valid = THEMES.includes(theme) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', valid);
    Storage.setTheme(valid);

    // Update active state in theme buttons if present
    document.querySelectorAll('[data-theme-btn]').forEach(btn => {
      if (btn.getAttribute('data-theme-btn') === valid) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextIdx = (THEMES.indexOf(current) + 1) % THEMES.length;
    this.applyTheme(THEMES[nextIdx]);
  }
};

// Auto-initialize theme
ThemeController.init();
