# T18 / Slice 174：保留完整 Proposer 不确定事项的容量恢复

## 结论与边界

用户允许适当增加输出预算或分批。当前写作提纲/两条正文沿用已显式绑定的 8192 输出上限；Proposer 每批最多两条短计划、4096 输出上限，完整来源、全部原问题、完整答案和新 Judge 不裁剪。

c96 两族新失败不是输出截断：Zerg 744 输出 tokens、Terran 388 输出 tokens，均完整返回三条 uncertainties，却被旧 Provider V1 的最多两条限制拒收。不能删除第三条，也不能重抽整个计划。新机制只扩展 Host 的辅助数组容量，原 Provider V1 合同、失败记录、正文、编号、来源和费用全部保留。

本次不是新生产出的种族 Skill，也不是策略有效性验收。正式离线五件套仍 1/5，runtime 0/5；项目 16/22 tickets，Ticket 18 为 2/8 slices。Terran 已清已知来源问题的章节流程 6/7，Zerg 0/8；两族正式独立消费者评估尚未完成。

## 本次修复的三处边界

1. **付费结果恢复**：只有已结算、HTTP 200、完整输出、唯一失败路径为 `$.uncertainties` 数量超限的原始 sealed candidate 可以进入。重建完整 invocation、角色、上下文、合同和原费用回执。Host 允许最多 128 条辅助事项，每条仍最多 240 字符；正文最多两条、600 字符计划、精确目标编号、已分配来源及已知来源成员资格不放宽。
2. **续批和汇总**：显式辅助容量 binding 一直传到每批输出验证、下一批完整 priorBatches、native 请求重建和无损汇总。旧请求身份不因新的 Host 恢复政策而重发；旧默认验证仍拒绝三条事项。完整原文进入汇总，不从数组中裁掉事项。
3. **消费者和续跑**：恢复产物有自己的协议，原 Provider V1 失败不改为成功。独立消费者重新读取原失败样本、重建 materialization 和真实 DSH 导入回执；没有显式 recipe binding 则拒绝。c96 首次迁移必须绑定两条实际失败和零 Provider 验证，继承费用、旧角色和全部旧规则展示。

未来调用现场的同类失败走同一 Host 恢复分支。其他正文/来源错误、超出 Host 安全容量、截断和余额不足不自动套用此恢复。恢复是结构/传输机制，不回答原文中仍未证实的策略问题。

## 真实样本和已完成验证

- 父 run：`faction-v1-c96a15b1a09894a777f7`，已终态，不能原样重启。
- Zerg：`structured-0bdcb5476e0a6e6b16292e4816013dc9fa63bb1d3e38d6cd`，原回执 `bd4edd35c3ec2ac23b8f560e58b6f2e9deda0658d14b4bbe5366b82991959cab`。
- Terran：`structured-7534c9a380436dac92f1d0a9a269621dd3cf7162f195004e`，原回执 `7dad93c613594df171a1c3e1097c1a3e3119f610d62ba85c225bd20a699e34e6`。
- 新 Terran 只读完整回放通过六章及前四批计划，精确重建第七章最后一批实际请求与 invocation：`terran-proposer-auxiliary-diagnosis.json`，hash `2ab224943697e2595744f0c8071bfdd5229d7b8cd4c5177a5f7dffb7bcd1b60d`。
- 先写真实 Zerg 回归测试，观察旧实现 `FACTION_PROPOSER_BATCH_UNCERTAINTIES_INVALID`；修复后同一真实样本通过，新旧验证边界同时保留。
- 首版接线验证已通过 64 项、两个真实 DSH 零 Provider 导入、独立消费者回放和续批/汇总验证，报告 `ed1387448dba5cc992f6d43b92ed875841a835acce294d3cc71a3abd4181937a`。其中为验证 Zerg 最后批传播所注入的尾批不是已生产内容。
- 现场故障注入扩展已通过：最终 87 项、3 个真实 DSH 会话、0 个真实 Provider 调用，gate `2ccb32a9d74bd063404c12678fd7f3dcedaae068aeb2f6ab15d655d899107139`。覆盖完整 overflow 自动恢复、未知来源、超大辅助数组、截断、402、缓存不重收费及租约释放；其中现场传输使用五个明确标记的模拟 Provider 故障，不计入实际生产。额外六项显式迁移正负检查也通过。

