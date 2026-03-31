# Changelog

## [2.1.1] - 2026-03-31

### Fixed

- **Posts page freeze after migration** — Opening the Posts page could cause the management UI to hang indefinitely when posts lacked enrichment data (e.g. after migrating from a previous installation). The root cause was `render()` being called unconditionally at the end of `enrichPostsForArtists`, even when all API requests failed. Because the posts were never updated, the next render would trigger the same failing enrichment again, creating a silent infinite loop with no errors in DevTools. `render()` and `loadData()` are now only called when at least one post was successfully enriched.

### Changed

- **Masonry layout on Artist Detail page** — Post cards in the artist detail view now use the same masonry column layout introduced for the Posts page in 2.1.0, so cards of varying height pack tightly instead of leaving gaps.

### Removed

- **Debug order badges** — Removed the `#N` overlay badges on post cards that were used to verify sort order during development.

---

## [2.1.0] - 2026-03-31

### Added

- **Settings page** — Danger-zone actions (Reset Database) extracted from the Home page into a dedicated Settings page with its own sidebar link.
- **Masonry layout for Posts page** — Replaced the fixed CSS grid with a masonry column layout so cards of varying height pack tightly.

### Changed

- **Home page stats** — Simplified by removing the "Most Tracked Artist" stat.

---

## [2.0.0] - 2026-03-30

### Added

- **Post thumbnail enrichment** — Posts now store a `thumbnail_url` fetched from the API and displayed on post cards (DB migration v3).
- **Enrichment transformation layer** — Centralised `transformArtistProfile` and `transformPostProfile` helpers with safe fallbacks for missing or empty API fields.

### Changed

- **Database renamed** — Database is now `BetterCK_DB`. On first launch after update, data is automatically migrated from the legacy `BetterSU_DB` and the old database is deleted.
- **Project renamed** — Extension renamed from Better SU to Better Coomer/Kemono.
