// Executable Plan-edit tool port. Models own arguments, never mutation receipts,
// source values, versions or the claim that an edit has passed semantic review.
// The existing Plan builders remain the sole commit implementation.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1 }
  from '../structured-generation/output-contract-registry-v1.mjs';

export const STRUCTURED_PLAN_TOOLS_PROTOCOL_V1 = 'structured_plan_tools_v1';
export const STRUCTURED_PLAN_TOOLS_PROTOCOL_V2 = 'structured_plan_tools_v2';
export const STRUCTURED_PLAN_TOOLS_PROTOCOL_V3 = 'structured_plan_tools_v3';
const fields = ['intentText', 'actionsText', 'reasonText', 'alternativesText', 'conditionsText'];
const labels = ['目标', '行动与分工', '取舍理由', '备选方案', '风险、前提与重规划条件'];
const clone = value => structuredClone(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (value, keys) => object(value)
  && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));

export function projectStagedRosterPlanArgumentsV1(snapshot) {
  return {version:'staged_argument_context_v1',results:clone(snapshot.results),
    stagedClaimPaths:clone(snapshot.stagedClaimPaths),missingClaimPaths:clone(snapshot.missingClaimPaths),
    stagedArguments:snapshot.edits.map(edit=>({claimPath:edit.claimPath,
      ...(edit.retainedText!==undefined ? {retainedText:edit.retainedText,retentionReason:edit.retentionReason}
        : {argument:clone(edit.argument)})})),
    applied:false,strategyContentAuthority:'unreviewed_model_argument',
    instruction:'These are the exact currently staged arguments, not Rules facts or final acceptance. Reconcile remaining arguments with this draft and the whole Plan. Keep valid staged calls; amend one if cross-field consistency requires it. No partial Plan is applied.'};
}

// Only the delivery index changes: shared source values and the host's canonical
// binding remain intact. F<n> handles belong to this frozen request, not future
// plans. A path tree avoids repeating thousands of identical parent paths.
export function buildRosterPlanFactCatalogueV2(facts) {
  const tree = Object.create(null);
  facts.forEach((fact,index) => {
    let node = tree;
    for (const key of fact.sourcePath.split('.')) {
      if (!Object.hasOwn(node,key)) node[key] = Object.create(null);
      node = node[key];
    }
    const ref = `F${index+1}`;
    if (fact.kind === 'text') (node.$text ||= []).push(ref);
    else {
      const {factId,kind,sourcePath,...metadata} = fact;
      (node.$number ||= []).push({ref,...clone(metadata)});
    }
  });
  return { encoding:'source_path_tree_v1', factCount:facts.length,
    instruction:'Join nested keys with dots to locate the unchanged shared source. $text lists factIds for source text; $number contains factIds as ref plus original values/scopes. Pass F<n> in factIds. Handles are valid only for this frozen request. Source text remains in verified-plan-facts; no facts have been omitted.',
    tree };
}

