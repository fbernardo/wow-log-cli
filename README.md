# wow-log-cli

Agent-friendly CLI for querying World of Warcraft combat logs without dumping huge files into context.

## Status

Experimental / MVP. Core commands are stable enough for daily use, but behavior may still evolve.

## Quickstart

### Requirements
- Node.js 22+
- npm

### Install deps

```bash
npm ci
```

### Run the CLI

```bash
npm run cli -- fight list --input src/tests/fixtures/plexus-slice.log
```

## Core commands

### 1) List fights

```bash
npm run cli -- fight list --input src/tests/fixtures/plexus-slice.log
```

### 2) Search events

```bash
npm run cli -- events search \
  --input src/tests/fixtures/plexus-slice.log \
  --encounter 3129 \
  --event-types SPELL_DAMAGE,SPELL_MISSED \
  --limit 50
```

### 3) Ability-scoped events

```bash
npm run cli -- ability events \
  --input src/tests/fixtures/plexus-slice.log \
  --encounter 3129 \
  --player "Eruani-Drak'thul-EU" \
  --ability "Void Ray" \
  --enemy-only \
  --normalized \
  --sort amount:desc \
  --limit 20
```

## Output formats

Use `--format` with one of:
- `json` (default)
- `jsonl`
- `csv`
- `table`
- `md`

## Damage semantics

Current output semantics are explicit in responses:
- `overkillCountsAsDamage: false`
- `absorbedCountsAsDamage: true`
- optional `enemyOnly: true/false`

## Testing

```bash
npm test
```

CI runs tests automatically on pull requests.

## More command details

See `COMMANDS.md` for deeper command docs and options.

## License

MIT — see [`LICENSE`](./LICENSE).
