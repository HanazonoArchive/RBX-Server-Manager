/**
 * RBX Server Manager - Anti-Spam Toast Notification System
 * Single-Active Queue with Micro-Pulse Replacement & Dedicated Left-Side Sync Indicator
 */

const Toast = {
  currentTimer: null,
  activeToastEl: null,

  show(message, type = 'info', duration = 2500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    let icon = 'lucide:info';
    if (type === 'success') icon = 'lucide:check-circle-2';
    if (type === 'error') icon = 'lucide:alert-circle';
    if (type === 'warning') icon = 'lucide:alert-triangle';

    clearTimeout(this.currentTimer);

    // If a toast is already visible, smoothly replace it without stacking / spamming
    if (this.activeToastEl && container.contains(this.activeToastEl)) {
      this.activeToastEl.className = `toast toast-${type}`;
      this.activeToastEl.innerHTML = `
        <iconify-icon icon="${icon}" style="font-size: 1.1rem; flex-shrink: 0;"></iconify-icon>
        <span>${message}</span>
      `;
      this.activeToastEl.style.opacity = '1';
      this.activeToastEl.style.transform = 'scale(1.02)';
      setTimeout(() => {
        if (this.activeToastEl) this.activeToastEl.style.transform = 'scale(1)';
      }, 100);

      this.currentTimer = setTimeout(() => {
        this.dismiss();
      }, duration);
      return;
    }

    // Otherwise create a fresh single toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <iconify-icon icon="${icon}" style="font-size: 1.1rem; flex-shrink: 0;"></iconify-icon>
      <span>${message}</span>
    `;

    container.innerHTML = '';
    container.appendChild(toast);
    this.activeToastEl = toast;

    this.currentTimer = setTimeout(() => {
      this.dismiss();
    }, duration);
  },

  dismiss() {
    if (this.activeToastEl) {
      this.activeToastEl.style.opacity = '0';
      this.activeToastEl.style.transform = 'translateY(10px)';
      this.activeToastEl.style.transition = 'all 0.2s ease-out';
      setTimeout(() => {
        if (this.activeToastEl && this.activeToastEl.parentNode) {
          this.activeToastEl.parentNode.removeChild(this.activeToastEl);
        }
        this.activeToastEl = null;
      }, 200);
    }
  },

  // Left-Side Sync Pill Toast (Positioned on the bottom-left away from action toasts)
  sync(message, type = 'info', duration = 2200) {
    let syncContainer = document.getElementById('sync-toast-container');
    if (!syncContainer) {
      syncContainer = document.createElement('div');
      syncContainer.id = 'sync-toast-container';
      document.body.appendChild(syncContainer);
    }

    const pill = document.createElement('div');
    pill.className = `sync-pill-toast sync-pill-${type}`;
    pill.innerHTML = `
      <iconify-icon icon="lucide:cloud" style="color: var(--accent-primary); font-size: 0.95rem;"></iconify-icon>
      <span>${message}</span>
    `;

    syncContainer.innerHTML = '';
    syncContainer.appendChild(pill);

    setTimeout(() => {
      pill.style.opacity = '0';
      pill.style.transform = 'translateY(6px)';
      pill.style.transition = 'all 0.2s ease-out';
      setTimeout(() => {
        if (syncContainer.contains(pill)) syncContainer.removeChild(pill);
      }, 200);
    }, duration);
  }
};
