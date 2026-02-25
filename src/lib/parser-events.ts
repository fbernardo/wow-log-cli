/**
 * WoW Combat Log Event-Based Parser
 * 
 * Parses a combat log file and emits events via callback as they're encountered.
 * Each event type has its own TypeScript interface.
 */

// ============================================================================
// EVENT TYPE DEFINITIONS
// ============================================================================

/** Base interface for all combat log events */
export interface CombatLogEvent {
  type: string;
  timestamp: Date;
  sourceGUID: string;
  sourceName: string;
  sourceFlags: string;
  sourceFlags2: string;
  destGUID: string;
  destName: string;
  destFlags: string;
  destFlags2: string;
}

/**
 * ENCOUNTER_START - Boss fight begins
 * Fields: ENCOUNTER_START, encounterID, bossName, difficulty, size, zoneID
 */
export interface EncounterStartEvent {
  type: 'ENCOUNTER_START';
  timestamp: Date;
  encounterId: number;
  bossName: string;
  difficulty: number;
  size: number;
  zoneId: number;
}

/**
 * ENCOUNTER_END - Boss fight ends
 * Fields: ENCOUNTER_END, encounterID, bossName, difficulty, size, flag, value
 */
export interface EncounterEndEvent {
  type: 'ENCOUNTER_END';
  timestamp: Date;
  encounterId: number;
  bossName: string;
  difficulty: number;
  size: number;
  flag: number;
  value: number;
  result: 'kill' | 'wipe' | 'unknown';
}

/**
 * ZONE_CHANGE - Player changed zone
 * Fields: ZONE_CHANGE, _, zoneName
 */
export interface ZoneChangeEvent {
  type: 'ZONE_CHANGE';
  timestamp: Date;
  zoneName: string;
}

/**
 * SPELL_CAST_START - Spell cast begins
 * Fields: SPELL_CAST_START, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool
 */
export interface SpellCastStartEvent extends CombatLogEvent {
  type: 'SPELL_CAST_START';
  spellId: number;
  spellName: string;
  spellSchool: number;
}

/**
 * SPELL_CAST_SUCCESS - Spell cast succeeded
 * Fields: SPELL_CAST_SUCCESS, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool
 */
export interface SpellCastSuccessEvent extends CombatLogEvent {
  type: 'SPELL_CAST_SUCCESS';
  spellId: number;
  spellName: string;
  spellSchool: number;
}

/**
 * SPELL_DAMAGE - Spell damage dealt
 * Fields: SPELL_DAMAGE, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool,
 *         amount, overkill, school, resisted, blocked, absorbed, critical, glancing, crushing
 */
export interface SpellDamageEvent extends CombatLogEvent {
  type: 'SPELL_DAMAGE';
  ownerGUID?: string;
  ownerName?: string;
  spellId: number;
  spellName: string;
  spellSchool: number;
  amount: number;
  overkill: number;
  school: number;
  resisted: number;
  blocked: number;
  absorbed: number;
  critical: boolean;
  glancing: boolean;
  crushing: boolean;
}

/**
 * RANGE_DAMAGE - Ranged damage (ranged attacks)
 * Same fields as SPELL_DAMAGE
 */
export interface RangeDamageEvent extends CombatLogEvent {
  type: 'RANGE_DAMAGE';
  ownerGUID?: string;
  ownerName?: string;
  spellId: number;
  spellName: string;
  spellSchool: number;
  amount: number;
  overkill: number;
  school: number;
  resisted: number;
  blocked: number;
  absorbed: number;
  critical: boolean;
  glancing: boolean;
  crushing: boolean;
}

/**
 * SWING_DAMAGE - Melee auto-attack damage
 * Fields: SWING_DAMAGE, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, amount, overkill, school, 
 *         resisted, blocked, absorbed, critical, glancing, crushing
 */
export interface SwingDamageEvent extends CombatLogEvent {
  type: 'SWING_DAMAGE';
  ownerGUID: string; // Index 9 - player GUID if source is a pet
  ownerName: string; // Lookup from player GUID
  amount: number;
  overkill: number;
  school: number;
  resisted: number;
  blocked: number;
  absorbed: number;
  critical: boolean;
  glancing: boolean;
  crushing: boolean;
}

