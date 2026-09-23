# Ticket 27 / Slice 271 — Teach 写表工作台集成与真实验收

Status: **S271 功能收口，Ticket 27 为 5/6；S272 策略质量 A/B 与实战继承仍开放。** Ticket 23 维持 33/36。本工作在隔离分支 `codex/ticket-27-slice-271-fresh-plan` 完成，未覆盖 K3 原工作树或 T23 正在运行的房间。

## 用户确认的顺序与现有链路差异

K3 原写表工作台只有 Foundation → 候选军表 → 比较/选择三轮，不能等同 Teach。主链路已有独立 Challenger/Student 与计划版预制表合同，但 K3 服务未接线。现有 Agent 模式默认走：读取 Skill、任务、Rules 合法菜单 → **小获胜计划**（得分路线、对手假设、风险）→ Challenger 提问/只读查询 → Student 保留、修订或标未决 → **选模型、升级和卡** → Rules 审核候选 → 比较、部署、单位用途及完整 RosterPlan。Teach 只提供可审查的公开论据，不修改 Rules。

预制表模式不同：先由 Builder/Rules 锁定用户现有名单，建立 `no_pregame_plan` 基线，再做 Foundation → Teach → `preset_plan_deepening`，**不重新选模型**。Agent 改表会让旧计划 stale；旧计划保留为历史，用户须用当前名单新建锁表再规划。旧三轮会话仍按 `agent_legacy_v1` 原合同重放。新旧预制表 recipe 分版本：v1 仍用升级名称；v2 支持官方 `purchasableUpgradeProfileId` 与 `nominatedModelId`，保持名单和 Rules audit 精确一致。

## 本片具体交付

- 服务端显式 `--enable-roster-flash` 接通 Keychain → 隔离结构化 Worker。挂载不调用模型，只有用户点击 Generate/Revise 才收费；凭据在父进程清零。每轮使用当前 Flash 严格 JSON 合同，不保存隐藏思维链。认证/额度错误与发送结果不明均停止；每次新运行重置调用上限，不无声重试或重新收费。
- 付费输出若是完整公开 JSON，会保留原样以供版本化别名归一、严格 schema 与 Rules 审核。仅多出未声明字段时，按合同通用丢弃并留下字段路径、原值哈希和回执；不会补缺字段、改已声明字段或放松 Rules。保存回复可零模型调用继续，UI 明示“续跑已保存回复”与“重新生成会计费”的区别。
- Teach 的挑战目标采用结构化目标 ID；错误引用不当成证据，缺可用证据的确定性答复降为未决，记录复核计数。保留结论但结构化目标有变化时发人工复核警告。页面可见 Teach 复核告警、候选差异、计划、来源和费用。
- 旧的真实 K3 草稿：5 单位旧计划与 4 单位改后名单不一致。现改表即 stale，禁止纯文字 revision 清 stale；使用当前 Builder 合法名单重新锁表/Teach，不把旧文字计划接给 Bot。

## 真实 Flash 与浏览器证据

Web 产品工作台在独立服务上以真实 Keychain Flash、Standard 2000、Terran 对 Kerrigan's Swarm 运行。使用已安装的 Playwright 浏览器查看桌面 1500×1050 与手机 390×844 页面，并从页面点击 Agent Generate、预制表 Generate 与保留回复续跑；未见页面异常。内置 CUA 当时没有可用浏览器入口，因此不是 CUA 验收。正常 Ticket 20 服务的 opt-in 接线已实现，但其完整独立运行路径尚未单独点验，列 Medium 追踪。

| 会话 | 真实结果 | Flash 用量与估算费用 |
| --- | --- | --- |
| `rws-f3c0b5c7-0b54-4f7f-98c7-68241e7daa84` Agent Teach | 小计划→质询→修订→候选→选择全部完成；3 候选仅 1 个 Rules 合法；选中 6 单位、27 模型、起始 Supply 10，1500/2000 矿、120 气；Rules audit `32c0bbd6ed6e08099489dd17ce4cf0024a172e164860811197630f283b43402b`。 | 6 调用，150,490 units；约 ¥0.302358 |
| `rws-c5669f35-723f-493b-9ba8-ec349d63fe95` v1 锁定表 | 锁住上述名单，Teach/深化成功；最终名单与初始完全一致，同 Rules audit，`selectedByAgentDeliberation=false`；3 个无效来源引用移除、2 个缺证据主张降未决、1 个保留目标变化警告。 | 4 调用，128,454 units；约 ¥0.255388 |
| `rws-64cfe208-1e98-4016-a65a-62f81f209881` v2 锁定表 | 官方升级 profile ID 与指定模型保留；同名单、同审查 `95515275467281062891edafa006b2cd9fe7db1c4055c9d5630121be7d71578a`。第四轮多出 `reinforcementPolicyTextNote`，已付回复保留后经通用未声明字段丢弃，**零新增 Provider 调用**恢复 `planned`；丢弃回执 `3a16e1a51283c3f8a3d5a8c1f973a6fd15ef28ef781a0ae66c73090eede1fdb5`。 | 4 调用，108,828 units；约 ¥0.200024 |

