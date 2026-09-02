import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UnitCard, TacticalCard, GameCard, ArmyList, DiceRoll, DataPackage } from './types';
import { normalizeDataPackage, normalizeUnitCards } from './weapon-profile';

const KEYS = {
  UNITS: 'sc_tmg_units',
  CARDS: 'sc_tmg_cards',
  GAME_CARDS: 'sc_tmg_game_cards',
  DATA_VERSION: 'sc_tmg_data_version',
  ARMY_LISTS: 'sc_tmg_army_lists',
  DICE_HISTORY: 'sc_tmg_dice_history',
};

// --- Generic helpers ---
async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// --- Units ---
export async function getUnits(): Promise<UnitCard[]> {
  const units = await getJSON<UnitCard[]>(KEYS.UNITS, []);
  return normalizeUnitCards(units);
}
export async function setUnits(units: UnitCard[]): Promise<void> {
  await setJSON(KEYS.UNITS, normalizeUnitCards(units));
}

// --- Cards ---
export async function getCards(): Promise<TacticalCard[]> {
  return getJSON<TacticalCard[]>(KEYS.CARDS, []);
}
export async function setCards(cards: TacticalCard[]): Promise<void> {
  await setJSON(KEYS.CARDS, cards);
}

// --- Game Cards ---
export async function getGameCards(): Promise<GameCard[]> {
  return getJSON<GameCard[]>(KEYS.GAME_CARDS, []);
}
export async function setGameCards(cards: GameCard[]): Promise<void> {
  await setJSON(KEYS.GAME_CARDS, cards);
}

// --- Data Version ---
export async function getDataVersion(): Promise<number> {
  return getJSON<number>(KEYS.DATA_VERSION, 0);
}
export async function setDataVersion(v: number): Promise<void> {
  await setJSON(KEYS.DATA_VERSION, v);
}

// --- Army Lists ---
export async function getArmyLists(): Promise<ArmyList[]> {
  return getJSON<ArmyList[]>(KEYS.ARMY_LISTS, []);
}
export async function setArmyLists(lists: ArmyList[]): Promise<void> {
  await setJSON(KEYS.ARMY_LISTS, lists);
}
export async function saveArmyList(army: ArmyList): Promise<void> {
  const lists = await getArmyLists();
  const idx = lists.findIndex(l => l.id === army.id);
  if (idx >= 0) lists[idx] = army;
  else lists.push(army);
  await setArmyLists(lists);
}
export async function deleteArmyList(id: string): Promise<void> {
  const lists = await getArmyLists();
  await setArmyLists(lists.filter(l => l.id !== id));
}

// --- Dice History ---
export async function getDiceHistory(): Promise<DiceRoll[]> {
  return getJSON<DiceRoll[]>(KEYS.DICE_HISTORY, []);
}
export async function addDiceRoll(roll: DiceRoll): Promise<void> {
  const history = await getDiceHistory();
  history.unshift(roll);
  if (history.length > 100) history.length = 100;
  await setJSON(KEYS.DICE_HISTORY, history);
}
export async function clearDiceHistory(): Promise<void> {
  await setJSON(KEYS.DICE_HISTORY, []);
}

// --- Data Package Import ---
export async function importDataPackage(pkg: DataPackage): Promise<void> {
  const normalized = normalizeDataPackage(pkg);
  await setUnits(normalized.units);
  await setCards(normalized.cards);
  await setGameCards(normalized.gameCards);
  await setDataVersion(normalized.version);
}

// Historical match values from the recovered product are deliberately
// not read, changed, or exported here. They are compatibility material awaiting
// the explicit quarantine/migration flow in Ticket 14 / Slice 134, never a room
// state store. Army lists remain local, user-owned drafts.