/**
 * SWING_DAMAGE_LANDED - Melee auto-attack damage (landed)
 * Same fields as SWING_DAMAGE
 */
export interface SwingDamageLandedEvent extends CombatLogEvent {
  type: 'SWING_DAMAGE_LANDED';
  ownerGUID: string; // Index 9 - player GUID if source is a pet
  ownerName: string; // Lookup from player GUID
  amount: number;
  overkill: number;
  school: number;
  resisted: number;
  blocked: number;
  absorbed: number;
  critical: boolean;
  glancing: boolean;
  crushing: boolean;
}

/**
 * SPELL_HEAL - Healing done
 * Fields: SPELL_HEAL, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool,
 *         amount, overkill, absorbed, critical
 */
export interface SpellHealEvent extends CombatLogEvent {
  type: 'SPELL_HEAL';
  spellId: number;
  spellName: string;
  spellSchool: number;
  amount: number;
  overkill: number;
  absorbed: number;
  critical: boolean;
}

/**
 * SPELL_PERIODIC_DAMAGE - Damage over time (DoT)
 * Same fields as SPELL_DAMAGE
 */
export interface SpellPeriodicDamageEvent extends CombatLogEvent {
  type: 'SPELL_PERIODIC_DAMAGE';
  ownerGUID?: string;
  ownerName?: string;
  spellId: number;
  spellName: string;
  spellSchool: number;
  amount: number;
  overkill: number;
  school: number;
  resisted: number;
  blocked: number;
  absorbed: number;
  critical: boolean;
  glancing: boolean;
  crushing: boolean;
}

/**
 * SPELL_PERIODIC_HEAL - Healing over time (HoT)
 * Same fields as SPELL_HEAL
 */
export interface SpellPeriodicHealEvent extends CombatLogEvent {
  type: 'SPELL_PERIODIC_HEAL';
  spellId: number;
  spellName: string;
  spellSchool: number;
  amount: number;
  overkill: number;
  absorbed: number;
  critical: boolean;
}

/**
 * SPELL_AURA_APPLIED - Buff/debuff applied
 * Fields: SPELL_AURA_APPLIED, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool, auraType
 */
export interface SpellAuraAppliedEvent extends CombatLogEvent {
  type: 'SPELL_AURA_APPLIED';
  spellId: number;
  spellName: string;
  spellSchool: number;
  auraType: 'BUFF' | 'DEBUFF';
}

/**
 * SPELL_AURA_REMOVED - Buff/debuff removed
 * Same fields as SPELL_AURA_APPLIED
 */
export interface SpellAuraRemovedEvent extends CombatLogEvent {
  type: 'SPELL_AURA_REMOVED';
  spellId: number;
  spellName: string;
  spellSchool: number;
  auraType: 'BUFF' | 'DEBUFF';
}

/**
 * SPELL_INTERRUPT - Spell interrupt
 * Fields: SPELL_INTERRUPT, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool,
 *         extraSpellID, extraSpellName, extraSpellSchool
 */
export interface SpellInterruptEvent extends CombatLogEvent {
  type: 'SPELL_INTERRUPT';
  spellId: number;
  spellName: string;
  spellSchool: number;
  extraSpellId: number;
  extraSpellName: string;
  extraSpellSchool: number;
}

/**
 * UNIT_DIED - Unit death
 * Fields: UNIT_DIED, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2
 */
export interface UnitDiedEvent {
  type: 'UNIT_DIED';
  timestamp: Date;
  sourceGUID: string;
  sourceName: string;
  sourceFlags: string;
  sourceFlags2: string;
  destGUID: string;
  destName: string;
  destFlags: string;
  destFlags2: string;
  killerGUID?: string;
  killerName?: string;
}

/**
 * SPELL_SUMMON - Pet/minion summoned
 * Fields: SPELL_SUMMON, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool
 */
export interface SpellSummonEvent extends CombatLogEvent {
  type: 'SPELL_SUMMON';
  spellId: number;
  spellName: string;
  spellSchool: number;
}

