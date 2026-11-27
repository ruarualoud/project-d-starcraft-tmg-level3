// Product intent only. Candidate deltas, Native audits and the author remain
// the existing pipeline; a focus is not an automatic purchase or score.
export const ROSTER_PLANNING_ENTRIES_V1=Object.freeze(['balanced','card_synergy','restructure']);
export function normalizeRosterPlanningEntryV1(value='balanced'){
 if(!ROSTER_PLANNING_ENTRIES_V1.includes(value))throw Object.assign(Error('ROSTER_PLANNING_ENTRY_INVALID'),{code:'ROSTER_PLANNING_ENTRY_INVALID'});return value;
}
export function projectRosterPlanningEntryV1(draft){
 const selected=normalizeRosterPlanningEntryV1(draft.planningEntry);
 return {version:1,selected,armyEditable:draft.mode!=='fixed',
  entries:[
   {id:'card_synergy',goal:'从冻结卡牌的真实能力及其条件，提出与单位用途相配合的路线；同时比较原方案。卡牌槽位并不等于完整能力。',
    sequence:['读取所选卡的完整冻结规则（能力、支付、时机）','明确受益单位、目标和代价，选择具体单位／卡／升级组合','builder_audit + candidateEdits 审计完整候选；需要补位时 builder_branches','只有比较依赖测量时才用 candidate_context 创建明确局部场景','作者选择采纳或有理由保留，并同步 Plan'],
    sourceIndex:'builder_menu_source_coverage.ruleSources；仅导航，未读规则不可当作证据'},
   {id:'restructure',goal:'允许在已有2000矿时重新分配资源，不把初稿单位当成必留项。先声明比较目标和要保持的部分。',
    sequence:['使用当前表或已保存候选作为明确基线','在 candidateEdits 指定删单位、删／加升级、移除／加入卡、替换单位；Host保留其他项目','builder_branches 对编辑后的基线有限补位：preserveUnitIds 保持指定单位不变，excludedNewUnitRecordKeys 不再新增指定类型；或 builder_audit 审计完整替代','比较真实预算、用途和必要的局部测量','作者提交联合军表／Plan修订，或有依据保留原案'],
    tools:['builder_audit','builder_branches','candidate_context'],
    exactEditFields:['unitIdsToRemove','unitsToUpsert','unitUpgradeEdits','tacticalCardEdits'],
    bounds:'候选页非穷举；旧加法菜单未列出不代表无法替换。满分不关闭比较窗口。'}],
  instruction:draft.mode==='fixed'?'军表不可修改；能力组合只能用于当前表的Plan，替换仅作为未来写表建议。':'入口提供可选的策略探索方法，不要求无穷比较、花满气或强制替换。模型选语义值，Host编译候选和引用；Native审计不是战略优劣判定。'};
}
