import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { withCheckpointContinuation } from '../skill-production/continuation.mjs';
import { auditProductionExecutionRowsV1 } from '../skill-production/execution-policy-v1.mjs';

export const FACTION_CHECKPOINT_INVENTORY_BINDING_V1 = seal({
  version: 'faction_checkpoint_inventory_v1',
  scope: 'complete_raw_roles_from_authenticated_ancestor_chain',
  skippedLaneResultsRemainAddressable: true, restoreWindowMustBeExplicit: true,
  supersededProvisionalResultsAndCostsPreserved: true, attemptsCopied: false,
  latestEligibleRoleWins: true, exactInputRequiredAtConsumption: true,
  sourceRefreshPerformed: false, semanticAcceptanceInherited: false, trainingTruth: false,
});
const binding = FACTION_CHECKPOINT_INVENTORY_BINDING_V1;
const invalid = code => fail('FACTION_CHECKPOINT_INVENTORY_' + code);
const decode = raw => verifySeal(JSON.parse(raw)).value;
const readManifest = id => verifySeal(JSON.parse(readFileSync(new URL(
  '../../build/ticket-18-faction-production-v1/' + id + '/recipe.json', import.meta.url), 'utf8')));

// A missing materialized row does not mean the paid result disappeared. The
// inventory spans the real sealed chain, without copying attempts or editing
// any ancestor. Explicit restoration windows quarantine only named accidental
// provisional restarts; descendants after that window remain eligible.
export function readFactionCheckpointInventoryV1({ filename, parentRunId, parentRecipe,
  lanePrefixes, restorationWindows = [], readRecipe = readManifest }) {
  verifySeal(parentRecipe);
  if (!Array.isArray(lanePrefixes) || !lanePrefixes.length
    || new Set(lanePrefixes).size !== lanePrefixes.length
    || lanePrefixes.some(p => !/^faction\.[a-z0-9_]+\.$/u.test(p))) invalid('LANE_SCOPE');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const chain = [];
    let id = parentRunId, recipe = parentRecipe;
    while (recipe) {
      verifySeal(recipe);
      const actual = db.prepare('SELECT recipe FROM runs WHERE id=?').get(id);
      if (id !== 'faction-v1-' + recipe.hash.slice(0, 20) || chain.some(r => r.id === id)
        || chain.length >= 256 || actual && actual.recipe !== recipe.hash
        || !actual && (!recipe.continuation || db.prepare('SELECT count(*) n FROM steps WHERE run=?').get(id).n
          || db.prepare('SELECT count(*) n FROM attempts WHERE run=?').get(id).n)
        || ['inputHashes', 'contextHash', 'sourceBinding', 'modelHash', 'dshBindingHash']
          .some(k => hash(recipe[k]) !== hash(parentRecipe[k]))) invalid('ANCESTRY_DRIFT');
      if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(id).n
        || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(id).n)
        invalid('ANCESTOR_NOT_TERMINAL');
      const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete' AND json_type(artifact,'$.value.roleId')='text'")
        .all(id).map(r => ({ id: r.id, inputHash: r.input_hash, artifact: decode(r.artifact),
          checkpointOwnerRunId: id, checkpointOwnerRecipeHash: recipe.hash }))
        .filter(r => r.artifact.roleId === r.id && Array.isArray(r.artifact.loop?.transcript)
          && r.artifact.loop.transcript.length && lanePrefixes.some(p => r.id.startsWith(p)));
      rows.forEach(r => verifySeal(r.artifact));
      chain.push({ id, recipe, rows });
      if (!recipe.continuation) break;
      const link = verifySeal(recipe.continuation);
      id = link.parentRunId; recipe = verifySeal(readRecipe(id));
      if (recipe.hash !== link.parentRecipeHash) invalid('ANCESTRY_LINK_DRIFT');
    }
    const windows = restorationWindows.map(w => {
      const first = chain.findIndex(r => r.id === w.throughRunId), last = chain.findIndex(r => r.id === w.restoreFromRunId);
      if (!lanePrefixes.includes(w.lanePrefix) || first < 0 || last <= first
        || !Array.isArray(w.supersededProvisionalRoles) || w.reason !== 'restore_skipped_lane_checkpoint') invalid('RESTORE_WINDOW');
      const lost = chain.slice(first, last).flatMap(r => r.rows.filter(s => s.id.startsWith(w.lanePrefix)));
      const actual = lost.map(r => ({ runId: r.checkpointOwnerRunId, id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) }));
      if (hash(actual) !== hash(w.supersededProvisionalRoles)) invalid('SUPERSEDED_SCOPE_DRIFT');
      // Every retired provisional role must replace the exact same input of
      // an existing earlier role. Missing or changed tasks are not discardable.
      for (const row of lost) if (!chain[last].rows.some(old => old.id === row.id && old.inputHash === row.inputHash))
        invalid('NOT_A_REDUNDANT_RESTART');
      return { ...w, first, last };
    });
    if (new Set(windows.map(w => w.lanePrefix)).size !== windows.length) invalid('OVERLAPPING_RESTORE_WINDOWS');
    const selected = new Map();
    for (let index = chain.length - 1; index >= 0; index--) for (const row of chain[index].rows) {
      if (windows.some(w => row.id.startsWith(w.lanePrefix) && index >= w.first && index < w.last)) continue;
      selected.set(row.id, row);
    }
    const steps = [...selected.values()].sort((a, b) => a.id.localeCompare(b.id));
    const proof = seal({ version: binding.version, bindingHash: binding.hash, parentRunId,
      parentRecipeHash: parentRecipe.hash, lanePrefixes, restorationWindows,
      ancestors: chain.map(r => ({ runId: r.id, recipeHash: r.recipe.hash })),
      reusable: steps.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact),
        checkpointOwnerRunId: r.checkpointOwnerRunId, checkpointOwnerRecipeHash: r.checkpointOwnerRecipeHash })),
      attemptsCopied: 0, accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false });
    return { steps, proof };
  } finally { db.close(); }
}