/**
 * SPELL_DISPEL - Spell dispelled
 * Fields: SPELL_DISPEL, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool,
 *         extraSpellID, extraSpellName, extraSpellSchool, auraType
 */
export interface SpellDispelEvent extends CombatLogEvent {
  type: 'SPELL_DISPEL';
  spellId: number;
  spellName: string;
  spellSchool: number;
  extraSpellId: number;
  extraSpellName: string;
  extraSpellSchool: number;
  auraType: 'BUFF' | 'DEBUFF';
}

/**
 * SWING_MISSED - Melee attack missed (parry, dodge, miss, etc.)
 * Fields: SWING_MISSED, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, missType
 */
export interface SwingMissedEvent extends CombatLogEvent {
  type: 'SWING_MISSED';
  missType: string; // PARRY, DODGE, MISS, BLOCK, EVADE, IMMUNE, etc.
}

/**
 * SPELL_MISSED - Spell attack missed
 * Fields: SPELL_MISSED, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool, missType
 */
export interface SpellMissedEvent extends CombatLogEvent {
  type: 'SPELL_MISSED';
  spellId: number;
  spellName: string;
  spellSchool: number;
  missType: string; // PARRY, DODGE, MISS, BLOCK, EVADE, IMMUNE, RESIST, ABSORB, etc.
  absorbed: number; // For ABSORB misses, how much was absorbed
  overkill: number; // Some advanced logs include trailing overkill-style value
  critical: boolean; // Some advanced logs include crit flag for ABSORB entries
}

export interface SpellPeriodicMissedEvent extends CombatLogEvent {
  type: 'SPELL_PERIODIC_MISSED';
  spellId: number;
  spellName: string;
  spellSchool: number;
  missType: string;
  absorbed: number;
  overkill: number;
  critical: boolean;
}

/**
 * RANGE_MISSED - Ranged attack missed
 * Fields: RANGE_MISSED, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, missType
 */
export interface RangeMissedEvent extends CombatLogEvent {
  type: 'RANGE_MISSED';
  missType: string;
}

/**
 * SPELL_ABSORBED - Spell damage absorbed by shield
 * Fields: SPELL_ABSORBED, sourceGUID, sourceName, sourceFlags, sourceFlags2,
 *         destGUID, destName, destFlags, destFlags2, spellID, spellName, spellSchool,
 *         absorberGUID, absorberName, absorberFlags, absorberFlags2, absorberSpellID, absorberSpellName, absorberSpellSchool,
 *         absorbed, overkill
 */
export interface SpellAbsorbedEvent extends CombatLogEvent {
  type: 'SPELL_ABSORBED';
  spellId: number;
  spellName: string;
  spellSchool: number;
  absorberGUID: string;
  absorberName: string;
  absorberSpellId: number;
  absorberSpellName: string;
  absorberSpellSchool: number;
  absorbed: number;
  overkill: number;
}

/**
 * COMBATANT_INFO - Player combatant info (sent at encounter start)
 * Fields: COMBATANT_INFO, playerGUID, ...
 */
export interface CombatantInfoEvent {
  type: 'COMBATANT_INFO';
  timestamp: Date;
  playerGUID: string;
}

/**
 * COMBAT_LOG_VERSION - Log file version info (first line)
 * Fields: COMBAT_LOG_VERSION, version, _, BUILD_VERSION, version, PROJECT_ID, id
 */
export interface CombatLogVersionEvent {
  type: 'COMBAT_LOG_VERSION';
  timestamp: Date;
  version: number;
  advancedLogEnabled: boolean;
  buildVersion: string;
  projectId: number;
}

/**
 * UNKNOWN_EVENT - Fallback for unrecognized event types
 */
export interface UnknownEvent {
  type: 'UNKNOWN';
  timestamp: Date;
  rawLine: string;
  eventType: string;
}

// ============================================================================
// UNION TYPE OF ALL EVENTS
// ============================================================================

