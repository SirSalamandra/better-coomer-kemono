# Project: Better Coomer/Kemono

## Project Overview

**Better Coomer/Kemono** is a browser extension (Chrome/Firefox) that enhances `kemono.cr` and `coomer.st` by tracking visited posts ("Viewed" tags), enabling "Mark as Unread", and adding audio players to posts with audio attachments. It's built with TypeScript and bundled with Webpack.

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

The extension uses the classic WebExtension three-component model with a modular, domain-driven directory structure.

### Directory Structure

```
src/
├── background/             # Service worker / background page
│   ├── index.ts            # Entry point: tab listeners, API enrichment, DB init
│   └── messageHandler.ts   # Runtime message routing
├── content/                # Content script
│   ├── index.ts            # Entry point: DOM orchestration, message handling
│   └── inject.ts           # Script injection helper
├── ui/                     # Isolated UI pages
│   ├── popup/              # popup.html / popup.ts / popup.css
│   └── management/         # management.html / management.ts / management.css
├── core/                   # Shared business logic
│   ├── config.ts           # Host allowlist (Configurations.isHostAllowed)
│   └── database/
│       ├── indexedDbManager.ts
│       ├── MigrationRunner.ts
│       └── migrations/     # 1_InitialCreate.ts, 2_ForceEnrichmentRefresh.ts, 3_...
├── shared/                 # Cross-cutting concerns
│   ├── constants/          # eventTypes.ts, pages.ts
│   ├── types/              # Artist, Post, URLDataType, ArtistProfileDTO, ContentMessage
│   └── utils/              # date.ts (pure generic utilities)
└── features/               # Feature-specific DOM logic extracted from content
    ├── audioPlayer/dom.ts
    ├── viewTracking/dom.ts
    └── urlParser/parser.ts
```

### Component Responsibilities

| Component | Entry Point | Role |
|---|---|---|
| Background script | `src/background/index.ts` | Service worker (Chrome MV3) / background page (Firefox MV2). Listens to `browser.tabs.onUpdated`, routes logic by page type, manages DB, proxies messages between content script and DB. Also performs 24 h API enrichment for artist/post metadata. |
| Message handler | `src/background/messageHandler.ts` | Handles `browser.runtime.onMessage` — decoupled from the tab listener. |
| Content script | `src/content/index.ts` | Injected into target pages. Handles DOM mutations (adding "Viewed" tags, audio players, unread buttons) and user interaction events. Communicates with background via messaging. |
| Popup | `src/ui/popup/` | Extension popup UI with stats. |
| Management | `src/ui/management/` | Full data management interface with API enrichment and stats. |

### Message Flow

1. User navigates → `browser.tabs.onUpdated` fires in background script.
2. Background calls `ExtractDataFromUrl()` (`features/urlParser/parser.ts`) → `URLDataType` (artist_id, post_id, page type, content_origin).
3. Background queries IndexedDB → sends typed message to content script.
4. Content script handles message types from `EventTypes` enum: `AddViewTag`, `AddPlayerElement`, `ExtractArtistInfo`, `ExtractPostInfo`.
5. User clicks "Mark as Unread" (x button) → content sends `RemoveViewTag` to background → background deletes from DB → confirms UI update via `RemoveViewTagFromUI`.

### Key Enums & Types

- `EventTypes` (`src/shared/constants/eventTypes.ts`) — all message types: `AddViewTag`, `AddPlayerElement`, `ExtractArtistInfo`, `ExtractPostInfo`, `RemoveViewTag`, `RemoveViewTagFromUI`, `UpdateData`.
- `Pages` (`src/shared/constants/pages.ts`) — page type identification (ArtistPage, PostPage, etc.).
- `URLDataType` (`src/shared/types/URLDataType.ts`) — parsed URL data structure.
- `Artist`, `Post` (`src/shared/types/`) — DB entity shapes.

### Data Layer

`IndexedDbManager` (`src/core/database/indexedDbManager.ts`) is a singleton that wraps IndexedDB with two object stores:
- `artists` — keyed by id, stores name, content_origin, and enrichment metadata (hostname, thumbnail_url, banner_url, post_count, last_enriched_at).
- `posts` — keyed by id, indexed by artist_id and viewed_at; stores enrichment metadata (name, posted_at, attachment_count, last_enriched_at).

`MigrationRunner` (`src/core/database/MigrationRunner.ts`) applies versioned migrations on `onupgradeneeded`. The background script handles the full migration flow: export → backup to `storage.local` → init new schema → restore → clear backup.

### Host Configuration

`src/core/config.ts` defines the `Configurations` object with `hostBaseNames` (`kemono`, `coomer`) and `isHostAllowed(host)`. The helper matches any TLD variation (e.g., `.cr`, `.st`).

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
