import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
  const pending = d.teachFramework.state.replyCorrections.findLast(r => r.correction?.code === 'ROSTER_TEACH_CANDIDATE_SCENE_MISMATCH');
  const paid = pending.correction.previousOutput;
  const kind = paid.roundKind;
  const unavailable = framework.rosterTeachRecoveryContractV1?.(kind, false) || framework.rosterTeachFrameworkContractV1(kind);
  assert.equal(validate(unavailable.providerSchema, paid).ok, false, 'An old candidate selection must not be a generatable action when no current candidate exists');
  const read = { ...paid, disposition: 'retry', kind: 'prerequisite_query', edits: [],
    toolRequestJson: JSON.stringify({ kind: 'spatial', toolRequest: { branchIdRef: 'retained-failed-branch',
      queryKind: 'space.solve_static_formation', argumentsJson: '{"unitId":"u-goliath-2","anchors":[{"xInches":33,"yInches":21}]}' } }) };
  assert.equal(validate(unavailable.providerSchema, read).ok, true);
  const available = framework.rosterTeachRecoveryContractV1(kind, true);
  assert.equal(validate(available.providerSchema, paid).ok, true, 'Actual reference validity remains checked by the bound Native selection validator');
  assert.notEqual(unavailable.contractHash, available.contractHash);
  assert(unavailable.providerSchema.properties.kind.enum.includes('retained_evidence'));
  assert(unavailable.providerSchema.properties.disposition.enum.includes('defer'));
  report.checks.push('actual_B_old_option_reply_removed_from_current_action_schema_before_generation_read_and_defer_remain_available_candidate_kind_returns_only_with_current_options');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