export function verifyFactionCheckpointInventoryV1({ proof, readAuthenticated }) {
  verifySeal(proof);
  const rebuilt = readAuthenticated();
  if (proof.bindingHash !== binding.hash || rebuilt.proof.hash !== proof.hash) invalid('PROOF_DRIFT');
  return rebuilt;
}

export function withFactionCheckpointInventoryV1(store, continuation) {
  const proof = continuation.manifest.checkpointInventory;
  if (!proof) return withCheckpointContinuation(store, continuation);
  verifySeal(proof);
  if (proof.bindingHash !== binding.hash || proof.parentRunId !== continuation.manifest.parentRunId
    || proof.parentRecipeHash !== continuation.manifest.parentRecipeHash) invalid('CONTINUATION_DRIFT');
  const rows = new Map(continuation.steps.map(r => [r.id, r]));
  const permits = new Map(proof.reusable.map(r => [r.id, r]));
  const direct = withCheckpointContinuation(store, { ...continuation,
    steps: continuation.steps.filter(r => !permits.has(r.id)) });
  return Object.freeze({ ...direct, acquire(id, input, ttl) {
    const permit = permits.get(id);
    if (!permit) return direct.acquire(id, input, ttl);
    const lease = store.acquire(id, input, ttl);
    if (lease.cached || hash(input) !== permit.inputHash) return lease;
    const row = rows.get(id), scope = continuation.manifest.reusable.find(r => r.id === id);
    if (!row || row.inputHash !== permit.inputHash || hash(row.artifact) !== permit.artifactHash
      || scope?.inputHash !== permit.inputHash || scope?.artifactHash !== permit.artifactHash) {
      store.release(lease); invalid('ARTIFACT_DRIFT');
    }
    const receipt = store.acquire('inherited.' + id, { manifestHash: continuation.manifest.hash, id });
    if (!receipt.cached) store.finish(receipt, { parentRunId: proof.parentRunId,
      parentRecipeHash: proof.parentRecipeHash, checkpointOwnerRunId: permit.checkpointOwnerRunId,
      checkpointOwnerRecipeHash: permit.checkpointOwnerRecipeHash, inventoryHash: proof.hash,
      inputHash: permit.inputHash, artifactHash: permit.artifactHash, newPhysicalCalls: 0 });
    return { cached: true, artifact: store.finish(lease, row.artifact) };
  } });
}

export function auditFactionCheckpointExecutionRowsV1({ recipe, rows, readInheritedRow, readInventory }) {
  const proof = recipe.continuation?.checkpointInventory;
  if (!proof) return auditProductionExecutionRowsV1({ recipe, rows, readInheritedRow });
  if (recipe.checkpointInventoryBinding?.hash !== binding.hash || typeof readInventory !== 'function')
    invalid('AUDIT_BINDING_REQUIRED');
  verifyFactionCheckpointInventoryV1({ proof, readAuthenticated: readInventory });
  const remaining = [], permits = new Map(proof.reusable.map(r => [r.id, r]));
  let inheritedRows = 0;
  for (const row of rows) {
    const p = permits.get(row.id), scope = recipe.continuation.reusable.find(r => r.id === row.id);
    if (!p || row.inputHash !== p.inputHash || hash(row.artifact) !== p.artifactHash) { remaining.push(row); continue; }
    const original = readInheritedRow(p.checkpointOwnerRunId, row.id);
    if (scope?.inputHash !== p.inputHash || scope?.artifactHash !== p.artifactHash
      || original?.inputHash !== p.inputHash || hash(original.artifact) !== p.artifactHash) invalid('AUDIT_ORIGIN_DRIFT');
    inheritedRows++;
  }
  const result = auditProductionExecutionRowsV1({ recipe, rows: remaining, readInheritedRow });
  return { ...result, inheritedRows: result.inheritedRows + inheritedRows };
}
