import {WIKI_READ_WINDOW_V1,paginateWikiTrajectoryV1,projectWikiReadWindowV1,selectWikiReadBatchV1} from './postgame-wiki-read-window-v1.mjs';
import {projectPostgameLearningModelContextV1} from './postgame-development-feedback-v1.mjs';
import { POSTGAME_INCREMENTAL_EDIT_V1, POSTGAME_INCREMENTAL_EDIT_V2, describePostgameIncrementalTargetsV1, compilePostgameIncrementalEditV1 } from './postgame-incremental-skill-edit-v1.mjs';
import { clone, fail, freeze, hash } from '../skill-production/common.mjs';
import { compilePostgameSkillMaterialsV1, compilePostgameWikiSourcesV1 } from './postgame-learning-assets-v1.mjs';

export const POSTGAME_WIKI_NAVIGATION_V1 = 'wiki_react_navigation_v1';
export const POSTGAME_WIKI_NAVIGATION_V2 = 'wiki_react_navigation_v2';
export const POSTGAME_WIKI_READING_POLICY_V1 = 'read_before_disposition_v1';
export const POSTGAME_WIKI_OPERATION_PHASE_V1 = 'read_then_dispose_v1';

// A clear no-op is not a skill update. Accept only unambiguous semantic aliases;
// conflicting mutation payloads must never be discarded to manufacture retain.
export function normalizePostgameWikiAbstentionV1(choice) {
  if(!choice||choice.operation)return choice;
  const verbs=[choice.action,choice.decision].filter(Boolean);
  if(!verbs.length||verbs.some(v=>!['retain','no_action'].includes(v)))return choice;
  if(['edits','patches','skillPatches','skillCreations','proposedChange'].some(k=>
    choice[k]!=null&&(!Array.isArray(choice[k])||choice[k].length)))return choice;
  const reason=choice.reason||choice.reasonForRetain||choice.summary;
  if(typeof reason!=='string'||!reason.trim())return choice;
  return {...choice,operation:'retain',reason};
}

function dispositionReadiness(pages, navigation, learningContext, factReview = null) {
  const delivered = new Set(navigation.delivered.map(page => page.handle));
  const requiredKinds = ['wiki', 'skill'].filter(kind => [...pages.values()].some(page => page.kind === kind));
  if(learningContext?.discoveryMode==='autonomous_patterns_v1'&&!factReview)requiredKinds.push(
    [...pages.values()].some(p=>p.kind==='trajectory')?'trajectory':'raw');
  const missingKinds = requiredKinds.filter(kind => ![...pages].some(([handle, page]) => page.kind === kind && delivered.has(handle)));
  return { ready: missingKinds.length === 0, missingKinds };
}


// Native episode context and original Skill metadata define the active learner.
// Opponent Skills remain readable for understanding; only this seat's scope is editable.
function learnerScope(input) {
 if(!input.assetScope?.ownerSeat)return null;
 const seat=input.assetScope.ownerSeat,other=seat==='player1'?'player2':'player1';
 const contexts=compilePostgameWikiSourcesV1(input.episodes,input.learningContext).map(p=>p.context).filter(c=>c?.factionBySeat?.[seat]&&c.factionBySeat[other]);
 const pairs=[...new Map(contexts.map(c=>[c.factionBySeat[seat]+'|'+c.factionBySeat[other],{ownFaction:c.factionBySeat[seat],opponentFaction:c.factionBySeat[other]}])).values()];
 const editableSkillHandles=compilePostgameSkillMaterialsV1(input.skills).filter(m=>{
  const skill=input.skills.find(s=>s.skillId===m.id),d=skill.direction;
  if(d)return pairs.some(p=>p.ownFaction===d.ownFaction&&p.opponentFaction===d.opponentFaction);
  if(skill.factionRecordKey)return pairs.some(p=>p.ownFaction===skill.factionRecordKey);
  return true;
 }).map(m=>m.handle);
 return {ownerSeat:seat,factionPairs:pairs,editableSkillHandles};
}

