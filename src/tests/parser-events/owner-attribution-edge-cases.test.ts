import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { parseCombatLogEvents, type CombatEvent } from '../../lib/parser-events';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NO_SIGNAL_LOG = resolve(__dirname, '../fixtures/owner-attribution-edge-no-signal.log');
const SWING_SEED_LOG = resolve(__dirname, '../fixtures/owner-attribution-edge-swing-seed.log');
const SPELL_SEED_LOG = resolve(__dirname, '../fixtures/owner-attribution-edge-spell-seed.log');

function parse(content: string): CombatEvent[] {
  const events: CombatEvent[] = [];
  parseCombatLogEvents(content, (event) => events.push(event));
  return events;
}

describe('owner attribution edge cases', () => {
  it('does not attribute pet spell damage when no summon/swing owner signal exists', () => {
    const events = parse(readFileSync(NO_SIGNAL_LOG, 'utf-8')) as any[];
    const petSpell = events.find((e) => e.type === 'SPELL_DAMAGE' && e.sourceName === 'Glaciersmasher');

    expect(petSpell).toBeTruthy();
    expect(petSpell.ownerGUID || '').toBe('');
    expect(petSpell.ownerName || '').toBe('');
  });

  it('attributes later pet spell damage after a swing event seeds ownerGUID', () => {
    const events = parse(readFileSync(SWING_SEED_LOG, 'utf-8')) as any[];
    const petSwing = events.find((e) => e.type === 'SWING_DAMAGE' && e.sourceName === 'Glaciersmasher');
    const petSpell = events.find((e) => e.type === 'SPELL_DAMAGE' && e.sourceName === 'Glaciersmasher');

    expect(petSwing).toBeTruthy();
    expect(petSwing.ownerGUID).toBe('Player-1403-071099E1');

    expect(petSpell).toBeTruthy();
    expect(petSpell.ownerGUID).toBe('Player-1403-071099E1');
    expect(petSpell.ownerName).toBe('Willòwí-Draenor-EU');
  });

  it('attributes periodic pet damage when spell damage seeds ownerGUID first', () => {
    const events = parse(readFileSync(SPELL_SEED_LOG, 'utf-8')) as any[];
    const periodic = events.find((e) => e.type === 'SPELL_PERIODIC_DAMAGE' && e.sourceName === 'Glaciersmasher');

    expect(periodic).toBeTruthy();
    expect(periodic.ownerGUID).toBe('Player-1403-071099E1');
    expect(periodic.ownerName).toBe('Willòwí-Draenor-EU');
  });
});
