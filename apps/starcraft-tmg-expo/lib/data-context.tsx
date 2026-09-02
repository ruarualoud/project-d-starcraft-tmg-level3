import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UnitCard, TacticalCard, GameCard, ArmyList, Faction } from './types';
import * as storage from './storage';
import { loadBundledDataIfNeeded } from './bundled-data-loader';

export const COMPATIBILITY_DATA_CLASSIFICATION = {
  classification: 'legacy_compatibility_display_only',
  canonical: false,
  roomAuthority: false,
  rulesAuthority: false,
  automaticNetworkSync: false,
  officialProjectionPlannedSlice: 134,
} as const;

interface DataContextType {
  // Data
  units: UnitCard[];
  cards: TacticalCard[];
  gameCards: GameCard[];
  armyLists: ArmyList[];
  dataVersion: number;
  dataClassification: typeof COMPATIBILITY_DATA_CLASSIFICATION;

  // Loading state
  isLoading: boolean;

  // Actions
  reloadLocal: () => Promise<void>;

  // Army list actions
  saveArmy: (army: ArmyList) => Promise<void>;
  deleteArmy: (id: string) => Promise<void>;

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
  const [dataVersion, setDataVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const reloadLocal = useCallback(async () => {
    setIsLoading(true);
    try {
      // The recovered bundle is retained only for reference browsing and local
      // army drafting. It cannot seed a room or claim official/canonical truth.
      await loadBundledDataIfNeeded();

      const [u, c, gc, al, v] = await Promise.all([
        storage.getUnits(),
        storage.getCards(),
        storage.getGameCards(),
        storage.getArmyLists(),
        storage.getDataVersion(),
      ]);
      setUnits(u);
      setCards(c);
      setGameCards(gc);
      setArmyLists(al);
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

  const saveArmy = useCallback(async (army: ArmyList) => {
    await storage.saveArmyList(army);
    setArmyLists(await storage.getArmyLists());
  }, []);

  const deleteArmy = useCallback(async (id: string) => {
    await storage.deleteArmyList(id);
    setArmyLists(await storage.getArmyLists());
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
      units, cards, gameCards, armyLists, dataVersion,
      dataClassification: COMPATIBILITY_DATA_CLASSIFICATION,
      isLoading,
      reloadLocal,
      saveArmy, deleteArmy,
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
