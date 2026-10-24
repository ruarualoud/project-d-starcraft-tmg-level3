# T27 / S272：新旧 B 军表、计划与差异原因

## 结论

新 B 军表确实不同，但不能归因于新的占点/火力交换工具计算结果。实际从零选表阶段没有调用这两个工具；新工具在锁表后的 Teach/计划阶段才使用。可追踪的军表变化链路是：模型初稿升级不同 → 初稿费用/余额不同 → 合法补满工具返回不同组合 → 模型选择不同补满方案。

新版是更早投入主力的重火力阵地表；旧版有更多独立的小型 Marine 单位。最终计划反而更保守。尚无完整对局，不能证明新版更优，也不能把两次独立生成当成单变量工具 A/B 实验。

## 比较对象与共同条件

### ABC 的变量是 Terran，不是 Zerg

已只读解码三间原房的权威初始 Envelope，比较完整军表对象与配置，而非只比较单位名称。三组 Zerg 完整军表和 armyBuilding 配置完全一致：2000 矿物、8 个单位条目、52 个初始模型、14 个升级；均没有独立生成的 Zerg 开局 Plan。

| 实验 | Terran 军表 | Terran 开局 Plan | Zerg 对手 |
|---|---|---|---|
| A | 固定 2000 分表 | 已生成并审核 | 相同固定 2000 分表，无独立开局 Plan |
| B | AI 从空表生成的 2000 分新表 | 为该新表生成并审核 | 同 A |
| C | 与 A 完全相同的固定表 | 无 | 同 A |

“B 的 Zerg Planner”只指 B 房间中 Zerg 的单步行动规划，不是军表生成，也不是 Zerg 开局 Plan。军表固定不意味着三局必须采取相同动作；对手会根据各局 Terran 的动作和实际局面重新规划。

完整 Zerg 对象摘要三组均为 `28790b7d6a103b2a305c44571c60b83bb8a637b5889e906d32ec337ac0b0326d`；配置摘要均为 `92f5aef28a2c0b053408b6e777da1334d2945170fd433d9a87509f12081cdb03`。证据：`build/ticket-23-three-arm-performance-baseline-20261010-v1/common-abc-zerg-roster-identity-20261013.private.json`。0 模型调用、0 房间写，没有重新写任何 Zerg 表。

- 旧选表 session：`iterative-web-8421f90b-6c90-494d-ab1a-d1b23f81caf8`；最终 Teach session：`rws-929b02a7-fc43-4eb6-9c60-1c7894faf6e9`；Plan `ba8a49a58d177836842c57746437c0c6d3fc8d474fa20fa0d25d9eed3ea6f389`。
- 新选表 session：`iterative-web-57f638cc-7d2f-4b09-9315-f1ab7c0a9958`；最终 Teach session：`rws-5f935d5d-f07a-4871-82c4-a763d030e7b5`；正式 B 使用 Plan `a6204f7c277f1d78ac4b9868839d7fa08482cb9427355cbda3330635be7bfa42`。
- 同为 Terran Armed Forces 对 Kerrigan's Swarm、Standard 2000、Hold Position、官方布局 standard-d6-1、54×36in；两份 frozenContext 的 side/faction/opponent/scale/map/task/source 相同。
- 单位菜单回执相同。地图摘要逐字段比较只有 receiptHash 和 mapBinding.sourceStateHash 不同；地形、任务、尺寸内容相同。不同状态引用不是换地图或更新官方数据。
- 两版都是 2000 矿物、155 瓦斯；4 张战术卡相同：Barracks (Tech Lab)、Factory、Academy、Barracks (Proxy)。

## 军表实际差异

| 项目 | 旧 B | 新 B |
|---|---|---|
| Marine | 1 large + 2 small | 1 large |
| Marauder | 1 large | 2 large |
| Goliath | 2 small | 2 small |
| Medic | 3 small | 3 small |
| 单位条目 | 9 | 8 |
| 首个 Marauder 升级 | Kinetic Foam | Kinetic Foam + Laser Targeting Systems |
| 首个 Goliath 升级 | Ares-Class Targeting System | Ares-Class Targeting System + Haywire Missiles |
| 新增主战单位 | 两队 small Marine（Bayonet/Combat Shield/Frag/Slugthrower） | 一队 large Marauder（Kinetic Foam/Laser Targeting Systems/Veteran of Tarsonis） |
| 第三 Medic | Stabilizer Medpacks | 无升级 |

两版都另有一队 Goliath 配 Ares/Haywire/Scatter，以及一队 Medic 配 A-13 Flash Grenade Launcher/Advanced Medic Facilities/Stabilizer Medpacks。