export function createRosterPlanEditToolsV1({ plan, paths, factPacket,
  protocol = STRUCTURED_PLAN_TOOLS_PROTOCOL_V1, currentClaimTexts = null }) {
  if (![STRUCTURED_PLAN_TOOLS_PROTOCOL_V1,STRUCTURED_PLAN_TOOLS_PROTOCOL_V2,STRUCTURED_PLAN_TOOLS_PROTOCOL_V3].includes(protocol))
    throw Error('PLAN_EDIT_PROTOCOL_INVALID');
  const compact = protocol === STRUCTURED_PLAN_TOOLS_PROTOCOL_V2;
  const hostSources = protocol === STRUCTURED_PLAN_TOOLS_PROTOCOL_V3;
  const sourceBinding = {sourceCatalogueHash: factPacket.sourceCatalogueHash,
    sourceFactsHash: hash(factPacket.sourceFacts || {}), bindingOwner:'host',
    scope:'available_evidence_not_proof_of_each_claim', semanticReviewStillRequired:true};
  if (!plan?.planHash || !Array.isArray(paths) || !paths.length
    || new Set(paths).size !== paths.length) throw Error('PLAN_EDIT_SOURCE_INVALID');
  const allowRetain = currentClaimTexts !== null;
  if (allowRetain && paths.some(path => typeof currentClaimTexts[path] !== 'string'))
    throw Error('PLAN_EDIT_SOURCE_INVALID');
  const facts = [
    ...(factPacket.premiseFacts?.numbers || []).map(row => ({
      ...clone(row), factId: `number:${hash(row).slice(0,24)}`,
      kind: 'number', sourcePath: row.factId })),
    ...(factPacket.premiseFacts?.texts || []).map(row => ({
      ...clone(row), factId: `text:${hash(row).slice(0,24)}`, kind: 'text' })),
  ];
  const byId = new Map(facts.map(row => [row.factId, row]));
  if (compact) facts.forEach((row,index) => byId.set(`F${index+1}`,row));
  const argumentsSchema = { type: 'object', additionalProperties: false,
    properties: {
      claimPath: { type: 'string', minLength: 1, maxLength: 160,
        ...(paths.length<=64?{enum:[...paths]}:{description:'Choose an exact path from requestedClaimPaths. The host rejects all other paths.'}) },
      ...Object.fromEntries(fields.map(key => [key, { type: 'string', minLength: 1,
        maxLength: 65536, description: ({
          intentText: 'The FINAL in-game strategic objective for the stored Plan. Not an objective to repair text, satisfy a reviewer or change wording.',
          actionsText: 'The FINAL game actions: which units do what, where and when, with sequencing and dependencies. Not instructions to rewrite, replace or keep other text.',
          reasonText: 'Public GAME-STRATEGY argument for the choices. Not an explanation of why a sentence needed editing. Facts belong in factIds, not invented receipts or computed totals.',
          alternativesText: 'Alternative GAME choices and causal trade-offs under the stated conditions. Not alternative phrasings, deleting a sentence, or retaining old wording.',
          conditionsText: 'IN-MATCH assumptions, opponent responses, risks and observable triggers that would change the strategy. Not conditions for editing a document or hypothetical rule-book changes. Unknown is not zero or proof of impossibility.',
        })[key] }])),
      ...(!hostSources ? {factIds: { type: 'array', minItems: 0, maxItems: 128,
        description: 'Select exact IDs from the delivered tool fact catalogue. The host binds original values and scope. No model-owned numeric value or success receipt.',
        items: { type: 'string', minLength: 1, maxLength: 160 } }} : {}),
    }, required: ['claimPath', ...fields, ...(!hostSources ? ['factIds'] : [])] };
  const tool = { name: 'plan.fill_argument', description:
    'Store the FINAL structured strategy argument for one requested Plan field, not editing instructions for another writer. No roster or Rules mutation. All requested fields commit together through the existing Plan runtime; invalid calls return typed errors without applying a partial Plan.',
    inputSchema: argumentsSchema };
  const retainTool = { name:'plan.retain_argument', description:
    'Explicitly keep an unchanged, still-supported formal Plan field with a public reason. The host retains its exact original text; no new validation or strategic acceptance is claimed.',
    inputSchema:{type:'object',additionalProperties:false,properties:{
      claimPath:clone(argumentsSchema.properties.claimPath),reasonText:{type:'string',minLength:1,maxLength:65536}},
      required:['claimPath','reasonText']} };
  const staged = new Map(), results = [];
  const render = edit => edit.retainedText !== undefined ? edit.retainedText
    : fields.map((key,i) => `${labels[i]}：${edit.argument[key]}`).join('\n')
    + (edit.facts.length ? '\n工具事实（保留来源范围，不证明策略已经实现）：\n'
      + edit.facts.map(f => JSON.stringify(f)).join('\n') : '');
  return Object.freeze({
    descriptor: () => ({ protocol,
      planVersion: plan.planVersion, requestedClaimPaths: [...paths], tools: [clone(tool),...(allowRetain?[clone(retainTool)]:[])],
      ...(allowRetain ? {retentionInstruction:'For EVERY listed field, either fill its revised final argument in toolCalls or call plan.retain_argument in retainedCalls. Do not rewrite labels or valid arguments merely to satisfy this editor. All fields are available so linked arguments can remain consistent. Partial batches are allowed; the host keeps staged calls until all fields are addressed. Retention does not resolve unresolved Teach questions.'}:{}),
      // Source text remains in the shared fact packet, not copied a second time.
      ...(hostSources ? {sourceBinding:clone(sourceBinding),
        sourceInstruction:'All verified-plan-facts are retained by the host with original source paths and scope. Explain factual bases in your public argument, but do not copy machine citation IDs or source payloads. Availability is not proof: independent source review still checks every assertion.'}
        : compact ? {factCatalogue:buildRosterPlanFactCatalogueV2(facts)}
        : {facts: facts.map(f => f.kind === 'text'
          ? { factId: f.factId, kind: f.kind, sourcePath: f.sourcePath } : clone(f))}),
      executionReceiptOwner: 'host', strategyArgumentOwner: 'model',
      sourceScopeMustBePreserved: true, semanticReviewStillRequired: true,
      instruction: 'Call plan.fill_argument with final game strategy, not a description of edits. Your fields are stored verbatim as the new argument: saying keep the rest unchanged does not copy it. Retain all still-relevant old strategy explicitly in these fields. '
        + (!hostSources ? 'Choose only facts that support this argument, not an exhaustive list. ' : '')
        + 'Successful calls are staged, not accepted strategy. Retry only missing/invalid calls using tool results; valid staged calls are retained. Never return execution receipts, prices, versions or a success flag as tool arguments.' }),
    outputContract({ allowEvidenceReads, maxBatchSize = null }) {
      const providerSchema = { type: 'object', additionalProperties: false, properties: {
        schemaVersion: { type: 'string', minLength: 1, maxLength: 80,
          enum: ['starcraft_tmg_roster_strategist_deliberation_v1'] },
        roundKind: { type: 'string', minLength: 1, maxLength: 16, enum: ['revision'] },
        toolCalls: { type: 'array', minItems: 0, ...(maxBatchSize?{maxItems:Math.min(paths.length,maxBatchSize)}:paths.length<=128?{maxItems:paths.length}:{}),
          items: { type: 'object', additionalProperties: false, properties: {
            name: { type: 'string', minLength: 1, maxLength: 80, enum: [tool.name] },
            arguments: clone(argumentsSchema),
          }, required: ['name', 'arguments'] } },
        ...(allowRetain ? {retainedCalls:{type:'array',minItems:0,...(paths.length<=128?{maxItems:paths.length}:{}),
          items:{type:'object',additionalProperties:false,properties:{
            name:{type:'string',minLength:1,maxLength:80,enum:[retainTool.name]},arguments:clone(retainTool.inputSchema)},required:['name','arguments']}}}:{}),
        ...(allowEvidenceReads ? { evidenceRequests: { type: 'array', minItems: 0, maxItems: 8,
          items: { type: 'object', additionalProperties: false, properties: {
            receiptHash: { type: 'string', minLength: 64, maxLength: 64 },
            path: { type: 'string', minLength: 0, maxLength: 2000 },
          }, required: ['receiptHash', 'path'] } } } : {}),
      }, required: ['schemaVersion', 'roundKind', 'toolCalls', ...(allowRetain?['retainedCalls']:[]), ...(allowEvidenceReads ? ['evidenceRequests'] : [])] };
      const ref = name => ({ id: `${protocol}.${name}`,
        version: '1.0.0', hash: hash(`${protocol}:${name}`) });
      const suffix = hash({ paths, allowEvidenceReads, ...(allowRetain?{allowRetain:true}:{}), ...(maxBatchSize?{maxBatchSize}:{}) }).slice(0,16);
      const contract = createStarcraftTmgOutputContractV1({ id: `ticket27.plan_edit_tools.${hostSources?'v3':compact?'v2':'v1'}.${suffix}`,
        version: '1.0.0', schemaName: `roster_plan_edit_${suffix}`, providerSchema,
        modelOwnedFields: Object.keys(providerSchema.properties), hostOwnedFields: [],
        mapperRef: ref('execute_typed_arguments'), semanticValidatorRef: ref('existing_plan_commit'),
        description: 'Structured Plan edit tool requests; receipts and source bindings are host-owned.' });
      return { contract, contractRef: outputContractRefStarcraftTmgV1(contract) };
    },
    callTool(call) {
      const error = (code, field) => {
        const result = { isError: true, structuredContent: { code, field,
          applied: false, retryableByCorrection: true, receiptOwner: 'host' } };
        results.push(result); return clone(result);
      };
      if (sameKeys(call,['name','arguments']) && allowRetain && call.name === retainTool.name) {
        const args = call.arguments;
        if (!sameKeys(args,['claimPath','reasonText'])) return error('PLAN_EDIT_ARGUMENT_FIELDS_INVALID','arguments');
        if (!paths.includes(args.claimPath)) return error('PLAN_EDIT_PATH_UNKNOWN','claimPath');
        if (typeof args.reasonText !== 'string' || !args.reasonText.trim()) return error('PLAN_EDIT_ARGUMENT_TEXT_REQUIRED','reasonText');
        const edit = {claimPath:args.claimPath, retainedText:currentClaimTexts[args.claimPath],
          retentionReason:args.reasonText.trim(),facts:[]};
        const replayed = staged.has(args.claimPath) && hash(staged.get(args.claimPath)) === hash(edit);
        staged.set(args.claimPath,edit);
        const result = {isError:false,structuredContent:{tool:retainTool.name,claimPath:args.claimPath,
          status:'staged',replayed,applied:false,receiptOwner:'host',semanticReviewStillRequired:true}};
        results.push(result);return clone(result);
      }
      if (!sameKeys(call, ['name','arguments']) || call.name !== tool.name)
        return error('PLAN_EDIT_TOOL_INVALID', 'name');
      const args = call.arguments;
      if (!sameKeys(args, ['claimPath', ...fields, ...(!hostSources ? ['factIds'] : [])]))
        return error('PLAN_EDIT_ARGUMENT_FIELDS_INVALID', 'arguments');
      if (!paths.includes(args.claimPath)) return error('PLAN_EDIT_PATH_UNKNOWN', 'claimPath');
      for (const key of fields) if (typeof args[key] !== 'string' || !args[key].trim())
        return error('PLAN_EDIT_ARGUMENT_TEXT_REQUIRED', key);
      if (!hostSources && (!Array.isArray(args.factIds) || args.factIds.some(id => !byId.has(id))))
        return error('PLAN_EDIT_FACT_UNKNOWN', 'factIds');
      const argument = Object.fromEntries(fields.map(key => [key, args[key].trim()]));
      const edit = { claimPath: args.claimPath, argument,
        facts: hostSources ? [] : [...new Set(args.factIds)].map(id => clone(byId.get(id))) };
      const replayed = staged.has(args.claimPath) && hash(staged.get(args.claimPath)) === hash(edit);
      staged.set(args.claimPath, edit);
      const result = { isError: false, structuredContent: { tool: tool.name,
        claimPath: args.claimPath, status: 'staged', replayed, applied: false,
        boundFacts: clone(edit.facts), receiptOwner: 'host', semanticReviewStillRequired: true } };
      results.push(result); return clone(result);
    },
    snapshot() {
      const edits = paths.filter(path => staged.has(path)).map(path => clone(staged.get(path)));
      return { protocol, fromPlanVersion: plan.planVersion,
        ...(hostSources ? {sourceBinding:clone(sourceBinding)} : {}),
        fromPlanHash: plan.planHash, edits, results: clone(results),
        stagedClaimPaths: edits.map(e => e.claimPath),
        missingClaimPaths: paths.filter(path => !staged.has(path)),
        repairs: edits.map(e => ({ claimPath: e.claimPath, replacementText: render(e) })),
        applied: false, receiptOwner: 'host', semanticReviewStillRequired: true, trainingTruth: false };
    },
  });
}
