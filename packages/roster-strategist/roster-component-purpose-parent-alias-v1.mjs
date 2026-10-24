import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_COMPONENT_PURPOSE_PARENT_ALIAS_V1 =
  "starcraft_tmg_roster_component_purpose_parent_alias_v1";

// A model may use the owning Unit's instance ID in a composition/upgrade
// recordKey field. Correct only that exact, unambiguous alias against the
// Rules-locked selected roster. The prose, instance IDs, roster and all
// unrelated references remain unchanged; the full purpose validator follows.
// Faction/tactical-card instance IDs are also Host-owned metadata. Bind a
// mismatched opaque echo only when kind+record selects exactly one roster
// component and the supplied ID does not name another actual component.
export function normalizeRosterComponentPurposeParentAliasV1({ output,
  selected } = {}) {
  if (!output || !Array.isArray(output.componentPurposes)
    || !Array.isArray(selected?.proposal?.units)) {
    return { output, receipt: null };
  }
  const units = new Map(selected.proposal.units.map((unit) =>
    [unit.unitInstanceId, unit]));
  const side = selected.proposal.sideKeySafe;
  const factionRecordKey = selected.candidate?.factionRecordKey;
  const cardTargets = [
    ...(side && factionRecordKey ? [{ componentKind: 'faction_card',
      recordKey: factionRecordKey, instanceId: `${side}-faction` }] : []),
    ...(selected.proposal.tacticalCardRecordKeys || []).map((recordKey, index) => ({
      componentKind: 'tactical_card', recordKey, instanceId: `${side}-tactical-${index + 1}` })),
  ];
  const knownInstanceIds = new Set([...cardTargets.map(row => row.instanceId),
    ...selected.proposal.units.flatMap(unit => [unit.unitInstanceId,
      `${unit.unitInstanceId}-composition`, ...(unit.upgrades || []).map((_, index) =>
        `${unit.unitInstanceId}-upgrade-${index + 1}`)])]);
  const moves = [];
  const purposes = output.componentPurposes.map((purpose, index) => {
    if (['faction_card', 'tactical_card'].includes(purpose?.componentKind)) {
      const matches = cardTargets.filter(target => target.componentKind === purpose.componentKind
        && target.recordKey === purpose.recordKey);
      if (matches.length !== 1 || knownInstanceIds.has(purpose.instanceId)) return purpose;
      moves.push({ index, componentKind: purpose.componentKind, recordKey: purpose.recordKey,
        fromInstanceId: purpose.instanceId, toInstanceId: matches[0].instanceId,
        authority: 'selected_roster_unique_component_identity', strategicTextChanged: false });
      return { ...purpose, instanceId: matches[0].instanceId };
    }
    if (purpose?.componentKind !== "composition"
      && purpose?.componentKind !== "upgrade") return purpose;
    const match = purpose.componentKind === "composition"
      ? /^(.+)-composition$/u.exec(purpose.instanceId || "")
      : /^(.+)-upgrade-(\d+)$/u.exec(purpose.instanceId || "");
    const unit = match ? units.get(match[1]) : null;
    const upgradeIndex = purpose.componentKind === "upgrade"
      ? Number(match?.[2]) - 1 : null;
    if (!unit || purpose.recordKey !== unit.unitInstanceId
      || typeof unit.recordKey !== "string" || !unit.recordKey
      || (upgradeIndex !== null && (!Number.isSafeInteger(upgradeIndex)
        || upgradeIndex < 0 || upgradeIndex >= unit.upgrades.length))) {
      return purpose;
    }
    moves.push({ index, componentKind: purpose.componentKind,
      instanceId: purpose.instanceId, parentUnitId: unit.unitInstanceId,
      fromRecordKey: purpose.recordKey, toRecordKey: unit.recordKey });
    return { ...purpose, recordKey: unit.recordKey };
  });
  if (moves.length === 0) return { output, receipt: null };
  const normalized = { ...output, componentPurposes: purposes };
  const body = {
    schema: ROSTER_COMPONENT_PURPOSE_PARENT_ALIAS_V1,
    originalOutputHash: hashStarcraftTmgContract(output),
    normalizedOutputHash: hashStarcraftTmgContract(normalized),
    selectedCandidateHash: selected.candidate.candidateHash,
    moves, contentSynthesized: false, rulesAuthority: false,
    trainingTruth: false,
  };
  return { output: normalized, receipt: { ...body,
    receiptHash: hashStarcraftTmgContract(body) } };
}
