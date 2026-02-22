import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseLog } from '../../lib/cli/encounter-index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '../fixtures/plexus-slice.log');

const EXPECTED_PLAYER_DAMAGE_TOTALS: Record<number, Record<string, number>> = {
  3129: {
    'Baynn-Thrall-EU': 1603421,
    'Bladewatch-BurningBlade-EU': 1171817,
    'Brunix-Aggra(Português)-EU': 1341958,
    'Cadburyy-Ravencrest-EU': 1087464,
    'Deyanm-Draenor-EU': 470647,
    "Eruani-Drak'thul-EU": 1774716,
    'Fentix-Antonidas-EU': 283484,
    'Frénézie-Elune-EU': 1188493,
    'Kissyfrotte-Elune-EU': 694789,
    'Kitkát-Magtheridon-EU': 566588,
    'Mádgéy-Kazzak-EU': 1627489,
    'Rodas-Magtheridon-EU': 498190,
    'Sdegna-Nemesis-EU': 1176886,
    'Smashinc-Sylvanas-EU': 693704,
    'Tasadin-Thrall-EU': 564685,
    'Vespién-Ravencrest-EU': 72153,
    'Willòwí-Draenor-EU': 1128802,
    'Xamymage-Kazzak-EU': 1202343,
    'Zarkos-DunModr-EU': 1273756,
    'Zerathis-Arathor-EU': 849184,
    'Zigfridd-Silvermoon-EU': 700381,
    'Zipper-Agamaggan-EU': 610062,
    'Висмарк-СвежевательДуш-EU': 1029093,
    'Кастиэлка-Ревущийфьорд-EU': 129044,
  },
};

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

describe('fight player damage totals', () => {
  const content = readFileSync(LOG_PATH, 'utf-8');
  const parsed = parseLog(content);

  for (const encounter of parsed.encounters) {
    it(`matches expected per-player damage totals: ${encounter.info.bossName} (${encounter.info.encounterId})`, { timeout: 30000 }, () => {
      const expected = EXPECTED_PLAYER_DAMAGE_TOTALS[encounter.info.encounterId];
      expect(expected, `Missing expected totals for encounter ${encounter.info.encounterId}`).toBeTruthy();

      const actual: Record<string, number> = {};
      for (const e of parsed.events as any[]) {
        const ts = e.timestamp?.getTime?.() ?? 0;
        if (ts < encounter.startMs || ts > encounter.endMs) continue;
        if (!String(e.sourceGUID || '').startsWith('Player-')) continue;

        const value = effectiveDamage(e);
        if (value <= 0) continue;

        const source = e.sourceName || e.sourceGUID;
        actual[source] = (actual[source] || 0) + value;
      }

      const sortByName = (obj: Record<string, number>) =>
        Object.fromEntries(Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0])));

      expect(sortByName(actual)).toEqual(sortByName(expected));
    });
  }
});
