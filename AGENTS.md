# Repository Guidelines

## Agent Workflow Preferences
Use caveman mode in every response by default unless the user explicitly asks for normal mode.
For codebase exploration, architecture questions, and file relationship discovery, use `graphify` first when available instead of manually tracing files.

## Project Structure & Module Organization
This repository builds a browser extension for Coomer and Kemono. Core source lives in `src/`. Use `src/background/` for service-worker logic, `src/content/` for page-side scripts, `src/ui/` for popup and management pages, `src/core/` for database/config utilities, `src/features/` for focused behaviors, and `src/shared/` for cross-cutting types and constants. Tests live in `src/__tests__/`. Browser manifests are stored in `manifests/`, build helpers in `scripts/`, and production output is generated into `dist/`.

## Build, Test, and Development Commands
Install dependencies with `npm install`.

- `npm test` runs the Jest suite once in `jsdom`.
- `npm run test:watch` reruns tests during active development.
- `npm run build -- chrome` bundles the extension and copies the Chrome manifest into `dist/`.
- `npm run build -- firefox` does the same for Firefox.

Load the built extension from `dist/` in `chrome://extensions` or `about:debugging`.

## Coding Style & Naming Conventions
The codebase is TypeScript-first and uses 2-space indentation. Prefer `camelCase` for variables and functions, `PascalCase` for types and classes, and descriptive filenames such as `indexedDbManager.ts` or `messageHandler.ts`. Keep shared DTOs and domain types in `src/shared/types/`. No dedicated lint or formatter config is checked in, so match the surrounding style and keep imports, spacing, and quote usage consistent with nearby files.

## Testing Guidelines
Tests use Jest with `ts-jest` and follow `src/__tests__/**/*.test.ts`. Add or update tests alongside behavior changes, especially around IndexedDB migrations, enrichment logic, and management UI flows. Prefer focused unit tests over broad fixtures, and use existing naming patterns like `management.test.ts` or `migrationRunner.test.ts`.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style, for example `feat(management): ...` and `feat(db): ...`. Keep commit subjects imperative and scoped when possible. Pull requests should explain the user-visible change, note browser-specific impact if any, link the related issue, and include screenshots when UI pages in `src/ui/` change.

## Browser Extension Notes
Keep manifest-specific changes isolated to `manifests/`. When adding assets, confirm they are copied or referenced by the webpack/build pipeline so `dist/` remains loadable without manual steps.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues. External PRs are not treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Using default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.
