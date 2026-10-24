# T27 / S272 v802：事实返回后的战略作者职责隔离

## 问题与本次交付

原产品停在 e6042 / w576 / r3，PID92739 已退出，无在途请求。四条预算事实通过来源审核，但当前战略作者四次回复仍授权同一预算调查，最后由 `unchanged_investigation_authorization` 正确拒绝。

已证实的输入缺口不是网络或 Builder 算错：

1. 事实角色已经通过 `coordination.author_decision_return` 把“选择如何改表”交还作者。
2. 作者输入仍将事实角色的 `do not … choose the final roster` 任务放在普通输入，旧战略提案也与当前任务混在一起。
3. 纠错裁剪把最新 `batchFacts0` 放到后台，旧任务/旧战略提案仍在正文；没有独立的当前作者职责节点。

这是确认存在的协议缺口，但不能仅凭静态检查声称它是模型反复查询的唯一原因。

本次统一修复新任务与冷恢复的输入边界：

- 仅匹配当前 frontier 的原生有类型作者返回，生成 `strategy_owner_assignment`。保留原问题、来源理由、身份，不代替模型作选择。
- 旧事实任务、旧战略提案移动到明确的历史上下文；纠错时可精确读取，不再作为当前角色限制或答案模板。
- 最新作者待办始终留在当前输入；SYSTEM 区分当前作者与原事实角色。
- 现有军表、Builder 权威、Plan、预算审核和来源审核不变；重复调查仍拒绝。
- 仅对实际旧输入协议开放一次定点恢复；已带新职责节点的请求不能重复获取恢复。原件、费用、计数保留。

## 定点验证

用真实 e6042 输入与原回复，走共享 `createRosterDecisionWorkflowV1` / `createRosterWorkflowReadRoleExecutorV1`，所有写入隔离在内存，没有生产状态修改。

- RED：缺少当前作者职责节点，断言准确失败。
- GREEN：一次对应验证通过，10,020 ms。
- 原作者问题/来源理由逐值不变；当前完整军表/Plan 和权威输入逐值不变。
- 旧回复仍被重复调查门拒绝，未因转交被当成有效策略。
- 新协议、无原始交接证据、错误父任务三种情况不能续领本次恢复。
- 0 真实 Provider 请求、0 Native 调用、0 生产写入。不重跑已通过的旧门。

日志：`build/slice272-v802-red-20261021.log`、`build/slice272-v802-green-20261021.log`。

真实样本：

- 初次作者请求：`17d125856721f9be57852d5b46abc4db33d22000a33fa33b2bb0caaf6f9b34d3`
- 最后失败请求：`42867469a1a70288d28bd6acf05a7d8cdfd09e0044a940bfad307a346e537c33`
- 失败回复：`842d71ae6fb4118992105e36ebe116c256ddc72d9a1e432b801e58994b20481e`

## 实际续行与验收边界

已从原 `build/slice272-product-generation-v645-lqMWaS` 通过产品 resume 续行，PID21184，日志 `build/slice272-v802-incoming-author-live-20261021.log`。没有初始化新房间、旧 A–F 或对局。

启动时仍是 r3：1490 矿、170 气，距离 2000 差 510；历史 2000 候选未采用，旧 Plan 自称 2000 的错误仍须真实模型修改。新输入是否促成实际联合军表/Plan 修订，需要看真实回复与 Builder 提交结果，不能以本门通过替代。

T27 5/6，T23 33/36；余 S272/S248/S249/S250 共 4 片，最终 Plan 0/6，对局 0/12。

## 真实结果：未收敛，不能记作完成

PID21184 正常退出，产品在 e6049 / w576 / r3 停于 `needs_repair`，0 在途。追加一次实际调用已消耗，不盲重发。

- 请求：`42e7180a626e95a0e0a5c6ea2a3d6dff906bc185415b257caf7221813e2705bd`
- 回复：`39c7a24c0912f3c383b37f0ecd2ef248c409786b2ae122ac4cf20a8e2a043965`
- 新请求确有 `strategy_owner_assignment` / `strategy_owner_context`，旧事实禁令已不在当前 assignment；完整请求 557,571 字符。共享 Provider 工厂按当前角色组装 SYSTEM 并发送本次新 body，没有发现下游把此次调用当成旧回复恢复。
- 模型回复与上一次被拒输出**逐值完全相同**，outputHash 均为 `5a70eb0e3f9a97c93eb2f5d1ddccbfff6345a50577a63627ecb19a5fcf179940`。重复调查门再次正确拒绝。
- 164,273 输入 + 1,900 输出 = **166,173 units**；Provider 11.904 秒，不是端到端墙钟时间。保留旧账，不猜人民币金额。
- 原军表、Plan、必要未知与最终验收数均未变化。

结论：本次消除了已复现的输入职责混杂，但**没有证明它足以解决模型语义复读**，也没有证明策略提升。实际仍将“候选未采用”当成“候选存在性待调查”，忽略已经返回的作者选择。不是网络中断、Schema 解析失败或成功改表后回执漏存。

下一具体交付应针对这次复读：局部作者决策使用显式、分块的修改操作，避免要求重写整份旧战略回复；原问题台账保留，实际预算事实与作者选择分离，完整旧原件仍可读。先用此真实样本复现/验证，再观察模型是否通过 Builder 实际改表并联动 Plan。不可仅改措辞、重复授次或在 Host 手填采用结论。P4/P6仍未验收。

## Diff 范围

- 新增 `roster-workflow-strategy-owner-context-v1.mjs`：当前作者职责/历史任务分离。
- `roster-workflow-read-role-v1.mjs`：共享请求接入、旧协议恢复资格。
- `roster-workflow-correction-context-v1.mjs`：纠错保留当前作者阶段、历史材料按需读取。
- `roster-decision-role-instructions-v1.mjs`：作者 SYSTEM 职责说明。
- `roster-decision-product-journey-v1.mjs`：原始交接证据核对与一次恢复原因。
- 新增具体 bug 复现脚本 `verify-slice272-incoming-author-v802.mjs`，以及本报告和进度记录。
