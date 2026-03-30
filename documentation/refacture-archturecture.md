# Better SU Architecture Refactoring Proposal

## Current Pain Points

1. **Overcrowded `src` Root:** The root of `src/` is currently a mix of core extension entry points (`background.ts`, `content.ts`), UI pages (`popup.*`, `management.*`), and configuration files. This makes it harder to navigate as the project grows.
2. **Helper Monoliths:** `helpers.ts` is handling multiple responsibilities across different domains, such as parsing URLs (`ExtractDataFromUrl`) and directly mutating the DOM (`AddAudioElementsForAudioLinks`).
3. **Redundant Folders:** There is an overlap in purpose between the `helpers/` and `utils/` folders, as well as `enums/` and `utils/enums.ts`. For instance, `enums/eventTypes.ts` and `utils/enums.ts` (which exports `Messages`) both handle messaging constants.
4. **UI Code Mixed with Logic:** HTML and CSS files are sitting alongside core business logic.

## Proposed Modular Structure

To make the project more robust, we can adopt a more domain-driven and modular folder structure. Here is a blueprint:

```text
src/
├── background/         # All background/service worker logic
│   ├── index.ts        # Entry point (renamed from background.ts)
│   └── messageHandler.ts 
├── content/            # All content script logic
│   ├── index.ts        # Entry point (renamed from content.ts)
│   └── inject.ts       
├── ui/                 # Or 'pages/' - Isolated UI components
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   └── management/
│       ├── management.html
│       ├── management.ts
│       └── management.css
├── core/               # Shared business logic and domain concepts
│   ├── database/       # (Keep your existing database structure here)
│   │   ├── indexedDbManager.ts
│   │   ├── MigrationRunner.ts
│   │   └── migrations/
│   └── config.ts       # (Moved from configurations.ts)
├── shared/             # Cross-cutting concerns and utilities
│   ├── types/          # All interfaces (Artist, Post, URLDataType)
│   ├── constants/      # Replaces 'enums/'. Unify Messages and EventTypes here.
│   └── utils/          # Pure, generic functions (e.g., date formatting)
└── features/           # Feature-specific DOM manipulation and logic
    ├── audioPlayer/    # Extracted from helpers.ts
    │   └── dom.ts      
    ├── viewTracking/   # Extracted from helpers.ts
    │   └── dom.ts
    └── urlParser/      # Extracted from helpers.ts
        └── parser.ts
```

## Key Refactoring Steps (Code-Wise)

1. **Break up `helpers.ts`:** Move pure functions (like date formatting or URL parsing) into `shared/utils/` or `features/urlParser/`. Move DOM-manipulating functions (audio players, view tags) into a `features/` directory so that `content.ts` simply imports and orchestrates them.
2. **Unify Constants:** Merge `utils/enums.ts` and `enums/eventTypes.ts` into a single source of truth inside a `shared/constants/` directory to prevent messaging confusion.
3. **Isolate UI:** Group all related HTML, CSS, and TS files for a specific page into their own subdirectories under `ui/` (e.g., `ui/popup/`). This makes Webpack configuration cleaner and keeps the root tidy.
4. **Update Webpack Config:** Webpack will need to be updated to point to the new entry paths (e.g., `src/background/index.ts`, `src/ui/popup/popup.ts`).
