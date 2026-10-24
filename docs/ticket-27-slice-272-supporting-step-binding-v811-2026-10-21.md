# T27 / S272：辅助步骤的比较身份继承

P2/P3/P5；继续新P0–P6产品流程。T27 5/6、T23 33/36、剩余4片；最终Plan0/6、对局0/12。

## 本次真实错误

v810已真实完成预审→方法交接，但随后辅助几何修复收到矛盾合同：允许`comparisonBinding=null`继承父身份，实际编译却拒绝`assigned_comparison_requires_binding`。

实际失败工作：`…:purpose:v3:study:order0:scene-current:input-repair:order-repair0:order-repair0:order-repair0`；结果`77f1bd7ba027791c1c93ea3f3a321391514b0560266071caf35763c073bde164`；真实请求`1f116ccd10ec0d993eab43d0c4a185331afc417e4cc33716cb22ea8db92b3f19`，回复`3402137fddc12c9c00aa3a4eeab48adfe7c9599624441a1f64418e651eeb7574`。

三个待区分原因：父身份丢失、身份已交付但资格判断误拒、来源版本不一致。实际请求已交付完整`delegatedComparison`；比较源1159/分臂current准确；其中`stage=baseline`描述整个工作单，`role=supporting_step`准确描述scene-current。错误是解析器把辅助步骤继承资格额外限定成父工作单必须stage=prerequisite。Native几何失败本身是正常条件返回，不是这次修复要伪造通过的对象。

## 源修复

1. `roster-comparison-observation-v1.mjs`按步骤role与原observationStepIds判断继承资格，不再把整个实验阶段误作步骤职责。baseline/effect_endpoint里的辅助步骤也可继承，但子工作仍固定为prerequisite、observationStepIds=[]、endpointReached=null、sourceApproved=false。真正observation_candidate不能套用；父源、分臂及显式绑定冲突仍拒绝。
2. `roster-workflow-laboratory-v1.mjs`纠正空间参数错误说明：真实订单把unitId填在queryKind旁，编译器读取queryArguments内而报“缺unitId”。现在同时报告misplacedTopLevelFields、expectedEnvelope及保留实际值的结构示例。Host不移动/补写参数，模型自行修订；完整Native字段形状仍需遵守。
3. `roster-decision-workspace-run-v1.mjs`为这个可核对旧身份误拒提供一次受控纠错：必须是当前未执行工作、原错误确为绑定误拒、精确父身份为baseline/effect辅助步骤，新编译已越过该错误且仅暴露实际参数层级错误。保留原错误并交付remainingInputError；不放行执行、不清轮数/费用，不能再次获得此恢复。

## 定点验证

`node scripts/verify-slice272-supporting-step-binding-v811.mjs <原Run工作流目录>`：

- RED复现真实原付费工作单的绑定误拒。
- 源修复后一次GREEN，约1.3秒，退出0。
- 覆盖三种父阶段里的辅助继承、不得提升成观察结果、来源/分臂冲突拒绝、原始工作单不改、下一个真实参数错误准确保留、仅一次有界恢复。
- Provider0、Native0、生产写0；未重跑v810或其他已过门，不跑全量。

此门验证职责/错误接线，不证明场景合法、伤害测量完成或策略提升。

## 实际运行

确认同类绑定失败三次后对PID97956发SIGTERM，等待当前操作结束。最终退出，无pending/running，e6754/r4。没有强杀在途模型、手改回复或重置账本。

PID19623加载v811续同Run `slice272-product-generation-v645-lqMWaS`；日志`build/slice272-v811-live-1792562995492.log`。仍通过Web/App相同产品组合，原r4/2000矿170气不变。下一观察模型是否自动纠正参数层级、完成原Native几何和基线测量；两个备选及最终取舍仍待。

## Harness边界

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=bounded method→input repair→Native→source review→strategic owner。harnessToolsCalled为原场景/静态编队接口，定点验证不执行Native。agentDecisionEvidence是以上原请求/回复与续跑记录；uiTraceEvidence本次无新增浏览器验收；memoryTraceEvidence保留父任务/原失败，不写真实对局记忆；trainingTraceCandidates=false。rollbackOrDemotionRules：若继承能改分臂、伪造观察或重复恢复则阻止准出；userVisibleChecks：最终表/Plan仍未完成。
