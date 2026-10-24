// Actual A request84 was sent via fact-probe. Old unrelated correction rows
// must not switch its restart to the legacy investigator prompt.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { preserveRosterTeachPendingInvestigationPromptV1 as preserve } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const base = process.argv[2];
const session = JSON.parse(await fs.readFile(base + '/A/fresh-generation-v249/workspace/drafts/rws-8d1ff678-3b59-40d7-b282-4c38d4eafa46.json', 'utf8'));
const request = JSON.parse(gunzipSync(await fs.readFile(base + '/A/fresh-generation-v249/request-084.private.json.gz')));
const state = session.teachFramework.state;
const scope = { completedBeforeRun: false, roundIndex: state.investigation.rounds.length,
  initialRoundCount: state.investigation.rounds.length };
assert.equal(request.promptPack, 'roster_teach_fact_probe_v1');
assert.equal(preserve(state, scope), false, 'Actual sent fact-probe request must not resume through legacy pending corrections');
const exact = structuredClone(state);
exact.investigationPromptRoutes = [{ roundIndex: scope.roundIndex, route: 'retained_pending_investigation' }];
assert.equal(preserve(exact, scope), true, 'An explicit saved route outranks inference');
console.log(JSON.stringify({ status: 'pass', source: 'actual_A_request84', originalFactProbePreserved: true, explicitSavedRoutePreserved: true, providerCalls: 0 }));
