import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';
import { parseLog, parseEncounterIndex } from '../../lib/cli/encounter-index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, 'encounters');

interface FixtureManifestEntry {
  encounterId: number;
  bossName: string;
  result: 'kill' | 'wipe' | 'unknown' | 'in-progress';
  pull: number;
  file: string;
}

const manifest: FixtureManifestEntry[] = JSON.parse(
  readFileSync(resolve(FIXTURES_DIR, 'manifest.json'), 'utf-8'),
);

describe('encounter fixtures extracted from big log', () => {
  it('has at least one generated fixture', () => {
    expect(manifest.length).toBeGreaterThan(0);
  });

  for (const fixture of manifest) {
    it(`parses ${fixture.file} as a single encounter`, { timeout: 30000 }, () => {
      const gz = readFileSync(resolve(FIXTURES_DIR, fixture.file));
      const content = gunzipSync(gz).toString('utf-8');

      const idx = parseEncounterIndex(content);
      expect(idx.length).toBe(1);
      expect(idx[0].info.encounterId).toBe(fixture.encounterId);
      expect(idx[0].info.bossName).toBe(fixture.bossName);
      expect(idx[0].info.result).toBe(fixture.result);

      const parsed = parseLog(content);
      expect(parsed.encounters.length).toBe(1);

      const eventsInWindow = parsed.events.filter((e: any) => {
        const ts = e.timestamp?.getTime?.() ?? 0;
        return ts >= parsed.encounters[0].startMs && ts <= parsed.encounters[0].endMs;
      });
      expect(eventsInWindow.length).toBeGreaterThan(0);
    });
  }
});
