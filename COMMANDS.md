# Log Parser CLI — Agent-Friendly Command Spec

## Goal
Provide fast, low-token, query-focused access to large combat logs for AI agents.

- Avoid loading full log or full JSON into context
- Return only relevant slices
- Keep damage semantics fixed and deterministic

---

## Global CLI Shape

```bash
logparse <subcommand> [options]
```

Global options:

- `--input <path|- >` : Log file path, or `-` for stdin (required for data commands)
- `--format json|jsonl|csv|table|md` : Output format (default `json`)
- `--compact` : Minimize metadata in output
- `--out <path>` : Write output to file instead of stdout
- `--limit <n>` : Max rows/items (default depends on subcommand)
- `--offset <n>` : Pagination offset (default `0`)
- `--fields <csv>` : Restrict output columns/keys
- `--enemy-only` : Include only damage to non-player targets

Format examples:

```bash
# JSONL rows for streaming/line-by-line processing
logparse events search --input WoWCombatLog.txt --encounter 3129 --event-types SPELL_DAMAGE --format jsonl

# CSV table for spreadsheets
logparse fight list --input WoWCombatLog.txt --format csv
```

Stdin example:

```bash
cat WoWCombatLog.txt | logparse fight list --input -
```

Common filters:

- `--encounter <id|name>`
- `--player <name|guid>`
- `--target <name|guid>`
- `--ability <name|id>`
- `--event-types <csv>`

---

## Subcommands

## 1) `fight list`
List encounters/fights found in a log.

```bash
logparse fight list --input WoWCombatLog.txt
```

Options:
- `--group-by-encounter` (default true)
- `--kills-only`
- `--wipes-only`

Output schema (json):

```json
{
  "fights": [
    {
      "fightId": "fight_3129_...",
      "encounterId": 3129,
      "bossName": "Plexus Sentinel",
      "startTime": "2026-02-16T22:41:04.338Z",
      "endTime": "2026-02-16T22:42:47.942Z",
      "durationSec": 103.691,
      "result": "kill"
    }
  ]
}
```

---

## 2) `ability events`
Return raw/normalized event rows for one ability.

Recommendation: pass `--encounter` whenever possible. Without it, this command can scan very large portions of the log, produce huge row sets, and increase runtime/token cost for agents.

```bash
logparse ability events --input WoWCombatLog.txt --encounter 3129 --player "Eruani-Drak'thul-EU" --ability "Void Ray" --target "Plexus Sentinel" --event-types SPELL_DAMAGE,SPELL_PERIODIC_MISSED --limit 300
```

Options:
- `--normalized` : Include computed columns (`effectiveDamage`, `countsAsHit`, `countsAsCrit`)

Output schema:

```json
{
  "rows": [
    {
      "timestamp": "2026-02-16T22:42:21.425Z",
      "eventType": "SPELL_PERIODIC_MISSED",
      "source": "Eruani-Drak'thul-EU",
      "target": "Plexus Sentinel",
      "ability": "Void Ray",
      "amount": 0,
      "absorbed": 505,
      "overkill": 489,
      "critical": false,
      "effectiveDamage": 505,
      "countsAsHit": true,
      "countsAsCrit": false
    }
  ]
}
```

---

## 3) `events search`
Generic filtered event retrieval for agent debugging.

Recommendation: pass `--encounter` whenever possible. This command is broad by design, and encounter scoping keeps responses faster, smaller, and more useful for agent workflows.

```bash
logparse events search --input WoWCombatLog.txt --encounter 3129 --player "Eruani-Drak'thul-EU" --event-types SPELL_DAMAGE,SPELL_MISSED --limit 200 --fields timestamp,eventType,spellName,destName,amount,absorbed,critical
```

---

## 4) `compare`
Compare two logs or snapshots.

```bash
logparse compare --input WoWCombatLog.txt --encounter 3129 --player "Eruani-Drak'thul-EU" --metric abilityDamage
```

Or:

```bash
logparse compare --left-input old.log --right-input new.log --encounter 3129 --metric playerTotals
```

Output schema:

```json
{
  "metric": "abilityDamage",
  "diffs": [
    { "key": "Void Ray", "left": 283037, "right": 283416, "delta": 379 }
  ]
}
```

---

## 5) `query` (agent shortcut)
Natural-language intent mapped to deterministic subcommands.

```bash
logparse query --input WoWCombatLog.txt --question "Show all Eradicate hits by Eruani on Plexus Sentinel with crit and overkill" --encounter 3129
```

Behavior:
- Resolves question to one of: `fight list`, `ability events`, `events search`
- Returns:

```json
{
  "resolvedCommand": "ability events",
  "arguments": { "player": "Eruani-Drak'thul-EU", "ability": "Eradicate", "target": "Plexus Sentinel" },
  "result": { "rows": [] }
}
```

---

## Semantics (fixed)

For all outputs involving damage:

- Overkill contributes **0** to damage totals (event still returned/countable where relevant).
- Absorbed damage contributes to damage totals when represented by absorbed event rows.
- Enemy-only views exclude self/friendly-target damage.

Each output should include effective semantics used:

```json
{
  "semantics": {
    "enemyOnly": true,
    "overkillCountsAsDamage": false,
    "absorbedCountsAsDamage": true
  }
}
```

---

## Recommended Defaults for Agent Use

- default `--format json`
- default `--compact`
- default `--limit 200`
- default `--enemy-only` for damage event queries when user intent is damage-to-enemy
- require `--encounter` for high-volume commands (`ability events`, `events search`) unless `--force-all`

---

## Minimal MVP Command Set (implement first)

1. `fight list`
2. `ability events`
3. `events search`

This subset already enables high-quality agent workflows without context blowups.
