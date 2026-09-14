import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ArmyList, DiceRoll, Faction } from './types';
import { STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1 } from
  '../../../packages/client-domain/device-data-migration-v1.mjs';

const MAX_DICE_HISTORY = 100;
const MAX_ARMY_LISTS = 256;
const ACTIVE_ARMY_LISTS_KEY = '@project-d/starcraft-tmg/product/v1/army-lists';
const FACTIONS = new Set<Faction>(['Terran', 'Zerg', 'Protoss']);

interface DiceHistoryEnvelope {
  schemaVersion: 'starcraft_tmg_local_dice_history_v1';
  entries: DiceRoll[];
  rngAuthority: false;
  trainingTruth: false;
}

function safeDiceHistory(value: unknown): DiceRoll[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const envelope = value as Partial<DiceHistoryEnvelope>;
  if (envelope.schemaVersion !== 'starcraft_tmg_local_dice_history_v1'
    || envelope.rngAuthority !== false
    || envelope.trainingTruth !== false
    || !Array.isArray(envelope.entries)) return [];
  return envelope.entries.slice(0, MAX_DICE_HISTORY).filter((entry): entry is DiceRoll => (
    Boolean(entry)
    && typeof entry.id === 'string'
    && Array.isArray(entry.dice)
    && Number.isFinite(entry.total)
    && Number.isFinite(entry.timestamp)
  ));
}

export async function getDiceHistory(): Promise<DiceRoll[]> {
  const raw = await AsyncStorage.getItem(STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.diceHistory);
  if (!raw || raw.length > 1024 * 1024) return [];
  try {
    return safeDiceHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function setDiceHistory(entries: DiceRoll[]): Promise<void> {
  const envelope: DiceHistoryEnvelope = {
    schemaVersion: 'starcraft_tmg_local_dice_history_v1',
    entries: entries.slice(0, MAX_DICE_HISTORY).map((entry) => ({
      ...entry,
      label: entry.label?.slice(0, 80),
      dice: entry.dice.slice(0, 100),
    })),
    rngAuthority: false,
    trainingTruth: false,
  };
  await AsyncStorage.setItem(
    STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1.diceHistory,
    JSON.stringify(envelope),
  );
}

export async function addDiceRoll(roll: DiceRoll): Promise<void> {
  const history = await getDiceHistory();
  await setDiceHistory([roll, ...history]);
}

export async function clearDiceHistory(): Promise<void> {
  await setDiceHistory([]);
}

function safeArmyLists(value: unknown): ArmyList[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ARMY_LISTS).filter((army): army is ArmyList => (
    Boolean(army)
    && typeof army === 'object'
    && typeof army.id === 'string'
    && army.id.length > 0
    && army.id.length <= 128
    && typeof army.name === 'string'
    && army.name.length <= 160
    && FACTIONS.has(army.faction)
    && Number.isFinite(army.mineralsLimit)
    && Number.isFinite(army.gasLimit)
    && Array.isArray(army.tacticalCardIds)
    && army.tacticalCardIds.length <= 256
    && Array.isArray(army.roster)
    && army.roster.length <= 256
  ));
}

export async function getArmyLists(): Promise<ArmyList[]> {
  const raw = await AsyncStorage.getItem(ACTIVE_ARMY_LISTS_KEY);
  if (!raw || raw.length > 4 * 1024 * 1024) return [];
  try {
    return safeArmyLists(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function setArmyLists(armies: ArmyList[]): Promise<void> {
  await AsyncStorage.setItem(
    ACTIVE_ARMY_LISTS_KEY,
    JSON.stringify(safeArmyLists(armies)),
  );
}

export async function saveArmyList(army: ArmyList): Promise<void> {
  const normalized = safeArmyLists([army])[0];
  if (!normalized) throw new Error('ARMY_DRAFT_INVALID');
  const armies = await getArmyLists();
  const index = armies.findIndex((entry) => entry.id === normalized.id);
  if (index >= 0) armies[index] = normalized;
  else armies.push(normalized);
  await setArmyLists(armies);
}

export async function deleteArmyList(id: string): Promise<void> {
  const armies = await getArmyLists();
  await setArmyLists(armies.filter((entry) => entry.id !== id));
}

// The active product Army workspace is deliberately namespaced away from the
// legacy keys inspected by compatibility migration. It is local planning data,
// never Room/Rules authority. Historical matches still stay behind the Room +
// Replay boundary.
