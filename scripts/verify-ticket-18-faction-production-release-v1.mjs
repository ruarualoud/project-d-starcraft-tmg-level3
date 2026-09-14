import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal, verifySeal, fail } from
  '../packages/skill-production/common.mjs';
import { FACTION_PRODUCTION_RELEASE_V1,
  createFactionProductionReleaseManifestV1 } from
  '../packages/skill-production-v3/faction-production-release-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async file => verifySeal(JSON.parse(await readFile(
  path.join(root, file), 'utf8')));
const runId = 'faction-v1-6fb3850f59642566130f';
const recipe = await read('build/ticket-18-faction-production-v1/'
  + runId + '/recipe.json');
const general = await read(
  'build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/general-strategy-final-v1/final-general-skill.json');
const terran = await read('build/ticket-18-faction-production-v1/'
  + runId + '/terran_armed_forces-candidate.json');
const { hash: ignored, ...recipeBody } = recipe;

// Concrete regression: implementation/readiness evidence changed after a
// compatible provider model-alias repair. That must not invalidate paid Skills.
const patchCompatible = seal({
  ...recipeBody,
  fieldValueReadinessHash: '0'.repeat(64),
  codeHashes: recipe.codeHashes.map((row, index) => index
    ? row : { ...row, hash: '1'.repeat(64) }),
});
const manifest = createFactionProductionReleaseManifestV1({
  runId,
  recipe,
  currentRecipe: patchCompatible,
  existingSkills: [general, terran],
  checkpointSummary: { complete: 1069, pending: 2 },
});
if (manifest.compatibility !== 'compatible_patch'
  || manifest.existingSkills.length !== 2
  || manifest.existingSkills.some(row => !row.originalContentHashPreserved)
  || manifest.existingSkills[0].artifactHash !== general.hash
  || manifest.existingSkills[1].artifactHash !== terran.hash) {
  fail('FACTION_PRODUCTION_RELEASE_PATCH_REGRESSION');
}

let criticalDriftBlocked = false;
try {
  createFactionProductionReleaseManifestV1({
    runId,
    recipe,
    currentRecipe: seal({ ...recipeBody,
      sourceBinding: { ...recipe.sourceBinding, faq: '2'.repeat(64) } }),
    existingSkills: [general, terran],
  });
} catch (error) {
  criticalDriftBlocked = error.code
    === 'FACTION_PRODUCTION_RELEASE_CRITICAL_DRIFT';
}
if (!criticalDriftBlocked) fail('FACTION_PRODUCTION_RELEASE_CRITICAL_GATE_MISSING');

const result = seal({
  version: 'ticket_18_faction_production_release_readiness_v1',
  releaseBindingHash: FACTION_PRODUCTION_RELEASE_V1.hash,
  releaseManifestHash: manifest.hash,
  compatibleCodeAndReadinessDriftPassed: true,
  sourceDriftBlocked: true,
  existingGeneralSkillAdapted: true,
  existingTerranSkillAdapted: true,
  existingContentHashesPreserved: true,
  providerCalls: 0,
  passed: true,
  trainingTruth: false,
});
const out = path.join(root, 'build/ticket-18-faction-production-v1');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'stable-production-release-readiness-v1.json'),
  JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));

