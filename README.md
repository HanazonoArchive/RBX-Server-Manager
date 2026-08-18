# RBX Server Manager
**Universal Game-Agnostic Roblox Server Explorer & Launcher Hub**

RBX Server Manager is a **100% client-side, zero-dependency static web application** designed to track, resolve, and 1-click launch Roblox game servers (Place ID + Server Job ID) across any game.

---

## 🌟 Key Features

1. **100% Game-Agnostic**:
   - Zero hardcoded game locks or IDs.
   - Enter any custom Roblox Place ID or save custom game profiles with 1 click.
   - Dynamically scans active public servers, player counts, and ping.

2. **Instant Server Joiner with Short-Code Auto-Resolution**:
   - Paste 8-character server codes (e.g. `27eb-4606` or `27eb4606`) or full 36-character UUIDs.
   - Resolves and launches instances without leaving or reloading the tab.

3. **Direct Roblox Session Bridge (Tampermonkey / Violentmonkey)**:
   - Connects directly to your signed-in browser session to bypass Roblox Cloudflare restrictions with **0ms latency, zero rate-limits, and zero CORS errors**.

4. **Multi-Theme Glassmorphism Bento UI**:
   - 🌙 **Dark Void**
   - ⚡ **Cyber Neon**
   - 🌲 **Emerald**
   - ☀️ **Clean Light**

---

## 📁 Modular Folder Structure

```
LT2DupeTool/
├── css/
│   ├── variables.css      # Multi-theme design tokens
│   ├── base.css           # Typography (Outfit + JetBrains Mono)
│   ├── layout.css         # Bento grid, sticky header & sidebar drawer
│   ├── components.css     # Glassmorphism cards, buttons & server badges
│   └── animations.css     # Keyframe animations
├── js/
│   ├── storage.js         # LocalStorage manager
│   ├── constants.js       # Game presets
│   ├── themeController.js # Theme switcher
│   ├── toast.js           # Toast notification engine
│   ├── bridge.js          # Roblox Session Bridge connector
│   ├── robloxApi.js       # Safe protocol launcher & API fetcher
│   ├── sidebar.js         # Right-side drawer menu
│   └── app.js             # Main page controller
├── index.html             # Main Server Explorer & Hub
├── rbx-bridge.user.js     # 1-Click Userscript for Session Bridge
├── serve.js               # Zero-dependency local static server
├── start.bat              # 1-Click Windows launcher
└── README.md              # Documentation & setup guide
```

---

## 🚀 How to Deploy to GitHub Pages

1. Push this folder to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Deploy Universal RBX Server Manager"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In GitHub, go to **Settings** -> **Pages** -> Select `main` branch -> **Save**.
3. Your web app will be live at:
   `https://<your-username>.github.io/<repo-name>/`

---

## 💻 How to Run Locally

- Double-click **`start.bat`** to launch the local server at `http://localhost:3000`!
