# Graph Report - better-coomer-kemono  (2026-06-21)

## Corpus Check
- 65 files · ~15,563 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 296 nodes · 629 edges · 22 communities (16 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27157957`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Management UI Logic|Management UI Logic]]
- [[_COMMUNITY_Background Runtime|Background Runtime]]
- [[_COMMUNITY_IndexedDB Storage|IndexedDB Storage]]
- [[_COMMUNITY_Management Page Rendering|Management Page Rendering]]
- [[_COMMUNITY_Project Docs And Tests|Project Docs And Tests]]
- [[_COMMUNITY_Migration Pipeline|Migration Pipeline]]
- [[_COMMUNITY_Chrome Manifest|Chrome Manifest]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Firefox Manifest|Firefox Manifest]]
- [[_COMMUNITY_Content And Events|Content And Events]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Build Script|Build Script]]
- [[_COMMUNITY_Local Tool Permissions|Local Tool Permissions]]
- [[_COMMUNITY_Brand Icon 32|Brand Icon 32]]
- [[_COMMUNITY_Brand Icon 64|Brand Icon 64]]
- [[_COMMUNITY_Brand SVG Logo|Brand SVG Logo]]
- [[_COMMUNITY_Webpack Config|Webpack Config]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `Post` - 41 edges
2. `IndexedDbManager` - 40 edges
3. `Artist` - 37 edges
4. `PostRepository` - 12 edges
5. `escapeHtml()` - 12 edges
6. `ArtistRepository` - 11 edges
7. `DatabaseConnection` - 11 edges
8. `IMigration` - 10 edges
9. `renderPostCard()` - 10 edges
10. `renderArtistDetail()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Claude Project Overview` --semantically_similar_to--> `README Project Overview`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `Gemini Project Overview` --semantically_similar_to--> `README Project Overview`  [INFERRED] [semantically similar]
  GEMINI.md → README.md
- `Repository Guidelines` --references--> `Chrome Extension Manifest`  [EXTRACTED]
  AGENTS.md → manifests/chrome.manifest.json
- `Repository Guidelines` --references--> `Firefox Extension Manifest`  [EXTRACTED]
  AGENTS.md → manifests/firefox.manifest.json
- `Claude Project Overview` --semantically_similar_to--> `Gemini Project Overview`  [EXTRACTED] [semantically similar]
  CLAUDE.md → GEMINI.md

## Import Cycles
- 1-file cycle: `src/shared/constants/supportedHosts.ts -> src/shared/constants/supportedHosts.ts`

## Communities (22 total, 6 thin omitted)

### Community 0 - "Management UI Logic"
Cohesion: 0.06
Nodes (10): ArtistRepository, BackupService, DatabaseConnection, runner, IndexedDbManager, LegacyMigrationService, PostRepository, TrackingQueryService (+2 more)

### Community 1 - "Background Runtime"
Cohesion: 0.15
Nodes (16): AddAudioElementsForAudioLinks(), createBackgroundApp(), setupMessageHandler(), EventTypes, Pages, ContentMessage, PostAttachmentDTO, PostDTO (+8 more)

### Community 2 - "IndexedDB Storage"
Cohesion: 0.21
Nodes (20): renderPostCard(), renderArtistDetail(), getPageArtists(), renderArtistCard(), renderArtists(), resetArtistsPage(), renderHome(), renderPosts() (+12 more)

### Community 3 - "Management Page Rendering"
Cohesion: 0.16
Nodes (5): MigrationRunner, InitialCreate, ForceEnrichmentRefresh, AddPostThumbnailUrl, IMigration

### Community 4 - "Project Docs And Tests"
Cohesion: 0.24
Nodes (6): artist, enrichedPost, unenrichedPost, ArtistProfileDTO, COOMER_SERVICES, enrichPostsForArtists()

### Community 5 - "Migration Pipeline"
Cohesion: 0.11
Nodes (19): action, default_icon, default_popup, default_title, background, service_worker, content_scripts, 32 (+11 more)

### Community 6 - "Chrome Manifest"
Cohesion: 0.11
Nodes (14): SUPPORTED_HOSTS, Configurations, dest, fs, manifest, matchPatterns, mgmt_css, mgmt_ui (+6 more)

### Community 7 - "Package Dependencies"
Cohesion: 0.11
Nodes (18): background, persistent, scripts, browser_action, default_icon, default_popup, content_scripts, 16 (+10 more)

### Community 8 - "Firefox Manifest"
Cohesion: 0.20
Nodes (15): buildArtistProfileUrl(), buildPostUrl(), FETCH_HEADERS, fetchArtistProfile(), fetchPostDetails(), enrichArtistIfNeeded(), enrichArtistSubset(), enrichPostIfNeeded() (+7 more)

### Community 9 - "Content And Events"
Cohesion: 0.15
Nodes (12): action, default_popup, background, service_worker, type, content_scripts, description, host_permissions (+4 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.22
Nodes (4): CHROME_TEMPLATE_PATH, EXPECTED_PATTERNS, FIREFOX_TEMPLATE_PATH, SUPPORTED_HOSTS

### Community 12 - "Build Script"
Cohesion: 0.67
Nodes (4): Repository Guidelines, Chrome Extension Manifest, Firefox Extension Manifest, Firefox Manifest V3 Variant

### Community 13 - "Local Tool Permissions"
Cohesion: 0.50
Nodes (5): Claude Project Overview, Gemini Project Overview, README Project Overview, Feature Roadmap, Architecture Refactor Proposal

### Community 16 - "Brand Icon 64"
Cohesion: 0.67
Nodes (3): logo-32 image asset, stylized fox head logo, orange and black color palette

## Knowledge Gaps
- **73 isolated node(s):** `fs`, `path`, `SUPPORTED_HOSTS`, `dest`, `matchPatterns` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IndexedDbManager` connect `Management UI Logic` to `Firefox Manifest`, `Background Runtime`, `IndexedDB Storage`, `Project Docs And Tests`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `Post` connect `Management UI Logic` to `Firefox Manifest`, `Background Runtime`, `IndexedDB Storage`, `Project Docs And Tests`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `Artist` connect `Management UI Logic` to `Firefox Manifest`, `Background Runtime`, `IndexedDB Storage`, `Project Docs And Tests`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `SUPPORTED_HOSTS` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Management UI Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.05548654244306418 - nodes in this community are weakly interconnected._
- **Should `Background Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.14616755793226383 - nodes in this community are weakly interconnected._
- **Should `Migration Pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._