// The catalogue is Host-owned and scoped to this review's development data.
// Handles are semantic selections, never filesystem paths or database IDs.
function catalogue({ skills, wiki, episodes, sourceArchive, learningContext }) {
  const pages = new Map();
  for (const material of compilePostgameSkillMaterialsV1(skills)) {
    pages.set(material.handle, { kind: 'skill', title: material.id, body: { ...material, incrementalTargets: describePostgameIncrementalTargetsV1(material) } });
  }
  for (const topic of wiki.topics) {
    pages.set(topic.handle, { kind: 'wiki', title: topic.topic, body: topic });
  }
  if (sourceArchive) {
    pages.set('wiki:evolution', { kind: 'history', title: 'Knowledge revisions and relationships', body: wiki.evolution });
    pages.set('wiki:impacts', { kind: 'history', title: 'Recorded selection outcomes and scope', body: wiki.impacts || [] });
    for (const topic of wiki.archivedTopics || []) {
      pages.set(topic.handle, { kind: 'history', title: topic.topic, body: topic });
    }
    const current = new Set(compilePostgameWikiSourcesV1(episodes, learningContext).map(p => p.source.decisionId));
    for (const source of sourceArchive.pages) {
      pages.set(source.archiveHandle, { kind: 'raw', title: source.source.decisionId,
        historical: !current.has(source.source.decisionId), body: source });
    }
  }
  for (const source of compilePostgameWikiSourcesV1(episodes, learningContext)) {
    const handle = `trace:${source.handle}`;
    pages.set(handle, { kind: 'raw', title: source.handle, body: source });
  }
  if(learningContext?.discoveryMode==='autonomous_patterns_v1')for(const g of learningContext.wholeGames||[]){
    pages.set('environment:'+g.id,{kind:'environment',title:g.id+' saved initial scene and rule profiles',body:g.environmentFacts||{availability:'not_recorded'}});
    for(const round of g.rounds){const handles=new Set(round.actionHandles);const steps=g.timeline.filter(t=>handles.has(t.handle));const receipts=new Set(steps.flatMap(t=>(t.publicDecisionTrace?.queryReceipts||[]).map(r=>r.queryReceiptHash)));
      const body={taskId:g.id,round:round.round,partOfSameTask:true,terminal:g.terminal,mission:g.mission,factionBySeat:g.factionBySeat,initialSceneHandle:'environment:'+g.id,steps,toolResultHandles:(g.toolEvidence||[]).filter(q=>q.root!==false&&receipts.has(q.queryReceiptHash)).map(q=>q.handle),limitations:g.knownEngineeringIssues};
      for(const page of paginateWikiTrajectoryV1('trajectory:'+g.id+':round:'+round.round,body)){const {handle,...value}=page;pages.set(handle,value)}
    }
    for(const [id,plan] of Object.entries(g.planVersions||{}))pages.set('plan:'+g.id+':'+id,{kind:'plan',title:g.id+' saved plan '+id,body:plan});
    for(const q of g.toolEvidence||[])pages.set(q.handle,{kind:'query',title:q.queryKind+' / '+q.authority.seatKey+' / r'+q.authority.stateRevision,hiddenFromIndex:q.root===false,body:q.artifactRef?{artifactRef:q.artifactRef}:q});
  }
  return pages;
}

