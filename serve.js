/**
 * RBX Server Manager - Local Server & Roblox API Proxy
 * Zero-dependency built-in Node.js server with authenticated browser emulation headers
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Standard authenticated browser headers to bypass Cloudflare bot detection
const ROBLOX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.roblox.com/',
  'Origin': 'https://www.roblox.com',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site'
};

// In-memory cache for game details
const gameDetailsCache = new Map();

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. API: Fetch Official Game Details by Place ID
  if (pathname === '/api/roblox/game-details') {
    const placeId = parsedUrl.searchParams.get('placeId');
    if (!placeId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing placeId parameter' }));
      return;
    }

    if (gameDetailsCache.has(placeId)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(gameDetailsCache.get(placeId)));
      return;
    }

    try {
      const uRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
        headers: ROBLOX_HEADERS
      });
      if (!uRes.ok) throw new Error('Universe lookup failed');
      const uData = await uRes.json();

      if (!uData.universeId) throw new Error('No universeId returned');

      const gRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${uData.universeId}`, {
        headers: ROBLOX_HEADERS
      });
      if (!gRes.ok) throw new Error('Game details lookup failed');
      const gData = await gRes.json();

      if (gData.data && gData.data.length > 0) {
        const game = gData.data[0];
        const result = {
          success: true,
          name: game.name,
          creatorName: game.creator ? game.creator.name : '',
          description: game.description,
          playing: game.playing,
          universeId: uData.universeId
        };
        gameDetailsCache.set(placeId, result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      throw new Error('Game not found');
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // 2. API: Fetch Public Servers by Place ID
  if (pathname === '/api/roblox/servers') {
    const placeId = parsedUrl.searchParams.get('placeId');
    const limit = parsedUrl.searchParams.get('limit') || '100';
    const cursor = parsedUrl.searchParams.get('cursor') || '';

    if (!placeId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing placeId parameter' }));
      return;
    }

    try {
      const rUrl = `https://games.roblox.com/v1/games/${placeId}/servers/0?sortOrder=2&limit=${limit}${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
      const rRes = await fetch(rUrl, {
        headers: ROBLOX_HEADERS
      });

      if (rRes.ok) {
        const json = await rRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: json.data || [],
          nextPageCursor: json.nextPageCursor || null
        }));
        return;
      }
      throw new Error(`Roblox API returned HTTP ${rRes.status}`);
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message, data: [] }));
      return;
    }
  }

  // 3. Static File Server
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(path.join(ROOT_DIR, reqPath));
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  RBX Server Manager running at: http://localhost:${PORT}`);
  console.log(`  Cloudflare-Bypassing Proxy Active with Full Headers`);
  console.log(`=======================================================`);

  // Auto-open browser on launch
  const openCmd = process.platform === 'win32' ? `start http://localhost:${PORT}` :
                  process.platform === 'darwin' ? `open http://localhost:${PORT}` :
                  `xdg-open http://localhost:${PORT}`;
  exec(openCmd, () => {});
});
