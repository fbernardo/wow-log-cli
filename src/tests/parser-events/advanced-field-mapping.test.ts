import { describe, it, expect } from 'vitest';
import { parseCombatLogEvents } from '../../lib/parser-events';

function line(eventParts: string[]): string {
  return `2/16/2026 22:42:21.425  ${eventParts.join(',')}`;
}

function parts(eventType: string, len = 40): string[] {
  const p = Array.from({ length: len }, () => '');
  p[0] = eventType;
  return p;
}

describe('advanced log field mapping regressions', () => {
  it('maps SPELL_DAMAGE advanced indices', () => {
    const p = parts('SPELL_DAMAGE', 40);
    p[1] = 'Player-1'; p[2] = 'Caster';
    p[5] = 'Creature-1'; p[6] = 'Boss';
    p[9] = '123'; p[10] = 'Void Ray'; p[11] = '32';
    p[14] = '32'; p[15] = '0'; p[16] = '0'; p[17] = '50';
    p[31] = '1200'; p[33] = '200'; p[35] = '1'; p[36] = '0'; p[37] = '0';

    const out: any[] = [];
    parseCombatLogEvents(line(p), (e) => out.push(e));

    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('SPELL_DAMAGE');
    expect(out[0].amount).toBe(1200);
    expect(out[0].overkill).toBe(200);
    expect(out[0].absorbed).toBe(50);
    expect(out[0].critical).toBe(true);
  });

  it('maps SPELL_MISSED absorb payload fields', () => {
    const p = parts('SPELL_MISSED', 20);
    p[1] = 'Player-1'; p[2] = 'Caster';
    p[5] = 'Creature-1'; p[6] = 'Boss';
    p[9] = '999'; p[10] = 'Beam'; p[11] = '32';
    p[12] = 'ABSORB'; p[14] = '505'; p[15] = '489'; p[16] = '1';

    const out: any[] = [];
    parseCombatLogEvents(line(p), (e) => out.push(e));

    expect(out[0].type).toBe('SPELL_MISSED');
    expect(out[0].missType).toBe('ABSORB');
    expect(out[0].absorbed).toBe(505);
    expect(out[0].overkill).toBe(489);
    expect(out[0].critical).toBe(true);
  });

  it('maps SPELL_PERIODIC_DAMAGE with classic fallback indices', () => {
    const p = parts('SPELL_PERIODIC_DAMAGE', 24);
    p[1] = 'Player-1'; p[2] = 'Dotter';
    p[5] = 'Creature-1'; p[6] = 'Boss';
    p[9] = '777'; p[10] = 'DoT'; p[11] = '32';
    p[12] = '250'; p[13] = '10'; p[14] = '32'; p[17] = '5'; p[18] = '1';

    const out: any[] = [];
    parseCombatLogEvents(line(p), (e) => out.push(e));

    expect(out[0].type).toBe('SPELL_PERIODIC_DAMAGE');
    expect(out[0].amount).toBe(250);
    expect(out[0].overkill).toBe(10);
    expect(out[0].absorbed).toBe(5);
    expect(out[0].critical).toBe(true);
  });

  it('maps SWING_DAMAGE_LANDED owner + tail absorb', () => {
    const p = parts('SWING_DAMAGE_LANDED', 40);
    p[1] = 'Pet-1'; p[2] = 'Pet';
    p[5] = 'Creature-1'; p[6] = 'Boss';
    p[10] = 'Player-Owner';
    p[13] = '1'; p[14] = '0'; p[15] = '0';
    p[28] = '333'; p[34] = '22'; p[35] = '1';

    const out: any[] = [];
    parseCombatLogEvents(line(p), (e) => out.push(e));

    expect(out[0].type).toBe('SWING_DAMAGE_LANDED');
    expect(out[0].ownerGUID).toBe('Player-Owner');
    expect(out[0].amount).toBe(333);
    expect(out[0].absorbed).toBe(22);
    expect(out[0].critical).toBe(true);
  });
});
