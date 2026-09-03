export type StarcraftTmgWorkbenchCoverageV1 =
  | "exact" | "partial" | "unknown" | "quarantined" | "not_loaded";

export interface StarcraftTmgBattleWorkbenchSnapshotV1 {
  schemaVersion: "starcraft_tmg_battle_workbench_snapshot_v1";
  roomId: string | null;
  matchBindingHash: string | null;
  stateRevision: number | null;
  stateHash: string | null;
  viewerSideKey: string | null;
  generatedFrom: "viewer_scoped_authoritative_projection";
  scenario: Record<string, any>;
  units: ReadonlyArray<Record<string, any>>;
  deployment: {
    battlefield: readonly string[];
    reserve: readonly string[];
    undeployed: readonly string[];
    destroyed: readonly string[];
  };
  scoreboard: ReadonlyArray<Record<string, any>>;
  threat: Record<string, any>;
  probability: Record<string, any>;
  tokenMarkerActions: Record<string, any>;
  scoreForecast: Record<string, any>;
  rulesQuickView: Record<string, any>;
  coverage: Record<string, { status: StarcraftTmgWorkbenchCoverageV1; evidence: readonly string[] }>;
  authority: {
    readOnly: true;
    clientMutationAllowed: false;
    legalSpaceHash: string | null;
    rulesRuntimeBinding: Record<string, any> | null;
  };
  eligibleForTraining: false;
  trainingTruth: false;
  snapshotHash: string;
}

export const STARCRAFT_TMG_BATTLE_WORKBENCH_VERSION:
  "starcraft_tmg_battle_workbench_snapshot_v1";
export function projectStarcraftTmgBattleWorkbenchV1(input?: Record<string, any>):
  Readonly<StarcraftTmgBattleWorkbenchSnapshotV1>;
export function isStarcraftTmgBattleWorkbenchSnapshotV1(
  value: unknown,
  expected?: Record<string, any>,
): value is StarcraftTmgBattleWorkbenchSnapshotV1;
