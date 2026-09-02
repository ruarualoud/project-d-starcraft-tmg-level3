export interface AsyncDeviceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface LegacyMigrationEntry {
  policyName: string;
  sourceKey: string;
  classification: string;
  plannedDisposition: string;
  present: boolean;
  rawValueHash: string | null;
  byteLength: number;
  parseStatus: string;
  itemCount: number | null;
  disposition: string;
  reason: string | null;
  originalBytesWillBeModified: false;
}

export interface LegacyMigrationScan {
  schemaVersion: "starcraft_tmg_device_data_migration_v1.scan";
  scannedAt: string;
  sourceKeyPolicy: "fixed_allowlist_only_no_get_all_keys";
  entries: LegacyMigrationEntry[];
  presentCount: number;
  eligibleCount: number;
  quarantinedCount: number;
  totalBytes: number;
  stage: "classified";
  requiresExplicitUserConfirmation: true;
  originalsPreserved: true;
  networkAllowed: false;
  roomAuthority: false;
  rulesAuthority: false;
  trainingTruth: false;
  scanHash: string;
}

export interface DeviceMigrationManifest {
  schemaVersion: "starcraft_tmg_device_data_migration_v1.manifest";
  scanHash: string;
  migratedAt: string;
  stage: "sanitized_imported";
  sourceBinding: Record<string, string>;
  recordKeys: Record<string, string>;
  recordHashes: Record<string, string>;
  counts: {
    preferencesImported: number;
    legacyUnitLabelMapsQuarantined: number;
    armyDraftsQuarantined: number;
    historyRecordsImportedReadOnly: number;
    diceEntriesImportedLocalOnly: number;
    sourcePayloadsQuarantined: number;
  };
  originalKeysModified: [];
  originalBytesPreserved: true;
  networkUsed: false;
  roomRestoreAttempted: false;
  providerCalled: false;
  skillGenerated: false;
  dshRun: false;
  muzeroDataGenerated: false;
  selfPlayRun: false;
  trainingTruth: false;
  manifestHash: string;
}

export interface LocalPreferencesRecord {
  schemaVersion: "starcraft_tmg_local_preferences_v1";
  language: "zh" | "en";
  unitLabelOverrides: Record<string, string>;
  unitLabelOverrideClassification: "user_local_unreviewed_label";
  legacyUnitLabelsImported: false;
  migrationScanHash: string | null;
  canAffectRules: false;
  trainingTruth: false;
  recordHash: string;
}

export interface ReadOnlyLegacyMatchRound {
  roundNumber: number;
  player1Damage: number;
  player2Damage: number;
  player1Score: number;
  player2Score: number;
  player1KillCount: number;
  player2KillCount: number;
}

export interface ReadOnlyLegacyMatchSummary {
  schemaVersion: "starcraft_tmg_read_only_legacy_match_summary_v1";
  migrationScanHash: string;
  recordHash: string;
  occurredAtMs: number;
  roundCount: number;
  rounds: ReadOnlyLegacyMatchRound[];
  player1TotalScore: number;
  player2TotalScore: number;
  winnerClass: "player1" | "player2" | "draw" | "unknown";
  timelineEventCount: number;
  excluded: {
    identityAndFreeText: true;
    mutableBattleState: true;
    remoteAuthorityClaims: true;
    capabilityMaterial: true;
  };
  readOnly: true;
  mayRestoreRoom: false;
  mayCreateReplay: false;
  muzeroEligible: false;
  trainingTruth: false;
  summaryHash: string;
}

export interface ReadOnlyLegacyHistory {
  schemaVersion: "starcraft_tmg_read_only_legacy_history_v1";
  migrationScanHash: string;
  records: ReadOnlyLegacyMatchSummary[];
  readOnly: true;
  mayRestoreRoom: false;
  mayCreateReplay: false;
  muzeroEligible: false;
  trainingTruth: false;
  recordHash: string;
}

export const STARCRAFT_TMG_DEVICE_DATA_MIGRATION_VERSION: string;
export const STARCRAFT_TMG_LEGACY_STORAGE_KEYS_V1: Readonly<Record<string, string>>;
export const STARCRAFT_TMG_DEVICE_STORAGE_KEYS_V1: Readonly<Record<string, string>>;
export function starcraftTmgDeviceMigrationGenerationKeyV1(
  scanHash: string,
  name: "legacyPreferences" | "armyDraftQuarantine" | "history" | "legacyDiceHistory" | "quarantine" | "staging",
): string;

export function scanLegacyStarcraftTmgDeviceDataV1(options: {
  storage: Pick<AsyncDeviceStorage, "getItem">;
  scannedAt?: string;
}): Promise<LegacyMigrationScan>;

export function confirmLegacyStarcraftTmgDeviceDataMigrationV1(options: {
  storage: AsyncDeviceStorage;
  scan: LegacyMigrationScan;
  confirmed: true;
  sourceProjection: Record<string, unknown>;
}): Promise<DeviceMigrationManifest>;

export function loadStarcraftTmgDeviceMigrationManifestV1(options: {
  storage: Pick<AsyncDeviceStorage, "getItem">;
}): Promise<DeviceMigrationManifest | null>;

export function readStarcraftTmgReadOnlyLegacyHistoryV1(options: {
  storage: Pick<AsyncDeviceStorage, "getItem">;
}): Promise<ReadOnlyLegacyHistory | null>;

export function readStarcraftTmgLocalPreferencesV1(options: {
  storage: Pick<AsyncDeviceStorage, "getItem">;
}): Promise<LocalPreferencesRecord | null>;

export function writeStarcraftTmgLocalPreferencesV1(options: {
  storage: Pick<AsyncDeviceStorage, "setItem">;
  language: "zh" | "en";
  unitLabelOverrides: Record<string, string>;
  migrationScanHash?: string | null;
}): Promise<LocalPreferencesRecord>;
