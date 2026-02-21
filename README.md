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

## Known limitations

### Command coverage

Currently supported command families:
- `fight list`
- `ability events`
- `events search`

Not yet implemented from broader spec ideas:
- `compare`
- `query`

### Parser edge cases

- Combat-log variants can differ by expansion/build and logging settings.
- Advanced-field mappings are covered by regression tests, but uncommon/unknown event layouts may still parse as `UNKNOWN`.
- Timestamp parsing supports both 3-digit and 4-digit fractional seconds, but malformed lines are skipped.

### Output caveats

- `table` and `md` formats are lightweight textual renderers; they are intended for readability, not strict machine import.
- CSV column order is derived from discovered keys in output rows.
- `--raw-line` exposes original log line text and can increase output size significantly.

### Filtering/sorting behavior notes

- `--sort` applies to row-producing commands and runs before pagination.
- `--time-range` supports relative and absolute inputs; invalid values raise an error.
- Encounter-scoped queries are strongly recommended for performance and smaller outputs.

### Performance / scale

- Very large logs can still be expensive if no encounter/player filters are used.
- High `--limit` values may increase runtime and output size noticeably.

## License

MIT — see [`LICENSE`](./LICENSE).
