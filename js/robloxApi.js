/**
 * RBX Server Manager - Roblox API & Game Lookup Service
 * Universal Multi-Tier Engine: Direct Memory Bridge Hook, Local Node Proxy, Session Bridge & CORS Mirrors
 */

const RobloxApi = {
  // Extract 8-digit short code (2nd and 3rd UUID segments e.g. "f635-417d") matching RoPro & BTRoblox standard
  formatShortCode(id) {
    if (!id) return 'Unknown';
    const trimmed = String(id).trim();
    if (trimmed.length <= 9) return trimmed;

    // Standard hyphenated UUID (e.g. f4c34c77-f635-417d-a60a-086391a61d81)
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      if (parts.length >= 3 && parts[1] && parts[2]) {
        return `${parts[1]}-${parts[2]}`;
      }
    }

    // Unhyphenated hex string
    const clean = trimmed.replace(/[^a-f0-9]/gi, '');
    if (clean.length >= 16) {
      return `${clean.substring(8, 12)}-${clean.substring(12, 16)}`;
    }

    return trimmed.substring(0, 9);
  },

  // Fetch official game details (Name, Creator, Description) using Place ID
  async fetchGameDetails(placeId) {
    if (!placeId) return null;
    const cleanId = String(placeId).trim().replace(/[^0-9]/g, '');
    if (!cleanId) return null;

    // 1. Direct Memory Bridge Hook (Instant 0ms, Zero Blocks)
    if (typeof window.__RBX_BRIDGE__ !== 'undefined' && typeof window.__RBX_BRIDGE__.fetchGameInfo === 'function') {
      try {
        const directRes = await window.__RBX_BRIDGE__.fetchGameInfo(cleanId);
        if (directRes && directRes.success && directRes.data) {
          return directRes.data;
        }
      } catch (e) {
        console.warn('Direct Bridge fetchGameInfo failed:', e);
      }
    }

    // 2. Local Node Proxy Endpoint (if running via `node serve.js` or `start.bat`)
    try {
      const localRes = await fetch(`/api/roblox/game-details?placeId=${cleanId}`);
      if (localRes.ok) {
        const data = await localRes.json();
        if (data && data.name) {
          return {
            name: data.name,
            creatorName: data.creatorName || (data.creator && data.creator.name) || 'Roblox',
            description: data.description || ''
          };
        }
      }
    } catch (e) {
      // Local backend not reachable
    }

    // 3. Session Bridge postMessage Fallback
    if (typeof Bridge !== 'undefined' && (Bridge.isActive || window.__RBX_BRIDGE_ACTIVE__)) {
      try {
        const bridgeRes = await Bridge.fetchGameInfo(cleanId);
        if (bridgeRes && bridgeRes.success && bridgeRes.data) {
          return bridgeRes.data;
        }
      } catch (e) {
        console.warn('Bridge postMessage game info failed:', e);
      }
    }

    // 4. Fallback to Public CORS Proxies
    const proxyList = [
      (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    for (const makeProxy of proxyList) {
      try {
        // Universe ID Lookup
        const universeUrl = makeProxy(`https://apis.roblox.com/universes/v1/places/${cleanId}/universe`);
        const uRes = await fetch(universeUrl);
        if (!uRes.ok) continue;
        const uData = await uRes.json();
        const universeId = uData.universeId || uData.UniverseId;
        if (!universeId) continue;

        // Game Details from Universe ID
        const detailsUrl = makeProxy(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
        const dRes = await fetch(detailsUrl);
        if (!dRes.ok) continue;
        const dData = await dRes.json();
        if (dData && dData.data && dData.data.length > 0) {
          const g = dData.data[0];
          return {
            name: g.name,
            creatorName: g.creator ? g.creator.name : 'Roblox',
            description: g.description || ''
          };
        }
      } catch (e) {
        console.warn('Public proxy game details failed:', e);
      }
    }

    return null;
  },

  // Fetch active public servers for any Place ID
  async fetchServers(placeId, limit = '100', cursor = '') {
    const cleanId = String(placeId || '').trim().replace(/[^0-9]/g, '');
    if (!cleanId) return { success: false, error: 'Invalid Place ID' };

    // 1. Direct Memory Bridge Hook (Instant 0ms, Direct GM_xmlhttpRequest execution)
    if (typeof window.__RBX_BRIDGE__ !== 'undefined' && typeof window.__RBX_BRIDGE__.fetchServers === 'function') {
      try {
        const directRes = await window.__RBX_BRIDGE__.fetchServers(cleanId, limit, cursor);
        if (directRes && directRes.success) {
          return directRes;
        }
      } catch (e) {
        console.warn('Direct Memory Bridge fetchServers failed:', e);
      }
    }

    // 2. Local Node Proxy Endpoint (Bypasses Cloudflare completely on localhost:3000)
    try {
      const query = `/api/roblox/servers?placeId=${cleanId}&limit=${limit}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
      const localRes = await fetch(query);
      if (localRes.ok) {
        const json = await localRes.json();
        if (json && json.data) {
          return { success: true, data: json.data, nextPageCursor: json.nextPageCursor };
        }
      }
    } catch (e) {
      // Local backend not reachable or running on file://
    }

    // 3. Userscript Session Bridge postMessage Fallback
    if (typeof Bridge !== 'undefined' && (Bridge.isActive || window.__RBX_BRIDGE_ACTIVE__)) {
      try {
        const bridgeRes = await Bridge.fetchServers(cleanId, limit, cursor);
        if (bridgeRes && bridgeRes.success) {
          return bridgeRes;
        }
      } catch (e) {
        console.warn('Bridge postMessage fetchServers failed:', e);
      }
    }

    // 4. Fallback to Multi-Proxy Rotation
    const robloxTarget = `https://games.roblox.com/v1/games/${cleanId}/servers/0?sortOrder=2&limit=${limit}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
    const proxyList = [
      (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    for (const makeProxy of proxyList) {
      try {
        const res = await fetch(makeProxy(robloxTarget));
        if (!res.ok) continue;
        const json = await res.json();
        if (json && json.data) {
          return { success: true, data: json.data, nextPageCursor: json.nextPageCursor };
        }
      } catch (e) {
        console.warn('Public CORS proxy failed:', e);
      }
    }

    return {
      success: false,
      error: 'Public proxies blocked by Roblox Cloudflare. Connect your Session Bridge or use the local server (start.bat) for guaranteed access.'
    };
  },

  // Deep multi-page scanning engine (scans up to 300 servers across multiple pages for maximum discovery)
  async deepScanServers(placeId, maxPages = 3) {
    const cleanId = String(placeId || '').trim().replace(/[^0-9]/g, '');
    if (!cleanId) return [];

    let allServers = [];
    let currentCursor = '';

    for (let page = 0; page < maxPages; page++) {
      const res = await this.fetchServers(cleanId, '100', currentCursor);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        allServers.push(...res.data);
        if (res.nextPageCursor) {
          currentCursor = res.nextPageCursor;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return allServers;
  },

  // Fetch friends currently playing on servers for a Place ID
  async fetchFriendsInGame(placeId) {
    const cleanId = String(placeId || '').trim().replace(/[^0-9]/g, '');
    if (!cleanId) return [];

    // 1. Direct Memory Bridge Hook (Instant 0ms, Direct GM_xmlhttpRequest execution)
    if (typeof window.__RBX_BRIDGE__ !== 'undefined' && typeof window.__RBX_BRIDGE__.fetchFriendsPresence === 'function') {
      try {
        const res = await window.__RBX_BRIDGE__.fetchFriendsPresence(cleanId);
        if (res && res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (e) {
        console.warn('Direct bridge fetchFriendsPresence failed:', e);
      }
    }

    // 2. Session Bridge postMessage Fallback
    if (typeof Bridge !== 'undefined' && (Bridge.isActive || window.__RBX_BRIDGE_ACTIVE__)) {
      try {
        const res = await Bridge.fetchFriendsPresence(cleanId);
        if (res && res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (e) {
        console.warn('Bridge postMessage fetchFriendsPresence failed:', e);
      }
    }

    return [];
  },

  // Resolve short 8-digit codes (e.g. 27eb-4606) to full UUID
  async resolveServerId(placeId, inputCode) {
    if (!inputCode) return null;
    const raw = String(inputCode).trim();
    if (!raw) return null;

    // Already a full 36-character UUID
    if (raw.length > 20 && raw.includes('-')) {
      return raw;
    }

    const cleanCode = raw.toLowerCase().replace(/[^a-f0-9]/g, '');

    // 1. Fast in-memory check from currently loaded servers (0ms instant lookup)
    if (typeof ServerExplorer !== 'undefined' && Array.isArray(ServerExplorer.servers) && ServerExplorer.servers.length > 0) {
      const memMatch = ServerExplorer.servers.find(srv => {
        const sId = String(srv.id || '').toLowerCase().replace(/[^a-f0-9]/g, '');
        return sId.includes(cleanCode);
      });
      if (memMatch && memMatch.id) return memMatch.id;
    }

    // 2. Fetch deep servers from Roblox API to match
    const servers = await this.deepScanServers(placeId, 2);
    if (servers && servers.length > 0) {
      const match = servers.find(srv => {
        const sId = String(srv.id || '').toLowerCase().replace(/[^a-f0-9]/g, '');
        // Direct substring match (supports 2nd-3rd segments like f635-417d)
        if (sId.includes(cleanCode)) return true;

        // Bookend match fallback (first 4 + last 4)
        if (cleanCode.length === 8) {
          const first4 = cleanCode.substring(0, 4);
          const last4 = cleanCode.substring(4, 8);
          if (sId.startsWith(first4) && sId.endsWith(last4)) return true;
        }

        return false;
      });

      if (match) return match.id;
    }

    return raw;
  },

  // Launch Roblox game instance
  async launch(placeId, inputId, onStatusUpdate = null) {
    const targetPlace = String(placeId || Storage.getActivePlaceId() || '').trim();
    let finalId = String(inputId || '').trim();

    if (!targetPlace) {
      if (onStatusUpdate) onStatusUpdate({ error: true, message: 'Place ID is required to launch!' });
      return;
    }

    if (finalId && finalId.length <= 12) {
      if (onStatusUpdate) onStatusUpdate({ loading: true, message: `Resolving code "${finalId}"...` });
      const resolved = await this.resolveServerId(targetPlace, finalId);
      if (resolved) {
        finalId = resolved;
      }
    }

    // Build modern official Roblox Deep-Link URI (Bypasses 403 authentication ticket errors)
    let uri = `roblox://experiences/start?placeId=${targetPlace}`;
    if (finalId) {
      uri += `&gameInstanceId=${finalId}`;
    }

    if (onStatusUpdate) onStatusUpdate({ loading: true, message: 'Opening Roblox Protocol...' });

    // Get Active App Color Theme
    const currentTheme = Storage.getTheme() || document.documentElement.getAttribute('data-theme') || 'dark';
    const launchUrl = `launch.html?placeId=${encodeURIComponent(targetPlace)}${finalId ? '&jobId=' + encodeURIComponent(finalId) : ''}&theme=${encodeURIComponent(currentTheme)}`;

    // Launch via Dedicated Disposable "Launcher" Tab (Clean URL & Tab Title)
    try {
      window.open(launchUrl, '_blank');
    } catch (e) {
      // Fallback to isolated hidden iframe if popups are restricted
      let iframe = document.getElementById('rbx-launch-frame');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'rbx-launch-frame';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:0;pointer-events:none;';
        document.body.appendChild(iframe);
      }
      iframe.src = `roblox://experiences/start?placeId=${targetPlace}${finalId ? '&gameInstanceId=' + finalId : ''}`;
    }

    if (onStatusUpdate) {
      setTimeout(() => {
        onStatusUpdate({
          success: true,
          message: finalId ? `Launched server ${this.formatShortCode(finalId)}!` : 'Launched game instance!'
        });
      }, 400);
    }
  }
};
