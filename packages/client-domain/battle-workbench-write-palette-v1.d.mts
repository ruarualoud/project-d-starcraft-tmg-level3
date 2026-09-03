export const STARCRAFT_TMG_WRITE_PALETTE_VERSION:
  "starcraft_tmg_battle_workbench_write_palette_v1";
export const STARCRAFT_TMG_CURRENT_RULE_GRAPH_INDEX_V1: Readonly<Record<string, any>>;
export function isDirectlyNamedTokenMarkerRuleAtomV1(atom: unknown): boolean;
export function classifyStarcraftTmgWriteSheetEntryV1(entry: unknown): Readonly<{
  writeFamilies: readonly string[];
  tokenMarker: Record<string, any> | null;
}>;
export function projectStarcraftTmgWritePaletteV1(input?: {
  legalSpace?: Record<string, any> | null;
}): Readonly<Record<string, any>>;
export function isStarcraftTmgWritePaletteV1(
  value: unknown,
  expected?: { roomId?: string; legalSpaceHash?: string },
): boolean;
