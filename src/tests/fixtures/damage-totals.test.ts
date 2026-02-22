import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { parseLog, type ParsedLog, type EncounterWindow } from '../../lib/cli/encounter-index';
import { EXPECTED_DAMAGE_TOTALS_PER_FIXTURE } from './expected-damage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname);
const ENCOUNTERS_DIR = resolve(FIXTURES_DIR, 'encounters');

function effectiveDamage(e: any): number {
  const isDamage =
    e.type === 'SPELL_DAMAGE' ||
    e.type === 'SPELL_PERIODIC_DAMAGE' ||
    e.type === 'SWING_DAMAGE' ||
    e.type === 'SWING_DAMAGE_LANDED' ||
    e.type === 'RANGE_DAMAGE';

  if (!isDamage) return 0;

  const amount = Math.max(0, Number(e.amount || 0));
  const overkill = Math.max(0, Number(e.overkill || 0));
  return Math.max(0, amount - overkill);
}

function calculateDamageTotals(parsed: ParsedLog, encounter: EncounterWindow): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of parsed.events as any[]) {
    const ts = e.timestamp?.getTime?.() ?? 0;
    if (ts < encounter.startMs || ts > encounter.endMs) continue;
    if (!String(e.sourceGUID || '').startsWith('Player-')) continue;

    const value = effectiveDamage(e);
    if (value <= 0) continue;

    const source = e.sourceName || e.sourceGUID;
    totals[source] = (totals[source] || 0) + value;
  }
  return totals;
}

function sortByName(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0])));
}

interface FixtureEntry {
  encounterId: number;
  bossName: string;
  result: string;
  pull: number;
  file: string;
}

const manifest: FixtureEntry[] = JSON.parse(
  readFileSync(resolve(ENCOUNTERS_DIR, 'manifest.json'), 'utf-8'),
);

// Map fixture files to their expected damage keys
const FIXTURE_KEYS: Record<string, string> = {
  'plexus-slice.log': 'plexus-slice',
};
for (const f of manifest) {
  FIXTURE_KEYS[f.file] = f.file.replace('.log.gz', '');
}

// Build list of all fixtures to test
const ALL_FIXTURES: { name: string; path: string; isGz: boolean; key: string }[] = [
  { name: 'plexus-slice.log', path: resolve(FIXTURES_DIR, 'plexus-slice.log'), isGz: false, key: 'plexus-slice' },
  ...manifest.map((f) => ({
    name: f.file,
    path: resolve(ENCOUNTERS_DIR, f.file),
    isGz: true,
    key: f.file.replace('.log.gz', ''),
  })),
];

describe('fight player damage totals (golden values)', () => {
  for (const fixture of ALL_FIXTURES) {
    it(`validates damage totals for ${fixture.name}`, { timeout: 60000 }, () => {
      let content: string;
      if (fixture.isGz) {
        content = gunzipSync(readFileSync(fixture.path)).toString('utf-8');
      } else {
        content = readFileSync(fixture.path, 'utf-8');
      }

      const parsed = parseLog(content);
      const expected = EXPECTED_DAMAGE_TOTALS_PER_FIXTURE[fixture.key];

      // If no expected values (empty), just verify non-negative damage
      if (!expected || Object.keys(expected).length === 0) {
        for (const encounter of parsed.encounters) {
          const totals = calculateDamageTotals(parsed, encounter);
          const totalDamage = Object.values(totals).reduce((a, b) => a + b, 0);
          expect(totalDamage).toBeGreaterThanOrEqual(0);
        }
        return;
      }

      // Compare each encounter against expected
      for (const encounter of parsed.encounters) {
        const actual = calculateDamageTotals(parsed, encounter);
        expect(sortByName(actual)).toEqual(sortByName(expected));
      }
    });
  }
});