解释：旧版更偏多个轻步兵单位分占/轮换，新版偏强化 Marauder 与集中火力。但以上是编成倾向，不是攻击概率、可达站位或胜率已经验证的结论。large/small 为军表 compositionKind；本文不把模型叙述中的模型数当作规则审计结果。

## 军表变化究竟来自哪里

1. 两次初稿均选 Marine large、Marauder large、Goliath small、Medic small，以及相同的前三张战术卡。主力种类没有一开始就换掉。
2. 新初稿额外选 Marauder 的 Laser Targeting Systems、Goliath 的 Haywire Missiles。工具记录的初稿费用为旧 920、新 1000；待补余额为旧 1080、新 1000。
3. 两次都调用已有 `exact_budget_repairs`，各返回 4 个 Builder 认证的合法满分组合。其 `strategyRankingPerformed:false`：它解决预算/槽位/升级合法性，不计算哪个组合战略最优。
4. 忽略 candidateId 标签差异后，旧最终表与旧候选第 2 项完全一致；新最终表与新候选第 1 项完全一致。旧补入 Goliath + 两队 small Marine + 两个 Medic；新补入 large Marauder + Goliath + 两个 Medic。
5. 新版模型在补满轮公开解释：追加第二 Marauder、第二 Goliath 和两 Medic，保留并加深“中央阵地火力+支援”路线。旧版补满轮仍沿用初始四单位的解释，没有为新增五单位写同等细致的取舍理由。

因此，确定的近因是“初稿多 80 分升级改变背包余额，然后模型选了不同的合法扩表组合”。新占点/火力查询没有在这一阶段提供计算结果。仍不能孤立确定最初两项升级偏好为何不同：模型独立生成、上下文/工具可用性及合同版本等没有进行同输入单变量控制。不得简单声称纯随机，也不得声称新工具证明 Marauder 更优。

当前架构的实际限制：预算工具不做策略排序，两次模型最终都选择了它提供的一项候选；没有证据显示比较了所有合法军表。若要检验新工具是否改善写表，应在锁表前让模型针对明确假设局面比较至少两个候选，而非拿空场查询结果当作阵容优劣证据。本轮未为此重新付费生成。

### 为什么新工具已接线，却没有参与这次写表

代码检查区分了“未接线”和“流程未使用”：

- `iterative-roster-tool-port-v1.mjs` 支持 scene_context/scene_query/scenario_branch，并委托统一场景 laboratory；model port schema 也公开这三种查询及 canonical sceneQueryContracts。因此不能称接口完全没接进去。
- scene 查询要求已有合法 currentCandidate。此前 EMPTY 状态只能先查菜单/地图，再提交第一个军表草稿；这是有意义的对象绑定，不是错误。
- `iterative-roster-flash-model-port-v1.mjs` 的 requiredDecisionReason 在欠预算且已有 exact_budget_repairs.matches 时立即设 `requiredDecisionKind:propose`，使用 proposalOnlyContract。提示要求立刻交完整新军表，继续查询不能推进此步。
- 这导致第一个合法欠预算草稿之后，工具虽然能读场景，下一轮输出合同却先强制补表。补满后 query 再次允许，但本轮模型直接选择 finish；收口只检查军表与地图证据，没有要求或证明场景比较已发生。

这是一项具体的流程限制，不是推测模型“忽略了所有工具”。它说明本次没观察到新工具用于选表有宿主流程因素；仍不能证明解除后模型一定会选另一张表。改进应是有界候选比较状态：允许模型用同一查询服务比较候选/假设场景，再修改军表和计划；保留防无限分页保护，但不能把“算出合法补满选项”误当作“战略推敲已经结束”。避免改成每轮无条件调用全部工具或注入策略奖惩。本次仅记录 S272 待修项，未改这一合同或重新生产表。

## 进场计划变化

以下是经过 Rules 审计的计划表，不是强制每回合必须照办，也不是已完成部署/路径证明。两份 `placementAndPathVerified:false`。

| 回合 | 旧计划新增 | 新计划新增 | 累计占用 Supply：旧 / 新 |
|---|---|---|---|
| 1 | Goliath、两小 Marine、两 Medic | Goliath、large Marauder、large Marine、升级 Medic | 5 / 6（容量 6） |
| 2 | 第二 Goliath | 另外两 Medic | 7 / 8（容量 8） |
| 3 | large Marauder | 第二 large Marauder | 9 / 10（容量 10） |
| 4 | large Marine | 第二 Goliath | 11 / 12（容量 12） |
| 5 | 第三 Medic | 无 | 12 / 12（最后回合不设此上限） |

