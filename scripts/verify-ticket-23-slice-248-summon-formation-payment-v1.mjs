import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bindStarcraftTmgFormationSelectionV1 } from
  '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
import { projectStarcraftTmgFormationPaymentsV1 } from
  '../packages/online-agent-session/legal-formation-search-v1.mjs';

const capture = JSON.parse(await readFile(process.argv[2], 'utf8'));
const receipt = capture.queryReceipt;
const original = JSON.stringify(receipt);
const option = receipt.result.formationOptions.find((entry) =>
  entry.formationOptionId === capture.chosenFormationOptionId);
assert.ok(option?.completeFormationPlacementChecked);
assert.deepEqual(option.canonicalParameters.paymentCardInstanceIds,
  capture.selectedPayment);
const raw = {
  proposal: { kind: 'parameterized', domainId: receipt.result.domainId },
  formationSelection: {
    formationOptionId: option.formationOptionId,
    paymentCardInstanceIds: capture.selectedPayment,
    slotAssignments: [],
    publicReason: 'Use the selected Rules-instantiated complete formation.',
  },
};
const rawBefore = JSON.stringify(raw);
const bound = bindStarcraftTmgFormationSelectionV1(raw, [receipt], {});
assert.deepEqual(bound.proposal.parameters, option.canonicalParameters);
assert.deepEqual(bound.formationSelection.paymentCardInstanceIds,
  capture.selectedPayment);
assert.equal(JSON.stringify(raw), rawBefore);
assert.equal(JSON.stringify(receipt), original);
assert.throws(() => bindStarcraftTmgFormationSelectionV1({
  ...raw, formationSelection: {
    ...raw.formationSelection, paymentCardInstanceIds: ['not-a-legal-card'],
  },
}, [receipt], {}), (error) =>
  error.code === 'ACTION_FORMATION_PAYMENT_SELECTION_INVALID');
assert.throws(() => bindStarcraftTmgFormationSelectionV1({
  ...raw, formationSelection: {
    ...raw.formationSelection, paymentCardInstanceIds: [],
  },
}, [receipt], {}), (error) =>
  error.code === 'ACTION_FORMATION_PAYMENT_SELECTION_INVALID');
assert.deepEqual(projectStarcraftTmgFormationPaymentsV1({
  paymentCardInstanceIds: { enum: [] },
}, [option]).legalPaymentChoices, []);
assert.deepEqual(projectStarcraftTmgFormationPaymentsV1({
  paymentCardInstanceIds: { enum: [[]] },
}, []).legalPaymentChoices, [[]]);
assert.deepEqual(projectStarcraftTmgFormationPaymentsV1(undefined,
  [{ ...option, completeFormationPlacementChecked: false }])
  .legalPaymentChoices, []);
console.log(JSON.stringify({ ok: true, capturedRevision: capture.stateRevision,
  canonicalPaymentAndPlacementUnchanged: true, invalidPaymentRejected: true,
  missingPaymentRejected: true, providerCalls: 0, roomWrites: 0 }));
