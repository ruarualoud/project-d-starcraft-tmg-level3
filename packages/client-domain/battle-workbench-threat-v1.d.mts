export const STARCRAFT_TMG_THREAT_WORKBENCH_VERSION:
  "starcraft_tmg_threat_workbench_v1";
export function projectStarcraftTmgThreatWorkbenchV1(input?: Readonly<{
  roomProjection?: Record<string, unknown>;
  units?: readonly Record<string, unknown>[];
  legalSpace?: Record<string, unknown> | null;
}>): Readonly<Record<string, any>>;
export function isStarcraftTmgThreatWorkbenchV1(
  value: unknown,
  expected?: Readonly<{
    roomId?: string;
    matchBindingHash?: string;
    stateRevision?: number;
    stateHash?: string;
  }>,
): boolean;