export type CombatEvent =
  | EncounterStartEvent
  | EncounterEndEvent
  | ZoneChangeEvent
  | CombatantInfoEvent
  | SpellCastStartEvent
  | SpellCastSuccessEvent
  | SpellDamageEvent
  | RangeDamageEvent
  | SwingDamageEvent
  | SwingDamageLandedEvent
  | SwingMissedEvent
  | SpellMissedEvent
  | SpellPeriodicMissedEvent
  | RangeMissedEvent
  | SpellAbsorbedEvent
  | SpellHealEvent
  | SpellPeriodicDamageEvent
  | SpellPeriodicHealEvent
  | SpellAuraAppliedEvent
  | SpellAuraRemovedEvent
  | SpellInterruptEvent
  | UnitDiedEvent
  | SpellSummonEvent
  | SpellDispelEvent
  | CombatLogVersionEvent
  | UnknownEvent;

// ============================================================================
// CALLBACK TYPE
// ============================================================================

export type EventCallback = (event: CombatEvent) => void;

interface OwnerLink {
  ownerGuid: string;
  lastSeenMs: number;
}

class AttributionState {
  private readonly playerNameByGuid = new Map<string, string>();
  private readonly ownerGuidByUnitGuid = new Map<string, OwnerLink>();

  // Guard against stale ownership links living forever across long logs.
  private static readonly OWNER_LINK_TTL_MS = 30 * 60 * 1000;

  observe(event: CombatEvent): void {
    const anyEvent = event as any;

    if (typeof anyEvent.sourceGUID === 'string' && anyEvent.sourceGUID.startsWith('Player-') && anyEvent.sourceName) {
      this.playerNameByGuid.set(anyEvent.sourceGUID, anyEvent.sourceName);
    }

    // Explicit owner relationship is strongest signal.
    if (event.type === 'SPELL_SUMMON' && anyEvent.sourceGUID && anyEvent.destGUID) {
      if (String(anyEvent.sourceGUID).startsWith('Player-')) {
        this.ownerGuidByUnitGuid.set(String(anyEvent.destGUID), {
          ownerGuid: String(anyEvent.sourceGUID),
          lastSeenMs: event.timestamp.getTime(),
        });
      }
    }

    // SWING and some damage rows may include ownerGUID for pets/guardians;
    // infer only for non-player sources.
    if (
      (
        event.type === 'SWING_DAMAGE' ||
        event.type === 'SWING_DAMAGE_LANDED' ||
        event.type === 'SPELL_DAMAGE' ||
        event.type === 'SPELL_PERIODIC_DAMAGE' ||
        event.type === 'RANGE_DAMAGE'
      ) &&
      anyEvent.sourceGUID &&
      anyEvent.ownerGUID
    ) {
      if (!String(anyEvent.sourceGUID).startsWith('Player-') && String(anyEvent.ownerGUID).startsWith('Player-')) {
        const existing = this.ownerGuidByUnitGuid.get(String(anyEvent.sourceGUID));
        // Avoid noisy owner flips from weak/inferred signals.
        if (!existing || existing.ownerGuid === String(anyEvent.ownerGUID)) {
          this.ownerGuidByUnitGuid.set(String(anyEvent.sourceGUID), {
            ownerGuid: String(anyEvent.ownerGUID),
            lastSeenMs: event.timestamp.getTime(),
          });
        }
      }
    }

    // Zone changes are a safe boundary to drop stale entity ownership.
    if (event.type === 'ZONE_CHANGE') {
      this.ownerGuidByUnitGuid.clear();
    }
  }

  backfill(event: CombatEvent): void {
    const anyEvent = event as any;

    if (!anyEvent.ownerGUID && anyEvent.sourceGUID && !String(anyEvent.sourceGUID).startsWith('Player-')) {
      const link = this.ownerGuidByUnitGuid.get(String(anyEvent.sourceGUID));
      if (link) {
        const age = event.timestamp.getTime() - link.lastSeenMs;
        if (age >= 0 && age <= AttributionState.OWNER_LINK_TTL_MS) {
          anyEvent.ownerGUID = link.ownerGuid;
          link.lastSeenMs = event.timestamp.getTime();
        }
      }
    }

    if (anyEvent.ownerGUID && !anyEvent.ownerName) {
      anyEvent.ownerName = this.playerNameByGuid.get(String(anyEvent.ownerGUID)) || '';
    }
  }
}

