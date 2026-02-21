import { describe, it, expect } from 'vitest';
import { parseCombatLogEvents } from '../../lib/parser-events';

function mkLine(parts: string[]): string {
  return `2/16/2026 22:42:21.425  ${parts.join(',')}`;
}

describe('parser contract alignment', () => {
  it('emits UNKNOWN events instead of dropping them', () => {
    const out: any[] = [];
    parseCombatLogEvents(mkLine(['UNHANDLED_EVENT', 'x', 'y']), (e) => out.push(e));

    expect(out).toHaveLength(1);
    expect(out[0].type).toBe('UNKNOWN');
    expect(out[0].eventType).toBe('UNHANDLED_EVENT');
    expect(out[0].rawLine).toContain('UNHANDLED_EVENT');
  });

  it('resolves ownerName from prior player GUID mapping', () => {
    const playerCast = mkLine([
      'SPELL_CAST_SUCCESS',
      'Player-Owner',
      'Willow',
      '', '',
      'Creature-1',
      'Boss',
      '', '',
      '1',
      'Spell',
      '1',
    ]);

    const swing = mkLine((() => {
      const p = Array.from({ length: 40 }, () => '');
      p[0] = 'SWING_DAMAGE_LANDED';
      p[1] = 'Pet-1';
      p[2] = 'PetName';
      p[5] = 'Creature-1';
      p[6] = 'Boss';
      p[10] = 'Player-Owner';
      p[28] = '100';
      return p;
    })());

    const out: any[] = [];
    parseCombatLogEvents(`${playerCast}\n${swing}`, (e) => out.push(e));

    const swingEvent = out.find((e) => e.type === 'SWING_DAMAGE_LANDED');
    expect(swingEvent.ownerGUID).toBe('Player-Owner');
    expect(swingEvent.ownerName).toBe('Willow');
  });
});
