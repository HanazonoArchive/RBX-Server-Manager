// ==UserScript==
// @name         RBX Server Manager - Direct Session Bridge
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Connects RBX Server Manager directly to your Roblox browser session with 0ms lag, zero CORS blocks, and game name lookup.
// @match        *://localhost/*
// @match        *://127.0.0.1/*
// @match        *://*.github.io/*
// @match        file:///*
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      games.roblox.com
// @connect      apis.roblox.com
// @connect      thumbnails.roblox.com
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // Broadcast presence to the webpage
  function announceBridge() {
    try {
      targetWindow.postMessage({ source: 'RBX_BRIDGE', type: 'PONG', version: '1.3' }, '*');
    } catch (e) {}
  }

  // Periodic heartbeat on load
  announceBridge();
  let count = 0;
  const heartbeat = setInterval(() => {
    announceBridge();
    count++;
    if (count > 5) clearInterval(heartbeat);
  }, 1000);

  // Listen for requests from RBX Server Manager via standard postMessage
  targetWindow.addEventListener('message', function(e) {
    if (!e.data || e.data.source !== 'RBX_PAGE') return;

    if (e.data.type === 'PING') {
      announceBridge();
      return;
    }

    // 1. Fetch Servers Request
    if (e.data.type === 'FETCH_SERVERS') {
      const { placeId, limit, cursor, requestId } = e.data;
      const safeLimit = limit || '100';
      const url = `https://games.roblox.com/v1/games/${placeId}/servers/0?sortOrder=2&limit=${safeLimit}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;

      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        anonymous: false,
        timeout: 12000,
        onload: function(response) {
          try {
            const data = JSON.parse(response.responseText);
            targetWindow.postMessage({
              source: 'RBX_BRIDGE',
              type: 'FETCH_SERVERS_RESPONSE',
              requestId: requestId,
              success: true,
              data: data,
              status: response.status
            }, '*');
          } catch (err) {
            targetWindow.postMessage({
              source: 'RBX_BRIDGE',
              type: 'FETCH_SERVERS_RESPONSE',
              requestId: requestId,
              success: false,
              error: err.message,
              status: response.status
            }, '*');
          }
        },
        onerror: function(err) {
          targetWindow.postMessage({
            source: 'RBX_BRIDGE',
            type: 'FETCH_SERVERS_RESPONSE',
            requestId: requestId,
            success: false,
            error: 'Network request error'
          }, '*');
        },
        ontimeout: function() {
          targetWindow.postMessage({
            source: 'RBX_BRIDGE',
            type: 'FETCH_SERVERS_RESPONSE',
            requestId: requestId,
            success: false,
            error: 'Request timed out'
          }, '*');
        }
      });
    }

    // 2. Fetch Game Name & Details by Place ID
    if (e.data.type === 'FETCH_GAME_INFO') {
      const { placeId, requestId } = e.data;

      // Step A: Get universe ID from place ID
      GM_xmlhttpRequest({
        method: 'GET',
        url: `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
        headers: { 'Accept': 'application/json' },
        anonymous: false,
        timeout: 8000,
        onload: function(uRes) {
          try {
            const uData = JSON.parse(uRes.responseText);
            if (uData.universeId) {
              // Step B: Get game details from universe ID
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://games.roblox.com/v1/games?universeIds=${uData.universeId}`,
                headers: { 'Accept': 'application/json' },
                anonymous: false,
                timeout: 8000,
                onload: function(gRes) {
                  try {
                    const gData = JSON.parse(gRes.responseText);
                    if (gData.data && gData.data.length > 0) {
                      const game = gData.data[0];
                      targetWindow.postMessage({
                        source: 'RBX_BRIDGE',
                        type: 'FETCH_GAME_INFO_RESPONSE',
                        requestId: requestId,
                        success: true,
                        name: game.name,
                        description: game.description,
                        creatorName: game.creator ? game.creator.name : '',
                        universeId: uData.universeId
                      }, '*');
                    } else {
                      targetWindow.postMessage({
                        source: 'RBX_BRIDGE',
                        type: 'FETCH_GAME_INFO_RESPONSE',
                        requestId: requestId,
                        success: false,
                        error: 'Game details not found'
                      }, '*');
                    }
                  } catch (err) {
                    targetWindow.postMessage({
                      source: 'RBX_BRIDGE',
                      type: 'FETCH_GAME_INFO_RESPONSE',
                      requestId: requestId,
                      success: false,
                      error: err.message
                    }, '*');
                  }
                },
                onerror: function() {
                  targetWindow.postMessage({
                    source: 'RBX_BRIDGE',
                    type: 'FETCH_GAME_INFO_RESPONSE',
                    requestId: requestId,
                    success: false,
                    error: 'Failed to fetch game details'
                  }, '*');
                }
              });
            } else {
              targetWindow.postMessage({
                source: 'RBX_BRIDGE',
                type: 'FETCH_GAME_INFO_RESPONSE',
                requestId: requestId,
                success: false,
                error: 'Universe not found'
              }, '*');
            }
          } catch (err) {
            targetWindow.postMessage({
              source: 'RBX_BRIDGE',
              type: 'FETCH_GAME_INFO_RESPONSE',
              requestId: requestId,
              success: false,
              error: err.message
            }, '*');
          }
        },
        onerror: function() {
          targetWindow.postMessage({
            source: 'RBX_BRIDGE',
            type: 'FETCH_GAME_INFO_RESPONSE',
            requestId: requestId,
            success: false,
            error: 'Universe lookup failed'
          }, '*');
        }
      });
    }
  });

  console.log('[RBX Server Manager] Direct Session Bridge v1.3 Ready!');
})();
