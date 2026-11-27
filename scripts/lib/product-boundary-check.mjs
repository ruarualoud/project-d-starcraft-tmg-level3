// Development verifier, not a replacement product runtime. Product state is never copied.
import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite, readJson } from './development-context.mjs';

const order = ['read', 'compile', 'consume', 'successor', 'coldRecovery'];
const failureKinds = new Set(['product', 'fixture', 'external', 'model_semantics', 'unclassified']);

export function productBoundaryError(message, { code, kind = 'unclassified', stage, basis, cause } = {}) {
  return Object.assign(new Error(message, { cause }), {
    code, failureKind: kind, failureStage: stage, failureBasis: basis,
  });
}

function lastPassedCheckpoint(record) {
  for (const step of [...order].reverse()) {
    if (record.passed[step]) return { step, checkpointRef: record.passed[step].checkpointRef };
  }
  return null;
}

export function summarizeProductBoundary(record) {
  const failure = record.status === 'failed' ? record.failures.at(-1) : null;
  const steps = order.filter(step => record.passed[step]);
  const checkpoint = failure?.lastCheckpoint || record.inProgress || lastPassedCheckpoint(record);
  return { status: record.status, passed: steps, failureCount: record.failures.length,
    ...(checkpoint ? { checkpoint } : {}),
    ...(failure ? { failure: { step: failure.step, kind: failure.kind,
      code: failure.code ?? null, stage: failure.stage ?? null, repairRef: failure.repairRef ?? null } } : {}) };
}

export async function runProductBoundaryCheck({ directory, identity, steps, afterSaved }) {
  if (!identity?.factoryModule || !identity?.factoryExport || !identity?.sourceRef || !identity?.contractVersion) {
    throw Error('PRODUCT_FACTORY_AND_SOURCE_REQUIRED');
  }
  const names = steps.map(s=>s.name);
  if (new Set(names).size !== names.length || names.some(n=>!order.includes(n)) ||
      names.some((n,i)=>i && order.indexOf(n)<=order.indexOf(names[i-1]))) throw Error('BOUNDARY_ORDER_INVALID');
  if (steps.some(s=>typeof s.openProduct!=='function' || typeof s.check!=='function')) throw Error('PRODUCT_ENTRY_REQUIRED');
  await fs.mkdir(directory,{recursive:true});
  const file=path.join(directory,'boundary.json');
  let record;
  try { record=await readJson(file); } catch(error) { if(error.code!=='ENOENT')throw error; }
  if(record && JSON.stringify(record.identity)!==JSON.stringify(identity)) throw Error('BOUNDARY_IDENTITY_CHANGED');
  record ??= {version:1,identity,passed:{},failures:[],status:'not_started'};
  for(const step of steps) {
    if(record.passed[step.name])continue;
    // No automatic retry of a failed step; caller must provide the concrete fix reference.
    const oldFailure=record.failures.filter(f=>f.step===step.name).at(-1);
    if(oldFailure && (!step.repairRef || step.repairRef===oldFailure.repairRef)) throw Error('BOUNDARY_REPAIR_REFERENCE_REQUIRED');
    let product;
    let stage = 'open_product';
    let lastCheckpoint = record.inProgress?.step === step.name ? record.inProgress : lastPassedCheckpoint(record);
    const saveCheckpoint = async (checkpointRef, label = null) => {
      if (typeof checkpointRef !== 'string' || !checkpointRef.length) throw Error('PRODUCT_CHECKPOINT_REFERENCE_REQUIRED');
      const previous = record.inProgress;
      if (previous?.step === step.name && previous.checkpointRef === checkpointRef && previous.label === label) return;
      lastCheckpoint = { step: step.name, checkpointRef, label };
      record.inProgress = lastCheckpoint;
      record.status = 'partial';
      await atomicWrite(file, JSON.stringify(record, null, 2));
    };
    try {
      product=await step.openProduct(record.passed);
      stage = 'check';
      const result=await step.check(product,record.passed,{saveCheckpoint});
      if(!result?.evidenceRef || !result?.checkpointRef)throw Error('PRODUCT_EVIDENCE_AND_CHECKPOINT_REQUIRED');
      record.passed[step.name]={...result,completedAt:new Date().toISOString()};
      delete record.inProgress;
      record.status='partial';
      await atomicWrite(file,JSON.stringify(record,null,2));
    } catch(error) {
      if(record.passed[step.name])throw error;
      const kind = failureKinds.has(error.failureKind) ? error.failureKind : 'unclassified';
      record.failures.push({step:step.name,kind,message:error.message,
        code:error.code??null,stage:error.failureStage??stage,classificationBasis:error.failureBasis??null,
        lastCheckpoint,repairRef:step.repairRef??null,at:new Date().toISOString()});
      record.status='failed';
      await atomicWrite(file,JSON.stringify(record,null,2));
      throw error;
    } finally { await product?.close?.(); }
    // A simulated crash here proves saved boundaries can resume without rerunning a passed step.
    await afterSaved?.(step.name,record);
  }
  record.status='passed';
  await atomicWrite(file,JSON.stringify(record,null,2));
  return record;
}
