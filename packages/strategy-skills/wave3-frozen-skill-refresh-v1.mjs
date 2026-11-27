import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as pack } from '../../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs';
import { seal, verifySeal } from '../skill-production/common.mjs';
import { verifyRosterPlanV1 } from '../roster-strategist/roster-plan-contracts-v1.mjs';

export function compileFrozenWave3SkillRefreshV1(root, manifest) {
  const read = ref => JSON.parse(readFileSync(path.join(root,ref), 'utf8'));
  const compiled = 'build/ticket-28-wave3-source-candidate-20261112-v1/compiled/';
  const faq = read('content/source-releases/wave3-20261112-faq-delta-v1.json');
  const { revisions } = read(compiled + 'import-ledger.json');
  const { diff } = read(compiled + 'staged-review.json');
  const dataset = read(compiled + 'dataset.json');
  verifySeal(pack);
  assert.equal(revisions[0].normalizedDatasetHash, pack.sourceBinding.dataset);
  assert.equal(revisions.at(-1).normalizedDatasetHash, dataset.datasetHash);
  assert.equal(dataset.datasetHash, manifest.source.datasetHash);
  assert.equal(diff.fromRevisionHash, revisions[0].revisionHash);
  assert.equal(diff.toRevisionHash, revisions.at(-1).revisionHash);
  assert.equal(faq.sourceBinding.current.byteHash, manifest.source.references.faq.byteHash);

  const changes = new Map();
  const added = [];
  const reviewedKeys = new Set(diff.changes.map(row => row.recordKey));
  const official = 'official_current_product_candidate';
  for (const collection of Object.values(read(compiled + 'semantic-diff.json'))) {
    for (const row of collection.added.filter(row => row.authorityDisposition === official)) {
      assert(reviewedKeys.has(row.recordKey));
      added.push(row.recordKey);
    }
    for (const row of [...collection.modified, ...collection.removed].filter(row => row.authorityDisposition === official)) {
      assert(reviewedKeys.has(row.recordKey));
      const fields = row.fields?.filter(({ field, before, after }) =>
        !['timestamp', 'updatedAt', 'createdAt', 'upvotes', 'frontUrl', 'backUrl'].includes(field.split('.')[0]) &&
        !(typeof before === 'string' && typeof after === 'string' && before.trim() === after.trim()));
      if (fields?.length || !row.fields) changes.set(row.recordKey, { kind: row.fields ? 'modified' : 'removed', fields });
    }
  }
  for (const row of faq.rows) {
    const dependency = faq.dependentRetainedEntries.find(entry => entry.currentEntryId === row.currentEntryId);
    if (row.previousEntryId && (row.disposition === 'revised' || dependency)) {
      changes.set(row.previousEntryId, { kind: 'faq', currentRef: row.currentEntryId, question: row.question,
        previousAnswer: row.previousAnswer, effectiveAnswer: row.effectiveAnswer, dependency });
    }
  }
  function sourceKeys(section) {
    const refs = new Set();
    function collect(value) {
      if (Array.isArray(value)) return value.forEach(collect);
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (['requiredSourceRefs', 'sourceRefs', 'ruleRefs'].includes(key) && Array.isArray(child)) {
          for (const ref of child.filter(item => typeof item === 'string')) {
            refs.add(ref.replace(/^source:/, '').replace(/^faq-v1:(\d+)$/, (_, n) => 'faq-v1:' + n.padStart(2, '0')));
          }
        } else collect(child);
      }
    }
    collect(section);
    return [...refs].sort();
  }
  const sections = [];
  const parents = new Map();
  let pilot;
  for (const entry of pack.entries) {
    const skill = verifySeal(read(entry.skillPath));
    assert.equal(skill.hash, entry.skillHash);
    parents.set(entry.skillId, skill);
    const field = skill.knowledge ? 'knowledge' : 'procedure';
    skill[field].forEach((section, index) => {
      const refs = sourceKeys(section);
      const directChanges = refs.filter(ref => changes.has(ref));
      const result = { skillId: entry.skillId, parentHash: skill.hash, section: field + '/' + index,
        axis: section.section?.axis ?? section.axis, sourceRefs: refs, directChanges,
        status: directChanges.length ? 'review_changed_sources' : 'no_direct_match_requires_coverage_review' };
      sections.push(result);
      if (!pilot && entry.factionRecordKey === 'tactical_cards:terran_armed_forces' &&
          directChanges.some(ref => changes.get(ref).fields?.some(f => f.classification === 'cost_or_eligibility'))) {
        pilot = { ...result, sourcePath: entry.skillPath, previousText: section,
          changedFacts: directChanges.map(ref => ({ ref, ...changes.get(ref) })),
          task: '逐条核对旧建议依赖的资源、编制和单位事实。保留仍适用的条件，给出需要修改的建议及其来源。比较尚未测量时标为待验证；提交章节修订候选。' };
      }
    });
  }
  assert(pilot, 'Expected an existing Terran section citing a changed cost');
  const oldFactions = new Set(pack.entries.map(entry => entry.factionRecordKey).filter(Boolean));
  const unrepresentedFactions = Object.values(dataset.recordsByKey).filter(row =>
    row.collectionId === 'tactical_cards' && row.authorityDisposition === official &&
    row.payload.isFactionCard && !oldFactions.has(row.recordKey)).map(row => row.recordKey).sort();
  const binding = { sourceCapturedAt:dataset.sourceCapturedAt, originalPackHash: pack.hash, originalDatasetHash: pack.sourceBinding.dataset,
    candidateDatasetHash: dataset.datasetHash, faqByteHash: faq.sourceBinding.current.byteHash, importDiffHash: diff.diffHash };
  const affected = sections.filter(section => section.directChanges.length).length;
  const general = pack.entries.find(entry => entry.role === 'general').skillId;
  const factionSkill = recordKey => 'starcraft-tmg.faction.' + recordKey.split(':')[1];
  const jobs = pack.entries.map(entry => ({
    role:entry.role, skillId:entry.skillId, parentHash:entry.skillHash,
    requires:entry.role === 'general' ? [] : entry.role === 'faction' ? [general] :
      [general, factionSkill(entry.ownFaction), factionSkill(entry.opponentFaction)],
    sections:sections.filter(section=>section.skillId===entry.skillId)
      .map(({section,axis,status})=>({section,axis,status})),
  }));
  for (const key of unrepresentedFactions) {
    jobs.push({role:'faction',skillId:factionSkill(key),parentHash:null,requires:[general],
      sections:[{section:'faction-scope',axis:'faction_scope',status:'needs_new_coverage'}], factionRecordKey:key});
  }
  const order = {general:0, faction:1, matchup:2};
  jobs.sort((a,b)=>order[a.role]-order[b.role] || a.skillId.localeCompare(b.skillId,'en'));
  const preparation = seal({schema:'wave3_skill_preparation_v1',releaseHash:manifest.manifestHash,binding,
    jobs,stage:'prepared',runtimeAccepted:false,published:false});
  function sectionInput(skillId, sectionKey) {
    const job=preparation.jobs.find(row=>row.skillId===skillId);
    const unit=job?.sections.find(row=>row.section===sectionKey);
    if (!unit) return null;
    const section=sections.find(row=>row.skillId===skillId && row.section===sectionKey);
    const [field,index]=sectionKey.split('/');
    const refs=section?.sourceRefs ?? [job.factionRecordKey];
    const factChanges=(section?.directChanges??[]).map(ref=>({ref,...changes.get(ref)}));
    return seal({schema:'wave3_skill_section_input_v1',preparationHash:preparation.hash,skillId,
      section:sectionKey,axis:unit.axis,disposition:unit.status,parentHash:job.parentHash,
      previousSection:section ? parents.get(skillId)[field][Number(index)] : null,
      requiredSources:refs,changedFacts:factChanges,
      factionSource:job.factionRecordKey ? dataset.recordsByKey[job.factionRecordKey] : null,
      runtimeAccepted:false,published:false});
  }
  function factionChoicesForSection(skillId) {
    const entry = pack.entries.find(row => row.skillId === skillId);
    if (entry?.role === 'matchup') return [entry.ownFaction, entry.opponentFaction];
    const faction = entry?.factionRecordKey ?? jobs.find(job => job.skillId === skillId)?.factionRecordKey;
    return faction ? [faction] : [];
  }

  function inspectFactionChoice({ packet, faction, recordKey, builder, setup }) {
    const factions = factionChoicesForSection(packet.skillId);
    if (!factions.includes(faction)) return null;
    const choices = builder.enumerateArmyBuildingChoices({
      factionRecordKey: faction, scaleId: setup.scale, mineralBudget: setup.minerals,
    });
    assert.equal(choices.releaseBinding.normalizedDatasetHash, binding.candidateDatasetHash);
    assert.equal(choices.releaseBinding.sourceSnapshotHash, dataset.sourceSnapshotHash);
    const eligible = [...choices.unitCandidates, ...choices.tacticalCandidates];
    let selection = null;
    if (recordKey !== null) {
      const option = eligible.find(row => row.recordKey === recordKey);
      if (!option) return null;
      const source = dataset.recordsByKey[recordKey];
      assert.equal(source.authorityDisposition, official);
      selection = { option, sourceRecordHash: source.sourceRecordHash, officialProfile: source.payload };
    }
    return seal({ schema: 'wave3_skill_section_faction_choices_v1', sectionInputHash: packet.hash,
      preparationHash: preparation.hash, releaseHash: preparation.releaseHash, roomRelease: choices.releaseBinding,
      setupId: setup.id, faction, scale: setup.scale, mineralBudget: setup.minerals,
      menuReceiptHash: choices.receiptHash, legalityNote: choices.legalityNote,
      ...(selection ? { selection } : { candidates: eligible.map(row => row.recordKey) }),
    });
  }

  function inspectHistoricalPlan(plan, setup) {
    verifyRosterPlanV1(plan);
    const origin = plan.provenance;
    if (!origin || origin.normalizedDatasetHash !== binding.originalDatasetHash) {
      throw Error('WAVE3_PLAN_REFRESH_ORIGIN_UNSUPPORTED');
    }
    const army = plan.rosterCandidate;
    const components = new Map();
    function include(recordKey, instanceId) {
      if (!components.has(recordKey)) components.set(recordKey, new Set());
      if (instanceId) components.get(recordKey).add(instanceId);
    }
    include(army.factionRecordKey);
    for (const card of army.tacticalCardRecordKeys) include(card);
    for (const unit of army.units) include(unit.recordKey, unit.unitInstanceId);
    for (const purpose of plan.componentPurposes) include(purpose.recordKey, purpose.instanceId);
    const directChanges = [...components].filter(([key])=>changes.has(key)).map(([recordKey,instances])=>({
      recordKey, instances:[...instances].sort(), change:changes.get(recordKey),
      purposeHashes:plan.componentPurposes.filter(row=>row.recordKey===recordKey).map(row=>row.purposeHash),
    }));
    const mission = origin.missionBinding;
    const layout = ['missionRecordKey','deploymentRecordKey'].map(key=>({
      key, previous:mission?.[key]??null, selected:setup[key], sameRecord:mission?.[key]===setup[key],
    }));
    return seal({schema:'wave3_historical_plan_impact_v1', planHash:plan.planHash, releaseHash:manifest.manifestHash,
      originalDatasetHash:origin.normalizedDatasetHash, currentDatasetHash:dataset.datasetHash,
      referencedRecords:components.size,directChanges,layout,
      previousSkillVersions:plan.provenance.skillVersions, measuredToolReceipts:plan.toolReceiptReferences.length,
      reviewSections:{
        resourceBudget:directChanges.filter(row=>row.change.kind==='removed'||row.change.fields?.some(f=>f.classification==='cost_or_eligibility')).map(row=>row.recordKey),
        componentPurposes:directChanges.flatMap(row=>row.purposeHashes),
        scoreRoute:layout.some(row=>!row.sameRecord)?'changed_setup_requires_review':'review_current_objectives',
        deploymentConcept:'review_paths_against_current_geometry',opponentHypotheses:'review_against_current_opponent_information',
      },status:'requires_applicability_review',runtimeAccepted:false,canStartMatch:false,trainingTruth:false});
  }
  return {inspectHistoricalPlan, factionChoicesForSection, inspectFactionChoice, impact:{binding,existingSkills:pack.entries.length,sectionCount:sections.length,affected,unrepresentedFactions,
    officialAdditionsForDiscovery:added.sort(),sections,coverage:'按旧章节显式来源匹配；间接影响和无来源的章节须单独审核。'},
    pilot:{binding,qualification:'generation_input_only',...pilot},preparation,sectionInput};
}
