# CLI Implementation Tasks (Agent-Friendly)

## Scope
Implement the command spec from `COMMANDS.md` with a practical MVP first, then parity/quality features.

---

## Phase 1 — MVP Commands

### 1) Command entrypoint + argument parsing
- [x] Create `src/lib/cli/index.ts` (main entrypoint)
- [x] Support subcommands:
  - `fight list`
  - `ability events`
  - `events search`
- [x] Add global options:
  - `--input`, `--format`, `--compact`, `--out`, `--limit`, `--offset`, `--sort`, `--fields`
- [x] Add filter options:
  - `--encounter`, `--player`, `--target`, `--ability`, `--event-types`, `--time-range`

### 2) Core query engine
- [x] Create `src/lib/cli/query-engine.ts`
- [x] Implement normalized event stream from parser (`parser-events.ts`)
- [x] Implement reusable filters (encounter/player/target/ability/type/time)
- [x] Implement pagination and sort for row outputs

### 3) Encounter indexing
- [x] Create `src/lib/cli/encounter-index.ts`
- [x] Build in-memory index with encounter boundaries + metadata
- [x] Provide `resolveEncounter(id|name)` helper

### 4) Output formatting
- [x] Create `src/lib/cli/output.ts`
- [x] Implement `json` output first
- [x] Add `jsonl` output
- [x] Add optional `csv` output for tabular rows
- [x] Respect `--fields` projection
- [x] Add compact metadata mode (`--compact`)

### 5) Implement each MVP command
- [x] `fight list`
  - returns fight list with duration/result/timestamps
- [x] `ability events`
  - row-level events with normalized columns
- [x] `events search`
  - generic filtered row retrieval

---

## Phase 2 — Damage Semantics (Fixed Rules)

### 6) Semantics layer
- [x] Create semantics helper (`src/lib/cli/output.ts`)
- [x] Implement fixed rules:
  - absorbed counts as damage
  - overkill counts as 0 damage (event still returned/countable)
  - enemy-only excludes self/friendly targets
- [x] Wire only `--enemy-only` flag
- [x] Include semantics metadata in every output payload

### 7) Enemy-only projection support
- [x] Ensure commands can return enemy-only values without losing raw parser output
- [x] Validate self/friendly damage exclusion in enemy views

---

## Phase 3 — Agent Optimizations

### 8) Token-efficient defaults
- [x] Default row-heavy commands to `--limit 200`
- [x] Document recommendation to use `--encounter` for heavy commands (`ability events`, `events search`) instead of enforcing it
- [x] Ensure `--compact` removes non-essential payload keys

### 9) Fast-path summaries
- [x] Add fast path for `fight list` (encounter-boundary-only parse, no full event retention)

### 9.1) Cleanup
- [ ] Remove unused/dead code after command-scope changes (e.g., old `fight summary` code paths)

## Phase 4 — Validation and Parity

### 10) Fixtures and regression tests
- [x] Add fixtures for Plexus Sentinel / Eruani cases
- [x] Validate known expected values (from reference reports):
  - Void Ray: hits/crit%/damage parity
  - Burning Blades: absorbed periodic tick inclusion
  - Melee: hit count and absorbed events
- [ ] Add regression tests for advanced-log field mapping

### 11) CLI tests
- [x] Add unit tests for filter parsing and query engine
- [x] Add tests for all CLI subcommands in current scope
- [ ] Add snapshot tests for JSON output schemas

---

## Phase 5 — Packaging and UX

### 12) NPM scripts and docs
- [x] Add `package.json` scripts for stable test runs (`test`, `test:ci`, `test:watch`)
- [x] Update CLI usage docs with examples
- [x] Add examples optimized for agent workflows (including csv/jsonl and stdin)

### 13) Optional: OpenClaw skill packaging
- [x] Create skill folder scaffold
- [x] Add `SKILL.md` with clear trigger description
- [ ] Add minimal wrappers/examples for running CLI commands from agent context

---

## Acceptance Criteria (MVP)

- [x] Agent can answer targeted questions without loading full log JSON
- [x] `ability events` is deterministic and paginated
- [x] Output includes explicit semantics metadata
- [x] Known Plexus/Eruani parity checks pass for key abilities/events