// Selecting an edit identifies its required read dependencies. Host delivers
// those exact pages once, keeps the edit uncommitted, and asks the author to
// decide again against the complete original Skill and cited knowledge.
// Public handles select sources; Host resolves their storage kinds. A read raw
// trace or superseded topic is supporting context only when it is explicitly
// linked to a selected current Wiki topic. It never becomes new rule authority.
function boundWikiTopics(choice,pages,seen){
 const requested=selected(choice.wikiTopicHandles,'wikiTopicHandles');
 if(requested.some(h=>!seen.has(h)||!pages.has(h)))fail('POSTGAME_WIKI_CHOICE_SOURCE_NOT_READ',{handles:requested.filter(h=>!seen.has(h)||!pages.has(h))});
 const topics=requested.filter(h=>pages.get(h).kind==='wiki');
 if(!topics.length)fail('POSTGAME_WIKI_CHOICE_SOURCE_NOT_READ',{reason:'select_at_least_one_read_current_wiki_topic'});
 for(const handle of requested){const page=pages.get(handle);if(page.kind==='wiki')continue;
  const linked=topics.some(t=>{const current=pages.get(t).body;
   return page.kind==='raw'&&((current.rawTraceHandles||[]).includes(handle)
      ||page.body.source&&(current.sources||[]).some(s=>hash(s)===hash(page.body.source)))
    ||page.kind==='history'&&page.body.supersededBy===current.topic;});
  if(!linked)fail('POSTGAME_WIKI_CHOICE_SOURCE_NOT_READ',{handle,reason:'supporting_source_not_linked_to_selected_current_topic',allowedCurrentTopics:topics});
 }
 return topics;
}

export function preparePostgameWikiEditReadsV1(input){
 const choice=input.choice;if(!['edit','create'].includes(choice?.operation))return null;
 const pages=catalogue(input),seen=new Set(input.navigation.delivered.map(p=>p.handle));
 const target=choice.operation==='edit'?choice.skillHandle:choice.basisSkillHandle;
 if(pages.get(target)?.kind!=='skill'||!Array.isArray(choice.wikiTopicHandles)||!choice.wikiTopicHandles.length)return null;
 const handles=[...new Set([target,...choice.wikiTopicHandles])];
 if(choice.wikiTopicHandles.some(h=>!['wiki','history','raw'].includes(pages.get(h)?.kind)))return null;
 const missing=handles.filter(h=>!seen.has(h));if(!missing.length)return null;
 const results=missing.map(handle=>({handle,...clone(pages.get(handle)),cached:false}));
 return freeze({kind:'read',results,newPages:results,proposedChoice:clone(choice),reason:'selected_edit_dependencies_delivered'});
}

// Only a registered factual review can mark an existing value as incorrect.
// Bind semantic values to this request's handles; authors never supply paths/hashes.
function factualRepairTargets(input,pages) {
  return (input.factReview?.affectedSkillValues || []).map(value=>{
    const pair=[...pages].find(([,page])=>page.kind==='skill'&&page.body.id===value.skillId);
    const matches=pair?describePostgameIncrementalTargetsV1(pair[1].body).find(s=>s.sectionHandle===value.sectionHandle)?.textTargets.filter(t=>t.text===value.value)||[]:[];
    if(matches.length!==1)fail('POSTGAME_WIKI_FACT_TARGET_INVALID',{skillId:value.skillId,sectionHandle:value.sectionHandle});
    return {skillHandle:pair[0],sectionHandle:value.sectionHandle,textHandle:matches[0].handle,text:value.value,issueIds:clone(value.issueIds||[])};
  });
}
function requireFactualValuesRevised(input,pages,edits) {
  const contains=(node,text)=>typeof node==='string'?node===text:Array.isArray(node)?node.some(v=>contains(v,text)):node&&typeof node==='object'?Object.values(node).some(v=>contains(v,text)):false;
  const unchanged=factualRepairTargets(input,pages).filter(target=>{
    const edit=edits.find(e=>e.skillHandle===target.skillHandle&&e.sectionHandle===target.sectionHandle);
    return contains(edit?edit.value:pages.get(target.skillHandle).body.content[target.sectionHandle],target.text);
  });
  if(unchanged.length)fail('POSTGAME_WIKI_CHOICE_FACT_TARGET_UNCHANGED',{targets:unchanged});
}

