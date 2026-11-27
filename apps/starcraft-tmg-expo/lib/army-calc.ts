import type { ArmyList, ArmyState, TacticalCard, UnitCard, RosterUnit, SlotMap, Faction, Upgrade, WeaponProfile, GameCard } from './types';

const emptySlots = (): SlotMap => ({ Core: 0, Elite: 0, Support: 0, Hero: 0, Air: 0, Other: 0 });

export function computeArmyState(army: ArmyList, cards: TacticalCard[]): ArmyState {
  const gasLimit = Math.floor(army.mineralsLimit * 0.10);

  // Gas used by tactical cards
  let gasUsed = 0;
  army.tacticalCardIds.forEach(id => {
    const c = cards.find(x => x.id === id);
    if (c) gasUsed += c.cost;
  });

  // Resource total from faction + tactical cards
  let resourceTotal = 0;
  const addResource = (cid: string) => {
    const c = cards.find(x => x.id === cid);
    if (c && c.resource != null) resourceTotal += Number(c.resource) || 0;
  };
  if (army.factionCardId) addResource(army.factionCardId);
  army.tacticalCardIds.forEach(addResource);

  // Minerals used by roster units
  let mineralsUsed = 0;
  let supplyUsed = 0;
  army.roster.forEach(u => {
    let upgCost = 0;
    u.activeUpgrades.forEach(idx => {
      const upg = u.availableUpgrades[idx];
      if (upg) upgCost += (u.size === 'small' ? upg.costS : upg.costL);
    });
    mineralsUsed += (u.baseCost + upgCost);
    supplyUsed += (u.supply || 0);
  });

  // Slots available from cards
  const slotsAvailable = emptySlots();
  const addSlots = (cid: string) => {
    const c = cards.find(x => x.id === cid);
    if (c && c.slots) {
      for (const [key, val] of Object.entries(c.slots)) {
        const normKey = Object.keys(slotsAvailable).find(k => k.toLowerCase() === key.toLowerCase());
        if (normKey) slotsAvailable[normKey as keyof SlotMap] += Number(val) || 0;
      }
    }
  };
  if (army.factionCardId) addSlots(army.factionCardId);
  army.tacticalCardIds.forEach(addSlots);

  // Slots used by roster (each unit takes 1 slot)
  const slotsUsed = emptySlots();
  army.roster.forEach(u => {
    if (slotsUsed[u.unitType] !== undefined) {
      slotsUsed[u.unitType] += 1;
    }
  });

  return { mineralsUsed, gasUsed, supplyUsed, resourceTotal, slotsAvailable, slotsUsed };
}

export function createRosterUnit(unit: UnitCard, size: 'small' | 'large'): RosterUnit {
  const profile = size === 'small' ? unit.smallProfile : unit.largeProfile;
  return {
    unitId: unit.id,
    name: unit.name,
    unitType: unit.unitType,
    size,
    baseCost: profile?.cost || 0,
    supply: profile?.supply || 0,
    activeUpgrades: [],
    availableUpgrades: unit.upgrades,
    stats: unit.stats,
    keywords: unit.keywords,
  };
}

