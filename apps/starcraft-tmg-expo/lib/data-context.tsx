import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { UnitCard, TacticalCard, GameCard, ArmyList, Faction } from './types';
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
  classification: 'official_source_metadata_projection_rights_and_faq_refresh_pending',
  canonicalSourceOwner: 'server_source_localization_runtime',
  canonical: false,
  catalogueBodyAvailable: false,
  roomAuthority: false,
  rulesAuthority: false,
  automaticNetworkSync: false,
  sourceRefreshPolicy: 'explicit_user_command_only',
  legacyFallbackAllowed: false,
  trainingTruth: false,
} as const);

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
  officialCatalogueAvailable: false;
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

  const unavailableArmyMutation = useCallback(async () => {
    throw Object.assign(
      new Error('Official catalogue body is unavailable pending rights release'),
      { code: 'OFFICIAL_CATALOGUE_BODY_UNAVAILABLE' },
    );
  }, []);

  const emptyUnits = useMemo<UnitCard[]>(() => [], []);
  const emptyCards = useMemo<TacticalCard[]>(() => [], []);
  const emptyGameCards = useMemo<GameCard[]>(() => [], []);
  const emptyArmies = useMemo<ArmyList[]>(() => [], []);
  const dataVersion = Number(source?.source.dataVersions.unitsVersion || 0);

  const emptyByFaction = useCallback(() => [], []);

  return (
    <DataContext.Provider value={{
      units: emptyUnits,
      cards: emptyCards,
      gameCards: emptyGameCards,
      armyLists: emptyArmies,
      dataVersion,
      dataClassification: OFFICIAL_DATA_CLASSIFICATION,
      officialCatalogueAvailable: false,
      officialSourceMetadataVerified: source !== null,
      migration,
      isLoading,
      reloadLocal,
      scanLegacyData,
      confirmLegacyMigration,
      saveArmy: unavailableArmyMutation,
      deleteArmy: unavailableArmyMutation,
      getUnitsByFaction: emptyByFaction,
      getCardsByFaction: emptyByFaction,
      getFactionCards: emptyByFaction,
      getTacticalCards: emptyByFaction,
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
