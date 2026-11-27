import {projectActiveSandboxEvidenceForModelV1} from './active-sandbox-evidence-projection-v1.mjs';
import { createHash } from 'node:crypto';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { normalizeProviderVisualInputsV1 } from '../secure-provider-runtime/provider-visual-input-v1.mjs';

// Called with the observation returned by sandbox.observe, not model arguments.
// Session/profile/turn identity remains Host-owned; the ordinary durable
// Provider gateway owns reservations, dispatch and settlement.
export function compileActiveSandboxProviderArtifactV1({observation, sessionId, sessionBindingHash}) {
  if (!observation?.turnId || !['player1','player2'].includes(observation.seat)
    || !Array.isArray(observation.content)) throw new Error('SANDBOX_PROVIDER_OBSERVATION_REQUIRED');
  const texts = observation.content.filter(part => part.type === 'text');
  const images = observation.content.filter(part => part.type === 'image');
  if (texts.length !== 1 || images.length !== 1
    || observation.content.length !== 2) throw new Error('SANDBOX_TEXT_AND_FRAME_REQUIRED');
  const visualInputs = normalizeProviderVisualInputsV1(images.map(image => ({
    mimeType:image.mimeType, data:image.data,
    sha256:createHash('sha256').update(Buffer.from(image.data,'base64')).digest('hex'), detail:'high',
  })));
  const role=observation.role||'action';
  const instructions={
    action:'图片用于观察；数值和合法性以同状态Rules工具为准。完整单位资料用query:{kind:"read_unit",unitId}；availableQueries列出的空间工具用query:{kind:"spatial",queryKind,arguments}；攻击概率用query:{kind:"attack_probability",choice,parameters,sampleBudget?}，仅当前fight域的唯一目标。只给对象与语义参数，Host绑定房间状态。查询结论只证明工具明示范围，距离不等于能到达或能控制。否则返回decision:{choice,purpose,expectedConsequence}；只有菜单项带parameterContract时，增加parameters并按其字段选择语义值。Host绑定动作域与身份，不填写回执、骰子结果或状态。native-action-feedback只纠正指出的参数问题，保留其它选择，不重新设计整个实验。完整返回对象为 {"sandbox":{"decision":{...}}} 或 {"sandbox":{"query":{...}}}，二选一。只给公开理由，不输出隐藏思维链。已交付查询不要重复；未覆盖工具不代表动作非法。',
    design:'你是本轮探索设计者。针对可执行菜单和明确动作期限提出一个可观察的局部假设，可是弱假设但不得假装能模拟整场。回答sandbox.hypothesis，含goal/hypothesis/expectedObservation/disconfirmingObservation/limits五个非空文本；说明什么结果支持、推翻或无法区分。不能预先声称已观测。只给公开论证。',
    reflection:'你是本席经验写入者。先读native-observation-ledger中的实际动作和事件，再比较prior-model-beliefs中的原假设与预测。后者是未验证的主观解释，不是发生过的事情。回答sandbox.reflection，含condition/lesson/limitations三个非空文本，说明观察支持什么、没有测到什么。若实验没执行假设所需的动作，正常结束为未观察到，不补造因果或要求无限新实验。没有某事件只表示本段未观察到，不表示规则禁止。当前任务是解释这一段实测，不重做整体策略。只给公开论证。',
  };
  if(!instructions[role]) throw new Error('SANDBOX_PROVIDER_ROLE_INVALID');
  const shapes={action:{query:{kind:'read_unit OR spatial OR attack_probability',unitId:'for read_unit only: visible unit ID',
    queryKind:'for spatial only: one availableQueries entry',arguments:'for spatial only: semantic argument object',choice:'for attack_probability only: current fight choice',parameters:'for attack_probability only: Native fight parameters with one target allocation; Host derives targetUnitId',sampleBudget:'for attack_probability only: optional positive integer'},
    decision:{choice:'one exact semantic choice from current menu',parameters:'only for choices with parameterContract: semantic values matching that contract',purpose:'public purpose',expectedConsequence:'prediction, not fact'}},
    design:{hypothesis:{goal:'text',hypothesis:'text',expectedObservation:'text',disconfirmingObservation:'text',limits:'text'}},
    reflection:{reflection:{condition:'text',lesson:'text',limitations:'text'}}};
  const payload=JSON.parse(texts[0].text);
  if(role==='design'&&payload.designTiming==='learner_decision_v1')instructions.design=
    '你在自己的真实决策窗口设计局部探索。experimentScope来自当前Rules菜单，选其中自己能控制的选择，说明为了哪个当前目标、收益与代价、哪个观察会改变取舍。不要把“接口接受合法动作”当战略目标，也不要要求冻结对手按你的实验选择单位或行动。可只观察一个方案，但未执行替代方案就不能宣称更优。使用sandbox.hypothesis的goal/hypothesis/expectedObservation/disconfirmingObservation/limits五个文本字段，包含条件、可观察依据与未测边界；不填写Host身份或裁判事实，不扩展成整场模拟。';
  if(payload.experimentContract==='measured_sequence_v1'){
    instructions.design+=' 本次还必须在hypothesis内给experiment：plannedChoices按先后列当前可控菜单句柄；observations列timing=before/after/both和query。工程将测量结果保存并交给行动和反思，只有声明的动作实际发生且结算结束才算动作覆盖完成；有限上限或窗口结束可未测收口。测量优先使用availableQueries，完整单位变化可read_unit。attack_probability只用before、选择当前fight菜单choice及其语义parameters，唯一allocation已经选择目标，工程派生targetUnitId；显式填写时必须与该allocation一致；不要自己写domain/状态/骰子。需测接战/连续性就声明space.inspect_relationships的before/after。假设只覆盖这些动作和测量；单次无伤亡不能反驳更高期望，概率与实得随机结果分开。未执行替代方案不能宣称更优，也不要为本次单路径探索虚构替代分支。';
    shapes.design.hypothesis.experiment={plannedChoices:['current controlled choice, in intended order'],
      observations:[{timing:'before OR after OR both',query:'one complete object from queryForms; no unrelated fields'}]};
    instructions.action+=' prior-model-beliefs.experiment给出声明动作序列与进度，native-observation-ledger.experiment给出已送达测量。行动仍必须使用当前菜单；设计时的旧choice不能直接当当前choice使用。说明实际取舍；必要时可偏离计划，但不能把未执行项说成已测。attack_probability查询用{kind:"attack_probability",choice,parameters,sampleBudget?}，Host绑定当前动作域。';
    instructions.reflection+=' 先核对experiment.progress与measurements：哪些声明动作被观察、哪些测量有结果、是否有限提前结束。对查询保留exact/advisory/unknown原义；不能把一次随机输赢当期望证明，也不能只靠图片断言接战或连续性。完整动作覆盖只证明完成观察，不证明策略优越。';
  }
  if(role==='design'&&payload.designTiming==='learner_decision_v1'){
    instructions.design+=' 在提交hypothesis前，可以先返回sandbox.query查询当前单位、空间或攻击概率，格式与下方queryForms一致；结果交回同一设计角色，再决定假设。不要凭印象补命中/护甲/射程等数值；未读时可以先提出待核条件，不能当成已知事实。旧工具unknown不等于当前工具仍不可用。已送达的同一查询不要重复。';
    shapes.design.query=structuredClone(shapes.action.query);
    instructions.design+=' 如同一回复同时包含hypothesis和query，Host只保存为provisionalDesign并执行读取，不提交实验；读完后回到你，需再明确返回最终hypothesis才能开始行动。provisionalDesign是你此前未提交的草案，不是已证事实或审核意见。';
  }
  const {assets,assetManifest,deliveredFacts,deliveredExperiences,deliveredTrialEvidence,actionFeedback,observationLedger,priorBeliefs,...current}=payload;
  if(payload.experienceCatalogue?.length){
    const memoryInstruction=' experienceCatalogue是本席先前隔离探索的候选目录，尚未证明适用于当前局面。可返回sandbox.query:{kind:"read_experience",memoryId,part:"summary"}读取条件、未验证解释、原生观察摘要；若需原件，再选part:"evidence"和已返回的path。只选目录句柄，Host绑定原件。不要把历史unknown改成0或已解决，不把候选解释当规则，也不要因为旧局某次骰子就断言期望优越。已读经验可用于提出新假设或有依据保留，不能假装本轮已观察；不得重复同一读取。';
    if(role!=='reflection'){
      instructions[role]+=memoryInstruction;
      if(role==='design')Object.assign(shapes.design.query,{kind:shapes.design.query.kind+' OR read_experience',memoryId:'for read_experience only: own catalogue handle',part:'for read_experience only: summary OR evidence',path:'for experience evidence only: returned path'});
      else Object.assign(shapes.action.query,{kind:shapes.action.query.kind+' OR read_experience',memoryId:'for read_experience only: own catalogue handle',part:'for read_experience only: summary OR evidence',path:'for experience evidence only: returned path'});
    }else instructions.reflection+=' historical-conditional-experiences是上轮候选及其旧观察，本轮结果只来自native-observation-ledger；区分哪些旧假设被本轮支持、推翻或仍未测，不把检索当验证。';
  }
  const evidenceProjection=role==='reflection'&&observationLedger
    ?projectActiveSandboxEvidenceForModelV1(observationLedger):null;
  if(evidenceProjection){
    instructions.reflection+=' current-trial-measurement-inventory分别列本轮声明测量和已记录工具查询；未列查询只说明本账本没有记录，不是unknown结果或工具不可用。关系结论/精度/限制完整保留，deferred-current-trial-evidence只是移走重复地形原件，绝不表示地形不存在。需要核对时返回sandbox.query:{kind:"read_trial_evidence",evidenceRef,part:"catalogue",offset?}读取明确分页目录，再用part:"node",nodeId读原件。当前原件不会被重算，不重查已送达内容；旧经验仍不属于本轮事实。';
    shapes.reflection.query={kind:'read_trial_evidence',evidenceRef:'one deferred-current-trial-evidence reference',
      part:'catalogue OR node',offset:'catalogue only: optional nextOffset',nodeId:'node only: exact listed nodeId'};
  }
  const queryForms={readUnit:{kind:'read_unit',unitId:'visible unit ID'},
    spatial:{kind:'spatial',queryKind:'one availableQueries spatial queryKind',arguments:'that query semantic argument object'},
    attackProbability:{kind:'attack_probability',choice:'current fight menu choice',
      parameters:'Native fight semantic parameters with one target allocation; Host derives the measurement target',sampleBudget:'optional positive integer'}};
  const body = {schemaVersion:'starcraft_active_sandbox_provider_artifact_v1',
    sessionId, sessionBindingHash, promptPack:`active_visual_sandbox_${role}_${role==='reflection'?'v10':payload.designTiming==='learner_decision_v1'?'v9':payload.experimentContract==='measured_sequence_v1'?'v6':payload.designTiming==='learner_decision_v1'?'v4':'v3'}`,
    nodes:[{nodeType:'sandbox-contract',authority:'platform',content:{
      turnId:observation.turnId,seat:observation.seat,
      instruction:instructions[role],responseShapes:shapes[role],
      ...(payload.experimentContract==='measured_sequence_v1'?{queryForms}:{}),
    }},...(assets?[{nodeType:'frozen-strategy-assets',authority:'strategy_reference',content:assets}]:[]),
    ...(assetManifest?[{nodeType:'frozen-strategy-asset-manifest',authority:'asset_identity',content:assetManifest}]:[]),
    ...(priorBeliefs?[{nodeType:'prior-model-beliefs',authority:'unverified_model_belief',content:priorBeliefs}]:[]),
    ...(observationLedger?[{nodeType:'native-observation-ledger',authority:'native_evidence',content:evidenceProjection?.ledger||observationLedger}]:[]),
    ...(evidenceProjection?[
      {nodeType:'current-trial-measurement-inventory',authority:'native_measurement_index',content:evidenceProjection.measurementInventory},
      {nodeType:'deferred-current-trial-evidence',authority:'saved_native_evidence_index',content:evidenceProjection.deferredEvidence}]:[]),
    ...(deliveredTrialEvidence?.length?[{nodeType:'delivered-current-trial-evidence',authority:'saved_native_current_trial_evidence',content:deliveredTrialEvidence}]:[]),
    ...(deliveredExperiences?.length?[{nodeType:'historical-conditional-experiences',authority:'historical_observations_and_unverified_interpretations',content:deliveredExperiences}]:[]),
    ...(deliveredFacts?.length?[{nodeType:'native-query-results',authority:'native_evidence',content:deliveredFacts}]:[]),
    ...(actionFeedback?.length?[{nodeType:'native-action-feedback',authority:'native_contract',content:actionFeedback}]:[]),
    {nodeType:'user-message',authority:'user',content:{text:JSON.stringify(current)}}],
    visualInputs,
    responseContract:{allowedChannels:['sandbox'],decisionCandidateSource:'current_native_menu'},
    trainingTruth:false};
  body.responseContract.contractHash = hash(body.responseContract);
  return {...body,promptArtifactHash:hash(body)};
}
