import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import officialCatalogueJson from '../assets/data/official-product-catalogue-v1.json';
import type { UnitCard, TacticalCard, GameCard, ArmyList, Faction, DataPackage } from './types';
import { normalizeDataPackage } from './weapon-profile';
import * as productStorage from './storage';
import { useLevel3ClientDomain } from './level3/client-domain-provider';
import {
  confirmLegacyStarcraftTmgDeviceDataMigrationV1,
  loadStarcraftTmgDeviceMigrationManifestV1,
  readStarcraftTmgReadOnlyLegacyHistoryV1,
  scanLegacyStarcraftTmgDeviceDataV1,
  type DeviceMigrationManifest,
  type LegacyMigrationScan,
  type ReadOnlyLegacyHistory,
} from '../../../packages/client-domain/device-data-migration-v1.mjs';

export const OFFICIAL_DATA_CLASSIFICATION = Object.freeze({
  classification: 'verified_frozen_official_product_projection',
  canonicalSourceOwner: 'starcraft-tmg.official.command-center',
  canonical: true,
  catalogueBodyAvailable: true,
  roomAuthority: false,
  rulesAuthority: false,
  automaticNetworkSync: false,
  sourceRefreshPolicy: 'explicit_user_command_only',
  legacyFallbackAllowed: false,
  trainingTruth: false,
} as const);

interface ProductCatalogueSource {
  sourceId: string;
  sourceSnapshotHash: string;
  officialDatasetHash: string;
  sourceLockHash: string;
  capturedAt: string;
  dataVersions: { unitsVersion: string; cardsVersion: string; rulesVersion: string };
  recordCounts: { units: number; cards: number; gameCards: number };
  sourceRefreshPolicy: 'explicit_user_command_only';
  displayAuthority: 'verified_frozen_official_product_projection';
  rulesAuthority: false;
  trainingTruth: false;
}

interface ProductCatalogueEnvelope extends DataPackage {
  schemaVersion: 'starcraft_tmg_official_product_catalogue_v1';
  source: ProductCatalogueSource;
}

// JSON imports widen literal union members (Faction, UnitType and card type) to
// `string`. The build script validates and normalizes that frozen source before
// emitting this product envelope, so the cast belongs at this one import seam.
const officialCatalogue = officialCatalogueJson as unknown as ProductCatalogueEnvelope;
const normalizedOfficialCatalogue = normalizeDataPackage(officialCatalogue);

interface MigrationView {
  phase: 'not_scanned' | 'scanning' | 'classified' | 'importing' | 'sanitized_imported' | 'failed';
  scan: LegacyMigrationScan | null;
  manifest: DeviceMigrationManifest | null;
  history: ReadOnlyLegacyHistory | null;
  errorCode: string | null;
}

interface DataContextType {
  units: UnitCard[];
  cards: TacticalCard[];
  gameCards: GameCard[];
  armyLists: ArmyList[];
  dataVersion: number;
  dataClassification: typeof OFFICIAL_DATA_CLASSIFICATION;
  catalogueSource: ProductCatalogueSource;
  officialCatalogueAvailable: true;
  officialSourceMetadataVerified: boolean;
  migration: MigrationView;
  isLoading: boolean;
  reloadLocal: () => Promise<void>;
  scanLegacyData: () => Promise<LegacyMigrationScan | null>;
  confirmLegacyMigration: (expectedScanHash?: string) => Promise<DeviceMigrationManifest | null>;
  saveArmy: (army: ArmyList) => Promise<void>;
  deleteArmy: (id: string) => Promise<void>;
  getUnitsByFaction: (faction: Faction) => UnitCard[];
  getCardsByFaction: (faction: Faction) => TacticalCard[];
  getFactionCards: (faction: Faction) => TacticalCard[];
  getTacticalCards: (faction: Faction) => TacticalCard[];
}

const DataContext = createContext<DataContextType | null>(null);

