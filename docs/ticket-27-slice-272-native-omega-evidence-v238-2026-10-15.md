# Ticket 27 / Slice 272：A 的 Omega 原生执行证据

## 结果

2026-10-15，复用 A 原始冻结来源与已保存的完整编队，在隔离假设场景中切换为 player2 移动阶段，执行一次原生 `Omega Network`，成功创建 Omega Worm。没有模型调用、没有正式房间动作、没有改 A 的军表或 Plan。

这不是 A Teach 已完成，也不是策略落点优劣验证。它补的是旧调查一直缺少的“能力实际执行”证据。A/B 正式接入仍待完成；四组对局保持暂停。

## 旧调查具体缺什么

- `q2-omega-worm-conditional-scene` 实际摆入三个 Marine、两个 Goliath 与 Kerrigan，并没有创建或摆入 Worm。
- 该假设场景的 `activeSideKey` 是 player1，随后查看的是 player1 行动域。不能据此认定 player2 没有 Omega 能力。
- 故障后的独立事实调查请求未收到完整模型正文；这些失败与未知费用仍保留。本次没有重发它们。

## 本次执行

入口为已有 `createPregameSceneLaboratoryV1`，使用正式 V6/V1 Rules runtime。来源严格复用 A 的固定军表、任务、部署、冻结地图；已保存的完整模型位置直接恢复，没有重跑队形求解。

1. 条件场景：Movement、player2、地形保留。
2. 从当前域读取 `Omega Network` 的参数合同，而不是手写动作回执。
3. 使用诊断见证点 `(48, 6)` 英寸；这是一个用于证明能力可执行的明确输入，不是推荐战略位置。
4. 传入域要求的 `activeUnitId=player2-kerrigan`、`paymentCardInstanceIds=[]` 和毫英寸坐标。
5. 原生实例化与执行返回 `resultStatus=ok`、`omega_worm_set_on_battlefield` 事件。
6. 后态实际存在 `player2-omega-worm`，圆形底盘 3.15 英寸；阵营卡从 ready 变为 exhausted，资源值仍为 1。创建后的域不再提供 Omega Network。

动作合同仍明确：新 Worm 当回合不能使用除 Structure 外的特殊能力。此次没有验证随后回合进场或整张地图的所有位置，不能扩张结论。

## 证据与边界

证据目录：

`build/ticket-23-three-arm-performance-baseline-20261010-v1/A/omega-native-v238/`

- `scene.private.json`：完整条件场景与几何范围说明。
- `context-0.private.json.gz`：原生调用前上下文与域。
- `request-1.private.json`：唯一新 Native 请求。
- `receipt-1.private.json`：实际动作、参数、事件和后态变化。
- `context-1.private.json.gz`：实际后态查询。
- `progress.private.json`：终态与零源状态修改证明。

关键身份：

- A Plan9：`a7cb5ba1f2ec6c2d17a682acfe5e1ad2e58e23f3018a7c12350fc3b78b37aa1d`
- 原始源状态：`b063b31d396e813f999b09d90c6eddaeace22b9707dc26dd68a3477efbce629d`
- 原生执行回执：`5d4ac4ceee520a8e422c19ac5f70b0e4808387ce14f6ec4c9ab2ce376d9030a8`
- 实际后态：`ebfb448a4cf3dd37f886b2991b401980af33c12509e9694425fc88f0b7ff4124`

工作终态 `completed`，06:50:19.507Z；完成后进程仍有空闲线程句柄，确认回执与证明已落盘后仅对该诊断 PID48213 发送 SIGTERM，现已退出，不要重启。1 次新 Native 执行、0 Provider、0 正式房间动作、0 原草稿写入。`sourceStateHashUnchanged=true`、`originalDraftUnchanged=true`。没有重复已通过门禁。

## 与结构化 Plan 修改的关系

用户要求已落实的分工保持不变：模型填写最终策略的目的、行动、理由、备选和触发条件；是否改军表是模型可选分支；Plan 修改通过 `plan.fill_argument` 执行，事实绑定和保存回执由系统生成。字段执行成功不代表理由正确，策略仍需来源核对及对局检验。

B 的 v237 已完成一次真实 Flash 修订与增量审核（3 个修改字段、0 High），本次没有重跑。候选 Plan21 已保存，但当前检查点不是完整正式工作台存档，不能只替换 Plan 而丢失历史、审核和费用。正式接回时要复用已有完整工作台流程/保存记录，保持旧未知费用，不重新付费生成。

## 本次 diff 与下一步

- 新增操作脚本：`scripts/diagnose-slice272-A-omega-native-v238.mjs`。
- 新增本报告；更新当前恢复入口及根 TASKS。
- 本轮无产品规则修改、无新测试、无提交、无清理。

后续具体交付物：

1. A：将原生回执交给现有事实调查/Teach 消费，生成明确的结论及必要 Plan 修订；不直接把诊断成功标为 Teach 通过。
2. B：将已完成候选及谱系、工具执行、审核和费用记录接回正式工作台，不重生成已付费结果。
3. A/B 都满足既定准出条件后，四组使用同版链路续跑；本报告不授权提前开局。

T27 5/6，T23 33/36，主线剩余 272、248、249、250 共 4 片，完整比较对局仍为 0/12。

## Harness 留痕

- harnessLoopUsed: true；targetGames: StarCraft TMG。
- promptPackRoutes: 本次无模型请求；目标为现有 fact_probe / Teach。
- harnessToolsCalled: describeQueryContext、runScenarioBranch(native_action)、proveMutationZero。
- uiTraceEvidence: 本次无 UI 行为，不作 UI 验收结论。
- agentDecisionEvidence: 旧公开请求揭示阵营/场景范围不符；诊断点为工程见证，不冒充 Agent 决策。
- memoryTraceEvidence: 原草稿与 Plan 保留，证据单独保存。
- trainingTraceCandidates: 无；trainingTruth=false。
- rollbackOrDemotionRules: 回执只适用于明确的父状态/阶段/阵营，不能用来推导其他位置或后续回合已成功。
- userVisibleChecks: 能力产生实际单位与卡状态变化，而非仅通过字段检查。
