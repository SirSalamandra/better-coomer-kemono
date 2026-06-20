# ADR 0001: Host Support Policy and Manifest Generation

## Status
Accepted

## Context
The extension currently tries to recognize supported hosts in runtime code while browser manifests still hardcode host-related permissions and matches separately. This creates drift between runtime behavior and browser permissions.

The project needs a clear way to define which hosts are officially supported and ensure runtime checks and generated manifests stay aligned.

## Decision
- The project defines an explicit Host Support Policy.
- Supported hosts are a concrete allowlist of full hostnames.
- The current supported hosts are `coomer.st` and `kemono.cr`.
- A host not present in the allowlist is an Unsupported Host and must be treated as a safe no-op at runtime.
- The canonical host list lives in shared code, not in `config.ts`.
- Browser manifests are generated from per-target templates plus a build script.
- The build script injects only the fields derived from the Host Support Policy instead of rebuilding entire manifests from scratch.

## Consequences
### Positive
- Runtime behavior and browser permissions come from the same source of truth.
- Adding or removing support for a host becomes an explicit policy change.
- Per-target manifest differences remain visible in templates.
- The extension avoids misleading “automatic support” for future TLD changes.

### Negative
- Supporting a new host now requires a code change, rebuild, and release.
- The build pipeline becomes slightly more complex because manifest generation is no longer fully static.

## Alternatives considered

### Heuristic runtime matching by basename
Rejected because browser manifests still need explicit permission entries, and basename heuristics can imply support the extension cannot actually guarantee.

### Keep multiple hand-maintained manifests
Rejected because host lists would continue to drift across targets and runtime checks.

### One fully generated manifest builder
Rejected for now because it hides target-specific manifest differences and introduces unnecessary complexity for this project.
