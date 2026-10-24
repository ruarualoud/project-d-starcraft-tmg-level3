# 固定 2000 分军表的模型计划 v5 — 用户审阅版

这是模型**为已有军表写计划**的真实产物导读，不是模型从零选出的军表。完整、未经此导读改写的原始保存记录在 [`build/ticket-27-slice-272-fixed-preset-live-v1/revision-live-E9OxkC/drafts/rws-7814d0d4-271c-4ddc-8888-511010ae7b3f.json`](../build/ticket-27-slice-272-fixed-preset-live-v1/revision-live-E9OxkC/drafts/rws-7814d0d4-271c-4ddc-8888-511010ae7b3f.json) 的 `planSerialized` 字段。场景为 Standard 2000、Terran Armed Forces 对 Kerrigan's Swarm、Hold Position。原计划 v5 hash `8949101b…764d251`；独立复核 High 0、Medium 0、Low 6，但这不代表地图路线已证或真实对局效果已证。

## Rules 锁定的军表

| 单位 | 数量/规模 | 每个单位已选升级 |
| --- | --- | --- |
| Marine | 3 队，large | AGG-12、Bayonet、Combat Shield、Grenades - Frag、Rocket Launcher、Slugthrower |
| Goliath | 2 台，small | Ares-Class Targeting System、Haywire Missiles、Scatter Missiles |
| Jim Raynor | 1，small | 无 |
| Medic | 1，small | Stabilizer Medpacks |

战术卡：Barracks (Proxy)、Factory、Supply Depot。Rules 审核：7 单位、33 起始模型、总 Supply 12、25 项已选升级、矿物 **2000/2000**、Vespene 115。模型没有改、选、比较这张军表的权限。

## 模型写的胜利计划

主线是任务点控制：己方亲和点 1/3 作较便宜的守点基础；尝试争对方点 2/4 的较高分；中立点 5 作摇摆目标。次线是击毁对方单位的 Supply，既得分也降低对方占点能力。模型给出的**目标**累计分为第 1–5 回合 `0 → 1 → 6 → 9 → 12`，并在 v5 明确说第 2 回合对方点和第 3 回合跃升到 6 分都要以当时有单位真实到点为条件；数字不是确定得分。若争点失败，转为守点 1/3、阻止对方得分并通过击杀 Supply 追分；若对手领先 7 分以上，优先拒点而非分兵争全部五点。

| 回合 | Rules 校验的首次进场 | 累计 Supply/上限 | 模型赋予的任务 |
| --- | --- | --- | --- |
| 1 | Marine 1、Marine 2、Raynor | 5/6 | 定位己方点 1/3；本轮不计任务点 VP |
| 2 | Marine 3 | 7/8 | 作为机动争夺单位，尝试中立点 5；到达性未证 |
| 3 | Goliath 1 | 9/10 | 反装甲/飞行与对方点 2/4 通道火力；到达性未证 |
| 4 | Goliath 2 | 11/12 | 与第一台分担侧翼和主通道覆盖 |
| 5 | Medic | 12/末轮不限 | 治疗/支援；前四轮完全不在场 |

模型打算把 Barracks (Proxy) 的一次性非入场边部署留到看清虫群进场与菌毯后，用于更有价值的侧翼争点，而不是自动立即消耗。对 Omega Worm 侧袭，前两轮只能抽 Marine/Raynor 回防；第 3 回合后 Goliath 才可加入。对 ON CREEP 冲锋，前两轮只能重定位、拒点，不能假设有 Goliath 远程屏障。对早期伤亡，Combat Shield、Raynor 的 Freedom Fighters 与让出高风险点是现有手段；Medic 第 5 回合前不能治疗或接反应。若 Raynor 早死，计划放弃高风险的对方亲和点进攻，收缩至己方点；若 Marine 早死，接受损失一个己方点本轮收益。

## 为什么这样用这张表——模型实际写了什么

这是**固定军表的用法解释**，不是选购这张军表时比较过其他组合的理由。模型认为 Marine 1/2 在最早可进场窗口承担己方点的低成本守点，Marine 3 在第 2 回合尝试中立点 5；Raynor 的 Freedom Fighters 是早期占点 Supply 下限的保障；Goliath 1/2 在第 3/4 回合才进场，负责对装甲、飞行与冲锋接敌；Medic 第 5 回合才进场，不能被算进前四回合的生存收益。Barracks (Proxy) 被解释为一次性改变入场位置的工具，Factory 是 Goliath 后续修复资源，Supply Depot 支撑 Hero 位。模型也承认前两回合没有 Medic 治疗、Factory 修复或 Goliath 火力屏障，是这套排程的风险窗口。

这个解释仍没有回答“为何这七个单位和这些升级优于另一张同为 2000 分的表”，也没有给出量化对抗交换结果；军表本来被锁定，模型未做选择或替换实验。

## 先后顺序与条件分支

