import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function readJson(filename) {
  return JSON.parse(readFileSync(filename, "utf8"));
}

function invalid() {
  throw new Error("SLICE248_VERSIONED_FORK_COST_ANCESTRY_MISSING");
}

// Reporting ancestry only. Each versioned branch contributes its own paid
// calls; the oldest branch freezes the root-Room cost at its fork. No branch
// may borrow another experiment's baseline or reset actual Provider usage.
export function resolveTicket23VersionedCostAncestryV1({ targetDirectory,
  targetRoomId, sourceRoomId, rooms }) {
  let directory = path.resolve(targetDirectory);
  let expectedTargetRoomId = targetRoomId;
  let inheritedCostCny = 0;
  for (let depth = 0; depth < 8; depth += 1) {
    const fork = readJson(path.join(directory, "fork-private.json"));
    const receipt = readJson(path.join(directory, "fork-receipt.json"));
    if (fork.targetRoomId !== expectedTargetRoomId
      || receipt.targetRoomId !== fork.targetRoomId
      || receipt.sourceRoomId !== fork.sourceRoomId
      || (depth === 0 && fork.sourceRoomId !== sourceRoomId)) invalid();
    const sourceDirectory = path.resolve(fork.sourceDirectory || "");
    const sourceProgress = readJson(path.join(sourceDirectory,
      "progress.json"));
    if (!Number.isFinite(sourceProgress.estimatedCostCny)
      || sourceProgress.estimatedCostCny < 0) invalid();
    const sourceIsFork = existsSync(path.join(sourceDirectory,
      "fork-private.json"));
    if (sourceIsFork) {
      const sourceReceipt = readJson(path.join(sourceDirectory,
        "fork-receipt.json"));
      if (sourceReceipt.targetRoomId !== fork.sourceRoomId) invalid();
      inheritedCostCny += sourceProgress.estimatedCostCny;
      directory = sourceDirectory;
      expectedTargetRoomId = fork.sourceRoomId;
      continue;
    }
    const rootPrivate = readJson(path.join(sourceDirectory,
      "runner-private.json"));
    const roomWindow = Object.values(rooms || {}).find((room) =>
      room?.roomId === fork.sourceRoomId) || null;
    // A notification baseline is optional. The retained paid lineage is not.
    if (rootPrivate.roomId !== fork.sourceRoomId) invalid();
    const currentProgressFile = path.join(directory, "progress.json");
    const frozenRootCost = existsSync(currentProgressFile)
      ? readJson(currentProgressFile).sourceCostAtVersionedForkCny
      : null;
    const recoveryFrozenCost = ((receipt.schemaVersion
      === "ticket23_slice248_legal_prefix_recovery_v1"
      && receipt.recoveryKind === "named_active_once_per_round_v8"
      && receipt.sourceCurrentStateRevision > receipt.sourceStateRevision)
      || (receipt.schemaVersion === "ticket23_slice248_singleton_identity_recovery_v1"
        && receipt.recoveryKind === "singleton_summon_identity_v6"
        && receipt.sourceCurrentStateRevision === receipt.sourceStateRevision))
      && receipt.frozenSourceEstimatedCostCny === sourceProgress.estimatedCostCny
      ? receipt.frozenSourceEstimatedCostCny : null;
    // A correction returns the board to an earlier legal revision, NOT the
    // paid ledger. Retain fees for the excluded suffix as well as its prefix.
    const rootCost = Number.isFinite(recoveryFrozenCost)
      ? recoveryFrozenCost : Number.isFinite(frozenRootCost) && frozenRootCost > 0
      ? frozenRootCost
      : roomWindow?.lastObserved?.revision === receipt.sourceStateRevision
        ? roomWindow.lastObserved?.estimatedCostCny : null;
    if (!Number.isFinite(rootCost) || rootCost < 0
      || rootCost < (roomWindow?.baselineEstimatedCostCny ?? 0)) invalid();
    inheritedCostCny += rootCost;
    return { roomWindow, inheritedCostCny,
      branchDepth: depth + 1, rootRoomId: fork.sourceRoomId };
  }
  invalid();
}
