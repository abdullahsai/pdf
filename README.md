# Local PDF Studio

Local PDF Studio is a 100% in-browser PDF workspace for merging, extracting, reordering, rotating, duplicating, and deleting PDF pages. All processing stays on the client—no files ever leave the browser.

## Key features

- 🧩 **Merge & reorder**: Import multiple PDFs, drag pages into any order, and build a single document timeline.
- ✂️ **Extract / split**: Switch to extract mode to export selected pages or contiguous page groups as individual files.
- 🔁 **Transformations**: Rotate, duplicate, and delete one or many pages at once with keyboard shortcuts and quick actions.
- 🖼️ **Thumbnails & preview**: High-quality thumbnails render progressively in a worker. A dedicated preview pane supports zoom/pan and rotation.
- ⚙️ **Undo/redo**: Full command history for all mutating operations.
- 💾 **Smart storage**: Automatically writes large inputs to OPFS (Origin Private File System) for stability while keeping smaller jobs in memory.
- 📄 **On-demand export**: Build the final PDF in a dedicated worker with progress feedback and options to download or open in a new tab.
- 🔒 **Privacy-first**: Clear messaging confirms everything runs locally.

## Tech stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) for the UI.
- [pdfjs-dist](https://github.com/mozilla/pdf.js) for PDF decoding, metadata, and thumbnail rendering inside a web worker.
- [pdf-lib](https://github.com/Hopding/pdf-lib) for composing the final PDF in an assembly worker.
- [SortableJS](https://sortablejs.github.io/Sortable/) for drag-and-drop page reordering with multi-select support.
- OPFS and Blobs for storage—no IndexedDB fallback (Chrome-only target).

## Development

Prerequisites:

- Node.js 20+
- npm 10+
- Modern Chrome (app runtime)

```bash
npm install
npm run dev
```

The app runs at <http://localhost:5173>. Use Chrome to ensure OPFS access and OffscreenCanvas features.

### Build

```bash
npm run build
```

Output is emitted to `dist/` with hashed assets. Use `npm run preview` to locally test the production build.

## Deployment (CapRover)

This repository ships with everything needed for a CapRover deployment:

- `Dockerfile` – builds the Vite app and serves it with Nginx on port 80.
- `nginx/` – custom config enabling CSP, COOP/COEP, gzip, and brotli (module installed in the image).
- `.dockerignore` – keeps the final image lean.
- `captain-definition` – points CapRover to the Dockerfile.

### CapRover deploy steps

1. Build the production bundle and deploy via CapRover:

   ```bash
   npm run build
   caprover login
   caprover deploy --default
   ```

2. After the first deployment:
   - In the CapRover dashboard, set the container port to **80**.
   - Attach your domain and enable **HTTPS** (CapRover automatically enables HTTP/2 with HTTPS).

No further server configuration is required—the app is a static bundle and does not upload user files.

## Environment notes

- The app targets Chromium-based browsers with OPFS support. Other browsers may lack required APIs.
- There is no i18n or accessibility layer yet; content is English-only.
- Password-protected PDFs prompt for a password; wrong or skipped passwords mark the file as errored without blocking other files.

## Keyboard shortcuts

- `Ctrl/Cmd + A` – Select all pages
- `Ctrl/Cmd + Z` – Undo (Shift for redo)
- `Ctrl/Cmd + S` – Export
- `Delete / Backspace` – Delete selection
- `R` – Rotate selection 90° clockwise

## Privacy

All PDF parsing, rendering, and assembly happen in the browser using workers and OPFS. No network requests occur after the initial page load.