| 时间 | 模型的优先意图 | 若条件不成立 |
| --- | --- | --- |
| 第 1 回合 | Marine 1/2 和 Raynor 进场；观察虫群走向点 2/4/5 还是袭向点 1/3，以及是否前置菌毯；不立刻消耗 Barracks (Proxy) | 此回合任务点不计分；若己方被侧袭，抽 Marine 回防并接受另一个己方点可能丢失 |
| 第 2 回合 | Marine 3 入场，尝试点 5；己方 Marine 争取守点 1/3，Raynor 贴近关键占点单位 | 若 Marine 3 到不了点 5，点 5 当回合不计入目标；对方点 2/4 也只在已有 Marine 真正可到时才考虑，且可能要放弃原守点的 1 分 |
| 第 3 回合 | Goliath 1 入场，意图覆盖对方点 2/4 方向并威慑冲锋；目标累计 6 分 | 到达和火力线都未证；若到不了对方点，模型自己把较低基线写为累计 2 分，而不是强称 6 分 |
| 第 4 回合 | Goliath 2 入场；设想一台守主要争点方向、一台照看 Omega Worm 侧翼 | 分工仍须看当时实际敌军、地形和合法火力线，不能机械执行 |
| 第 5 回合 | Medic 入场后才可以治疗或使用 Life Support；继续按实际控制权与比分修订 | 若已失去 Raynor/Marine 或落后 7 分以上，缩为守己方点、拒点和击毁对方 Supply 的计划 |

原件还有一条 14 项的 `activationOrder`，按单位列出了 Movement 再 Assault 的优先表；它跨越了不同回合才进场的单位，因此**不是一份可直接执行的逐动作脚本**，也没有每个单位的坐标、移动终点、目标敌军或换火次序。

## 对手预测与预设应对——原件中确实存在

| 模型假设 | 模型打算观察什么 | 预设应对 | 尚未证实之处 |
| --- | --- | --- | --- |
| Kerrigan 用 Crushing Grip 打乱激活节奏（中等信心） | Kerrigan 进入作用范围、消耗 Biomass、关键争点单位被算作已激活 | 重新查询剩余可激活单位；把点 5 任务转给其他 Marine 或 Raynor | 转交后的可达性查询返回 unknown；需要当局重算 |
| Omega Network/Worm 从后方开入场边（中等信心） | 合法 Worm 位置及预备队中的低 Supply 单位 | 不追击不能占点的 Worm 本体；前两回合抽 Marine/Raynor 守点 1/3，第 3 回合后可用 Goliath | 抽一队回防后两个己方点还是否守得住，空间查询返回 unknown；原计划明确接受可能少得 1 分 |
| 菌毯支持的加速/冲锋（中等信心） | 点附近前置 Creep Tumor、冲锋单位、菌毯卡选择 | 评估用一次动作贴近并移除 Tumor 是否合算；否则撤出冲锋范围，第 3 回合后才用 Goliath 建远程火力 | 没有本地图的实际冲锋距离、火力圈和损失测算 |
| 虫群打歼灭与 Supply 得分（低信心） | 集火高 Supply 单位而不是争全部点 | 前期护住 Raynor/Marine；第 5 回合后才动用 Medic；Goliath 入场后尝试保持射程 | 威胁交换工具返回 `no_current_attack_domain`，预期伤害未知，不能认定远程一定占优 |
| 对方实际阵容仍未知 | 对方进场单位、升级、菌毯卡与支援解锁 | 保留 Barracks (Proxy) 的一次性能力，先观察再决定主攻占点还是拒点/歼灭 | 这不是“猜中对方阵容”，而是待观察后更新的开放分支 |

原件还规定了重新规划触发器：对手领先 7 分以上、展示飞行/重支援等不同阵容、Worm 或 Tumor 改变战场、己方关键单位提前损失、规则查询澄清了关键交互，均应重算路线。这些是条件预案，**不是对手已经做过这些动作**。

## 地图证据究竟到了哪里

会话绑定了任务、部署卡和一个 `mapTopologyHash`，模型也实际发出了“我方入场边及 Barracks (Proxy) 到五个点的距离、前两回合可达性”空间查询。但该查询在实验房间 revision 0 返回 `resultStatus=unknown`、`unknownReason=no_active_relationships_in_base_state`，没有得到任何单位—地形—任务点的可达关系。后方掩护后占点 Supply 的查询也是 `unknown`。因此这里只能说模型**知道应该查地图，却没拿到可用于计划的地图结论**；其“Marine 3 去点 5”“Goliath 覆盖点 2/4”是意图，不是验证过的路线。缺少具体地图名/区域、出生区到各点的通路与距离、底盘可通行性、高低地/障碍、敌方威胁火力线、每步终点以及这些地形如何改变前五回合分数预期。

要把这份计划当作可上桌方案，至少应在实际地图和对手部署已知时，对每一轮的候选落点、最短合法路线、控制范围与敌方反制做查询，得出可执行动作并随局势修订。当前 v5 尚未做到。

## 审阅时应特别质疑

1. `placementAndPathVerified=false`：Marine 3 在第 2 回合到点 5、Goliath 1 在第 3 回合影响点 2/4，都尚无具体地图、底盘和行动序列证明；目标分数可能偏乐观。
2. 复核未发现 High/Medium，但我读原件发现跨字段口径不一致：早期进场理由和部分单位用途写 Freedom Fighters 为 8 英寸，v5 正文却称具体半径未知。当前冻结规则适配器确实依据源文字样 `Within 8` 编译为 8000 milli-inches；需要将来源正确传给计划/复核并修订“未知”说法，不能靠复核零 High 直接放行。
3. 这是公开策略说明与工具回执，**没有隐藏思维链**。没有真实对局执行、地图路线证明，也没有证明目标得分能兑现。

此页是便于人工审阅的摘录；若与原始 `planSerialized` 有差异，以原始记录为准，并作为修订问题处理。
