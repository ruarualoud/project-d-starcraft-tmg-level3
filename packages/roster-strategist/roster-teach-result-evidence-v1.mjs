import {collectPregameNativeActionEvidenceV1} from './pregame-native-action-evidence-v1.mjs';
import {collectPregameGeometryEvidenceV1} from './pregame-placement-evidence-v1.mjs';
import {projectPregameSpatialRelationshipV1} from './pregame-scene-laboratory-v1.mjs';
const clone=value=>structuredClone(value);
function computedOutcomes(value) {
  const rows = new Map();
  function visit(node, path = "", sourceReceiptHash = null, valid = true) {
    if (!node || typeof node !== "object") return;
    const invalidLayout = node.hypotheticalPlacementAssessment?.units?.some(u => u.resultStatus !== "ok")
      || node.sourceReceipt?.hypotheticalPlacementAssessment?.units?.some(u => u.resultStatus !== "ok");
    valid &&= !invalidLayout;
    sourceReceiptHash = node.receiptHash || sourceReceiptHash;
    if (valid && node.queryKind === "attack_probability" && node.outcomes && node.estimateHash) {
      rows.set(node.estimateHash, { sourceReceiptHash, path, estimateHash: node.estimateHash,
        attackerUnitId: node.attackerUnitId, targetUnitId: node.targetUnitId, weaponName: node.weaponName,
        contributingModelIds: node.contributingModelIds, visibleTargetModelIds: node.visibleTargetModelIds,
        outcomes: clone(node.outcomes), assumptions: clone(node.assumptions), uncertainty: clone(node.uncertainty),
        precision: node.precision, rulesMechanicsPerOutcome: node.rulesMechanicsPerOutcome,
        conditionalScenarioNotPrediction: true });
    }
    for (const [key, child] of Object.entries(node)) visit(child, path ? `${path}.${key}` : key, sourceReceiptHash, valid);
  }
  visit(value);
  return [...rows.values()];
}

function spatialRelationshipEvidence(value) {
  const rows = new Map();
  function visit(node, path = '', valid = true) {
    if (!node || typeof node !== 'object') return;
    valid &&= !node.hypotheticalPlacementAssessment?.units?.some(u => u.resultStatus !== 'ok')
      && !node.sourceReceipt?.hypotheticalPlacementAssessment?.units?.some(u => u.resultStatus !== 'ok');
    const native = node.queryReceipt, graph = native?.result;
    if (valid && node.receiptHash && native?.queryKind === 'space.inspect_relationships'
      && native.status !== 'unknown' && Array.isArray(graph?.relationships)) {
      rows.set(node.receiptHash, { sourceReceiptHash: node.receiptHash,
        nativeQueryReceiptHash: native.queryReceiptHash, path: path ? path + '.queryReceipt.result' : 'queryReceipt.result',
        relationshipGraphHash: graph.relationshipGraphHash, scope: clone(graph.scope),
        relationships: graph.relationships.map(projectPregameSpatialRelationshipV1),
        conditionalScenarioNotPrediction: true, arrivalOrAbilityUseProven: false });
    }
    for (const [key, child] of Object.entries(node)) visit(child, path ? `${path}.${key}` : key, valid);
  }
  visit(value);
  return [...rows.values()];
}

// Large receipt projection must preserve a query's result semantics, not only
// relocate its numbers into a generic computedOutcomes list. In particular an
// omitted attackEstimates property was being read as an empty estimate array.
function fireExchangeEvidence(value) {
  const rows=new Map();
  function visit(node,path='',sourceReceiptHash=null,valid=true){
    if(!node||typeof node!=='object')return;
    valid &&= !node.hypotheticalPlacementAssessment?.units?.some(unit=>unit.resultStatus!=='ok')
      && !node.sourceReceipt?.hypotheticalPlacementAssessment?.units?.some(unit=>unit.resultStatus!=='ok');
    sourceReceiptHash=node.receiptHash||sourceReceiptHash;
    if(valid&&node.queryKind==='fire_zone_exchange'&&node.estimateHash&&Array.isArray(node.attackEstimates)){
      rows.set(node.estimateHash,{sourceReceiptHash,path,queryKind:node.queryKind,
        estimateHash:node.estimateHash,seatKey:node.seatKey,
        attackEstimateCount:node.attackEstimates.length,
        attackEstimates:node.attackEstimates.map(estimate=>Object.fromEntries([
          'queryKind','estimateHash','domainId','sourceDomainId','sideKey','attackerUnitId','targetUnitId',
          'weaponName','profileKey','canonicalParameters','contributingModelIds','visibleTargetModelIds',
          'outcomes','assumptions','uncertainty','precision','rulesMechanicsPerOutcome',
        ].filter(key=>Object.hasOwn(estimate,key)).map(key=>[key,clone(estimate[key])]))),
        attackEstimateFailures:clone(node.attackEstimateFailures||[]),
        ...(node.attackSelection?{attackSelection:clone(node.attackSelection)}:{}),
        comparisonPolicy:clone(node.comparisonPolicy),conditionalScenarioNotPrediction:true,
        originalNativeArrayCountPreserved:true,
        scope:'These are the actual returned current attack estimates, including empty arrays. Missing targets are not zero damage; reciprocal fire requires its own scoped evidence.'});
    }
    for(const[key,child]of Object.entries(node))visit(child,path?`${path}.${key}`:key,sourceReceiptHash,valid);
  }
  visit(value);return [...rows.values()];
}

// One result projection for Teach, revision and final review. No new execution
// or semantic interpretation; every item preserves its original receipt scope.
function scopedQueryResults(value) {
  const rows=new Map(),seen=new Set();
  function visit(node) {
    if(!node||typeof node!=='object'||seen.has(node))return;
    seen.add(node);
    const query=node.queryReceipt;
    if(node.receiptHash&&query&&Object.hasOwn(query,'result')
      &&Buffer.byteLength(JSON.stringify(query.result))<=32768) {
      rows.set(node.receiptHash,{
        sourceReceiptHash:node.receiptHash,sourceStateHash:node.sourceStateHash,
        baseStateHash:node.baseStateHash,queryReceiptHash:query.queryReceiptHash,
        queryKind:query.queryKind||node.queryKind,status:query.status,
        resultStatus:node.resultStatus,unknownReason:node.unknownReason,
        sceneScope:clone(node.sceneScope||null),
        source:clone(query.source||null),result:clone(query.result),
        originalResultUnchanged:true,interpretationVerified:false,
      });
    }
    // Full state patches contain no additional query receipts.
    for(const [key,child]of Object.entries(node))if(key!=='stateChanges')visit(child);
  }
  visit(value);return [...rows.values()];
}

export function projectRosterTeachResultEvidenceV1(value, {includeComputedOutcomes=true}={}) {
  const geometry=collectPregameGeometryEvidenceV1(value);
  const nativeActions=collectPregameNativeActionEvidenceV1(value);
  const spatial=spatialRelationshipEvidence(value);
  const fire=fireExchangeEvidence(value);
  const outcomes=includeComputedOutcomes?computedOutcomes(value):[];
  const queries=scopedQueryResults(value);
  return {...(geometry.length?{scopedGeometryEvidence:geometry}:{}),
    ...(nativeActions.length?{nativeActionEvidence:nativeActions}:{}),
    ...(spatial.length?{spatialRelationshipEvidence:spatial}:{}),
    ...(fire.length?{fireExchangeEvidence:fire}:{}),
    ...(outcomes.length?{computedOutcomes:outcomes}:{}),
    ...(queries.length?{scopedQueryResults:queries}:{})};
}
