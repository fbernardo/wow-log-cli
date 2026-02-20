---
name: logparse-cli
description: Use the logparse CLI to answer targeted World of Warcraft combat-log questions without loading full logs into context. Use when asked for encounter lists, fight summaries, player summaries, ability event timelines, filtered event searches, or parser anomaly checks from large log files.
---

# Logparse CLI Skill

Use this skill whenever a user asks questions about a WoW combat log and you need precise, low-token outputs.

## Run pattern

- Use `src/lib/parser-cli.ts` or run via `npx tsx src/lib/parser-cli.ts <command>`.
- Prefer narrow filters first (`--encounter`, `--player`, `--ability`, `--event-types`, `--limit`).
- Prefer `--enemy-only` for "damage done" questions.

## Commands

### List encounters
```bash
npx tsx src/lib/parser-cli.ts fight list --input <logfile>
```

### Fight summary
```bash
npx tsx src/lib/parser-cli.ts fight summary --input <logfile> --encounter "<boss>" --enemy-only
```

### Player summary
```bash
npx tsx src/lib/parser-cli.ts player summary --input <logfile> --encounter "<boss>" --player "<player>" --enemy-only
```

### Ability events
```bash
npx tsx src/lib/parser-cli.ts ability events --input <logfile> --encounter "<boss>" --player "<player>" --ability "<ability>" --enemy-only --normalized --limit 300
```

### Generic event search
```bash
npx tsx src/lib/parser-cli.ts events search --input <logfile> --encounter "<boss>" --player "<player>" --event-types SPELL_DAMAGE,SPELL_MISSED --fields timestamp,eventType,ability,target,amount,absorbed,critical --limit 200
```

### Anomalies
```bash
npx tsx src/lib/parser-cli.ts anomalies --input <logfile> --encounter "<boss>" --player "<player>"
```

## Semantics

The CLI uses fixed semantics:

- Overkill contributes `0` damage (event remains visible/countable)
- Absorbed contributes to damage when present in absorbed rows
- `--enemy-only` excludes self/friendly-target damage

## Agent workflow

1. `fight list` to find the encounter
2. `player summary` to identify suspicious ability totals
3. `ability events` for row-level verification
4. `events search` for ad-hoc forensic checks
5. `anomalies` for parser consistency hints

## Output formats

- `--format json` (default)
- `--compact` for minimized output
- `--fields <csv>` to project specific columns
- `--limit <n>` and `--offset` for pagination