export function createEmptyArmy(faction: Faction, name: string): ArmyList {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    faction,
    mineralsLimit: 500,
    gasLimit: 50,
    factionCardId: null,
    tacticalCardIds: [],
    roster: [],
    missionId: null,
    deploymentId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/** Explicitly copy a saved draft to a selected release. Upgrade indices are local to a card revision. */
export function repriceArmyCopy(army: ArmyList, units: UnitCard[], cards: TacticalCard[], target: {
  datasetHash:string; minerals:number; missionId:string; deploymentId:string;
}): ArmyList {
  if (army.mineralsLimit !== target.minerals) throw Error('ROSTER_SCALE_MISMATCH');
  if (army.factionCardId && !cards.some(card => card.id === army.factionCardId && card.isFactionCard)) {
    throw Error('ROSTER_FACTION_CARD_UNAVAILABLE: ' + army.factionCardId);
  }
  for (const id of army.tacticalCardIds) {
    if (!cards.some(card => card.id === id && !card.isFactionCard)) throw Error('ROSTER_CARD_UNAVAILABLE: ' + id);
  }
  const roster = army.roster.map(old => {
    const unit = units.find(card => card.id === old.unitId);
    const profile = old.size === 'small' ? unit?.smallProfile : unit?.largeProfile;
    if (!unit || !profile?.models) throw Error('ROSTER_PROFILE_UNAVAILABLE: ' + old.unitId);
    const updated = createRosterUnit(unit,old.size);
    updated.activeUpgrades = old.activeUpgrades.map(index => {
      const name = old.availableUpgrades[index]?.name;
      const matches = unit.upgrades.map((upgrade,i) => upgrade.name === name ? i : -1).filter(i => i >= 0);
      if (matches.length !== 1) throw Error('ROSTER_UPGRADE_CHANGED: ' + old.unitId + ' / ' + (name ?? index));
      return matches[0];
    });
    return updated;
  });
  return {...army,...createEmptyArmy(army.faction,army.name + ' · W3'),roster,
    factionCardId:army.factionCardId,tacticalCardIds:[...army.tacticalCardIds],officialDatasetHash:target.datasetHash,
    mineralsLimit:target.minerals,gasLimit:Math.floor(target.minerals / 10),
    missionId:target.missionId,deploymentId:target.deploymentId};
}

// --- Damage Calculation ---
export interface CombatResult {
  expectedHits: number;
  expectedDamage: number;
  expectedKills: number;
  hitProbability: number;
  details: string;
}

function parseHitValue(hit: string): number {
  // "3+" means need 3 or more on d6 → probability = (7-3)/6 = 4/6
  const match = hit.match(/(\d+)\+/);
  if (match) return parseInt(match[1]);
  return 4; // default 4+
}

export function calculateCombat(
  weapon: WeaponProfile,
  attackerUpgrades: string[],
  targetStats: { armor?: number; hp?: number; shield?: number; evade?: number },
  targetKeywords: string,
  roa: number,
): CombatResult {
  const hitNeeded = parseHitValue(weapon.hit);
  const hitProb = Math.max(0, Math.min(1, (7 - hitNeeded) / 6));
  const dmgPerHit = parseInt(weapon.dmg) || 1;
  const effectiveArmor = targetStats.armor || 0;
  const effectiveDmg = Math.max(1, dmgPerHit - effectiveArmor);

  const expectedHits = roa * hitProb;
  const expectedDamage = expectedHits * effectiveDmg;
  const totalHP = (targetStats.hp || 1) + (targetStats.shield || 0);
  const expectedKills = Math.min(expectedDamage / totalHP, 1);

  const details = `${roa}atk × ${(hitProb * 100).toFixed(0)}%hit × ${effectiveDmg}dmg (${dmgPerHit}base - ${effectiveArmor}armor)`;

  return { expectedHits, expectedDamage, expectedKills, hitProbability: hitProb, details };
}

// --- Army Text Export/Import ---
export function armyToText(army: ArmyList, cards: TacticalCard[], units: UnitCard[], gameCards?: GameCard[]): string {
  const lines: string[] = [];
  lines.push(`=== ${army.name} ===`);
  lines.push(`Faction: ${army.faction}`);
  lines.push(`Minerals: ${army.mineralsLimit}`);
  lines.push('');

  // Faction card
  if (army.factionCardId) {
    const fc = cards.find(c => c.id === army.factionCardId);
    if (fc) lines.push(`[FC] ${fc.name}`);
  }

  // Tactical cards (count duplicates)
  const tcCounts = new Map<string, number>();
  army.tacticalCardIds.forEach(id => tcCounts.set(id, (tcCounts.get(id) || 0) + 1));
  tcCounts.forEach((count, id) => {
    const tc = cards.find(c => c.id === id);
    if (tc) lines.push(`[TC] ${tc.name}${count > 1 ? ` x${count}` : ''} (${tc.cost * count}gas)`);
  });

  // Mission card
  if (army.missionId && gameCards) {
    const mc = gameCards.find(c => c.id === army.missionId);
    if (mc) {
      const parts = [mc.name];
      if (mc.format) parts.push(mc.format);
      if (mc.gameLength) parts.push(`${mc.gameLength}R`);
      if (mc.startingSupply != null) parts.push(`${mc.startingSupply}S`);
      lines.push(`[Mission] ${parts.join(' · ')}`);
    }
  }

  // Deployment card
  if (army.deploymentId && gameCards) {
    const dc = gameCards.find(c => c.id === army.deploymentId);
    if (dc) {
      const parts = [dc.name];
      if (dc.gameSize) parts.push(dc.gameSize);
      lines.push(`[Deploy] ${parts.join(' · ')}`);
    }
  }

  lines.push('');
  lines.push('--- Roster ---');

  // Roster
  army.roster.forEach((u, i) => {
    const upgNames = u.activeUpgrades.map(idx => u.availableUpgrades[idx]?.name).filter(Boolean);
    let line = `${i + 1}. ${u.name} [${u.unitType}/${u.size}] ${u.baseCost}M`;
    if (upgNames.length > 0) {
      line += ` +upg: ${upgNames.join(', ')}`;
    }
    lines.push(line);
  });

  const state = computeArmyState(army, cards);
  lines.push('');
  lines.push(`Total: ${state.mineralsUsed}/${army.mineralsLimit}M ${state.gasUsed}/${Math.floor(army.mineralsLimit * 0.1)}G`);
  lines.push(`=== END ===`);

  return lines.join('\n');
}

export function textToArmy(text: string, cards: TacticalCard[], units: UnitCard[]): ArmyList | null {
  try {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let name = 'Imported Army';
    let faction: Faction = 'Terran';
    let mineralsLimit = 500;
    let factionCardId: string | null = null;
    const tacticalCardIds: string[] = [];
    const roster: RosterUnit[] = [];

    for (const line of lines) {
      // Parse name
      const nameMatch = line.match(/^===\s*(.+?)\s*===$/);
      if (nameMatch && nameMatch[1] !== 'END') name = nameMatch[1];

      // Parse faction (supports both old Chinese and new English format)
      const factionMatch = line.match(/^(?:Faction|阵营):\s*(.+)$/);
      if (factionMatch) faction = factionMatch[1] as Faction;

      // Parse minerals
      const minMatch = line.match(/^(?:Minerals|矿物上限):\s*(\d+)$/);
      if (minMatch) mineralsLimit = parseInt(minMatch[1]);

      // Parse faction card
      const fcMatch = line.match(/^\[(?:FC|阵营卡)\]\s*(.+)$/);
      if (fcMatch) {
        const fc = cards.find(c => c.isFactionCard && c.name === fcMatch[1] && c.faction === faction);
        if (fc) factionCardId = fc.id;
      }

      // Parse tactical card (supports multiplier like "x2")
      const tcMatch = line.match(/^\[(?:TC|战术卡)\]\s*(.+?)(?:\s*x(\d+))?\s*\(/);
      if (tcMatch) {
        const tc = cards.find(c => !c.isFactionCard && c.name === tcMatch[1] && c.faction === faction);
        const count = tcMatch[2] ? parseInt(tcMatch[2]) : 1;
        if (tc) {
          for (let i = 0; i < count; i++) tacticalCardIds.push(tc.id);
        }
      }

      // Parse roster unit (supports both old Chinese and new English format)
      const unitMatch = line.match(/^\d+\.\s*(.+?)\s*\[(\w+)\/(\w+)\]\s*(\d+)(?:M|矿)/);
      if (unitMatch) {
        const [, unitName, unitType, size] = unitMatch;
        const unit = units.find(u => u.name === unitName && u.faction === faction);
        if (unit) {
          const ru = createRosterUnit(unit, size as 'small' | 'large');

          // Parse upgrades
          const upgMatch = line.match(/\+(?:upg|升级):\s*(.+)$/);
          if (upgMatch) {
            const upgNames = upgMatch[1].split(',').map(s => s.trim());
            upgNames.forEach(un => {
              const idx = ru.availableUpgrades.findIndex(u => u.name === un);
              if (idx >= 0) ru.activeUpgrades.push(idx);
            });
          }
          roster.push(ru);
        }
      }
    }

    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      faction,
      mineralsLimit,
      gasLimit: Math.floor(mineralsLimit * 0.1),
      factionCardId,
      tacticalCardIds,
      roster,
      missionId: null,
      deploymentId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (e) {
    console.error('Failed to parse army text:', e);
    return null;
  }
}
