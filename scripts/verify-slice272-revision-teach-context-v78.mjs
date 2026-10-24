// Concrete A/B HTTP400: the revision consumer injected the complete 10–12MB
// Teach archive. Exercise that actual consumer with saved plans and a local
// Provider double; no real model, new Room, action or stored Plan mutation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { rosterPublicClaimTextEntriesV1, rosterPublicClaimSectionV1 } from '../packages/roster-strategist/roster-public-claim-paths-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';

const base = process.argv[2];
const config = JSON.parse(await fs.readFile(base + '/common-v77-plan-repair-config.private.json', 'utf8'));
const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
const builder = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) });
const laboratory = createPregameSceneLaboratoryV1({ sourceState: state, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
    enumerate() { throw Error('archive lookup never enumerates actions'); },
    instantiate() { throw Error('no action'); }, apply() { throw Error('no mutation'); } } });
for (const row of config.rows) {
  const filename = `${row.dataDirectory}/drafts/${row.sessionId}.json`;
  const before = await fs.readFile(filename, 'utf8');
  const draft = JSON.parse(before), plan = JSON.parse(draft.planSerialized);
  const experience = draft.teachFramework.state;
  const oldBytes = Buffer.byteLength(JSON.stringify(experience));
  const paths = row.targetedClaimPaths;
  const claims = new Map(rosterPublicClaimTextEntriesV1(plan));
  // The revision consumer never selects Skills or a roster. Its constructor
  // descriptor dependency is stubbed, while the actual frozen Builder, lab,
  // source facts, immutable roster/schedule and complete Teach archive are real.
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
    strategyPack: { foundational: { entries: Array.from({ length: 5 }, () => ({})) },
      receipt: { hash: 'b'.repeat(64) } },
    selectionUnitRules: draft.teachFramework.context.sourceFacts.selectionUnitRules });
  let calls = 0, promptBytes;
  const output = await strategist.reviseRosterPlan({ plan,
    ...(draft.lockedRoster ? { baselinePlan: draft.lockedRoster.baselinePlan } : {}),
    armyAudit: draft.lockedRoster?.lock.verdict.audit || draft.working.verdict.audit,
    missionProfile: laboratory.missionScoringAuthority().missionScoringProfile,
    toolReceipts: draft.toolReceipts, teachFrameworkExperience: experience,
    reasonText: 'Concrete revision-context regression, local Provider double only.',
    revisionPurpose: 'user_requested_claim_revision_v1', targetedClaimPaths: paths,
    triggerIds: [], revisedSectionKeys: [...new Set(paths.map(p => rosterPublicClaimSectionV1(plan, p)))],
  }, { deliberation: {
    descriptor: () => ({ modelVersion: 'zero_provider_v78', promptVersion: 'v78_repro' }),
    async deliberate(request) {
      calls++;
      const node = request.promptNodes.find(n => n.nodeType === 'teach-framework-experience');
      assert(node, 'the real revision prompt must still carry Teach');
      promptBytes = Buffer.byteLength(JSON.stringify(request));
      console.log(JSON.stringify({ arm: row.arm, call: calls, oldTeachBytes: oldBytes, promptBytes }));
      assert(promptBytes < oldBytes / 4, 'revision must not inject the entire retained Teach archive');
      assert(promptBytes < 1_000_000, 'captured A/B revision fits the measured compact packet, not a global token limit');
      assert.deepEqual(node.content.experience.synthesis, experience.synthesis, 'current tradeoffs/proposals/uncertainty preserved verbatim');
      assert.deepEqual(node.content.experience.agenda, experience.agenda, 'all questions and hypotheses preserved');
      assert.deepEqual(node.content.experience.framework, experience.framework, 'no reduced Teach method');
      let answer;
      if (calls === 1) {
        assert(request.responseFormat.schema.properties.evidenceRequests, 'raw evidence must actually be queryable');
        answer = { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1', roundKind: 'revision', repairs: [],
          evidenceRequests: [
            { receiptHash: node.content.experience.archiveReference.receiptHash, path: 'synthesis.answers.0.tradeoff' },
            { receiptHash: 'f'.repeat(64), path: 'missing' },
          ] };
      } else {
        assert.equal(calls, 2, 'one retained lookup then coordinated revision');
        const results = request.promptNodes.find(n => n.nodeType === 'revision-retained-evidence').content.results;
        assert.equal(results[0].result.value, experience.synthesis.answers[0].tradeoff);
        assert.equal(results[0].status, 'read');
        assert.equal(results[1].status, 'unknown');
        assert.equal(results[1].code, 'ROSTER_TEACH_RETAINED_EVIDENCE_UNKNOWN');
        answer = { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1', roundKind: 'revision',
          evidenceRequests: [], repairs: paths.map((claimPath, i) => ({ claimPath,
            replacementText: claims.get(claimPath) + (i === 0 ? '\nLocal verification fixture only.' : '') })) };
      }
      assert(validate(request.responseFormat.schema, answer).ok, 'actual declared Provider schema admits lookup/final shape');
      return { output: answer, receipt: { paidProviderCall: false } };
    },
  } });
  assert.equal(calls, 2);
  assert.equal(output.plan.rosterCandidate.candidateHash, plan.rosterCandidate.candidateHash);
  assert.deepEqual(output.plan.openingDeploymentSchedule, plan.openingDeploymentSchedule);
  assert.deepEqual(output.plan.scoreRoute.targetVpSchedule, plan.scoreRoute.targetVpSchedule);
  assert.deepEqual(output.plan.componentPurposes, plan.componentPurposes);
  assert.equal(output.teachEvidenceDelivery.lookupResults.length, 2);
  assert.equal(output.teachEvidenceDelivery.archiveReference, hash(experience));
  assert.equal(await fs.readFile(filename, 'utf8'), before, 'original drafts unchanged');
  console.log(JSON.stringify({ arm: row.arm, status: 'PASS', promptBytes, providerCalls: 0,
    namedPaths: paths.length, currentQuestionsAndSynthesisPreserved: true,
    actualRetainedLookup: true, unknownNotInvented: true, rosterAndScheduleUnchanged: true }));
}
assert(laboratory.proveMutationZero().sourceStateHashUnchanged);
