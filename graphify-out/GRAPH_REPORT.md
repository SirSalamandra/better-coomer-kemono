# Graph Report - .  (2026-06-19)

## Corpus Check
- 65 files · ~65,255 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 323 nodes · 632 edges · 21 communities (16 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Firefox MV3 Manifest|Firefox MV3 Manifest]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Build Script|Build Script]]
- [[_COMMUNITY_Local Tool Permissions|Local Tool Permissions]]
- [[_COMMUNITY_Brand Icon 128|Brand Icon 128]]
- [[_COMMUNITY_Brand Icon 32|Brand Icon 32]]
- [[_COMMUNITY_Brand Icon 64|Brand Icon 64]]
- [[_COMMUNITY_Brand SVG Logo|Brand SVG Logo]]
- [[_COMMUNITY_Webpack Config|Webpack Config]]

## God Nodes (most connected - your core abstractions)
1. `IndexedDbManager` - 32 edges
2. `Post` - 29 edges
3. `Artist` - 25 edges
4. `renderArtistDetail()` - 13 edges
5. `render()` - 12 edges
6. `escapeHtml()` - 12 edges
7. `IMigration` - 10 edges
8. `renderPostCard()` - 10 edges
9. `formatDate()` - 10 edges
10. `renderArtistDetail` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Background Tab Update Runtime` --conceptually_related_to--> `Release History`  [INFERRED]
  src/background/index.ts → CHANGELOG.md
- `Architecture Refactor Proposal` --rationale_for--> `Background Tab Update Runtime`  [INFERRED]
  documentation/refacture-archturecture.md → src/background/index.ts
- `Enrich Posts Regression Tests` --rationale_for--> `Release History`  [INFERRED]
  src/__tests__/enrichPostsForArtists.test.ts → CHANGELOG.md
- `Claude Project Overview` --semantically_similar_to--> `README Project Overview`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `Gemini Project Overview` --semantically_similar_to--> `README Project Overview`  [INFERRED] [semantically similar]
  GEMINI.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Project Documentation Set** — better_coomer_kemono_agents_repository_guidelines, better_coomer_kemono_claude_project_overview, better_coomer_kemono_gemini_project_overview, better_coomer_kemono_readme_project_overview [EXTRACTED 1.00]
- **Build Distribution Pipeline** — better_coomer_kemono_package_build_and_test_scripts, scripts_build_distribution_builder, manifests_chrome_extension_manifest, manifests_firefox_extension_manifest [EXTRACTED 1.00]
- **Runtime And Persistence Regression Suite** — background_index_tab_update_runtime, tests_enrich_posts_for_artists_regression_tests, tests_indexed_db_manager_persistence_tests, tests_migration_runner_versioning_tests [INFERRED 0.85]
- **Content API Response Pipeline** — content_inject_api_interceptor, content_index_content_script, background_message_handler_setup_message_handler [EXTRACTED 1.00]
- **IndexedDB Migration Pipeline** — database_indexed_db_manager_indexed_db_manager, database_migration_runner_migration_runner, migrations_1_initial_create_initial_create, migrations_2_force_enrichment_refresh_force_enrichment_refresh, migrations_3_add_post_thumbnail_url_add_post_thumbnail_url [EXTRACTED 1.00]
- **API Enrichment Flow** — background_message_handler_setup_message_handler, utils_enrichment_transform_artist_profile, utils_enrichment_transform_post_profile [EXTRACTED 1.00]
- **Management Page Set** — management_management_router, pages_home_render_home, pages_artists_render_artists, pages_posts_render_posts, pages_artistdetail_render_artist_detail, pages_settings_render_settings [EXTRACTED 1.00]
- **Management Enrichment Flow** — pages_artists_render_artists, pages_posts_render_posts, pages_artistdetail_render_artist_detail, utils_enrich_enrich_artists, utils_enrich_enrich_posts_for_artists [EXTRACTED 1.00]
- **Extension UI Surfaces** — management_management_shell, management_management_router, popup_popup_shell, popup_popup_controller [INFERRED 0.75]

## Communities (21 total, 5 thin omitted)

### Community 0 - "Management UI Logic"
Cohesion: 0.13
Nodes (36): renderPostCard(), artists, currentPage(), db, deleteArtist(), deletePost(), init(), loadData() (+28 more)

### Community 1 - "Background Runtime"
Cohesion: 0.12
Nodes (19): AddAudioElementsForAudioLinks(), db, setupMessageHandler(), EventTypes, Pages, Configurations, ArtistProfileDTO, ContentMessage (+11 more)

### Community 2 - "IndexedDB Storage"
Cohesion: 0.13
Nodes (6): IndexedDbManager, IndexedDbManager, runner, db, Artist, Post

### Community 3 - "Management Page Rendering"
Cohesion: 0.16
Nodes (24): renderPostCard, management router, Management Page Shell, renderArtistDetail, renderArtistCard, renderArtists, renderHome, renderPosts (+16 more)

### Community 4 - "Project Docs And Tests"
Cohesion: 0.13
Nodes (22): Background Tab Update Runtime, Repository Guidelines, Release History, Claude Project Overview, Gemini Project Overview, Jest Config, Package Build And Test Scripts, README Project Overview (+14 more)

### Community 5 - "Migration Pipeline"
Cohesion: 0.16
Nodes (5): MigrationRunner, InitialCreate, ForceEnrichmentRefresh, AddPostThumbnailUrl, IMigration

### Community 6 - "Chrome Manifest"
Cohesion: 0.10
Nodes (20): action, default_icon, default_popup, default_title, background, service_worker, content_scripts, 16 (+12 more)

### Community 7 - "Package Dependencies"
Cohesion: 0.10
Nodes (20): devDependencies, baseline-browser-mapping, copy-webpack-plugin, fake-indexeddb, jest, jest-environment-jsdom, jest-util, ts-jest (+12 more)

### Community 8 - "Firefox Manifest"
Cohesion: 0.10
Nodes (19): background, persistent, scripts, browser_action, default_icon, default_popup, content_scripts, 16 (+11 more)

### Community 9 - "Content And Events"
Cohesion: 0.16
Nodes (18): AddAudioElementsForAudioLinks, setupMessageHandler, EventTypes, content script bootstrap, API interceptor, MigrationRunner, InitialCreate, ForceEnrichmentRefresh (+10 more)

### Community 10 - "Firefox MV3 Manifest"
Cohesion: 0.15
Nodes (12): action, default_popup, background, service_worker, type, content_scripts, description, host_permissions (+4 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.20
Nodes (9): compilerOptions, esModuleInterop, lib, module, outDir, strict, target, exclude (+1 more)

### Community 12 - "Build Script"
Cohesion: 0.22
Nodes (8): dest, fs, manifest, mgmt_css, mgmt_ui, path, pop_css, pop_ui

### Community 15 - "Brand Icon 32"
Cohesion: 0.67
Nodes (3): logo-32 image asset, stylized fox head logo, orange and black color palette

## Knowledge Gaps
- **105 isolated node(s):** `allow`, `manifest_version`, `name`, `version`, `description` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Post` connect `IndexedDB Storage` to `Management UI Logic`, `Background Runtime`, `Content And Events`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `IndexedDbManager` connect `IndexedDB Storage` to `Management UI Logic`, `Background Runtime`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Artist` connect `IndexedDB Storage` to `Management UI Logic`, `Background Runtime`, `Content And Events`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `allow`, `manifest_version`, `name` to the rest of the system?**
  _106 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Management UI Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Background Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `IndexedDB Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.12878787878787878 - nodes in this community are weakly interconnected._