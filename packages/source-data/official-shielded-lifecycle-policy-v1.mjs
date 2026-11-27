import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';

const schema = 'starcraft_tmg_official_shielded_lifecycle_policy_v1';
const recordKey = 'rules_sections:FuahgilWtc8nccVSp2Vv';
const withoutHash = policy => Object.fromEntries(Object.entries(policy).filter(([key]) => key !== 'policyHash'));

export function createOfficialShieldedLifecyclePolicyV1({ context }) {
  assertOfficialReleaseSourceV2(context, context || {});
  const record = context.dataset.recordsByKey[recordKey];
  const index = record?.payload?.items?.[0]?.subItems?.findIndex(row => row.title === 'SHIELDED');
  const source = record?.payload?.items?.[0]?.subItems?.[index]?.content?.[0]?.value;
  const text = String(source || '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ').trim();
  if (!/add it to the Hit Points \(HP\) of the first model/u.test(text)
    || !/Total Damage assigned to it exceeds its Shield value/u.test(text)
    || !/when the first model in the Unit is removed/u.test(text)
    || !/does not remove any remaining Hit Points/u.test(text)
    || !/only ends effects that require the Unit to be Shielded/u.test(text)
    || !/Shielded Status cannot be restored by HEAL/u.test(text)) {
    throw Error('SHIELDED_LIFECYCLE_RULE_SOURCE_UNSUPPORTED');
  }
  const body = {
    schema, semanticVersion: '1.0.0', normalizedDatasetHash: context.dataset.datasetHash,
    sourceSnapshotHash: context.snapshot.snapshotHash,
    source: { recordKey, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      jsonPointer: '/items/0/subItems/' + index + '/content/0/value', textHash: hash(source) },
    initialFirstModelIncludesShield: true, damageLossComparison: 'strictly_exceeds',
    firstModelRemovalLosesStatus: true, statusLossPreservesRemainingHitPoints: true,
    endShieldedDependentEffects: true, healRestoresStatus: false,
    sourceRefreshPerformed: false, trainingTruth: false,
  };
  return Object.freeze({ ...body, source: Object.freeze(body.source), policyHash: hash(body) });
}

export function hasOfficialShieldedLifecyclePolicyV1(state) {
  const policy = state.officialShieldedLifecyclePolicy;
  if (policy === undefined) return false;
  if (!policy || policy.schema !== schema || policy.semanticVersion !== '1.0.0'
    || policy.initialFirstModelIncludesShield !== true || policy.damageLossComparison !== 'strictly_exceeds'
    || policy.firstModelRemovalLosesStatus !== true || policy.statusLossPreservesRemainingHitPoints !== true
    || policy.endShieldedDependentEffects !== true || policy.healRestoresStatus !== false
    || policy.source?.recordKey !== recordKey || policy.sourceRefreshPerformed !== false
    || policy.trainingTruth !== false || policy.policyHash !== hash(withoutHash(policy))) {
    throw Error('SHIELDED_LIFECYCLE_POLICY_INVALID');
  }
  return true;
}