新版最大的时序变化：large Marine 从第 4 回合提前到第 1 回合，首队 Marauder 从第 3 回合提前到第 1 回合；支援层在第 2 回合齐备。旧版更多小单位早进场，重型主体晚来。这里比较的是计划，不代表当前实战已经兑现。

## 最终计划变化

| 维度 | 旧最终 Plan | 新最终 Plan |
|---|---|---|
| 主线 | 3/5 站点底线，后期大单位推 2/4 | 3/5 中央火力阵地，第二 Marauder 视对方过度投入才推 4 |
| 主要形态 | 两 Goliath 覆盖，多 Marine 分工，Medic 支援泡分开 | Marine 屏障、Marauder 稳住、Goliath 后方火力、Medic 互相支援 |
| 宣称累计目标 VP | 0 / 2 / 4 / 7 / 10 | 0 / 2 / 4 / 6 / 8 |
| 击杀 | 次要收益与反制手段 | 控点第一，击杀用于转控点或防止落后 10 分 |
| 退路 | 丢站点且敌方多点、敌领先≥6 等触发放弃敌色点 | 中央守不住/虫道绕后则退至己方侧，远程换人口；敌让出中央才推 4→2 |
| 对手假设/反制条目 | 5 / 10 | 5 / 6 |

两版都考虑 Crushing Grip、Omega 绕后、Creep 冲锋、Queen 反应和先 pass。新版将“未知对手、低承诺可逆站位”列为默认分支，存在过度保守风险；这是模型计划内容，不是 Host 注入奖励权重。

注意：新版从零选表草稿曾写“3/4/5 每轮 4 VP”，最终 Teach 后收敛成 3/5 每轮 2 VP 的底线。不能把早期草稿当作现在加载的最终 Plan。累计 VP 目标不是实战得分，也不等于已经达到领先 10 分的胜利条件。

## 新工具到底用在哪、证明了什么

- 旧初始选表：menu → map summary → menu → exact budget repairs → map route → final review。
- 新初始选表：menu → map summary → menu → map summary → exact budget repairs → map route → final review。没有新的 native marker/fire-exchange 调用。
- 锁表后的新 Teach：有 3 个 `mission_marker_control` 回执，以及 1 个 `fire_zone_exchange`。工具走统一 scene 服务，但场景为 pregame reference，不是正式对手当前隐藏状态。
- 占点查询在空场返回 exact；所有单位尚未进场。它准确回答空场当前资格/控制，不证明假设中央阵地能控点、能走过去、能形成射界。
- 火力交换为 advisory_estimate，`attackEstimates:0`、attack 分支 `no_current_attack_domain`；retreat/disperse 需要合法队形预览。没有得到此军表与对方换火的定量优势。
- 具体 route-to-objective 仍有 `base_profile_not_audited/unknown`。已认证通达概要不等于具体一次移动合法；unknown 也不等于不可达。新版最后计划明确承认空场查询不能回答接近通道。

可确认的改进是工具来源/精度/未知边界更显式，不能确认它改变了本次军表选择，或已经让策略更强。

## 保留问题与当前运行状态

- 新最终 Plan 把 `player1-exact-repair-3` 叫 bare Medic、把 repair-4 叫升级 Medic，与实际军表相反。typed 军表与 Supply 计划正确，文字错配记录 Medium，未手写覆盖模型计划。
- “累计目标 8 分低于 10 分获胜阈值”等表述混淆总分和领先差；规则器使用领先差，不采信该句作为胜利证明。记录策略/解释缺陷。
- 新 Plan source review 为 High0/Medium41/Low6，不意味着策略无缺陷或地图布局证明完整。
- B 房间的新运行停点在 player2（Zerg 对手），不是 player1 的 B 开局计划：Action 三轮仍将 Ventral Sacs 势力指示物描述成 Source of Creep/后续 Entry Edge。真实效果混用被拒绝；三组同版停止。C 的来源卡误判已另行修复并实际执行。
- T23 33/36、T27 5/6；主线仍余 S248/S272/S249/S250，有效完整对局 0/12。

## 可追溯材料

比较数据：`build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/plan-production-v31/B-fresh/new-old-comparison.private.json`。其中保留新旧公开计划、军表、实际查询、模型选表回复路径；不含 API key，不储存隐藏思维链。

旧模型回复在 `B/plan-workspace/iterative-draft/replies/`；旧最终 Plan 在 `B/plan-workspace/drafts/rws-929b02a7-fc43-4eb6-9c60-1c7894faf6e9.json`。新模型回复在 `query-contract-audit-v30/plan-production-v31/B-fresh/workspace/iterative-draft/replies/`；最终 Plan 在同 B-fresh 下 `teach-projection.private.json`。

本次为已有记录的只读比较：没有为了比较新增模型请求，没有重新写表，没有重跑已通过的验证。