export function compilePostgameWikiNavigationRequestV1(input) {
  const pages = catalogue(input);
  const nav = input.navigation;
  const autonomous=input.learningContext?.discoveryMode==='autonomous_patterns_v1';
  const window=autonomous?projectWikiReadWindowV1(nav,pages):null;
  const readiness = dispositionReadiness(pages, nav,input.learningContext,input.factReview);
  const readOnly = autonomous && !readiness.ready;
  const scope = learnerScope(input);
  const canCreate = nav.protocolVersion === POSTGAME_WIKI_NAVIGATION_V2 && !input.factReview;
  const missingTarget=nav.lastError?.code==='POSTGAME_WIKI_CHOICE_PATCH_TARGET_NOT_FOUND';
  const repairSkill=missingTarget && (!scope || scope.editableSkillHandles.includes(nav.lastError.choice?.skillHandle)) ? pages.get(nav.lastError.choice?.skillHandle) : null;
  const repairSection=nav.lastError?.details?.sectionHandle;
  const patchRepairContext=repairSkill?.kind==='skill'?{
    protocol:'missing_patch_target_v1',skillHandle:nav.lastError.choice.skillHandle,sectionHandle:repairSection,
    rejectedTarget:nav.lastError.details.target,
    currentSection:clone(repairSkill.body.content[repairSection]),
    allowedAppendTargets:repairSkill.body.incrementalTargets.find(s=>s.sectionHandle===repairSection)?.appendTargets||[],
    allowedTextTargets:repairSkill.body.incrementalTargets.find(s=>s.sectionHandle===repairSection)?.textTargets||[],
    instruction:'None of the previous patches were applied. Do not copy the missing anchor again. Select a published textHandle for replace_value, or an append destination for new items, after reading the current learner Skill. Or retain if no supported strategy addition is warranted. Host resolves the exact destination; audit labels are not editable Skill text.',
  }:null;
  return freeze({
    protocol: nav.protocolVersion || POSTGAME_WIKI_NAVIGATION_V1,
    role: 'wiki_informed_skill_proposer',
    taskMode:input.factReview?'registered_factual_correction_v1':'autonomous_skill_discovery',
    ...(input.learningContext?{learningContext:projectPostgameLearningModelContextV1(input.learningContext,{includeWholeGameTimeline:false,role:'wiki',indexOnly:autonomous})}:{}),
    ...(input.learningContext?.discoveryMode==='autonomous_patterns_v1'?{
      historicalSkillEffects:clone(input.wiki.impacts||[]),
      taskOutcomes:(input.learningContext.wholeGames||[]).map(g=>({taskId:g.id,outcome:g.terminal,rounds:g.rounds.map(r=>r.round),readingHandles:g.rounds.map(r=>'trajectory:'+g.id+':round:'+r.round)})),
      discoveryInstruction:input.factReview?'This is a registered factual correction, not another discovery round. The supplied factReview evidence is the factual basis. Read the current affected Skill and relevant Wiki, then correct the identified value or explicitly retain it in quarantine; do not require another whole-game investigation.':'Choose relevant tasks and action sequences yourself. Inspect original steps and cited tool results when needed to diagnose a pattern; Wiki prose alone is not its evidence. Compare observed successes and failures without grading every move by final victory. Read historical edits and their measured outcomes; refine or reject earlier explanations. One game split into rounds remains one task, not independent samples. No mandatory topic and no requirement to edit. No sandbox tools are available to this role.',
    }:{}),
    ...(window?{readingTransport:WIKI_READ_WINDOW_V1,readHistory:window.history,attachedBytes:window.attachedBytes,workspacePolicy:'Original materials remain immutable. Only a bounded active set is attached. Read a directory part for original action bodies. Previously read but unattached pages can be selected again; Host will reattach them. This is transport paging, not deletion or a limit on research choices.'}:{}),
    readingPolicy: POSTGAME_WIKI_READING_POLICY_V1,
    ...(autonomous ? {operationPhaseVersion:POSTGAME_WIKI_OPERATION_PHASE_V1,
      operationPhase:readOnly?'read_evidence':'decide',
      ...(readOnly?{availableRequiredReads:[...pages].filter(([,p])=>readiness.missingKinds.includes(p.kind))
        .map(([handle,p])=>({handle,kind:p.kind,title:p.title})),
        phaseInstruction:input.factReview?'Read the current affected Skill and relevant Wiki handles. The registered factual evidence is already supplied; original trajectory reading is optional if clarification is needed.':'Read original action parts from availableRequiredReads before proposing any change. A directory is not its action contents. You may instead retain with an explicit reason; that ends this attempt with no candidate and no effectiveness claim.'}:{})}:{}),
    dispositionReadiness: readiness,
    nextStep: input.factReview ? (readiness.ready?'Correct the marked current values using the supplied facts, or retain the candidate in quarantine.':'Read the current affected Skill and related Wiki; no new trajectory investigation is required.') : readiness.ready ? 'Decide edit/create or evidence-based retain; read further only if useful.'
      : 'These index handles ARE readable through operation=read. Select relevant pages of the missingKinds, including a task trajectory when listed. Host returns full contents on the next turn. Index-only delivery is not missing data. Read before submitting a change; you may retain without claiming an improvement.',
    ...(input.factReview?{factReview:clone(input.factReview),factualRepairTargets:factualRepairTargets(input,pages),factualRepairInstruction:'When editing this candidate, revise each marked erroneous existing value using its textHandle. Adding another note or creating a new Skill while keeping the incorrect value does not repair it. You may retain to end without fixing it, but that candidate remains quarantined. Host checks only the known unchanged values; strategy choice remains yours.'}:{}),
    editMode: POSTGAME_INCREMENTAL_EDIT_V2,
    ...(scope ? { learnerScope: scope } : {}),
    ...(patchRepairContext?{patchRepairContext}:{}),
    instruction: input.factReview ? (readOnly
      ? 'Read the current affected Skill and relevant Wiki using operation=read. factReview already contains the factual evidence; this task does not require redoing autonomous discovery or reading unrelated trajectories.'
      : 'Correct the registered factual claims in the current unaccepted candidate. Use factualRepairTargets textHandles with replace_value; Host preserves unchanged values. Adding a separate note while keeping a marked incorrect value does not repair it. Read any additional source only if needed to interpret the supplied facts. You may retain, but the incorrect candidate stays quarantined. Do not introduce new tactical goals or claim a measured strategy benefit from a factual correction.')
      : readOnly ? 'Choose relevant original action parts and other missing evidence using operation=read. Available handles select immutable observations, not new experiments. Do not submit an edit yet. You may choose retain to end without a candidate, explicitly stating evidence limitations. No topic or strategy change is prescribed.'
      : 'Consult the index, read relevant Wiki pages, current Skills and original traces as needed. '
      + (canCreate ? 'Then create or edit one Skill, or explicitly retain the current Skills. '
        : 'Then edit one existing Skill or explicitly retain the current Skills. ')
      + 'Read the target or basis Skill and '
      + 'the cited Wiki pages before editing. You may also cite linked history/raw handles already read; Host binds them to your selected current Wiki topics and preserves the original citation choices. Wiki interpretations are not rule truth or proof of superiority. '
      + 'Choose semantic handles only; Host binds sources and versions. Do not play the game, '
      + 'change rules, invent measurements or use hidden validation outcomes. '
      + 'Improve conditional decisions for learnerScope.ownerSeat; other-seat Skills are reference material, not edit targets. Facts corrected in Wiki do not imply that the baseline Skill was wrong. A useful addition connects situation, objective, action/alternative, expected benefit, cost and evidence limits. Do not claim untested superiority. '
      + 'Use append for new procedure items, or replace_value with a published textHandle and a new string for that one item; never echo a complete section or recopy a long exact-match anchor. '
      + 'Host preserves every unchanged value and resolves the selected textHandle against this frozen Skill. '
      + 'Array appends use the published append target handle and include only new items; preserve item types. '
      + 'Patches apply in order on a copy and commit together. A new Skill alone requires its full new procedure. '
      + (canCreate ? 'New procedures inherit the basis Skill\'s game-data and faction scope; they are candidates until independently evaluated.'
        : 'This protocol edits existing Skills; creation requires the version 2 interface.'),
    index: [...pages].filter(([,page])=>!page.hiddenFromIndex).map(([handle, page]) => ({ handle, kind: page.kind, title: page.title,
      ...(page.historical === undefined ? {} : { historical: page.historical }),
      ...(page.kind === 'skill' ? { editable: !scope || scope.editableSkillHandles.includes(handle), direction: page.body.content.direction || null, editableSections: page.body.editableSections } : {}) })),
    ...(input.sourceArchive ? { unavailableSources: clone(input.sourceArchive.unavailable) } : {}),
    delivered: (window?window.active:nav.delivered).map(page => page.kind === 'skill'
      ? { ...clone(page), body: { ...clone(page.body), incrementalTargets: describePostgameIncrementalTargetsV1(page.body) } }
      : clone(page)),
    previousRead: clone(nav.lastRead || null),
    correction: nav.lastError ? {code:nav.lastError.code,details:clone(nav.lastError.details),
      instruction:nav.lastError.code==='POSTGAME_WIKI_CHOICE_FACT_TARGET_UNCHANGED'
        ? 'The proposal was not applied because it left a registered erroneous value unchanged. Revise the listed textHandle itself; do not merely append a parallel explanation. Retaining ends without repairing or releasing this candidate.'
        : nav.lastError.code==='POSTGAME_WIKI_CHOICE_READING_REQUIRED'
        ? 'The proposal was not applied: original action bodies are still unread. Return operation=read with handles from availableRequiredReads. Do not rewrite the proposed strategy on this reading turn.'
        : 'The previous proposal was not applied. Use the current learnerScope editable handles and delivered textTargets; do not replay a failed long anchor or switch to an opponent Skill.'} : null,
    ...(nav.pendingProposal&&!nav.lastError?{pendingProposal:clone(nav.pendingProposal),nextDecision:'The proposed edit has NOT been applied. The exact requested Skill and Wiki pages are now in delivered. Compare against their full contents and issue a revised edit/create or retain; do not repeat an unread-target repair.'}:{}),
    responseInterface: {
      read: { operation: 'read', handles: ['choose index handles'], reason: 'What this reading resolves' },
      ...(readOnly ? {retain:{operation:'retain',reason:'why no candidate is warranted; identify unread evidence or other limitations'}}:{}),
      ...(!readOnly ? {
      edit: { operation: 'edit', skillHandle: 'one read skill handle',
        edits: [{ sectionHandle: 'choose an editable section', patches: [
          { op: 'replace_value', textHandle: 'choose a delivered textTargets handle', content: 'new complete text for that single value' },
          { op: 'append', arrayHandle: 'choose a delivered append target', content: ['new items only, matching that array’s item type'] },
        ] }],
        patchInstructions: 'Choose only the operations needed; this list illustrates alternatives, not required steps. Do not send value or unchanged contents.',
        wikiTopicHandles: ['read current Wiki topic handles; linked read history/raw handles may also support them'], applicableWhen: ['conditions'],
        reviseIf: ['contrary observations'], expectedBenefit: 'expected improvement', knownRisk: 'tradeoff' },
      ...(readiness.ready ? { retain: { operation: 'retain', reason: 'why the material read does not warrant an edit; inconclusive evidence is a valid reason' } } : {}),
      ...(canCreate ? { create: { operation: 'create', basisSkillHandle: 'read skill handle defining applicability scope',
        title: 'new Skill title', description: 'what this procedure does', steps: ['specific steps'],
        wikiTopicHandles: ['read current Wiki topic handles; linked read history/raw handles may also support them'], applicableWhen: ['conditions'], reviseIf: ['contrary observations'],
        expectedBenefit: 'goal and expected benefit', knownRisk: 'tradeoffs and limits' } } : {}),
      } : {}),
    },
    rawTraceAuthority: 'saved_observation_not_a_general_causal_proof',
    heldoutScenarioContentsIncluded: false,
    automaticPromotion: false, trainingTruth: false,
  });
}

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail('POSTGAME_WIKI_CHOICE_TEXT_REQUIRED', { field });
  return value;
}

