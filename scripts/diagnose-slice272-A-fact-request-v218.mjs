// Pure prompt reconstruction from the saved A context and the current original
// ask-expression. No scenario restoration, Native work, real key or network.
import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { projectRosterTeachRetainedEvidenceV1, projectRosterTeachRolePromptV1,
  rosterTeachInvestigationContractV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { projectRosterTeachCapabilityGuideV1, projectRosterTeachDecisionScopeV1,
  rosterTeachInvestigationWindowV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
import { assessRosterTeachEvidenceReadinessV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 as profile } from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
const [base] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
const dest = base + '/common-v218r2-A-request-diagnostic.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { startedAt: new Date().toISOString(), providerCalls: 0, nativeCalls: 0, sourceWrites: 0,
  diagnosisNotAcceptanceGate: true, savedQueryContextMustMatchActualRequest: true };
let secure;
try {
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const row = cfg.rows.find(r => r.arm === 'A'), filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  const original = await fs.readFile(filename), originalHash = hash(original.toString()), draft = JSON.parse(original);
  const plan = JSON.parse(draft.planSerialized), state = draft.teachFramework.state;
  const failed = draft.providerDispatches.at(-1), originalContext = draft.teachFramework.context;
  const selected = draft.selectedCandidateInput || draft.working?.candidateInput || draft.lockedRoster?.lock?.candidateInput;
  const context = { ...originalContext, existingEvidence: projectRosterTeachRetainedEvidenceV1(originalContext.existingEvidence || []),
    selectedRosterReference: { candidateInput: structuredClone(selected), candidateInputHash: hash(selected),
      planHash: plan.planHash, mutationAuthority: false,
      purpose: 'Exact selected native Builder input for hypothetical comparisons. A comparison does not change the roster; rosterEditAuthority still controls any later revision.' } };
  const investigation = state.investigation, window = rosterTeachInvestigationWindowV1(state);
  const focusIds = window.questionIds, roundIndex = investigation.rounds.length;
  const archive = new Map(), historyHash = hash(investigation);
  archive.set(historyHash, investigation);
  const frameworkSource = await fs.readFile(new URL('../packages/roster-strategist/roster-teach-framework-v1.mjs', import.meta.url), 'utf8');
  const start = frameworkSource.indexOf('const output = await ask("teach_framework_investigate", [');
  const end = frameworkSource.indexOf(', value => {', start);
  if (start < 0 || end < 0) throw Error('SOURCE_ASK_EXPRESSION_NOT_FOUND');
  // Evaluate only the argument expression, with pure dependencies. This avoids
  // inventing a lookalike prompt or executing the surrounding investigation.
  const expression = frameworkSource.slice(start + 'const output = await '.length, end) + ')';
  const deps = { ask: (kind, nodes, instruction) => ({ kind, nodes, instruction }),
    state, investigation, window, roundIndex, focusIds, focus: new Set(focusIds), plan, context, historyHash,
    currentToolContext: () => originalContext.queryContext, preservePendingPrompt: false,
    toolGuide: projectRosterTeachCapabilityGuideV1(originalContext.queryContext, context, { includeToolCatalog: true }),
    projectRosterTeachDecisionScopeV1, assessRosterTeachEvidenceReadinessV1 };
  const args = Function(...Object.keys(deps), 'return ' + expression)(...Object.values(deps));
  const nodes = projectRosterTeachRolePromptV1(args.kind, args.nodes, archive, { factProbe: true });
  const contract = rosterTeachInvestigationContractV1(focusIds), contractRef = outputContractRefStarcraftTmgV1(contract);
  const contextHash = hash({ kind: args.kind, sourceHash: hash({ context: originalContext, plan }),
    promptNodes: nodes, instruction: args.instruction, currentInvestigationContract: contractRef });
  const request = { sessionId: draft.sessionId, roundKind: args.kind, roundIndex: 1,
    promptPack: 'roster_teach_fact_probe_v1', promptNodes: nodes, userMessage: args.instruction,
    responseContract: { allowedChannels: ['roster_strategy'], publicEvidenceOnly: true, rulesRemainSoleLegalityAuthority: true },
    responseFormat: { kind: 'provider_strict_json_schema', schemaName: contract.schemaName,
      outputContractRef: contractRef, schema: contract.providerSchema }, contextHash };
  let body;
  secure = await createRosterPlanningSecureDeliberationFactoryV1({ profile,
    readCredential: async () => ({ credentialBytes: Buffer.from('offline-noncredential') }),
    createWorker: () => ({ attachCredential: async () => ({ ok: true, workerRef: 'offline' }), close: async () => {},
      send: async input => { body = input.body; throw Object.assign(Error('OFFLINE_CAPTURE_NO_SEND'), {
        safeReceipt: { code: 'OFFLINE_CAPTURE_NO_SEND', requestDefinitelyNotSent: true, requestMayHaveBeenSent: false } }); } }),
  });
  const port = await secure.factory.createForRun({ sessionId: draft.sessionId, runKind: 'teach-framework', planHash: plan.planHash });
  await port.deliberate(request).catch(error => { if (!body) throw error; });
  const sameBody = hash(body) === failed.requestBodyHash, sameContext = contextHash === failed.contextHash;
  const bytes = v => Buffer.byteLength(JSON.stringify(v));
  Object.assign(report, { status: sameBody && sameContext ? 'exact_failed_request_reconstructed' : 'saved_context_projection_not_exact',
    sameBody, sameContext, requestId: failed.requestId, requestBodyHash: hash(body), originalRequestBodyHash: failed.requestBodyHash,
    contextHash, originalContextHash: failed.contextHash, requestBytes: bytes(body), inputBytes: Buffer.byteLength(body.input),
    schemaBytes: bytes(body.text.format.schema), maxOutputTokens: body.max_output_tokens,
    nodeBytes: nodes.map(n => ({ kind: n.kind, bytes: bytes(n) })).sort((a,b) => b.bytes-a.bytes),
    originalDraftUnchanged: hash((await fs.readFile(filename)).toString()) === originalHash,
    limitation: sameBody && sameContext ? null : 'Saved queryContext or reconstruction differs; sizes cannot be attributed to actual sent A input.' });
  await fs.writeFile(base + '/common-v218r2-A-captured-request.private.json.gz', gzipSync(JSON.stringify(body)), { flag: 'wx', mode: 0o600 });
} catch (error) { report.status = 'diagnostic_stopped'; report.failure = error.message.slice(0,1200); process.exitCode = 1; }
finally { await secure?.close(); }
report.finishedAt = new Date().toISOString(); await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
