# T27 / S272 — v206 已保存 Teach 的引用绑定消费一致性

日期：2026-10-15。上一轮 v203–v204 已完成代码与定点门，本轮是真实 B 存档上的另一项来源修复，不是重复旧测试，也不是重开付费试验。

## 具体问题与修复

v201 已修“模型展示视图中的 1 CP 引用被判 unknown”，但已有存档仍是 `evidenceBindingVersion=3`。工作台 completed 分支把它当作无需更新，Plan 修订又直接复制旧 qualified synthesis。因此引用解析器正确，不代表实际 Plan 消费者读到了正确结果。

三项假设分别为旧缓存未刷新、原始回复缺失、恢复回执漏传。真实 B 存档已复现第一项：原始付费回答存在、原生成功支付回执存在，`createRosterRevisionTeachEvidenceV1` 仍输出旧 unknown。

现在三处共用当前绑定合同：

- `roster-teach-framework-v1.mjs`：绑定版本统一常量4；新增纯函数 `deriveRosterTeachSavedEvidenceBindingV1`，从原始公开回答和原始/调查/恢复回执重算**派生的引用绑定**，不调用模型或 Native。
- `roster-revision-teach-evidence-v1.mjs`：Plan 修订使用该派生视图；完整原存档和旧 qualified 状态仍可通过原档案引用读取，输入对象不修改。
- `roster-planning-workspace-service-v1.mjs`：旧 completed 结果可在现有入口零付费刷新绑定；旧限定结果/coverage 放入 `evidenceBindingHistory`。恢复回执也纳入，不再只取前两类证据。若原 raw 回复缺失，只复用已保存的对应公开输出，不从 qualified 文本编造 raw。

这不是给规则/模型回答重签名，也不是刷新工具目录或开启重试额度；仅标记消费者数值绑定的派生版本。没有改变军表、Plan、模型原话、源规则、费用或调查次数。整个问题依然 unresolved，不能因此接受 Teach 或启动对局。

## 定点结果

新脚本 `scripts/verify-slice272-saved-binding-consumers-v206.mjs` 只复现本次实际缓存问题：

1. RED：真实 Plan 消费者仍将支付路径输出 unknown。
2. 修源后唯一 GREEN（2.515秒）：Plan 消费者正确读到原生1CP；另一错误控点路径仍 unknown，带局部纠错提示；工作台与 Plan 使用同一派生结果；再次派生幂等；缺 raw 不编造；输入存档 hash 不变；旧 unknown 历史仍能读取。

证据：基线 build 下 `common-v206-saved-binding-red.private.json` / `common-v206-saved-binding-green.private.json`。真实ProviderCalls=0、NativeCalls=0、sourceDraftWrites=0。

工作台本次修改的 import/刷新分支单独语法检查一次通过。没有重跑 v201/v202/v203/v204 绿门、全量构建或对局验收。没有进行真实 HTTP 调用/存档持久化迁移；真实工作台后续执行时才使用此入口。

## 当前状态与续接

- 仍未收到“一次 B 真实 Flash 仅汇总复核”的答复；未运行 v205，未创建其进度报告，不重复提问。
- v205 是预留的真实运行编号；v206 是本轮离线修复编号，不能因为数字更大就误判 v205 已运行。
- 原 B 仍255calls/35,660,214units、Plan19、1未解；A Plan9/1未解，四组对局停止。真实新汇总的效果尚未验证。
- 若获准，按 v203–v204 文档的 `--resynthesize --run-version=205` 入口执行一次。它将带上 v206 当前代码；无需先重跑上述已通过门禁。
- 后续仍须 A/B 事实与 Plan 准出、相关实际消费者/同版对局、完整对照和复盘；不能将本次局部 Teach 引用检查称为所有战场工具已验收。
- T27 **5/6**、T23 **33/36**，主线剩272/248/249/250共**4片**，完整对局**0/12**。目标/地图优先级未缩减。

Diff：3产品源、1具体bug脚本、本报告和恢复/任务登记；无提交、删除、安装、子代理、网络调用或官方数据更新。

Harness记录：harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=teach synthesis / Plan revision consumer；harnessToolsCalled=保存回执读取与共享派生函数；uiTraceEvidence=无新增UI验收；agentDecisionEvidence=v200公开回答原样；memoryTraceEvidence=旧限定结果仍可读；trainingTraceCandidates=无；rollbackOrDemotionRules=跨回执补值/原答被改/重复收费则不准出；userVisibleChecks=消费端CP=1与真实未知分离，不假称Teach已通过。
