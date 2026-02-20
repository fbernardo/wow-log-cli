import { readFileSync } from 'fs';
import { parseCombatLogEvents, type CombatEvent, type EncounterStartEvent, type EncounterEndEvent, type SpellDamageEvent, type SpellHealEvent, type SpellAuraAppliedEvent } from '../../lib/parser-events';
import { describe, it, expect } from 'vitest';

const COMBAT_LOG_PATH = '/Users/openclaw/.openclaw/workspace/wow-log-analyzer/WoWCombatLog-021626_223411.txt';

interface EncounterSummary {
  bossName: string;
  encounterId: number;
  difficulty: number;
  size: number;
  result: 'kill' | 'wipe' | 'unknown';
  durationSeconds: number;
  eventCounts: Record<string, number>;
  topDamage: { name: string; amount: number }[];
  topHealing: { name: string; amount: number }[];
  buffsApplied: string[];
}

function summarizeEncounter(events: CombatEvent[]): EncounterSummary {
  const startEvent = events.find(e => e.type === 'ENCOUNTER_START') as EncounterStartEvent;
  const endEvent = events.find(e => e.type === 'ENCOUNTER_END') as EncounterEndEvent;
  
  const eventCounts: Record<string, number> = {};
  const damageDealt: Record<string, number> = {};
  const healingDone: Record<string, number> = {};
  const buffsApplied = new Set<string>();
  
  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    
    if (event.type === 'SPELL_DAMAGE' || event.type === 'SWING_DAMAGE_LANDED') {
      const e = event as SpellDamageEvent;
      if (e.sourceName && e.amount > 0) {
        damageDealt[e.sourceName] = (damageDealt[e.sourceName] || 0) + e.amount;
      }
    }
    
    if (event.type === 'SPELL_HEAL') {
      const e = event as SpellHealEvent;
      if (e.sourceName && e.amount > 0) {
        healingDone[e.sourceName] = (healingDone[e.sourceName] || 0) + e.amount;
      }
    }
    
    if (event.type === 'SPELL_AURA_APPLIED') {
      const e = event as SpellAuraAppliedEvent;
      if (e.auraType === 'BUFF') {
        buffsApplied.add(e.spellName);
      }
    }
  }
  
  const durationMs = endEvent && startEvent 
    ? new Date(endEvent.timestamp).getTime() - new Date(startEvent.timestamp).getTime()
    : 0;
  
  const topDamage = Object.entries(damageDealt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));
    
  const topHealing = Object.entries(healingDone)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));
  
  return {
    bossName: startEvent?.bossName || 'Unknown',
    encounterId: startEvent?.encounterId || 0,
    difficulty: startEvent?.difficulty || 0,
    size: startEvent?.size || 0,
    result: endEvent?.result || 'unknown',
    durationSeconds: Math.round(durationMs / 1000),
    eventCounts,
    topDamage,
    topHealing,
    buffsApplied: Array.from(buffsApplied).slice(0, 20)
  };
}

function getEncounters() {
  const content = readFileSync(COMBAT_LOG_PATH, 'utf-8');
  
  const encounters: { start: EncounterStartEvent; events: CombatEvent[] }[] = [];
  let currentEncounter: { start: EncounterStartEvent; events: CombatEvent[] } | null = null;
  
  parseCombatLogEvents(content, (event) => {
    if (event.type === 'ENCOUNTER_START') {
      if (currentEncounter) {
        encounters.push(currentEncounter);
      }
      currentEncounter = {
        start: event as EncounterStartEvent,
        events: []
      };
    }
    
    if (currentEncounter) {
      currentEncounter.events.push(event);
    }
  });
  
  if (currentEncounter) {
    encounters.push(currentEncounter);
  }
  
  return encounters;
}

describe('parseCombatLogEvents', () => {
  const encounters = getEncounters();

  for (const encounter of encounters) {
    it(`should correctly parse encounter: ${encounter.start.bossName}`, { timeout: 30000 }, () => {
      const summary = summarizeEncounter(encounter.events);
      expect(summary).toMatchSnapshot();
    });
  }
});
