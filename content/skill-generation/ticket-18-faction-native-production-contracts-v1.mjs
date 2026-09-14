import { hash, seal } from '../../packages/skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_V1 } from './ticket-18-faction-teach-output-contract-v1.mjs';

const str = maxLength => ({ type: 'string', minLength: 1, maxLength });
const arr = (items, minItems = 1, maxItems = 16) => ({ type: 'array', items, minItems, maxItems });
const obj = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const refs = { ...arr(str(512), 1, 8), uniqueItems: true };
const index = { type: 'integer', minimum: 0, maximum: 127 };
const axes = ['army_resources', 'unit_roles', 'phase_tempo', 'objectives', 'threat_tradeoffs', 'card_packages'];
const advice = obj({ title: str(200), when: arr(str(1600)), procedure: arr(str(1600)), alternatives: arr(str(1600)),
  risk: str(1600), reviseIf: arr(str(1600)), sourceRefs: refs, unproven: arr(str(1600)) });
const branches = field => obj({ branches: arr(obj({ axis: { ...str(100), enum: axes },
  [field]: arr(obj({ question: str(1200), sourceRefs: refs }), 2, 4) }), 6, 6) });
const shapes = { questions: branches('questions'), challenges: branches('probes'),
  reasoner: obj({ answers: arr(obj({ index, answer: str(1600), sourceRefs: refs }), 1, 8), uncertainties: arr(str(1600), 0) }),
  judge: obj({ judgments: arr(obj({ index, verdict: { ...str(20), enum: ['supported', 'unsupported', 'uncertain'] },
    reason: str(1200), sourceRefs: refs }), 1, 8) }),
  outline: obj({ outline: arr(obj({ focus: str(600), sourceRefs: refs }), 1, 8) }),
  items: obj({ items: arr(obj({ index, value: advice }), 1, 2) }) };
export const FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 = Object.freeze({
  ...Object.fromEntries(Object.entries(shapes).map(([kind, providerSchema]) => [kind, createStarcraftTmgOutputContractV1({
    id: 'starcraft-tmg.faction-native.' + kind, version: '2026.09.08.1', schemaName: 'faction_native_' + kind + '_v1', providerSchema,
    modelOwnedFields: Object.keys(providerSchema.properties), hostOwnedFields: ['scope', 'sourceBinding', 'acceptance'],
    mapperRef: { id: 'faction.native.identity', version: '1.0.0', hash: hash('unchanged-native-body') },
    semanticValidatorRef: { id: 'faction.existing-workflow.' + kind, version: '1.0.0', hash: hash('unchanged-workflow-denominators-sources-and-fresh-review-' + kind) },
    description: 'Native body only. Existing workflow owns source membership, exact target coverage, correction and qualification.' })])),
  notes: FACTION_TEACH_OUTPUT_CONTRACT_V1 });
export const FACTION_NATIVE_PRODUCTION_BINDING_V1 = seal({ version: 'faction_native_production_v1',
  contracts: Object.fromEntries(Object.entries(FACTION_NATIVE_PRODUCTION_CONTRACTS_V1).map(([k, c]) => [k, outputContractRefStarcraftTmgV1(c)])),
  scope: 'new_standard_question_tree_challenger_reasoner_judge_proposer_outline_and_item_roles_only',
  historicalCompletedRolesReplayedExactly: true, fullSourcesAndPriorWorkspacePreserved: true,
  existingWorkflowValidatorsUnchanged: true, outputTokenPromptTarget: 2400,
  rawJsonFallbackAllowed: false, automaticWireRetries: 0, semanticAcceptanceInherited: false, trainingTruth: false });
const one = { title: 'x', when: ['x'], procedure: ['x'], alternatives: ['x'], risk: 'x', reviseIf: ['x'], sourceRefs: ['x'], unproven: ['x'] };
export const FACTION_NATIVE_PRODUCTION_PROBE_SAMPLES_V1 = Object.freeze({
  questions: { branches: axes.map(axis => ({ axis, questions: [0, 1].map(() => ({ question: 'x', sourceRefs: ['x'] })) })) },
  challenges: { branches: axes.map(axis => ({ axis, probes: [0, 1].map(() => ({ question: 'x', sourceRefs: ['x'] })) })) },
  reasoner: { answers: [{ index: 0, answer: 'x', sourceRefs: ['x'] }], uncertainties: [] },
  judge: { judgments: [{ index: 0, verdict: 'uncertain', reason: 'x', sourceRefs: ['x'] }] },
  outline: { outline: [{ focus: 'x', sourceRefs: ['x'] }] }, items: { items: [{ index: 0, value: one }] },
  notes: { lesson: ['x'], uncertainties: ['x'] } });
