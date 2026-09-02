import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UnitCard, TacticalCard, GameCard, ArmyList, MatchRecord, Faction, DataPackage } from './types';
import * as storage from './storage';
import { fetchAllData } from './firebase-fetch';
import { loadBundledDataIfNeeded } from './bundled-data-loader';
import { normalizeDataPackage } from './weapon-profile';

interface DataContextType {
  // Data
  units: UnitCard[];
  cards: TacticalCard[];
  gameCards: GameCard[];
  armyLists: ArmyList[];
  matches: MatchRecord[];
  dataVersion: number;

  // Loading state
  isLoading: boolean;
  isSyncing: boolean;
  syncError: string | null;

  // Actions
  syncFromServer: () => Promise<void>;
  importPackage: (pkg: DataPackage) => Promise<void>;
  reloadLocal: () => Promise<void>;

  // Army list actions
  saveArmy: (army: ArmyList) => Promise<void>;
  deleteArmy: (id: string) => Promise<void>;

  // Match actions
  saveMatchRecord: (match: MatchRecord) => Promise<void>;
  deleteMatchRecord: (id: string) => Promise<void>;

  // Helpers
  getUnitsByFaction: (faction: Faction) => UnitCard[];
  getCardsByFaction: (faction: Faction) => TacticalCard[];
  getFactionCards: (faction: Faction) => TacticalCard[];
  getTacticalCards: (faction: Faction) => TacticalCard[];
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnits] = useState<UnitCard[]>([]);
  const [cards, setCards] = useState<TacticalCard[]>([]);
  const [gameCards, setGameCards] = useState<GameCard[]>([]);
  const [armyLists, setArmyLists] = useState<ArmyList[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const reloadLocal = useCallback(async () => {
    setIsLoading(true);
    try {
      // 首次启动时尝试加载内置数据包
      await loadBundledDataIfNeeded();

      const [u, c, gc, al, m, v] = await Promise.all([
        storage.getUnits(),
        storage.getCards(),
        storage.getGameCards(),
        storage.getArmyLists(),
        storage.getMatches(),
        storage.getDataVersion(),
      ]);
      setUnits(u);
      setCards(c);
      setGameCards(gc);
      setArmyLists(al);
      setMatches(m);
      setDataVersion(v);
    } catch (e) {
      console.error('Failed to load local data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadLocal();
  }, [reloadLocal]);

  const syncFromServer = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const pkg = normalizeDataPackage(await fetchAllData());
      await storage.importDataPackage(pkg);
      setUnits(pkg.units);
      setCards(pkg.cards);
      setGameCards(pkg.gameCards);
      setDataVersion(pkg.version);
    } catch (e: any) {
      setSyncError(e.message || '同步失败');
      throw e;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const importPackage = useCallback(async (pkg: DataPackage) => {
    const normalized = normalizeDataPackage(pkg);
    await storage.importDataPackage(normalized);
    setUnits(normalized.units);
    setCards(normalized.cards);
    setGameCards(normalized.gameCards);
    setDataVersion(normalized.version);
  }, []);

  const saveArmy = useCallback(async (army: ArmyList) => {
    await storage.saveArmyList(army);
    setArmyLists(await storage.getArmyLists());
  }, []);

  const deleteArmy = useCallback(async (id: string) => {
    await storage.deleteArmyList(id);
    setArmyLists(await storage.getArmyLists());
  }, []);

  const saveMatchRecord = useCallback(async (match: MatchRecord) => {
    await storage.saveMatch(match);
    setMatches(await storage.getMatches());
  }, []);

  const deleteMatchRecord = useCallback(async (id: string) => {
    await storage.deleteMatch(id);
    setMatches(await storage.getMatches());
  }, []);

  const getUnitsByFaction = useCallback((faction: Faction) => {
    return units.filter(u => u.faction === faction);
  }, [units]);

  const getCardsByFaction = useCallback((faction: Faction) => {
    return cards.filter(c => c.faction === faction);
  }, [cards]);

  const getFactionCards = useCallback((faction: Faction) => {
    return cards.filter(c => c.faction === faction && c.isFactionCard);
  }, [cards]);

  const getTacticalCards = useCallback((faction: Faction) => {
    return cards.filter(c => c.faction === faction && !c.isFactionCard);
  }, [cards]);

  return (
    <DataContext.Provider value={{
      units, cards, gameCards, armyLists, matches, dataVersion,
      isLoading, isSyncing, syncError,
      syncFromServer, importPackage, reloadLocal,
      saveArmy, deleteArmy,
      saveMatchRecord, deleteMatchRecord,
      getUnitsByFaction, getCardsByFaction, getFactionCards, getTacticalCards,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
