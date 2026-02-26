---
name: logparse-cli
description: Use the logparse CLI to answer targeted World of Warcraft combat-log questions without loading full logs into context. Use when asked for encounter lists, ability event timelines, or filtered event searches from large log files.
---

# Logparse CLI Skill

Use this skill whenever a user asks questions about a WoW combat log and you need precise, low-token outputs.

## Run pattern

- Use `src/lib/parser-cli.ts`.
- Prefer narrow filters first (`--encounter`, `--player`, `--ability`, `--event-types`, `--limit`).
- For row-heavy queries, pass `--encounter` whenever possible.

## Commands

### List encounters
```bash
npx tsx src/lib/parser-cli.ts fight list --input <logfile>
```

### Ability events
```bash
npx tsx src/lib/parser-cli.ts ability events --input <logfile> --encounter "<boss>" --player "<player>" --ability "<ability>" --enemy-only --normalized --limit 300
```

### Generic event search
```bash
npx tsx src/lib/parser-cli.ts events search --input <logfile> --encounter "<boss>" --player "<player>" --event-types SPELL_DAMAGE,SPELL_MISSED --fields timestamp,eventType,ability,target,amount,absorbed,critical --limit 200
```

## Semantics

The CLI uses fixed semantics:

- Overkill contributes `0` damage (event remains visible/countable)
- Absorbed contributes to damage when present in absorbed rows
- `--enemy-only` excludes self/friendly-target damage

### Hit counting / averages / crits (important)

When validating against WCL-style tables, be explicit about the denominator:

- **Damaging hits**: `SPELL_DAMAGE` + `SPELL_PERIODIC_DAMAGE` (plus `SWING_DAMAGE` / `RANGE_DAMAGE` when relevant)
- **Attempts (WCL-style hit rows in many views)**: damaging hits **plus** `*_MISSED` and `SPELL_ABSORBED`
- Use `--include-absorbed` when querying damage event families if you want absorbed rows included without manually adding `SPELL_ABSORBED` to `--event-types`.
- For WCL-style parent rollups, use `--ability-grouping wcl` (currently includes grouping `Ancestor` / elemental pet damage under `Call of the Ancestors`, and is designed to be extended with more rules).
- **Crit % (damage events)**: `critical=true` / damaging hits
- **Crit % (attempt-based)**: `critical=true` / attempts (only if explicitly requested)
- **Average per cast**: total `effectiveDamage` / `SPELL_CAST_SUCCESS` count
- **Average per damaging hit**: total `effectiveDamage` / damaging hits

If the user asks for “hits” without clarification, return both counts:
1) damaging hits, and 2) attempts including misses/absorbs.

## Agent workflow

1. `fight list` to find the encounter
2. `ability events` for row-level verification
3. `events search` for ad-hoc forensic checks

## Output formats

- `--format json` (default)
- `--format jsonl` for line-by-line pipelines
- `--format csv` for spreadsheet export
- `--compact` for minimized output
- `--fields <csv>` to project specific columns
- `--limit <n>` and `--offset` for pagination