const INITIAL_MIGRATION: MigrationView = Object.freeze({
  phase: 'not_scanned',
  scan: null,
  manifest: null,
  history: null,
  errorCode: null,
});

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code || 'DEVICE_MIGRATION_FAILED');
  }
  return 'DEVICE_MIGRATION_FAILED';
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { view } = useLevel3ClientDomain();
  const [migration, setMigration] = useState<MigrationView>(INITIAL_MIGRATION);
  const [armyLists, setArmyLists] = useState<ArmyList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const migrationOperationEpoch = useRef(0);
  const activeMigrationOperation = useRef<'reload' | 'scan' | 'confirm' | null>(null);
  const source = view.sourceLocalization;

  const reloadLocal = useCallback(async () => {
    if (activeMigrationOperation.current) return;
    const epoch = ++migrationOperationEpoch.current;
    activeMigrationOperation.current = 'reload';
    setIsLoading(true);
    try {
      const manifest = await loadStarcraftTmgDeviceMigrationManifestV1({
        storage: AsyncStorage,
      });
      const activeArmies = await productStorage.getArmyLists();
      if (migrationOperationEpoch.current === epoch) setArmyLists(activeArmies);
      if (manifest && migrationOperationEpoch.current === epoch) {
        const history = await readStarcraftTmgReadOnlyLegacyHistoryV1({
          storage: AsyncStorage,
        });
        setMigration((current) => ({
          phase: 'sanitized_imported',
          scan: current.scan,
          manifest,
          history,
          errorCode: null,
        }));
      } else if (migrationOperationEpoch.current === epoch) {
        setMigration(INITIAL_MIGRATION);
      }
    } catch (error) {
      if (migrationOperationEpoch.current === epoch) {
        setMigration((current) => ({
          ...current,
          phase: 'failed',
          errorCode: errorCode(error),
        }));
      }
    } finally {
      if (migrationOperationEpoch.current === epoch) {
        activeMigrationOperation.current = null;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void reloadLocal();
  }, [reloadLocal]);

  const scanLegacyData = useCallback(async () => {
    if (activeMigrationOperation.current || migration.manifest) return null;
    const epoch = ++migrationOperationEpoch.current;
    activeMigrationOperation.current = 'scan';
    setMigration((current) => ({ ...current, phase: 'scanning', errorCode: null }));
    try {
      const publishedManifest = await loadStarcraftTmgDeviceMigrationManifestV1({
        storage: AsyncStorage,
      });
      if (publishedManifest) {
        const history = await readStarcraftTmgReadOnlyLegacyHistoryV1({
          storage: AsyncStorage,
        });
        if (migrationOperationEpoch.current === epoch) {
          setMigration((current) => ({
            phase: 'sanitized_imported',
            scan: current.scan,
            manifest: publishedManifest,
            history,
            errorCode: null,
          }));
        }
        return null;
      }
      const scan = await scanLegacyStarcraftTmgDeviceDataV1({ storage: AsyncStorage });
      if (migrationOperationEpoch.current === epoch) {
        setMigration({ phase: 'classified', scan, manifest: null, history: null, errorCode: null });
      }
      return scan;
    } catch (error) {
      if (migrationOperationEpoch.current === epoch) {
        setMigration((current) => ({ ...current, phase: 'failed', errorCode: errorCode(error) }));
      }
      return null;
    } finally {
      if (migrationOperationEpoch.current === epoch) {
        activeMigrationOperation.current = null;
      }
    }
  }, [migration.manifest]);

  const confirmLegacyMigration = useCallback(async (expectedScanHash?: string) => {
    const scan = migration.scan;
    if (activeMigrationOperation.current) return null;
    if (!scan || migration.phase !== 'classified' || !source
      || (expectedScanHash !== undefined && scan.scanHash !== expectedScanHash)) {
      setMigration((current) => ({
        ...current,
        phase: 'failed',
        errorCode: !source
          ? 'SOURCE_PROJECTION_REQUIRED'
          : expectedScanHash !== undefined && scan?.scanHash !== expectedScanHash
            ? 'DEVICE_MIGRATION_SCAN_CHANGED'
            : 'DEVICE_MIGRATION_SCAN_REQUIRED',
      }));
      return null;
    }
    const epoch = ++migrationOperationEpoch.current;
    activeMigrationOperation.current = 'confirm';
    setMigration((current) => ({ ...current, phase: 'importing', errorCode: null }));
    try {
      const manifest = await confirmLegacyStarcraftTmgDeviceDataMigrationV1({
        storage: AsyncStorage,
        scan,
        confirmed: true,
        sourceProjection: source,
      });
      const history = await readStarcraftTmgReadOnlyLegacyHistoryV1({
        storage: AsyncStorage,
      });
      if (migrationOperationEpoch.current === epoch) {
        setMigration({
          phase: 'sanitized_imported',
          scan,
          manifest,
          history,
          errorCode: null,
        });
      }
      return manifest;
    } catch (error) {
      if (migrationOperationEpoch.current === epoch) {
        setMigration((current) => ({ ...current, phase: 'failed', errorCode: errorCode(error) }));
      }
      return null;
    } finally {
      if (migrationOperationEpoch.current === epoch) {
        activeMigrationOperation.current = null;
      }
    }
  }, [migration.phase, migration.scan, source]);

  const saveArmy = useCallback(async (army: ArmyList) => {
    await productStorage.saveArmyList(army);
    setArmyLists(await productStorage.getArmyLists());
  }, []);

  const deleteArmy = useCallback(async (id: string) => {
    await productStorage.deleteArmyList(id);
    setArmyLists(await productStorage.getArmyLists());
  }, []);

  const units = normalizedOfficialCatalogue.units as UnitCard[];
  const cards = normalizedOfficialCatalogue.cards as TacticalCard[];
  const gameCards = normalizedOfficialCatalogue.gameCards as GameCard[];
  const dataVersion = normalizedOfficialCatalogue.version;
  const byFaction = useCallback(<T extends { faction: string },>(entries: T[], faction: Faction) => (
    entries.filter((entry) => entry.faction === faction)
  ), []);

  return (
    <DataContext.Provider value={{
      units,
      cards,
      gameCards,
      armyLists,
      dataVersion,
      dataClassification: OFFICIAL_DATA_CLASSIFICATION,
      catalogueSource: officialCatalogue.source,
      officialCatalogueAvailable: true,
      officialSourceMetadataVerified: true,
      migration,
      isLoading,
      reloadLocal,
      scanLegacyData,
      confirmLegacyMigration,
      saveArmy,
      deleteArmy,
      getUnitsByFaction: (faction) => byFaction(units, faction),
      getCardsByFaction: (faction) => byFaction(cards, faction),
      getFactionCards: (faction) => byFaction(cards, faction)
        .filter((card) => card.isFactionCard),
      getTacticalCards: (faction) => byFaction(cards, faction)
        .filter((card) => !card.isFactionCard),
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
