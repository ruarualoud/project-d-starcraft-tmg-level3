import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';

// Output format does not identify the prompt used to produce it. A new
// source-reconstruction can still return legacy-shaped JSON. Resolve its first
// execution through the sealed recipe chain instead of guessing from output.
export async function resolveFactionPromptLineageV1({ steps, parentRunId, readRecipe, checkpointInventory = null }) {
  if (!Array.isArray(steps) || typeof readRecipe !== 'function') fail('FACTION_PROMPT_LINEAGE_INPUT_INVALID');
  const cache = new Map();
  async function recipeFor(runId, expectedHash = null) {
    if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId)) fail('FACTION_PROMPT_LINEAGE_RUN_INVALID');
    if (!cache.has(runId)) cache.set(runId, verifySeal(await readRecipe(runId)));
    const recipe = cache.get(runId);
    if (expectedHash && recipe.hash !== expectedHash) fail('FACTION_PROMPT_LINEAGE_RECIPE_DRIFT');
    return recipe;
  }
  const rows = [];
  for (const step of steps) {
    if (!step.artifact?.roleId) continue;
    const seen = new Set(); let runId = parentRunId, expectedHash = null;
    const locate = proof => {
      if (!proof) return null;
      verifySeal(proof);
      const p = proof.reusable.find(r => r.id === step.id && r.inputHash === step.inputHash);
      if (!p) return null;
      if (p.artifactHash !== hash(step.artifact) || !proof.ancestors.some(a =>
        a.runId === p.checkpointOwnerRunId && a.recipeHash === p.checkpointOwnerRecipeHash))
        fail('FACTION_PROMPT_LINEAGE_INVENTORY_DRIFT');
      return p;
    };
    const initial = locate(checkpointInventory);
    let ownership = initial;
    if (initial) { runId = initial.checkpointOwnerRunId; expectedHash = initial.checkpointOwnerRecipeHash; }
    for (;;) {
      if (seen.has(runId) || seen.size >= 256) fail('FACTION_PROMPT_LINEAGE_CYCLE');
      seen.add(runId);
      const recipe = await recipeFor(runId, expectedHash);
      const inherited = recipe.continuation?.reusable?.find(row => row.id === step.id);
      if (inherited?.inputHash === step.inputHash) {
        verifySeal(recipe.continuation);
        if (inherited.artifactHash !== hash(step.artifact)) {
          // A continuation may deliberately bypass an inherited checkpoint
          // (for example, when volatile recovery evidence is quarantined) and
          // materialize the same exact-input role again. Only the authenticated
          // checkpoint inventory can prove that the replacement belongs to
          // this run; without that owner proof the difference remains drift.
          if (ownership?.checkpointOwnerRunId !== runId
            || ownership.checkpointOwnerRecipeHash !== recipe.hash
            || ownership.artifactHash !== hash(step.artifact)) {
            fail('FACTION_PROMPT_LINEAGE_STEP_DRIFT');
          }
        } else {
          const origin = locate(recipe.continuation.checkpointInventory);
          ownership = origin;
          expectedHash = origin?.checkpointOwnerRecipeHash || recipe.continuation.parentRecipeHash;
          runId = origin?.checkpointOwnerRunId || recipe.continuation.parentRunId;
          continue;
        }
      }
      const structured = step.artifact.structuredDecodePassed === true || step.artifact.structuredImportHash !== undefined;
      rows.push({ roleId: step.id, inputHash: step.inputHash, artifactHash: hash(step.artifact),
        originRunId: runId, originRecipeHash: recipe.hash,
        promptProtocol: structured ? 'structured' : recipe.structuredGenerationBinding ? 'current_json_prompt_v1' : 'legacy_json_prompt_v1' });
      break;
    }
  }
  return seal({ version: 'faction_prompt_lineage_v1', parentRunId, rows,
    sourceOfTruth: 'sealed_first_execution_recipe_not_output_shape', providerCalls: 0, trainingTruth: false });
}
