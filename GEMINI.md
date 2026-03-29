# Project: Better SU

## Project Overview

**Better SU** is a browser extension (Chrome/Firefox) that enhances `kemono.cr` and `coomer.st` by tracking visited posts ("Viewed" tags), enabling "Mark as Unread", and adding audio players to posts with audio attachments. It's built with TypeScript and bundled with Webpack.

## Commands

```bash
npm install
npm run build chrome    # Build for Chrome (Manifest v3)
npm run build firefox   # Build for Firefox (Manifest v2)
npm test                # Run all tests (Jest)
npm run test:watch      # Re-run tests on file change
```

Output goes to `dist/`.

### Testing Setup

- **Jest 29 + ts-jest** with `jsdom` as the default environment.
- **fake-indexeddb** replaces the real browser IndexedDB in `indexedDbManager.test.ts`.
- `indexedDbManager.test.ts` uses `@jest-environment node` (docblock) to access the real `structuredClone` from Node, which jsdom doesn't expose.
- Test files live in `src/__tests__/`; run a single file with `npx jest src/__tests__/helpers.test.ts`.

### Loading the Extension

- **Chrome:** `chrome://extensions` → Enable Developer mode → Load unpacked → select `dist/`.
- **Firefox:** `about:debugging` → This Firefox → Load Temporary Add-on → select any file in `dist/`.

## Architecture

The extension uses the classic WebExtension three-component model:

### Component Responsibilities

| Component | File | Role |
|---|---|---|
| Background script | `src/background.ts` | Service worker (Chrome MV3) / background page (Firefox MV2). Listens to `browser.tabs.onUpdated`, routes logic by page type, manages DB, proxies messages between content script and DB. |
| Content script | `src/content.ts` | Injected into target pages. Handles DOM mutations (adding "Viewed" tags, audio players, unread buttons) and user interaction events. Communicates with background via messaging. |
| Popup | `src/popup.ts` / `popup.html` | Currently a placeholder. |

### Message Flow

1. User navigates → `browser.tabs.onUpdated` fires in background script.
2. Background calls `ExtractDataFromUrl()` (`helpers.ts`) → `URLDataType` (artist_id, post_id, page type, content_origin).
3. Background queries IndexedDB → sends typed message to content script.
4. Content script handles message types from `EventTypes` enum: `AddViewTag`, `AddPlayerElement`, `RemoveViewTagFromUI`.
5. User clicks "Mark as Unread" (x button) → content sends `RemoveViewTag` to background → background deletes from DB → confirms UI update.

### Key Enums & Types

- `EventTypes` (`src/enums/eventTypes.ts`) — all message types between scripts.
- `Pages` (`src/enums/pages.ts`) — page type identification (ArtistPage, PostPage, etc.).
- `URLDataType` (`src/types/URLDataType.ts`) — parsed URL data structure.
- `Artist`, `Post` (`src/types/`) — DB entity shapes.

### Data Layer

`IndexedDbManager` (`src/database/indexedDbManager.ts`) is a singleton that wraps IndexedDB with two object stores:
- `artists` — keyed by id, stores name + content_origin.
- `posts` — keyed by id, indexed by artist_id and viewed_at.

### Host Configuration

`src/configurations.ts` defines the allowed base hostnames (`kemono`, `coomer`). The helpers match any TLD variation (e.g., `.cr`, `.st`).

### Manifests

Two separate manifests in `manifests/`:
- `chrome.manifest.json` — MV3, uses `service_worker`.
- `firefox.manifest.json` — MV2, uses `background.scripts`.

The build script (`scripts/build.js`) copies the appropriate manifest and supporting files (popup HTML, styles, icons) into `dist/`.

## Development Conventions

### Code Style
The project uses TypeScript with a strictness level that is not fully enforced (`"strict": false` in `tsconfig.json`). It follows standard TypeScript/JavaScript conventions.

### Contribution
The `README.md` file encourages contributions via pull requests and issues.

## Development Log

### Session: 2025-11-21

**Feature: "Mark as Unread"**

- **Goal:** Allow users to manually remove the "Viewed" status from a post.
- **Implementation Steps:**
    1.  **UI:** Added a clickable "x" button next to the "Viewed" tag on post cards (`src/helpers/helpers.ts`).
    2.  **Event Handling:** Implemented a delegated event listener in the `capture` phase in `src/content.ts` to handle clicks on the "x" button, preventing the parent card's click event from firing.
    3.  **Logic:**
        - The content script sends a `RemoveViewTag` message to the background script.
        - The background script (`src/background.ts`) deletes the post record from IndexedDB.
        - The background script sends a `RemoveViewTagFromUI` message back to the content script, which then removes the "Viewed" tag from the DOM.
- **Status:** The feature is fully implemented, tested, and confirmed to be working. The project has been successfully built.
- **Documentation:** Created a `documentation/ideas.md` file to track future feature ideas.
