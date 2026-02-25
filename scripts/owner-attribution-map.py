#!/usr/bin/env python3
import csv
import subprocess
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: owner-attribution-map.py <combat-log-path> [limit]")
    sys.exit(1)

log_path = sys.argv[1]
limit = int(sys.argv[2]) if len(sys.argv) >= 3 else 500000
repo = Path(__file__).resolve().parents[1]

cmd = [
    'npm', 'run', '-s', 'cli', '--',
    'events', 'search',
    '--input', log_path,
    '--event-types', 'SWING_DAMAGE,SWING_DAMAGE_LANDED,SPELL_DAMAGE,SPELL_PERIODIC_DAMAGE,RANGE_DAMAGE',
    '--limit', str(limit),
    '--fields', 'source,sourceGUID,sourceOwner,sourceOwnerGUID,sourceAttributed',
    '--format', 'csv',
]

p = subprocess.run(cmd, cwd=str(repo), capture_output=True, text=True)
if p.returncode != 0:
    print(p.stderr or p.stdout)
    sys.exit(p.returncode)

rows = list(csv.DictReader(p.stdout.splitlines()))
if len(rows) >= limit:
    print(f"WARNING: fetched {len(rows)} rows (limit={limit}). Results may be truncated.", file=sys.stderr)

mapping = {}
for r in rows:
    src = (r.get('source') or '').strip()
    src_guid = (r.get('sourceGUID') or '').strip()
    owner = (r.get('sourceOwner') or '').strip()
    owner_guid = (r.get('sourceOwnerGUID') or '').strip()
    if not src or not owner or src == owner:
        continue
    # Only keep true non-player entities -> player owner mappings.
    if src_guid.startswith('Player-'):
        continue
    if not owner_guid.startswith('Player-'):
        continue
    mapping[(src, src_guid)] = (owner, owner_guid)

for (src, src_guid), (owner, owner_guid) in sorted(mapping.items(), key=lambda x: x[0][0].lower()):
    print(f"{src}\t{src_guid}\t=>\t{owner}\t{owner_guid}")

print(f"\nTotal mapped entities: {len(mapping)}")
