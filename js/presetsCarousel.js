/**
 * RBX Server Manager - Game Presets Carousel (js/presetsCarousel.js)
 * Single Responsibility: Drag-to-Slide Game Presets Bar & MRU Preset Chips
 */

const PresetsCarousel = {
  isDragBound: false,

  init() {
    this.render();
    this.initDraggable();
  },

  render() {
    const container = document.getElementById('presets-bar');
    if (!container) return;

    const currentPlaceId = Storage.getActivePlaceId();
    const profiles = Storage.getGameProfiles();

    let html = profiles.map(g => {
      const gId = String(g.id || '').trim();
      const active = gId === currentPlaceId;
      return `
        <button onclick="PresetsCarousel.select('${gId}')" class="preset-chip ${active ? 'active' : ''}">
          <iconify-icon icon="${g.icon || 'lucide:gamepad-2'}"></iconify-icon>
          <span>${g.name}</span>
        </button>
      `;
    }).join('');

    html += `
      <button onclick="Sidebar.showAddGameModal()" class="preset-chip" style="border-style: dashed; color: var(--accent-primary);" title="Add and lookup a new game">
        <iconify-icon icon="lucide:plus"></iconify-icon>
        <span>Add Game</span>
      </button>
    `;

    container.innerHTML = html;
  },

  select(placeId) {
    const cleanId = String(placeId || '').trim();
    Storage.setActivePlaceId(cleanId);
    Storage.touchGameProfile(cleanId);
    
    this.render();
    if (typeof Sidebar !== 'undefined') Sidebar.refreshGamesList();
    if (typeof QuickJoiner !== 'undefined') QuickJoiner.syncUI();
    if (typeof ServerExplorer !== 'undefined') {
      ServerExplorer.currentPage = 1;
      ServerExplorer.scan();
    }
  },

  initDraggable() {
    const slider = document.getElementById('presets-bar');
    if (!slider || this.isDragBound) return;
    this.isDragBound = true;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    slider.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click
      isDown = true;
      hasMoved = false;
      slider.classList.add('grabbing');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    const onEnd = () => {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove('grabbing');
    };

    window.addEventListener('mouseup', onEnd);
    slider.addEventListener('mouseleave', onEnd);

    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(x - startX) > 4) {
        hasMoved = true;
      }
      slider.scrollLeft = scrollLeft - walk;
    });

    // Prevent accidental button clicks when dragging
    slider.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
      }
    }, true);

    // Allow vertical mouse wheel to scroll the page naturally without trapping
    slider.addEventListener('wheel', (e) => {
      if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        window.scrollBy({ top: e.deltaY, behavior: 'auto' });
      }
    }, { passive: true });
  }
};