合计 **14 次真实调用、387,772 units、约 ¥0.757770**（按未命中缓存保守估算；不是账单实扣），远低于 ¥100 提醒线。无真实 Room 变更，无 Skill 训练/晋升。初次 Agent 比较轮曾有一份 schema 异常回复在旧适配器下丢失，随后成功；不能倒推它一定可恢复。v2 场景的零付费恢复才有保存回复的实证。

截图（均为本工作树 `build/ticket-27-slice-271-codex-integration/` 内的本地验收资产）：`roster-workspace-teach-setup.png`、`roster-workspace-teach-running.png`、`roster-workspace-resume-live-ready.png`、`desktop-session-plan.png`、`desktop-session-candidates.png`、`desktop-session-provenance.png`、`mobile-session-plan.png`、`mobile-session-candidates.png`、`preset-locked-before-generate.png`、`desktop-preset-session-plan.png`、`mobile-preset-teach-review.png`。其中手机 Teach 复核图可见 3 无效引用、2 降未决、1 人工复核及费用。资产在忽略构建目录中，未作为源码提交。

聚焦门：安全适配器伪 Worker 验证通过（挂载 0 调用、凭据不返回父进程、动态 Teach/preset 合同、认证/不明发送停止、取消不发送、付费公开回复保留）；真实 API v2 升级字段先复现 `BUILDER_LOCKED_ROSTER_INPUT_INVALID` 再修成创建 201；Web 导出通过，桌面/手机实际页面 0 error。旧 K3 草稿的 stale→锁表回归在前一提交已通过。本片没有重跑无关全量门；完整 Expo `tsc` 上一次只报无关副官文件，未因为本片重跑。

## 质量边界与剩余 S272

S271 证明“链路可运行、名单合法/不可偷换、计划可追溯”，**不证明写表策略优秀**。Agent 的 3 个候选只有 1 个合法，另外 2 个违反 Core slot 上限；选中的雷诺表剩余 500 矿未花。计划公开写出得分日程、部署和风险假设，也承认未知地图几何，但为何只有一个合法备选、少花资源是否划算，须 S272 用固定表/无赛前计划/Teach 计划做 A/B，并观察实际胜率、得分、击杀与计划修订。不得把这次唯一合法候选当成雷诺必优结论。预制表 Teach 仍有未决与人工复核警告，不晋升成训练真值。当前 UI 仍需粘贴 Builder candidate JSON，原生 Builder→工作台转交可作为 Medium 交互项。v2 recipe 支持 profile ID/指定升级模型，但尚不等于任意外部军表格式都可导入。

S272 的具体交付：同预算、同任务/地形、固定与 Agent 表的质量对照；用真实计划建立对应 Room，验证 `RosterPlan→TurnPlan` 跨回合读取/修订与失效条件；逐步截取决策证据并记录成本/时延。T23 的 2000 分对局继续使用原房，不为本片重启。

## Agent harness / Skill 进化边界

- `harnessLoopUsed`: 产品 Web 的公开计划→Teach 证据→Rules 审核→回执/续跑；不作训练晋升。
- `targetGames`: StarCraft TMG Standard 2000，冻结官方源快照。
- `promptPackRoutes`: `agent_teach_v1`、`locked_roster_teach_v1`；旧会话 `agent_legacy_v1` 回读。
- `harnessToolsCalled`: 冻结任务/Army Builder、只读赛前实验室、隔离 Flash Worker；无 Room mutation。
- `uiTraceEvidence`: 上列桌面/手机截图，Web 按钮触发真实请求与续跑。
- `agentDecisionEvidence`: 小计划、Teach 挑战/回答、候选比较、最终公开计划；不保存也不声称访问隐藏思维链。
- `memoryTraceEvidence`: session/plan/list/source hash 及旧计划 stale 关联；实际 Room TurnPlan 记忆待 S272。
- `trainingTraceCandidates`: 本片无晋升候选；低质量和未决证据仅作后续复盘材料。
- `rollbackOrDemotionRules`: 旧会话原合同重放；错误引用降未决、stale 计划禁用、规则不合法候选禁选；Provider 不明发送不自动重试。
- `userVisibleChecks`: 计划/候选/来源/费用/Teach 告警、锁表不重选、已保存回复续跑提示。策略效果仍待实战。
