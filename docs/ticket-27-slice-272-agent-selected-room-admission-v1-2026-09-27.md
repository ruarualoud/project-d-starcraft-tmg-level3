# Ticket 27 / Slice 272 — Agent 选表 + Teach 修订计划入房检查点

2026-09-27。本记录仅覆盖 **Agent 从头选出的满 2000 分 Terran 军表**，不把锁表 Teach 回放称作第二次 Agent 选表，也不把入房预检称作已完成对局。

## 已验证的来源链

1. `iterative-standard-2000-live-v1` 的 Agent 候选经 Army Builder 确认为 7 单位、2000/2000 minerals；原始进场时序 hash `1ec66ef097ada74f6abadf3e940a6507823bc467e262458fc9768ee94be92b54`，Lost Temple 同图路线回执 `3673d35ed98a0a726e4bef03be34c40ed1aea6cc995c11a8fdd88b0af2ddf248`。
2. `agent-selected-teach-standard-2000-live-v1` 锁住该名单，Teach 仅负责策略文本。复审后的计划 hash `656c84531c516ba142f50508eddf557e301ad82244e06082336c89f09685d7c3`；最终复审 0 Critical/High、2 Medium、3 Low。Medium 保留跟踪，按既定准入政策不阻断。
3. 复合 session receipt `681c10d82e1e17b39224617dead5ce94dd5c0308222c3bf5ad62615b1eed3bc7` 绑定原 Agent handoff、锁表 Teach receipt、Rules 审核、原始进场时序和计划初版，不把来源性质改写成预制表。零 Provider `--bridge-only` 回放成功。
4. Room 入口在当前认证席位重新读取投影，验证名单审核、任务/部署、官方来源、地图编译及可达性，再将复审版计划播种到 TurnPlan。首次及去重后的正式房间预检均返回 7/7 arrival、revision 0、计划 hash 与复审相同；0 Provider、0 模型费用。去重版房间 ID `ticket23-slice248-aa-20260927053744169`。

## 工程变动与边界

- `agent-selected-teach-plan-bridge-v1.mjs` 建立版本化复合回执；`roster-plan-turn-plan-bridge-v1.mjs` 接受该回执但继续拒绝未排程的 Agent 计划。
- `roster-planning-product-module-v1.mjs` 提供只读原 Agent handoff 复用与同席、同名单、同地图、同审查结果的正式入房交接。
- `serve-ticket-23-slice-248-agent-agent-web-v1.mjs` 支持该模式的真实房间及冻结恢复快照；`run-ticket-23-slice-248-agent-agent-web-v1.mjs` 转发对应 CLI 入口。入房与恢复不可混用新的赛前输入。
- 两次预检都未启动实战 Provider。优化后仍有明显开局固定耗时，需要在实战继续量测；不能宣称开局性能已达产品要求。

## 真实短检查点

第三次正式启动补了类型化阶段回报，避免外层 600 秒无回报超时把仍在做赛前绑定的服务误杀。各阶段分别在约 187、306、536、559 秒返回；真正的开局固定耗时仍偏高，不能宣称性能已达产品要求。首次无阶段回报的房间 `20260927055830376` 未开打、无模型费用，仅留隔离诊断，不是比赛。

新房间 `20260927061507239` 已到 revision 3 的安全检查点：1 个规则唯一后继、2 个真实模型决策、6 次 Flash、403,662 units、约 ¥0.550947。player1 TurnPlan 日志第一条 `pregamePlanOrigin.rosterMode=agent_built`、`rosterPlanHash=656c8453…`；真实模型先保留首手，再选择 Goliath 作为 M1/M3 火力据点的前置侧翼屏风，说明 Marine/Marauder 后续上短路。Goliath 单模型坐标 `(18000,30575)`，形成 4 个 Host 选项并选 requested-direct；Rules Apply/Replay 通过，逐动作截图已写入同房 `screenshots/`。这证明计划实际被 Bot 读取并用于公开决策，**不证明整局策略效果**。

发现一项来源叙事缺陷：虽然结构化身份及 Room origin 正确标 `agent_built`，复用锁表 Teach 的公开 `scoreRoute.routeText` 仍以 “Locked preset roster (unchanged)” 开头，`publicSummaryText` 还错误声称“没有军表被提出、比较、选择”。Agent 目前仍正确引用实际名单/路线，但这段来源陈述不符 Agent 选表历史；作为 Medium 修正文案与来源审查，不把它误判为军表或 Rules 已漂移。不得用这个错误表述作为后续写表经验真值。

## 尚未准出

需要继续同一房间到真实战斗、跨回合计划修订及终局，复核策略选择与实际得分；并另做原固定军表同名单有/无计划 A/B。地图 20 图正式验收与本检查点无关，不能借 Lost Temple 入房预检替代。

## 赛前进场表与实战占池值对齐（后续新会话）

原房间 Round 2 初始化暴露一项计划数据差异：旧 v1 进场表按面板
`startingSupply` 排程，将三个购买了 Advanced Medic Facilities 的
Medic 计为各 1；实战来源原文要求它们在 Supply Pool 计算时各计 0。
因此旧公开计划把第二、第三 Medic 推迟到第 2、4 回合，而真实 Round 1
可以合法同场带上三个 Medic。这个旧表和已运行房间保持原样，不改写
签名、哈希或历史决策。

新建 v2 进场表复用 Rules 的 `supply_pool_calculation` 情境投影：每个
Unit 同时保留面板值、实际占池值和生效定义 ID；轮次累计只用占池值。
迭代写表入口从正式房间来源状态接收同一组版本化规则路由，模型输入
也同时给出两种数值，避免按面板值做错误的背包约束。旧 v1 验证器
继续识别历史表；v2 创建和来源回验走同一投影。

对上述真实 2000 分七单位名单的单次聚焦回验通过：旧 v1 表仍可验证；
新 v2 若在第 1 回合放入 Marine、Marauder、Goliath 与三名 Medic，
面板合计 9，但占池为 6/6；第 2 回合加入第二 Marauder 后为 8/8，
三名 Medic 的占池值均为 0。首个诊断用例错误地把全部七单位塞进
第 1 回合，正确收到 8>6 拒绝；第二个诊断使用了锁表 Teach 候选 ID
而非原 Agent 候选 ID，正确收到来源绑定拒绝；修正验证输入后，聚焦
门返回 `CONTEXTUAL_PREGAME_SUPPLY_V2_OK`。这是未来新会话的规则接线
证明，不是当前旧 v1 计划在运行中被重写，也不代表自动写表稳定性
已验收。
