/**
 * RBX Server Manager - Optional Supabase Cloud Sync & Authentication Module
 * Username-Based Authentication & Real-Time Multi-Device Live Sync
 */

const AuthSync = {
  client: null,
  user: null,
  isSyncing: false,
  lastSyncTime: null,
  pushTimer: null,
  realtimeChannel: null,

  init() {
    if (typeof supabase === 'undefined' || typeof SUPABASE_CONFIG === 'undefined') {
      console.warn('Supabase SDK or configuration not loaded. Running in local-only mode.');
      this.updateHeaderBadge();
      return;
    }

    try {
      this.client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      this.updateHeaderBadge();
      return;
    }

    // Check existing active session
    this.client.auth.getSession().then(({ data, error }) => {
      if (data && data.session && data.session.user) {
        this.user = data.session.user;
        this.updateHeaderBadge();
        this.pullFromCloud(true);
        this.subscribeRealtime();
      } else {
        this.user = null;
        this.updateHeaderBadge();
      }
    });

    // Listen for auth state transitions (Sign in, Sign out, Token Refresh)
    this.client.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        this.user = session.user;
        this.updateHeaderBadge();
        if (event === 'SIGNED_IN') {
          this.pullFromCloud(true);
          this.subscribeRealtime();
        }
      } else {
        this.user = null;
        if (this.realtimeChannel) {
          this.client.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
        this.updateHeaderBadge();
      }
    });
  },

  // Helper to map plain usernames to valid Supabase auth identities
  resolveEmail(input) {
    const clean = String(input || '').trim();
    if (!clean) return '';
    if (clean.includes('@')) return clean;
    // Format pure username to clean internal auth email
    const safeUser = clean.toLowerCase().replace(/[^a-z0-9_]/g, '');
    return `${safeUser}@rbxuser.local`;
  },

  updateHeaderBadge(isSyncing = false) {
    const badge = document.getElementById('sync-status-badge');
    if (!badge) return;

    if (this.user) {
      const name = this.user.user_metadata?.username || this.user.email?.split('@')[0] || 'User';
      badge.className = 'badge badge-emerald';
      badge.style.cursor = 'pointer';
      badge.title = `Cloud Sync Active (${name}). Click to manage account.`;
      
      if (isSyncing) {
        badge.innerHTML = `
          <iconify-icon icon="lucide:loader-2" class="animate-spin" style="color: var(--accent-cyan);"></iconify-icon>
          <span>Syncing...</span>
        `;
      } else {
        badge.innerHTML = `
          <iconify-icon icon="lucide:cloud-check" style="color: var(--accent-primary);"></iconify-icon>
          <span>Synced: <b>${name}</b></span>
        `;
      }
      badge.onclick = () => this.showModal('account');
    } else {
      badge.className = 'badge badge-secondary';
      badge.style.cursor = 'pointer';
      badge.title = 'Sync bookmarks & profiles across 3-4 devices (Optional). Click to log in.';
      badge.innerHTML = `
        <iconify-icon icon="lucide:cloud"></iconify-icon>
        <span>Cloud Sync (Optional)</span>
      `;
      badge.onclick = () => this.showModal('login');
    }
  },

  onLocalDataChanged() {
    if (!this.user || !this.client) return;

    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushToCloud(true);
    }, 400);
  },

  async pushToCloud(silent = true) {
    if (!this.user || !this.client) return;

    this.isSyncing = true;
    this.updateHeaderBadge(true);

    const bookmarks = Storage.getSavedServers();
    const gameProfiles = Storage.getGameProfiles();
    const theme = Storage.getTheme();
    const username = this.user.user_metadata?.username || this.user.email?.split('@')[0] || '';

    try {
      const { data, error } = await this.client
        .from('user_sync_data')
        .upsert({
          user_id: this.user.id,
          username: username,
          bookmarks: bookmarks,
          game_profiles: gameProfiles,
          theme: theme,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.warn('Supabase push error:', error.message);
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          this.promptTableSetup();
        } else if (!silent) {
          Toast.show('Cloud sync error: ' + error.message, 'error');
        }
      } else {
        this.lastSyncTime = new Date();
        if (!silent) Toast.sync('Saved to cloud!');
      }
    } catch (e) {
      console.warn('Sync push failed:', e);
    } finally {
      this.isSyncing = false;
      this.updateHeaderBadge(false);
    }
  },

  async pullFromCloud(silent = true) {
    if (!this.user || !this.client) return;

    this.isSyncing = true;
    try {
      const { data, error } = await this.client
        .from('user_sync_data')
        .select('*')
        .eq('user_id', this.user.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205') {
          this.promptTableSetup();
        }
        return;
      }

      if (data) {
        // Merge cloud bookmarks with local storage bookmarks (deduplicating by ID/JobId)
        if (Array.isArray(data.bookmarks)) {
          const localBm = Storage.getSavedServers();
          const merged = [...data.bookmarks];
          
          localBm.forEach(l => {
            const exists = merged.some(m => m.id === l.id || (m.jobId && m.jobId === l.jobId && m.placeId === l.placeId));
            if (!exists) merged.push(l);
          });

          Storage.saveSavedServers(merged, false);
          if (typeof App !== 'undefined' && typeof App.renderBookmarks === 'function') {
            App.renderBookmarks();
          }
        }

        // Merge custom game profiles
        if (Array.isArray(data.game_profiles) && data.game_profiles.length > 0) {
          const localProfiles = Storage.getGameProfiles();
          const mergedProfiles = [...data.game_profiles];

          localProfiles.forEach(lp => {
            const exists = mergedProfiles.some(mp => String(mp.id).trim() === String(lp.id).trim());
            if (!exists) mergedProfiles.push(lp);
          });

          Storage.saveGameProfiles(mergedProfiles, false);
          if (typeof App !== 'undefined' && typeof App.renderPresetChips === 'function') {
            App.renderPresetChips();
          }
        }

        // Apply synced theme if available
        if (data.theme && typeof ThemeController !== 'undefined') {
          ThemeController.applyTheme(data.theme);
        }

        this.lastSyncTime = new Date();
        if (!silent) Toast.sync('Downloaded & merged cloud data!');
      } else {
        // No cloud record yet, push our current local data up
        this.pushToCloud(true);
      }
    } catch (e) {
      console.warn('Sync pull failed:', e);
    } finally {
      this.isSyncing = false;
    }
  },

  subscribeRealtime() {
    if (!this.user || !this.client) return;

    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.client
      .channel('public:user_sync_data:' + this.user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_sync_data',
        filter: `user_id=eq.${this.user.id}`
      }, (payload) => {
        if (payload.new && payload.new.bookmarks) {
          Storage.saveSavedServers(payload.new.bookmarks, false);
          if (typeof App !== 'undefined' && typeof App.renderBookmarks === 'function') {
            App.renderBookmarks();
          }
          Toast.sync('Live sync updated from another device!');
        }
      })
      .subscribe();
  },

  async handleSignUp() {
    const userIn = document.getElementById('auth-signup-user');
    const passIn = document.getElementById('auth-signup-pass');
    const confirmIn = document.getElementById('auth-signup-confirm');
    const btn = document.getElementById('auth-signup-btn');
    const errEl = document.getElementById('auth-error-msg');

    const username = (userIn ? String(userIn.value || '').trim() : '');
    const pass = (passIn ? String(passIn.value || '') : '');
    const confirm = (confirmIn ? String(confirmIn.value || '') : '');

    if (errEl) errEl.style.display = 'none';

    if (!username || username.length < 3) {
      this.showAuthError('Username must be at least 3 characters');
      return;
    }
    if (!pass || pass.length < 6) {
      this.showAuthError('Password must be at least 6 characters');
      return;
    }
    if (pass !== confirm) {
      this.showAuthError('Passwords do not match');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<iconify-icon icon="lucide:loader-2" class="animate-spin"></iconify-icon><span>Creating Account...</span>`;
    }

    const email = this.resolveEmail(username);

    try {
      // 1. Create user in Supabase
      const { data, error } = await this.client.auth.signUp({
        email: email,
        password: pass,
        options: {
          data: {
            username: username
          }
        }
      });

      if (error) {
        if (error.message?.includes('already registered')) {
          this.showAuthError('This username is already taken. Please choose another.');
        } else {
          this.showAuthError(error.message);
        }
        return;
      }

      // 2. Ensure active authenticated session
      let session = data?.session;
      if (!session) {
        // Fallback auto-sign in
        const signInRes = await this.client.auth.signInWithPassword({
          email: email,
          password: pass
        });

        if (signInRes.data && signInRes.data.session) {
          session = signInRes.data.session;
          this.user = signInRes.data.user;
        } else if (signInRes.error) {
          if (signInRes.error.message?.includes('Email not confirmed')) {
            this.showAuthError('Supabase email confirmation is enabled. In Supabase Dashboard -> Authentication -> Providers -> Email, please turn OFF "Confirm email".');
            return;
          }
          this.showAuthError(signInRes.error.message);
          return;
        }
      } else {
        this.user = data.user;
      }

      if (this.user) {
        Toast.show(`Account created! Welcome, ${username}!`, 'success');
        
        // 3. Immediately store local bookmarks to the newly created Supabase account
        await this.pushToCloud(false);
        this.subscribeRealtime();
        this.closeModal();
        this.updateHeaderBadge();
      }
    } catch (e) {
      this.showAuthError(e.message || 'Signup failed');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<iconify-icon icon="lucide:user-plus"></iconify-icon><span>Create Account & Auto-Login</span>`;
      }
    }
  },

  async handleSignIn() {
    const userIn = document.getElementById('auth-login-user');
    const passIn = document.getElementById('auth-login-pass');
    const btn = document.getElementById('auth-login-btn');
    const errEl = document.getElementById('auth-error-msg');

    const userInput = (userIn ? String(userIn.value || '').trim() : '');
    const pass = (passIn ? String(passIn.value || '') : '');

    if (errEl) errEl.style.display = 'none';

    if (!userInput) {
      this.showAuthError('Please enter your username');
      return;
    }
    if (!pass) {
      this.showAuthError('Please enter your password');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<iconify-icon icon="lucide:loader-2" class="animate-spin"></iconify-icon><span>Signing In...</span>`;
    }

    const email = this.resolveEmail(userInput);

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email,
        password: pass
      });

      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          this.showAuthError('Incorrect username or password.');
        } else if (error.message?.includes('Email not confirmed')) {
          this.showAuthError('Supabase email confirmation is enabled. In Supabase Dashboard -> Authentication -> Providers -> Email, turn OFF "Confirm email".');
        } else {
          this.showAuthError(error.message);
        }
        return;
      }

      if (data && data.user) {
        this.user = data.user;
        const name = this.user.user_metadata?.username || userInput.split('@')[0];
        Toast.show(`Welcome back, ${name}! Syncing devices...`, 'success');
        await this.pullFromCloud(false);
        this.subscribeRealtime();
        this.closeModal();
        this.updateHeaderBadge();
      }
    } catch (e) {
      this.showAuthError(e.message || 'Login failed');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<iconify-icon icon="lucide:log-in"></iconify-icon><span>Log In & Sync Devices</span>`;
      }
    }
  },

  async handleSignOut() {
    if (!this.client) return;

    try {
      await this.client.auth.signOut();
      this.user = null;
      if (this.realtimeChannel) {
        this.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
      this.updateHeaderBadge();
      this.closeModal();
      Toast.show('Signed out. Local storage bookmarks preserved!', 'info');
    } catch (e) {
      Toast.show('Sign out error: ' + e.message, 'error');
    }
  },

  showAuthError(msg) {
    const el = document.getElementById('auth-error-msg');
    if (el) {
      el.style.display = 'flex';
      el.textContent = msg;
    } else {
      Toast.show(msg, 'warning');
    }
  },

  showModal(tab = 'login') {
    let modal = document.getElementById('auth-sync-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'auth-sync-modal';
      modal.className = 'modal-backdrop active';
      document.body.appendChild(modal);
    } else {
      modal.classList.add('active');
    }

    this.renderModalContent(tab);
  },

  closeModal() {
    const modal = document.getElementById('auth-sync-modal');
    if (modal) modal.classList.remove('active');
  },

  renderModalContent(tab = 'login') {
    const modal = document.getElementById('auth-sync-modal');
    if (!modal) return;

    if (this.user) {
      const username = this.user.user_metadata?.username || this.user.email?.split('@')[0] || 'User';
      const bookmarkCount = Storage.getSavedServers().length;
      const profileCount = Storage.getGameProfiles().length;
      const syncTimeStr = this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString() : 'Active';

      modal.innerHTML = `
        <div class="modal-dialog">
          <button onclick="AuthSync.closeModal()" class="btn btn-icon btn-secondary" style="position: absolute; top: 1rem; right: 1rem;" title="Close">
            <iconify-icon icon="lucide:x"></iconify-icon>
          </button>

          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div class="badge badge-emerald" style="padding: 0.55rem; font-size: 1.3rem; border-radius: var(--radius-md);">
              <iconify-icon icon="lucide:cloud-check"></iconify-icon>
            </div>
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800;">Multi-Device Cloud Sync</h3>
              <p style="font-size: 0.75rem; color: var(--text-muted);">Real-time sync active across all your logged-in devices</p>
            </div>
          </div>

          <!-- Account Details Box -->
          <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent-glow); border: 1px solid var(--accent-primary); color: var(--accent-primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
                  ${username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${username}</div>
                  <div style="font-size: 0.72rem; color: var(--text-dim);">Supabase Cloud ID: ${this.user.id.substring(0, 8)}...</div>
                </div>
              </div>
              <span class="badge badge-emerald" style="font-size: 0.65rem;">
                <iconify-icon icon="lucide:radio"></iconify-icon>
                <span>Live Syncing</span>
              </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; text-align: center;">
              <div>
                <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase;">Bookmarks</div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--accent-primary);">${bookmarkCount}</div>
              </div>
              <div>
                <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase;">Profiles</div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--accent-cyan);">${profileCount}</div>
              </div>
              <div>
                <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase;">Last Sync</div>
                <div style="font-weight: 700; font-size: 0.78rem; color: var(--text-main); margin-top: 0.15rem;">${syncTimeStr}</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <button onclick="AuthSync.pushToCloud(false)" class="btn btn-primary btn-sm" style="flex: 1;">
              <iconify-icon icon="lucide:upload-cloud"></iconify-icon>
              <span>Save Local to Supabase</span>
            </button>
            <button onclick="AuthSync.pullFromCloud(false)" class="btn btn-secondary btn-sm" style="flex: 1;">
              <iconify-icon icon="lucide:download-cloud"></iconify-icon>
              <span>Download Cloud Data</span>
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
            <button onclick="AuthSync.handleSignOut()" class="btn btn-danger btn-sm">
              <iconify-icon icon="lucide:log-out"></iconify-icon>
              <span>Sign Out</span>
            </button>
            <button onclick="AuthSync.closeModal()" class="btn btn-secondary btn-sm">Close</button>
          </div>
        </div>
      `;
      return;
    }

    // Unauthenticated State: Login / Sign Up Tabs
    modal.innerHTML = `
      <div class="modal-dialog">
        <button onclick="AuthSync.closeModal()" class="btn btn-icon btn-secondary" style="position: absolute; top: 1rem; right: 1rem;" title="Close">
          <iconify-icon icon="lucide:x"></iconify-icon>
        </button>

        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div class="badge badge-emerald" style="padding: 0.5rem; font-size: 1.2rem; border-radius: var(--radius-md);">
            <iconify-icon icon="lucide:cloud"></iconify-icon>
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800;">Multi-Device Cloud Sync</h3>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Sync bookmarks across PC, laptop & phone with just a username</p>
          </div>
        </div>

        <!-- Tab Switcher -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.35rem; margin-bottom: 1.25rem; background: var(--bg-primary); padding: 0.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <button onclick="AuthSync.renderModalContent('login')" class="btn btn-sm ${tab === 'login' ? 'btn-primary' : 'btn-secondary'}" style="border: none;">
            <iconify-icon icon="lucide:log-in"></iconify-icon>
            <span>Log In</span>
          </button>
          <button onclick="AuthSync.renderModalContent('signup')" class="btn btn-sm ${tab === 'signup' ? 'btn-primary' : 'btn-secondary'}" style="border: none;">
            <iconify-icon icon="lucide:user-plus"></iconify-icon>
            <span>Create Account</span>
          </button>
        </div>

        <!-- Error Message Alert -->
        <div id="auth-error-msg" style="display: none; background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: var(--radius-md); padding: 0.6rem 0.85rem; color: #f43f5e; font-size: 0.75rem; margin-bottom: 0.85rem; align-items: center; gap: 0.35rem; line-height: 1.4;"></div>

        ${tab === 'login' ? `
          <!-- Log In Form (Username-based) -->
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <div class="input-group">
              <label class="input-label" for="auth-login-user"><span>Username</span></label>
              <div class="input-wrapper">
                <input type="text" id="auth-login-user" placeholder="e.g. DuperPro" class="input-control" autocomplete="username" />
              </div>
            </div>

            <div class="input-group">
              <label class="input-label" for="auth-login-pass"><span>Password</span></label>
              <div class="input-wrapper">
                <input type="password" id="auth-login-pass" placeholder="••••••••" class="input-control" autocomplete="current-password" />
              </div>
            </div>

            <button onclick="AuthSync.handleSignIn()" id="auth-login-btn" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
              <iconify-icon icon="lucide:log-in"></iconify-icon>
              <span>Log In & Sync Devices</span>
            </button>
          </div>
        ` : `
          <!-- Create Account Form (Username-based, Zero Email Required) -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div class="input-group">
              <label class="input-label" for="auth-signup-user"><span>Username</span></label>
              <div class="input-wrapper">
                <input type="text" id="auth-signup-user" placeholder="Choose a username" class="input-control" autocomplete="username" />
              </div>
            </div>

            <div class="grid-2col" style="gap: 0.5rem;">
              <div class="input-group">
                <label class="input-label" for="auth-signup-pass"><span>Password</span></label>
                <div class="input-wrapper">
                  <input type="password" id="auth-signup-pass" placeholder="6+ characters" class="input-control" autocomplete="new-password" />
                </div>
              </div>

              <div class="input-group">
                <label class="input-label" for="auth-signup-confirm"><span>Confirm Password</span></label>
                <div class="input-wrapper">
                  <input type="password" id="auth-signup-confirm" placeholder="Repeat password" class="input-control" autocomplete="new-password" />
                </div>
              </div>
            </div>

            <button onclick="AuthSync.handleSignUp()" id="auth-signup-btn" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
              <iconify-icon icon="lucide:user-plus"></iconify-icon>
              <span>Create Account & Auto-Login</span>
            </button>
          </div>
        `}

        <div style="border-top: 1px solid var(--border-color); margin-top: 1.25rem; padding-top: 0.75rem; text-align: center; font-size: 0.72rem; color: var(--text-dim);">
          <span>Cloud Sync is completely optional. You can use the app without logging in.</span>
        </div>
      </div>
    `;
  }
};

window.addEventListener('DOMContentLoaded', () => AuthSync.init());