本轮代码变化后只刷新受影响的 24/36 个既有启动门，另 12 个没有源码变化；这不是重新执行全量规则器，也不是新增 24 个开发切片。主入口尚未正式续跑，不能把这些工程验证计为章节生产进度。

2026-09-08 验证续记：workflow 77、续跑 40、预算 59、隔离并行、目录审查、editor 5、review 19 已完成。Proposer 新旧默认边界 35、native 42/3 真实 DSH、planning workflow 26/16 注入新审、planning migration 18 已通过。其余受影响门继续运行；上述模拟审查不是新生产的章节。

最后检查点：基础 native 44、容量 29、目标 ID 25、metadata 14 及 source/field/phase/transaction/DSH-context 回归已通过。选定启动门总数为 37（既有 36 加本次 auxiliary 1），34 已对齐，最后三个 target-completion/Teach-uncertainty/review-focus-capacity 在同一验证流水线运行。消费者准备 12/12 没有源码漂移；没有实际运行付费消费者评估或正式生产。

后续核实：上述尾检全部结束且通过，补答 16/3 真实 DSH、Teach 33/1 真实 DSH、focus 25；启动 37/37 门、146 文件哈希全部对齐，0 intent、0 payment-stop。开始从 c96 零付费预检（10285），尚未正式续跑。先验证依赖/历史/预算迁移，不能用静态 gate 代替实际 preflight。

预检已完成，`ready=true`、0 Provider，recipe `9200d037cfa6a1c4a388e9bb766210e6357111b72249e993e6e18ce345ca9cb1`。309 个历史角色可复用；本生产链继承 454 calls / 93,785,173 tokens / ¥70.783591，预算仍 1000 calls / ¥120 / 360M tokens / 7 days。第一未缓存角色准确落在 Terran 第七章最后一批已付费计划。已启动唯一 live 命令从 c96 续跑；实际恢复/新章节结果待观察，旧报告和费用不重置。

## 费用及下一步

本轮没有新增真实 Provider 调用。生产 SQLite 全局已知 API tokens 为 164,307,827，累计估算/预留 ¥137.089853，0 intent、0 payment-stop；下次 ¥200 提醒。该估算不是供应商最终账单。

下一步：完成现场恢复验证与受影响门 → 从 c96 零费预检 → 唯一正式续跑，恢复两条已付费计划并继续种族写作/来源审查 → 两族独立评估 → 正反对抗 → 真实位置关系 Harness、回放反思与版本化升级回归。后续 Harness 尚未因本次修复提前实施。

## Skill loop 记录

- `ctx2skillLoopUsed: true`；`targetGames: [starcraft-tmg]`；`roleRoutes: [rule_skill_builder, harness_optimizer]`。
- `skillsRead`：既有已验收总规则依赖、两族冻结源/既有准备角色和本节付费计划。
- `skillsGenerated: 0`；`judgeTestsRun`：本轮为结构、来源成员资格和回执回放验证，不是新的 LLM Judge。
- `crossTimeReplayResult`：Terran 六章只读复建通过；两份实际失败可以零 Provider 保留全文导入，未授予来源/策略验收。
- `promotions: []`；`blocks`：种族未完整生产/独立评估；`remainingRuleGaps`：原 uncertainties 保留，未被 Host 解答。
- `harnessLoopUsed: true`；`promptPackRoutes: [rule_skill_builder]`；`harnessToolsCalled`：离线原生生成/DSH 导入/只读证据重建。
- `uiTraceEvidence: none`；`agentDecisionEvidence`：仅计划，不是对战决策；`memoryTraceEvidence: none`；`trainingTraceCandidates: []`。
- `rollbackOrDemotionRules`：来源、原始回执、合同、上下文、费用或未证实事项漂移即拒绝；旧失败及旧版本不可覆盖。
- `userVisibleChecks`：未重复付费，未减少不确定事项，未把恢复报告冒充可用种族 Skill。
