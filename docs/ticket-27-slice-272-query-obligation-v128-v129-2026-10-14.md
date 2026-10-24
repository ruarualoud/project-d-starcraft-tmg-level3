# Ticket 27 / Slice 272 — 查询纠错必须回答原问题

日期：2026-10-14。T27 5/6；T23 33/36；主线余 248/272/249/250 四个 Slice；完整正式对局 0/12。

## 用户准出要求

A/B 停止。工程问题修复且 Teach 未解项真正清零、计划吸收修订并验收后，**从第 1 回合新开 A/B 对局**。不将原房续跑当成这一轮正式策略对照。历史证据和费用保留；没有新房、自动 Plan 应用或 live 代码切换。

## 实际发现

A v127 已真实结束（01:50:28Z），新增 2 calls / 695,076 units；A 离线总计 94 calls / 16,135,088 units。Plan A9 未变。最新汇总四个未解问题：Q2 对手场景、Q3 机会成本、Q5 减员后能力、Q6 路线与实际队形。

第 4 个纠错回复保留了原场景及 `mission_marker_control`，却删除报错的 `coherency_after_candidate_placement`。Host 因新工具返回 advisory 而标记修复成功。模型的公开理由误称 Host 会选择动作域；实际错误回执已提供各单位的真实动作域及参数模式。原场景控点结果不能证明完整队形/到达路径。

现有范围校验仅比较单位/目标 ID，无法发现“同样对象、不同问题”。最终汇总本次仍如实保留 Q6 未解，但中间修复成功状态错误，并浪费了重新计算已经成功的控点查询。

## 已实施

1. `roster-teach-query-recovery-v1.mjs`：根据源头 `failureTargets` 和共享 Native 查询词表，保留待修查询的类型及数量；直接调用与场景 follow-up 可以互换传输形式，但不能删除待修问题再用其他查询成功代替。拒绝项返回具体缺少的查询、原失败合同和动作域上下文，不执行无关替代查询。
2. 对历史错误成功进行本地重新分类，完整保留原付费回复/回执/次数。在明确修复且显式续修的条件下，按既有用户授权只增加一次纠错机会，持久记录且不重复发放。新操作不获得这项历史迁移额度。
3. `roster-teach-framework-v1.mjs`：同题其他成功证据不能清除尚未回答的查询义务；以该查询最新纠错结果为准。
4. B 的真实错误曾把 `scenario` 写在 `queryKind`。这种不在 Native 词表中的错误字段不是必须保留的查询语义，否则新校验会阻止正确修复。已针对这个实际样本补齐过滤边界。

不改变军表、战术权重、Rules 合法性或模型选择；不是证明任意查询都语义正确。

## 定点验证

证据位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

- `common-v128-dropped-query-fixture.private.json`：真实 A 第四次付费回复和原失败。
- `common-v128-query-obligation-red.private.json`：PID 92161，失败请求被执行一次，复现具体缺口。
- `common-v128-query-obligation-result.private.json`：PID 93705，唯一 GREEN；错误替代执行 0 次，历史回执保留，原四次选择不清零，只授权一次追加，重复恢复不重复发放；汇总不能被独立成功结果掩盖。0 Provider / 0 Room。
- `common-v128-invalid-predicate-{fixture,red,result}.private.json`：只验证 B 的畸形 `queryKind=scenario` 边界，RED 后收窄为共享 Native 词表，单次 GREEN。没有重跑先前通过的门禁。

## 真实续修结果：拦截已生效，问题仍未修好

v129 runner 95817 验证旧离线 host 40720 无在途调用后替换为 95992，仍用原 A 工作台、原规则/军表/地图、原 Teach 问题，只续指定查询。02:08:22Z 实际完成，Plan A9 未变。没有启动 A/B/C/D 比赛。

启动时基线 94 calls / 16,135,088 units；新增 2 calls / 702,499 units（纠错 149,192，汇总 553,307），A 离线累计 **96 calls / 16,837,587 units**。费用旧账继续，不清零。

实际第五次回复仍删除 coherency，且与第四次回复 outputHash 完全相同。新代码正确返回 `ROSTER_TEACH_RECOVERY_QUERY_PREDICATE_DROPPED` / `queryNotExecuted=true`，没有重算控点。5/5 次记录保留，不再盲目追加。

两次调用 contextHash、requestId、Provider receiptHash 均不同，均有新的已付费调用记录（分别 21.637/19.229 秒），所以不能把这次简单归因于框架复用了同一个上下文缓存。需要继续核查实际纠错信息的有效呈现和消费，不能据此声称已经定位服务商或模型故障。

最终仍四项未解：Q2/Q3/Q6/Q7（上一汇总为 Q2/Q3/Q5/Q6）。Q5 改为已答、Q7 新变未解，不构成全部收口或策略进步证明；下一步仍须逐项核对。观察明细：`common-v129-actual-choice-observation.private.json`、`common-v129-A-query-obligation-recovery-progress.private.json`。

本机观察 REPL 因反复保存大草稿出现一次内存退出；离线 host/runner 均未中断，没有重发模型调用。后续改用独立短命只读进程提取小字段，避免观察器持有多个大草稿。Host 初始化期间旧 `state.phase=completed` 不等于新请求完成，须以顶层 status、真实 PID、dispatch 及新结果为准。

## 剩余交付物

1. A/B 未解问题逐项得到有效工具证据；无法获得的场景仍明确未解，不通过删问题或修改标签放行。
2. 已修事实进入最终 Plan，处理旧 Teach 上下文仍重复“6 个 Marine 模型”等过期说法，重新核对最终计划与真实军表/规则一致。旧问题续修的原上下文是历史证据，不自动替代当前 Plan。
3. A/B 各自 Teach 全部闭环、最终计划验收记录。
4. 同版代码、冻结地图和一致对手能力下，从第 1 回合新开 A/B 正式对局及截图记录。

`harnessLoopUsed=true`；目标 StarCraft TMG；路由 `teach_framework_query_recovery` / `teach_framework_synthesis`；本门禁无 UI/Game 操作，修复结果未作为训练真相。若实际查询或回答仍未闭环，继续保持 A/B 不准入。