function selected(value, field) {
  if (!Array.isArray(value) || !value.length || value.some(v => typeof v !== 'string' || !v.trim())) {
    fail('POSTGAME_WIKI_CHOICE_SELECTION_REQUIRED', { field });
  }
  return [...new Set(value)];
}

export function resolvePostgameWikiNavigationChoiceV1(input) {
  const pages = catalogue(input), choice = normalizePostgameWikiAbstentionV1(input.choice);
  const seen = new Set(input.navigation.delivered.map(p => p.handle));
  const target = choice?.operation === 'edit' ? choice.skillHandle : choice?.operation === 'create' ? choice.basisSkillHandle : null;
  if(target && input.learnerScope && !input.learnerScope.editableSkillHandles.includes(target))
    fail('POSTGAME_WIKI_CHOICE_LEARNER_SCOPE',{target,editableSkillHandles:input.learnerScope.editableSkillHandles});
  const dependencies=preparePostgameWikiEditReadsV1(input);if(dependencies)return dependencies;
  if (choice?.operation === 'read') {
    const handles = selected(choice.handles, 'handles');
    text(choice.reason, 'reason');
    const results = handles.map(handle => {
      const page = pages.get(handle);
      if (!page) fail('POSTGAME_WIKI_CHOICE_HANDLE_UNAVAILABLE', { handle });
      return { handle, ...clone(page), cached: seen.has(handle) };
    });
    if(input.learningContext?.discoveryMode==='autonomous_patterns_v1'){const active=new Set(projectWikiReadWindowV1(input.navigation,pages).active.map(p=>p.handle));const {chosen,deferred}=selectWikiReadBatchV1(results);return freeze({kind:'read',results:chosen,newPages:chosen.filter(r=>!r.cached),deferredHandles:deferred,reattached:chosen.some(r=>r.cached&&!active.has(r.handle))});}
    return freeze({ kind: 'read', results, newPages: results.filter(r => !r.cached) });
  }
  if(input.learningContext?.discoveryMode==='autonomous_patterns_v1'&&choice?.operation!=='retain'){
    const readiness=dispositionReadiness(pages,input.navigation,input.learningContext,input.factReview);
    if(!readiness.ready)fail('POSTGAME_WIKI_CHOICE_READING_REQUIRED',{missingKinds:readiness.missingKinds,nextOperation:'read'});
  }
  if (choice?.operation === 'retain') {
    if(['edits','patches','skillPatches','skillCreations','proposedChange'].some(k=>
      choice[k]!=null&&(!Array.isArray(choice[k])||choice[k].length)))
      fail('POSTGAME_WIKI_CHOICE_RETENTION_CONFLICT');
    const readiness = dispositionReadiness(pages, input.navigation,input.learningContext,input.factReview);
    // Saved requests keep their original contract. New requests distinguish
    // missing evidence from merely not having used the available read command.
    // Abstaining does not assert a factual finding or publish any strategy.
    // Still require actual Wiki/Skill reading; unread trajectories are recorded
    // as limitations rather than forcing a fabricated edit or more paid calls.
    const missing=input.learningContext?.discoveryMode==='autonomous_patterns_v1'
      ? readiness.missingKinds.filter(k=>!['trajectory','raw'].includes(k)):readiness.missingKinds;
    if (input.readingPolicy === POSTGAME_WIKI_READING_POLICY_V1 && missing.length) {
      fail('POSTGAME_WIKI_CHOICE_READING_REQUIRED', { missingKinds: missing,
        nextOperation: 'read', instruction: 'Choose available index handles; no change is required after reading.' });
    }
    return freeze({ kind: 'final', result: { skillPatches: [], mementos: [],
      retentionReason: text(choice.reason, 'reason') } });
  }
  if (choice?.operation === 'create' && input.navigation.protocolVersion === POSTGAME_WIKI_NAVIGATION_V2) {
    if (pages.get(choice.basisSkillHandle)?.kind !== 'skill' || !seen.has(choice.basisSkillHandle)) {
      fail('POSTGAME_WIKI_CHOICE_TARGET_NOT_READ');
    }
    const topics = boundWikiTopics(choice,pages,seen);
    const creation = { basisSkillHandle: choice.basisSkillHandle, wikiTopicHandles: topics };
    for (const field of ['title', 'description', 'expectedBenefit', 'knownRisk']) creation[field] = text(choice[field], field);
    for (const field of ['steps', 'applicableWhen', 'reviseIf']) creation[field] = selected(choice[field], field);
    // Handles are sets; an ordered procedure is not. Repetition may be the
    // author's intended check/action sequence and must survive compilation.
    creation.steps = clone(choice.steps);
    requireFactualValuesRevised(input,pages,[]);
    return freeze({ kind: 'final', result: { skillPatches: [], mementos: [], skillCreations: [creation] } });
  }
  if (choice?.operation !== 'edit') fail('POSTGAME_WIKI_CHOICE_OPERATION_INVALID');
  const skill = pages.get(choice.skillHandle);
  if (skill?.kind !== 'skill' || !seen.has(choice.skillHandle)) {
    fail('POSTGAME_WIKI_CHOICE_TARGET_NOT_READ');
  }
  const topics = boundWikiTopics(choice,pages,seen);
  if (!Array.isArray(choice.edits) || !choice.edits.length) fail('POSTGAME_WIKI_CHOICE_EDIT_REQUIRED');
  const fields = new Set();
  const inputEdits = input.editMode === POSTGAME_INCREMENTAL_EDIT_V2
    ? [...choice.edits.reduce((groups,e)=>{const existing=groups.get(e.sectionHandle);if(existing&&Array.isArray(existing.patches)&&Array.isArray(e.patches)&&!e.value&&!existing.value)existing.patches.push(...clone(e.patches));else if(existing)fail('POSTGAME_WIKI_CHOICE_SECTION_INVALID');else groups.set(e.sectionHandle,clone(e));return groups;},new Map()).values()]
    : choice.edits;
  const edits = inputEdits.map(edit => {
    if (edit.skillHandle && edit.skillHandle !== choice.skillHandle) fail('POSTGAME_WIKI_CHOICE_MULTIPLE_SKILLS');
    if (!skill.body.editableSections.some(s => s.handle === edit.sectionHandle)
      || fields.has(edit.sectionHandle)) fail('POSTGAME_WIKI_CHOICE_SECTION_INVALID');
    fields.add(edit.sectionHandle);
    return { skillHandle: choice.skillHandle, sectionHandle: edit.sectionHandle, ...compilePostgameIncrementalEditV1({ material: skill.body, edit, editMode: input.editMode }),
      wikiTopicHandles: topics, applicableWhen: selected(choice.applicableWhen, 'applicableWhen'),
      reviseIf: selected(choice.reviseIf, 'reviseIf'),
      expectedBenefit: text(choice.expectedBenefit, 'expectedBenefit'), knownRisk: text(choice.knownRisk, 'knownRisk') };
  });
  requireFactualValuesRevised(input,pages,edits);
  return freeze({ kind: 'final', result: { skillPatches: edits, mementos: [] } });
}
