# T27 / S272：局部战略选择与下一项事实调查不能互斥（v800）

接续 [v799 作者选择消费](ticket-27-slice-272-author-resolution-v799-2026-10-21.md)。所属 P1/P2/P5；T27 5/6、T23 33/36、余四片。最终验收 Plan 0/6、对局 0/12，不能用本次门禁代替最终产物。

## 真实停点与根因

- 原产品 lqMWaS 停于 e5841 / w566 / r3，无在途请求，PID65040 已退出。
- 最新请求 `302e37ab34bdc214ee7c41d4674701b7b22bea8bb9b8b83d456b97a2802a410f`，回复 `93f36313272036eeeb2d3454a38bae2dbe12e0357d562c156487ee3fe41bc863`；同故障复现回复 `e88720df5d4734761dc9bd9641f3151cbb4f5103733f455232b5ebc424ff9fe8`。
- 模型保留已有局部用途选择，同时提出调查正式军表1490、尚缺510分的事实。它仍把下一动作标为 retain，但又给出 nextInvestigation，因此原事实调查校验正确拒绝。
- 更重要的是，改成调查也无法满足另一合同：v797 的 decided_here 只允许 retain/revise，而调查合同要求 investigate/revise。这令“已有局部决定＋另一事实仍待查”的正常组合无法表达。不能继续要求模型在冲突指令中重试。
- v799 的实际作者返回消费效果尚未证明：旧进程退出前已多派发一次作者，本次首先修这个新作者遇到的合同冲突，不回写旧结果。

## 修复与权限边界

1. decided_here 是逐题状态；disposition 是下一操作。允许调查其它 necessary_fact 时保留已作出的局部决定。
2. prompt 与校验同步说明，不能为了保留选择就删掉事实问题或把调查标成 retain。实际军表／Plan 修改仍必须走结构化操作。
3. 原调查校验继续要求显式问题编号、目的、新观察和停止条件；不允许把已解决问题当成必要事实重复查。
4. 恢复只匹配实际旧请求缺少此合同、且具体输出呈现此冲突的停点。仅用隔离候选判定缺陷适用性，不修改模型原回复；仍由模型纠正。新合同失败不能再次获得同一恢复授权；历史计数、失败和费用保留。

## 一次红绿验证

脚本：`scripts/verify-slice272-choice-with-investigation-v800.mjs`。

- RED：取真实回复，只在隔离夹具将下一动作改成 investigate；事实调查校验通过，decided_here 校验却拒绝。
- 修复后一次 GREEN：两合同一致；保留1项必要事实和2项明确决定。缺少调查、调查已决问题、非作者动作仍拒绝。
- 实际停点可获一次旧合同修复；有新合同标记的相同请求不能再次获授权。
- 0 测试真实 Provider／Native／生产写；原回复未改；不重跑 v797、v798、v799 等已通过门。

## 真实执行

PID76046 用原产品入口恢复同一 lqMWaS，日志 `build/slice272-product-generation-v800-partial-owner-choice.log`。已确认初始化为 `roomReinitialized=false`。模型纠正和后续来源修订结果待记录，当前正式表仍1490分，不能宣称2000候选已应用。

## Harness 与最终 diff

- harnessLoopUsed：true；targetGames：StarCraft TMG，冻结数据不变。
- promptPackRoutes：战略作者逐题选择 → 显式事实调查；来源修订仍走独立审核。
- harnessToolsCalled：原件读取、原调查校验、原产品 resume；无新 UI 验收。
- agentDecisionEvidence：上述真实回复；开发者未替模型填写选择或军表。
- memoryTraceEvidence：保留已有局部决定、必要未知、旧失败、原始请求回复及费用。
- trainingTraceCandidates：仍未通过完整策略／覆盖审核，不晋级正式 Skill 或对局记忆。
- rollbackOrDemotionRules：实际调查范围和来源审核不放宽；新合同无重复恢复资格。
- userVisibleChecks：局部选择不再阻断其它必要调查；最终军表与 Plan 尚待产出。
- 生产修改：author-handoff（逐题状态）、fact-inquiry（纠错说明）、read-role（prompt/版本/定点恢复识别）、product-journey（恢复原因）。新增一个具体缺陷测试及本文，更新任务入口；不提交 Git、不改规则数据或其它项目。
