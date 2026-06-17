# 🪣 Bucket

> A modern, feature-rich desktop download manager built with Electron, React, and TypeScript.

Bucket is a sleek, cross-platform download manager that handles everything from single HTTP URLs to batch imports and YouTube video downloads — all wrapped in a beautiful, glassmorphism-inspired UI with dark, AMOLED dark, and light themes.

---

## ✨ Features

### 📥 Download Management
- **Single URL downloads** — Paste any direct HTTP/HTTPS link and start downloading instantly
- **Batch URL downloads** — Add multiple URLs at once (one per line) with a single action
- **File import** — Drag & drop or browse `.txt`, `.csv`, `.html`, or `.json` files to extract and queue URLs automatically
- **YouTube support** — Download YouTube videos via `ytdl-core`, with automatic fallback to `yt-dlp` if available on the system
- **Pause & Resume** — Pause active downloads and resume them at any time
- **Cancel downloads** — Abort any in-progress transfer

### 🗂️ File Categorisation
Downloads are automatically categorised based on file extension:
| Category | Extensions |
|----------|------------|
| 🎬 Video | `mp4`, `mkv`, `avi`, `mov`, `webm` |
| 🎵 Music | `mp3`, `flac`, `wav`, `aac`, `ogg` |
| 🖼️ Images | `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp` |
| 📄 Documents | `pdf`, `doc`, `docx`, `txt`, `pptx`, `xlsx` |
| 📦 Archives | `zip`, `rar`, `7z`, `tar`, `gz` |
| 📁 Other | Everything else |

### 🖥️ UI & Experience
- **Dashboard** — At-a-glance stats (total files, storage used, speed, success rate), weekly activity chart, and recent downloads
- **Downloads page** — Live progress tracking with speed, ETA, and a circular overall progress indicator
- **Library** — Browse your downloaded files by category
- **History** — Review past completed downloads
- **Settings** — Customise theme, accent colour, default save folder, concurrent download limit, speed throttling, notifications, and startup behaviour
- **Custom window controls** — Frameless window with built-in minimize, maximize, and close buttons
- **Theme switcher** — Dark · AMOLED Dark · Light, cycled from the toolbar
- **7 accent colours** — Blue, Cyan, Purple, Green, Orange, Pink, Red
- **Global search bar** — Quickly find files and history entries

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Electron](https://www.electronjs.org/) v34 |
| UI framework | [React](https://react.dev/) v19 with TypeScript |
| Build tool | [Vite](https://vite.dev/) v8 + `vite-plugin-electron` |
| HTTP downloads | [got](https://github.com/sindresorhus/got) v14 |
| YouTube downloads | [ytdl-core](https://github.com/fent/node-ytdl-core) / `yt-dlp` (system fallback) |
| File utilities | [fs-extra](https://github.com/jprichardson/node-fs-extra) |
| Styling | Vanilla CSS (glassmorphism design system) |
| Linting | ESLint + typescript-eslint |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later
- *(Optional)* [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) installed and on your PATH for YouTube fallback support

### Installation

```bash
# Clone the repository
git clone https://github.com/NadunNWijekoon/bucket.git
cd bucket

# Install dependencies
npm install
```

### Running in Development

```bash
npm run dev
```

This starts the Vite dev server and launches the Electron window with hot module replacement (HMR) enabled.

### Building for Production

```bash
npm run build
```

This compiles TypeScript, bundles the renderer with Vite, and packages the Electron app via `electron-builder`. The output is placed in the `dist/` and `dist-electron/` directories.

---

## 📁 Project Structure

```
bucket/
├── electron/
│   ├── main.ts          # Electron main process — window, IPC, download logic
│   └── preload.ts       # Preload script — exposes electronAPI to renderer
├── src/
│   ├── components/
│   │   ├── AddDownloadModal.tsx  # Add download modal (Single / Batch / Import tabs)
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── StatusBar.tsx         # Bottom status bar
│   │   └── TopToolbar.tsx        # Toolbar with search, theme toggle, window controls
│   ├── pages/
│   │   ├── Dashboard.tsx  # Overview stats and recent activity
│   │   ├── Downloads.tsx  # Active download queue with progress
│   │   ├── Library.tsx    # File library by category
│   │   ├── History.tsx    # Download history
│   │   └── Settings.tsx   # App configuration
│   ├── store/
│   │   └── appStore.ts    # Global state (downloads, theme, UI state)
│   ├── App.tsx            # Root component and page router
│   ├── App.css            # Component styles
│   └── index.css          # Global design tokens and base styles
├── public/                # Static assets
├── package.json
└── vite.config.ts
```

---

## ⚙️ How Downloads Work

1. **Renderer** adds a download entry via the app store and sends a `start-download` IPC message to the main process.
2. **Main process** detects the URL type:
   - **YouTube URLs** (`youtube.com` / `youtu.be`): tries `ytdl-core` first; falls back to system `yt-dlp` if available.
   - **All other URLs**: uses `got` for streaming HTTP downloads.
3. Progress, speed, and metadata (filename, total size) are sent back to the renderer via IPC events in real time.
4. Files are written to a temporary `.download` file first, then atomically renamed to their final name in `~/Downloads/Bucket/` on completion.
5. Duplicate filenames are handled automatically by appending `(1)`, `(2)`, etc.

---

## 🎨 Themes

| Theme | Description |
|-------|-------------|
| **Dark** | Default dark mode with rich navy tones |
| **AMOLED Dark** | True-black background, ideal for OLED displays |
| **Light** | Clean light mode for daytime use |

Switch themes from the toolbar button or the **Settings → Appearance** panel.

---

## 📜 License

This project is private. All rights reserved.
