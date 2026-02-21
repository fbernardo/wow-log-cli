# Known Limitations

This document sets expectations for current behavior in `wow-log-cli`.

## Command coverage

Current supported command families:
- `fight list`
- `ability events`
- `events search`

Not yet implemented from broader spec ideas:
- `compare`
- `query`

## Parser edge cases

- Combat-log variants can differ by expansion/build and logging settings.
- Advanced-field mappings are covered by regression tests, but uncommon/unknown event layouts may still parse as `UNKNOWN`.
- Timestamp parsing supports both 3-digit and 4-digit fractional seconds, but malformed lines are skipped.

## Output caveats

- `table` and `md` formats are lightweight textual renderers; they are intended for readability, not strict machine import.
- CSV column order is derived from discovered keys in output rows.
- `--raw-line` exposes original log line text and can increase output size significantly.

## Filtering/sorting behavior notes

- `--sort` applies to row-producing commands and runs before pagination.
- `--time-range` supports relative and absolute inputs; invalid values raise an error.
- Encounter-scoped queries are strongly recommended for performance and smaller outputs.

## Performance / scale

- Very large logs can still be expensive if no encounter/player filters are used.
- High `--limit` values may increase runtime and output size noticeably.

## Roadmap direction

See `CLI_TASKS.md` for ongoing work and planned improvements.
