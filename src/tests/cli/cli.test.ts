import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseCliArgs, parseLog, runCommand } from '../../lib/cli/query-engine';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, '../fixtures/plexus-slice.log');
const DIMENSIUS_PULL_1 = resolve(__dirname, '../fixtures/encounters/enc-3135-pull-1-dimensius-the-all-devouring.log.gz');
const DIMENSIUS_PULL_2 = resolve(__dirname, '../fixtures/encounters/enc-3135-pull-2-dimensius-the-all-devouring.log.gz');

function readGz(path: string): string {
  return gunzipSync(readFileSync(path)).toString('utf-8');
}

describe('cli args', () => {
  it('parses command and boolean flags', () => {
    const r = parseCliArgs(['ability', 'events', '--input', 'x.log', '--player', 'Eruani', '--fight', 'fight_3135_1', '--enemy-only', '--normalized', '--include-absorbed', '--ability-grouping', 'wcl', '--limit', '10']);
    expect(r.command).toEqual(['ability', 'events']);
    expect(r.options.input).toBe('x.log');
    expect(r.options.player).toBe('Eruani');
    expect(r.options.fight).toBe('fight_3135_1');
    expect(r.options.enemyOnly).toBe(true);
    expect(r.options.normalized).toBe(true);
    expect(r.options.includeAbsorbed).toBe(true);
    expect(r.options.abilityGrouping).toBe('wcl');
    expect(r.options.limit).toBe(10);
  });
});

describe('cli commands', () => {
  it('fight list returns at least one encounter and includes plexus when present', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['fight', 'list'], {});
    expect(Array.isArray(res.fights)).toBe(true);
    expect(res.fights.length).toBeGreaterThan(0);

    const plex = res.fights.find((f: any) => f.bossName === 'Plexus Sentinel');
    if (plex) {
      expect(['kill', 'wipe', 'unknown']).toContain(plex.result);
    }
  });

  it('ability events returns void ray rows', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['ability', 'events'], {
      encounter: '3129',
      player: "Eruani-Drak'thul-EU",
      ability: 'Void Ray',
      enemyOnly: true,
      normalized: true,
      limit: 5,
    });
    expect(res.count).toBeGreaterThan(100);
    expect(res.rows.length).toBe(5);
    expect(res.rows[0]).toHaveProperty('effectiveDamage');
  });

  it('events search supports field projection', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      player: "Eruani-Drak'thul-EU",
      eventTypes: ['SPELL_DAMAGE'],
      fields: ['timestamp', 'eventType', 'ability'],
      limit: 3,
      enemyOnly: true,
    });
    expect(res.rows.length).toBe(3);
    expect(Object.keys(res.rows[0]).sort()).toEqual(['ability', 'eventType', 'timestamp']);
  });

  it('events search aggregates all pulls for same encounter id and includes fightId', { timeout: 30000 }, () => {
    const content = `${readGz(DIMENSIUS_PULL_1)}\n${readGz(DIMENSIUS_PULL_2)}`;
    const parsed = parseLog(content);

    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3135',
      limit: 50000,
    });

    expect(res.count).toBeGreaterThan(0);
    expect(res.rows[0].fightId).toBeTruthy();
    const distinctFightIds = new Set(res.rows.map((r: any) => r.fightId));
    expect(distinctFightIds.size).toBe(2);
  });

  it('events search supports narrowing to a specific fight with --fight', { timeout: 30000 }, () => {
    const content = `${readGz(DIMENSIUS_PULL_1)}\n${readGz(DIMENSIUS_PULL_2)}`;
    const parsed = parseLog(content);
    const fightId = parsed.encounters.find((e) => e.info.encounterId === 3135)?.info.fightId;
    expect(fightId).toBeTruthy();

    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3135',
      fight: fightId,
      limit: 50000,
    });

    expect(res.count).toBeGreaterThan(0);
    expect(res.rows.every((r: any) => r.fightId === fightId)).toBe(true);
  });

  it('events search with player includes pet-owned events', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      player: 'Willòwí-Draenor-EU',
      limit: 3000,
    });

    expect(res.count).toBeGreaterThan(1314); // direct player events + pet-owned events
    expect(res.rows.some((r: any) => r.source === 'Glaciersmasher')).toBe(true);
  });

  it('events search supports --sort desc before pagination', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);
    const res: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      sort: 'amount:desc',
      limit: 5,
    });

    expect(res.rows.length).toBe(5);
    for (let i = 1; i < res.rows.length; i++) {
      expect(Number(res.rows[i - 1].amount)).toBeGreaterThanOrEqual(Number(res.rows[i].amount));
    }
  });

  it('throws on invalid --sort field', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    expect(() => runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      sort: 'notAField:desc',
    })).toThrow(/Invalid --sort field/);
  });

  it('filters events by relative --time-range', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    const all: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      limit: 5000,
    });

    const windowed: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      timeRange: '00:10.000,00:20.000',
      limit: 5000,
    });

    expect(windowed.count).toBeGreaterThan(0);
    expect(windowed.count).toBeLessThan(all.count);
  });

  it('throws on invalid --time-range value', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    expect(() => runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      timeRange: 'invalid,00:20.000',
    })).toThrow(/Invalid --time-range value/);
  });

  it('includes raw line when --raw-line is enabled', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    const withRaw: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      rawLine: true,
      limit: 1,
    });

    const withoutRaw: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      eventTypes: ['SPELL_DAMAGE'],
      limit: 1,
    });

    expect(withRaw.rows[0].rawLine).toContain('SPELL_DAMAGE');
    expect(withoutRaw.rows[0].rawLine).toBeUndefined();
  });

  it('applies WCL ability grouping rules when enabled', { timeout: 30000 }, () => {
    const content = readFileSync(LOG_PATH, 'utf-8');
    const parsed = parseLog(content);

    const grouped: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      player: 'Brunix-Aggra(Português)-EU',
      enemyOnly: true,
      abilityGrouping: 'wcl',
      eventTypes: ['SPELL_DAMAGE', 'SPELL_PERIODIC_DAMAGE'],
      limit: 5000,
    });

    const ungrouped: any = runCommand(parsed, ['events', 'search'], {
      encounter: '3129',
      player: 'Brunix-Aggra(Português)-EU',
      enemyOnly: true,
      eventTypes: ['SPELL_DAMAGE', 'SPELL_PERIODIC_DAMAGE'],
      limit: 5000,
    });

    const groupedHasParent = grouped.rows.some((r: any) => r.ability === 'Call of the Ancestors');
    const ungroupedHasAncestorChild = ungrouped.rows.some((r: any) => r.source === 'Ancestor' && r.ability !== 'Call of the Ancestors');

    expect(groupedHasParent).toBe(true);
    expect(ungroupedHasAncestorChild).toBe(true);
  });
});
