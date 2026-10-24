# P5：比较结论的来源作用域与定点复核

T27/S272，新流程验收修正。最终Plan0/6、对局0/12、剩余4片；不是最终报告或稳定性声明。

## 发现的真实错误

- [596回复](../build/slice272-projection-owner-v565-inlKbk/596.reply.json)把两组36样本攻击分布的差值称为Medic带来的约+0.61期望伤害／+5.55个百分点击杀率；又把一条Marauder攻击估计写成多单位合计。
- 原生回执1124/1138的`attackEstimates[].reactionOpportunitySet.baselineOutcomeDistributionExcludesOptionalReactionEffects`明确为true。该基线不包含Medic可选反应；数值差异不能作为其减伤／治疗收益。单个攻击者条目也不等于联合顺序攻击。
- [590首次审核](../build/slice272-projection-owner-v565-inlKbk/590.reply.json)拦住覆盖不足，却放过了因果归因；[599审核](../build/slice272-projection-owner-v565-inlKbk/599.reply.json)随后错误通过。不能将这条通过当真实策略准出。
- 原始Medic材料还区分Movement主动Medpack、受伤触发Life Support、DEBUFF触发Restoration；不能把三者都描述成相同触发／目标条件。

## 产品修正

1. 原件不改。来源测量索引升级投影版本2，把实际`precision/uncertainty/assumptions`和可选反应排除标记放在伤害数字旁，原反应详情仍可精确读取。
2. 新索引使用`:v2`身份；旧`:v1`和已保存审核原样保留，不在同一ID下替换内容。
3. 独立来源审核v3明确检查：数值与因果分别成立；原生基线排除的效果不能归因；单攻击者不是联合火力；技能阶段／触发／目标／支付须与原件一致。仅加“条件性”不能免除错误归因。
4. 允许对一个明确旧回答建立独立、带工程修复身份的来源复核。评估器采用该回答最新的显式来源审核；新复核待完成或拒绝时不再沿用旧通过。其他回答及已过P3门不重跑。
5. 同Run驱动通过既有产品`publishEvidence/enqueue`接口安排`--recheck-component-comparison-scope`；一条修复身份只安排一次，冷启动复用已有复核，不重置次数／费用／军表／Plan。

## 定点验证

- `verify-slice272-comparison-proof-scope-v594.mjs`：实际原件可选反应排除true在旧投影丢失，RED；修后一次GREEN，保留源对象及采样范围，审核必须包含因果／汇总／技能条件。
- `verify-slice272-source-recheck-v595.mjs`：原599通过会覆盖待审复核，RED；修后一次GREEN，待审／拒绝阻止策略采纳，旧审核与原件不变，新投影不别名旧v1。
- 门中0Provider／生产写；只证明投影与复核路由，不证明真实模型已正确改写。没有重跑其他已通过门。

## 运行与下一步

PID30072完成606／当前advance后优雅退出；PID41533以v594–595继续同一`inlKbk/projection-owner`，日志`build/slice272-live-p5-v595.log`，仅追加上述组件回答复核。请核对活进程／日志，不凭PID文字假定存活。

还须观察实际复核→来源修订→必要Medic防御事实和其余取舍→两域通过→联合军表／Plan修订。地图调查仍未完成，未启动Web新生成或对局。

### 实际608–619及未收敛项

- 608真正读到新的原生作用域，拒绝把采样差异归因Medic，回交来源修订；616已明确撤回该因果说法。这是实际修正证据。
- 但是616仍将Marauder一行的10.056写成Marauder+Raynor+Marine2合计，同时又说它们是per-attacker；619整体审核仍错误通过该矛盾。另有Medpack主动阶段／反应触发的混述。不能把该绿色状态计为有效事实域准出。
- 当前整包审核已显示不能可靠完成逐主张核对。不追加同样大包盲审；下一P5交付是：以616段落和1168真实逐攻击者来源先做小块事实审核可行性，然后接入必要逐主张检查与反馈，再检验修订。旧回复和旧审核原样保留，不手改成通过／失败。
- PID41533已完成619/current advance后优雅退出；running0、draft仍r2、acceptanceGranted=false、joint-decision尚未创建。停的是危险自动推进，不是用户暂停或目标阻塞；继续开发上述P5，不启动对局或新Web生成。
- 至619：本Run24,572,423 Tokens／估USD5.654346312；项目已知131,138,889 Tokens，旧未知费用保留。

### 本次升级引入的目录回退已定点修正，尚未加载

实际608发送941,515字符，其中available_evidence_directory850,451字符／1197项。原因是read-role只对来源审核version===2启用精简目录，新增v3回退到全局历史。

`verify-slice272-source-review-directory-v596.mjs`在真正模型派发前捕获保存608的重新组装请求：RED复现；将门改为具备来源索引能力的版本（>=2）后一次GREEN，目录21,086字符／33项，assigned inputs、exact reads和assigned references逐值相同，0Provider／生产写。仅减少无关目录，不是新的模型策略等价试验。不要重跑已通过门；后续加载应在上述P5可行性／实现时一次完成。

至606：本Run22,985,296 Tokens，冻结价估USD5.242940760；项目已知129,551,762 Tokens。607+不在本小计，旧未知费用保留。

## Harness记录范围

- harnessLoopUsed:true；targetGames:StarCraft TMG。
- promptPackRoutes:experiment_planner → fact_summary → source_review → source_revision；最终strategy_decision尚未发生。
- harnessToolsCalled:本次门只读取保存Native／Builder回执，真实持续生产仍使用同产品工具；没有替代Rules或模拟成功。
- agentDecisionEvidence:596/599原件；修后实际回复待观察。uiTraceEvidence:本次未做UI验证。
- memoryTraceEvidence:同问题证据目录v593；原结果／费用保留。
- trainingTraceCandidates:无新增准入，trainingTruth:false。
- rollbackOrDemotionRules:任何因果／聚合／技能条件不符均拒绝来源通过，待复核不得沿用旧准入。
- userVisibleChecks:最终中文军表／Plan及逐步报告仍待，不以本文替代。
