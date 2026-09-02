import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiceRoll } from './types';
import { STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1 } from
  '../../../packages/client-domain/device-data-migration-v1.mjs';

const MAX_DICE_HISTORY = 100;

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

// Official catalogue, army drafts, and historical matches deliberately do not
// live in this generic storage module. Source metadata is owned by the Client
// Domain source extension; compatibility imports use the explicit migration
// module and can never become room or Rules authority.
