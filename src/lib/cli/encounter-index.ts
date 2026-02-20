import { parseCombatLogEvents, type CombatEvent } from '../parser-events';

export interface EncounterInfo {
  fightId: string;
  encounterId: number;
  bossName: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  result: 'kill' | 'wipe' | 'unknown' | 'in-progress';
}

export interface EncounterWindow {
  info: EncounterInfo;
  startMs: number;
  endMs: number;
}

export interface ParsedLog {
  events: CombatEvent[];
  encounters: EncounterWindow[];
}

function buildEncounterWindow(start: { bossName: string; startMs: number }, endEvent: any): EncounterWindow {
  return {
    info: {
      fightId: `fight_${endEvent.encounterId}_${start.startMs}`,
      encounterId: endEvent.encounterId,
      bossName: endEvent.bossName,
      startTime: new Date(start.startMs).toISOString(),
      endTime: endEvent.timestamp.toISOString(),
      durationSec: (endEvent.timestamp.getTime() - start.startMs) / 1000,
      result: endEvent.result,
    },
    startMs: start.startMs,
    endMs: endEvent.timestamp.getTime(),
  };
}

export function parseEncounterIndex(content: string): EncounterWindow[] {
  const encounters: EncounterWindow[] = [];
  const starts = new Map<number, { bossName: string; startMs: number }>();

  parseCombatLogEvents(content, (e) => {
    if (e.type === 'ENCOUNTER_START') {
      starts.set(e.encounterId, { bossName: e.bossName, startMs: e.timestamp.getTime() });
      return;
    }

    if (e.type === 'ENCOUNTER_END') {
      const s = starts.get(e.encounterId);
      if (!s) return;
      encounters.push(buildEncounterWindow(s, e));
      starts.delete(e.encounterId);
    }
  });

  return encounters;
}

export function parseLog(content: string): ParsedLog {
  const events: CombatEvent[] = [];
  parseCombatLogEvents(content, (e) => events.push(e));

  const encounters: EncounterWindow[] = [];
  const starts = new Map<number, { bossName: string; startMs: number }>();

  for (const e of events) {
    if (e.type === 'ENCOUNTER_START') {
      starts.set(e.encounterId, { bossName: e.bossName, startMs: e.timestamp.getTime() });
    }
    if (e.type === 'ENCOUNTER_END') {
      const s = starts.get(e.encounterId);
      if (!s) continue;
      encounters.push(buildEncounterWindow(s, e));
      starts.delete(e.encounterId);
    }
  }

  return { events, encounters };
}

export function resolveEncounter(parsed: ParsedLog, encounter?: string): EncounterWindow | null {
  if (!encounter) return null;
  const asNum = Number(encounter);
  if (!Number.isNaN(asNum)) {
    return parsed.encounters.find((e) => e.info.encounterId === asNum) || null;
  }
  const q = encounter.toLowerCase();
  return parsed.encounters.find((e) => e.info.bossName.toLowerCase().includes(q)) || null;
}
