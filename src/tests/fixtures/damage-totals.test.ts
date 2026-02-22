import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { parseLog } from '../../lib/cli/encounter-index';
import { EXPECTED_DAMAGE_TOTALS_PER_FIXTURE } from './expected-damage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname);
const ENCOUNTERS_DIR = resolve(FIXTURES_DIR, 'encounters');

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

const ALL_FIXTURES: { name: string; path: string; isGz: boolean; key: string }[] = [
  { name: 'plexus-slice.log', path: resolve(FIXTURES_DIR, 'plexus-slice.log'), isGz: false, key: 'plexus-slice' },
  ...manifest.map((f) => ({
    name: f.file,
    path: resolve(ENCOUNTERS_DIR, f.file),
    isGz: true,
    key: f.file.replace('.log.gz', ''),
  })),
];

function sortByName(obj: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0])));
}

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

      // Empty expected = wipe with no player damage (valid)
      if (!expected || Object.keys(expected).length === 0) {
        expect(parsed.encounters.length).toBeGreaterThan(0);
        return;
      }

      // Compare each encounter against golden values
      for (const enc of parsed.encounters) {
        // Calculate damage from parsed events (same logic as parser's effectiveDamage)
        const totals: Record<string, number> = {};
        for (const e of parsed.events as any[]) {
          const ts = e.timestamp?.getTime?.() ?? 0;
          if (ts < enc.startMs || ts > enc.endMs) continue;
          if (!String(e.sourceGUID || '').startsWith('Player-')) continue;
          
          const isDamage = ['SPELL_DAMAGE','SPELL_PERIODIC_DAMAGE','SWING_DAMAGE','SWING_DAMAGE_LANDED','RANGE_DAMAGE'].includes(e.type);
          if (!isDamage) continue;
          
          const amount = Math.max(0, Number(e.amount || 0));
          const overkill = Math.max(0, Number(e.overkill || 0));
          const damage = Math.max(0, amount - overkill);
          if (damage <= 0) continue;
          
          const source = e.sourceName || e.sourceGUID;
          totals[source] = (totals[source] || 0) + damage;
        }
        
        expect(sortByName(totals)).toEqual(sortByName(expected));
      }
    });
  }
});
