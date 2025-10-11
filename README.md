# PDF Tools (Stage 1)

A lightweight, client-only React app for merging PDF files right inside the browser. No files ever leave the user's device.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 20 or newer
- npm (bundled with Node.js)

### Install dependencies
```bash
npm install
```

### Run the development server
```bash
npm run dev
```
This opens Vite's dev server with hot reloading so you can see changes immediately.

### Run unit tests
```bash
npm test
```
- By default Vitest watches your files so tests re-run as you edit. Add `--run` for a single CI-style run.
- A “unit test” is a small automated check that focuses on one function or component at a time.

### Build the production bundle
```bash
npm run build
```
This creates optimized static files inside the `dist/` folder.

### Preview the production build locally
```bash
npm run preview
```
This serves the `dist/` files locally so you can confirm everything before deploying.

## Project Structure
- `src/App.tsx` – UI for the Stage 1 “Merge PDFs” tool.
- `src/lib/pdfMerge.ts` – Pure merge function used by both the UI and tests.
- `src/lib/*.test.ts` – Unit tests for the merge logic.
- `src/App.test.tsx` – UI test that validates the Merge button behaviour.
- `Dockerfile`, `nginx.conf`, `captain-definition` – Production deployment setup.

## Deploy on CapRover
1. Build and push the Docker image yourself **or** connect this repo to CapRover's GitHub integration.
2. Create a new CapRover app and choose the “Static Site” option, pointing it at container port `80`.
3. Deploy using the provided `captain-definition`. The container serves the built `dist/` folder via nginx.
4. No environment variables are required for Stage 1 – everything runs purely on the client.

## Accessibility and UX Notes
- Buttons and inputs are keyboard accessible and clearly labelled.
- Progress text communicates when merging starts, succeeds, or fails in plain language.
- Helpful hints explain what “client-only” means and why the Merge button may be disabled.

## Future Ideas
- Add PDF previews using `pdfjs-dist`.
- Support more PDF tools (split, compress, rotate) while keeping everything local-first.