// ============================================================================
// PARSER IMPLEMENTATION
// ============================================================================

/**
 * Parse a combat log file, emitting events via callback as they're found.
 * 
 * @param content - The raw combat log file content
 * @param callback - Function to call for each event found
 */
export function parseCombatLogEvents(content: string, callback: EventCallback): void {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const lineRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})\.(\d{3,4})\s{2,}(.+)$/;
  const attribution = new AttributionState();

  for (const line of lines) {
    if (!line.trim()) continue;

    const match = line.match(lineRegex);
    if (!match) continue;

    const [, month, day, year, hour, minute, second, ms, rest] = match;
    const timestamp = parseTimestamp(`${month}/${day}/${year}`, `${hour}:${minute}:${second}.${ms}`);

    const parts = parseCSVLine(rest);
    const eventType = parts[0];

    const event = parseEvent(eventType, parts, timestamp, line);
    if (!event) continue;

    attribution.observe(event);
    attribution.backfill(event);

    const anyEvent = event as any;
    if (!anyEvent.rawLine) anyEvent.rawLine = line;
    callback(event);
  }
}

/**
 * Parse a single event based on its type
 */
function parseEvent(
  eventType: string,
  parts: string[],
  timestamp: Date,
  rawLine: string
): CombatEvent | null {
  const getPart = (idx: number): string => parts[idx] || '';
  const parseIntSafe = (idx: number): number => parseInt(getPart(idx)) || 0;
  const parseBoolSafe = (idx: number): boolean => getPart(idx) === '1';
  const parseBoolFromEnd = (offsetFromEnd: number): boolean => {
    const idx = parts.length - 1 - offsetFromEnd;
    return idx >= 0 ? getPart(idx) === '1' : false;
  };
  const parseOwnerGuid = (idx: number): string => {
    const v = getPart(idx);
    return /^Player-/.test(v) ? v : '';
  };
  const parseOwnerGuidDamage = (): string => parseOwnerGuid(12) || parseOwnerGuid(13);

  switch (eventType) {
    case 'COMBAT_LOG_VERSION':
      return {
        type: 'COMBAT_LOG_VERSION',
        timestamp,
        version: parseIntSafe(1),
        advancedLogEnabled: getPart(3) === '1',
        buildVersion: getPart(5) || '',
        projectId: parseIntSafe(7),
      };
    
    case 'ZONE_CHANGE':
      return {
        type: 'ZONE_CHANGE',
        timestamp,
        zoneName: getPart(2)?.replace(/"/g, '') || 'Unknown',
      };
    
    case 'ENCOUNTER_START':
      return {
        type: 'ENCOUNTER_START',
        timestamp,
        encounterId: parseIntSafe(1),
        bossName: getPart(2)?.replace(/"/g, '') || 'Unknown',
        difficulty: parseIntSafe(3),
        size: parseIntSafe(4),
        zoneId: parseIntSafe(5),
      };
    
    case 'ENCOUNTER_END': {
      const flag = parseIntSafe(5);
      const value = parseIntSafe(6);
      let result: 'kill' | 'wipe' | 'unknown' = 'unknown';
      if (flag === 1 && value > 0) result = 'kill';
      else if (flag === 23 && value === 0) result = 'wipe';
      
      return {
        type: 'ENCOUNTER_END',
        timestamp,
        encounterId: parseIntSafe(1),
        bossName: getPart(2)?.replace(/"/g, '') || 'Unknown',
        difficulty: parseIntSafe(3),
        size: parseIntSafe(4),
        flag,
        value,
        result,
      };
    }
    
    case 'SPELL_CAST_START':
      return {
        type: 'SPELL_CAST_START',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
      };
    
    case 'SPELL_CAST_SUCCESS':
      return {
        type: 'SPELL_CAST_SUCCESS',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
      };
    
    case 'SPELL_DAMAGE':
      return {
        type: 'SPELL_DAMAGE',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        ownerGUID: parseOwnerGuidDamage(),
        ownerName: '',
        amount: parseIntSafe(31),
        // In advanced logs, overkill is typically near the tail (idx 33 in our observed format).
        // Fallback to classic position when needed.
        overkill: Math.max(0, parseIntSafe(33), parseIntSafe(13), parseIntSafe(29)),
        school: parseIntSafe(14),
        resisted: parseIntSafe(15),
        blocked: parseIntSafe(16),
        absorbed: parseIntSafe(17),
        // Advanced logs can shift these fields; fallback to tail positions:
        // ...,critical,glancing,crushing,missType (e.g. AOE)
        critical: parseBoolSafe(35) || parseBoolFromEnd(3),
        glancing: parseBoolSafe(36) || parseBoolFromEnd(2),
        crushing: parseBoolSafe(37) || parseBoolFromEnd(1),
      };
    
    case 'RANGE_DAMAGE':
      return {
        type: 'RANGE_DAMAGE',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        ownerGUID: parseOwnerGuidDamage(),
        ownerName: '',
        amount: parseIntSafe(12),
        overkill: parseIntSafe(13),
        school: parseIntSafe(14),
        resisted: parseIntSafe(15),
        blocked: parseIntSafe(16),
        absorbed: parseIntSafe(17),
        critical: parseBoolSafe(18),
        glancing: parseBoolSafe(19),
        crushing: parseBoolSafe(20),
      };
    
    case 'SWING_DAMAGE':
      return {
        type: 'SWING_DAMAGE',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        ownerGUID: getPart(10),
        ownerName: '',
        amount: parseIntSafe(28),
        overkill: 0,
        school: parseIntSafe(13),
        resisted: parseIntSafe(14),
        blocked: parseIntSafe(15),
        absorbed: Math.max(0, parseIntSafe(34), parseIntSafe(16)),
        critical: parseBoolSafe(35) || parseBoolFromEnd(3),
        glancing: parseBoolSafe(36) || parseBoolFromEnd(2),
        crushing: parseBoolSafe(37) || parseBoolFromEnd(1),
      };
    
    case 'SWING_DAMAGE_LANDED':
      return {
        type: 'SWING_DAMAGE_LANDED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        ownerGUID: getPart(10),
        ownerName: '',
        amount: parseIntSafe(28),
        overkill: 0,
        school: parseIntSafe(13),
        resisted: parseIntSafe(14),
        blocked: parseIntSafe(15),
        absorbed: Math.max(0, parseIntSafe(34), parseIntSafe(16)),
        critical: parseBoolSafe(35) || parseBoolFromEnd(3),
        glancing: parseBoolSafe(36) || parseBoolFromEnd(2),
        crushing: parseBoolSafe(37) || parseBoolFromEnd(1),
      };
    
    case 'SPELL_HEAL':
      return {
        type: 'SPELL_HEAL',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        amount: parseIntSafe(31),
        overkill: parseIntSafe(32),
        absorbed: parseIntSafe(18),
        critical: parseBoolSafe(34),
      };
    
    case 'SPELL_PERIODIC_DAMAGE':
      return {
        type: 'SPELL_PERIODIC_DAMAGE',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        ownerGUID: parseOwnerGuidDamage(),
        ownerName: '',
        // Support both classic and advanced-log layouts
        amount: parseIntSafe(31) || parseIntSafe(12),
        overkill: Math.max(0, parseIntSafe(33), parseIntSafe(13)),
        school: parseIntSafe(14),
        resisted: parseIntSafe(15),
        blocked: parseIntSafe(16),
        absorbed: parseIntSafe(17),
        critical: parseBoolSafe(18) || parseBoolFromEnd(3),
        glancing: parseBoolSafe(19) || parseBoolFromEnd(2),
        crushing: parseBoolSafe(20) || parseBoolFromEnd(1),
      };
    
    case 'SPELL_PERIODIC_HEAL':
      return {
        type: 'SPELL_PERIODIC_HEAL',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        amount: parseIntSafe(31),
        overkill: parseIntSafe(32),
        absorbed: parseIntSafe(18),
        critical: parseBoolSafe(34),
      };
    
    case 'SPELL_AURA_APPLIED':
      return {
        type: 'SPELL_AURA_APPLIED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        auraType: getPart(12) as 'BUFF' | 'DEBUFF',
      };
    
    case 'SPELL_AURA_REMOVED':
      return {
        type: 'SPELL_AURA_REMOVED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        auraType: getPart(12) as 'BUFF' | 'DEBUFF',
      };
    
    case 'SPELL_INTERRUPT':
      return {
        type: 'SPELL_INTERRUPT',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        extraSpellId: parseIntSafe(12),
        extraSpellName: getPart(13)?.replace(/"/g, '') || '',
        extraSpellSchool: parseIntSafe(14),
      };
    
    case 'UNIT_DIED':
      return {
        type: 'UNIT_DIED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        killerGUID: getPart(1),
        killerName: getPart(2)?.replace(/"/g, '') || '',
      };
    
    case 'SPELL_SUMMON':
      return {
        type: 'SPELL_SUMMON',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
      };
    
    case 'SPELL_DISPEL':
      return {
        type: 'SPELL_DISPEL',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        extraSpellId: parseIntSafe(12),
        extraSpellName: getPart(13)?.replace(/"/g, '') || '',
        extraSpellSchool: parseIntSafe(14),
        auraType: getPart(15) as 'BUFF' | 'DEBUFF',
      };
    
    case 'SWING_MISSED':
      return {
        type: 'SWING_MISSED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        missType: getPart(9) || 'UNKNOWN',
      };
    
    case 'SPELL_MISSED':
      return {
        type: 'SPELL_MISSED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        missType: getPart(12) || 'UNKNOWN',
        // Advanced logs (e.g. ABSORB) often include: nil, absorbed, overkillLike, critical, ...
        absorbed: parseIntSafe(14),
        overkill: parseIntSafe(15),
        critical: parseBoolSafe(16),
      };

    case 'SPELL_PERIODIC_MISSED':
      return {
        type: 'SPELL_PERIODIC_MISSED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        missType: getPart(12) || 'UNKNOWN',
        absorbed: parseIntSafe(14),
        overkill: parseIntSafe(15),
        critical: parseBoolSafe(16),
      };
    
    case 'RANGE_MISSED':
      return {
        type: 'RANGE_MISSED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        missType: getPart(9) || 'UNKNOWN',
      };
    
    case 'SPELL_ABSORBED':
      return {
        type: 'SPELL_ABSORBED',
        timestamp,
        sourceGUID: getPart(1),
        sourceName: getPart(2)?.replace(/"/g, '') || '',
        sourceFlags: getPart(3),
        sourceFlags2: getPart(4),
        destGUID: getPart(5),
        destName: getPart(6)?.replace(/"/g, '') || '',
        destFlags: getPart(7),
        destFlags2: getPart(8),
        spellId: parseIntSafe(9),
        spellName: getPart(10)?.replace(/"/g, '') || '',
        spellSchool: parseIntSafe(11),
        absorberGUID: getPart(12),
        absorberName: getPart(13)?.replace(/"/g, '') || '',
        absorberSpellId: parseIntSafe(16),
        absorberSpellName: getPart(17)?.replace(/"/g, '') || '',
        absorberSpellSchool: parseIntSafe(18),
        absorbed: parseIntSafe(19),
        overkill: parseIntSafe(20),
      };
    
    case 'COMBATANT_INFO':
      return {
        type: 'COMBATANT_INFO',
        timestamp,
        playerGUID: getPart(1),
      };
    
    default:
      return {
        type: 'UNKNOWN',
        timestamp,
        rawLine,
        eventType: eventType || 'UNKNOWN',
      };
  }
}

/**
 * Parse CSV line properly (handles quoted strings with commas)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse timestamp from combat log format
 */
function parseTimestamp(dateStr: string, timeStr: string): Date {
  const dateParts = dateStr.split('/');
  let year = Number(dateParts[2]);
  if (year < 100) year += 2000;
  const month = Number(dateParts[0]);
  const day = Number(dateParts[1]);
  
  const parts = timeStr.split(':');
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  const secParts = parts[2].split('.');
  const second = Number(secParts[0]);
  const msText = secParts[1] || '0';
  const msRaw = Number(msText);
  const ms = msText.length === 4 ? Math.round(msRaw * 0.1) : msRaw;
  
  return new Date(year, month - 1, day, hour, minute, second, ms);
}
