# Wave3 混合军表的反应结算

Ticket 28 / T28-W3-11，候选执行器 2.85.0。冻结数据仍使用与 2.84.0 相同的 release。验收条件包含确实使用或放弃反应、恢复原行动，以及从已保存的动作重新算出相同结果。

| 原失败军表 | 原因 | 工程改动及验收边界 |
| --- | --- | --- |
| 圣堂阶级对 Zerg Swarm | Khassar 检查双方的整份反应清单。它此前无法区分只有对面冲锋才会触发的 Overseer、交给原骰池结算的 Brood Instinct，以及防守方在一批射击后可能发动的 Lunge。 | 核对 Overseer 持卡方，要求闪避骰池有真实处理器，Lunge 绑定到实际受委派的射手。发生反应时保持委派状态，等待结算后才执行三点非致命伤害。 |
| 含 Medic 的 Terran 对 Twilight Templar | 自动命中处理器可以由风暴单独构造，但原版决定是否接 Life Support 时只查看另一种自动命中入口。Khassar 对伤害窗口也仅识别特定的虫族能力。 | 将同一个原生伤害池交给 Medic 的支付、四英寸范围、减伤与分伤处理器；复用原骰点。用同一个收到伤害的状态分别验证使用和放弃。 |

## 入口和对照

两份原失败军表及其原地图、任务、部署均保留。新执行器的正式开局已把圣堂组 54 个、Medic 组 27 个定义传入对局。两组都实际进入移动阶段。旧房继续取建房时保存的执行器版本。当新候选的动作或恢复未通过时，应在这里登记实际停点。[圣堂开局](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/opening.public.json) · [Medic 开局](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/medic/opening.public.json) · [2.84.0 原拒绝](ticket-28-wave3-match-functional-coverage-2026-11-25.md)

产品入口为 Standard 军表工厂和 Room 的合法菜单、预览、签名应用与重放。直接操作模拟双方人工席位。实验不涉及模型、策略记忆写入或数据发布。

## 本轮正式 Match 准出项

| 项目 | 实际操作 | 适用范围 |
| --- | --- | --- |
| M02 · 双席建房 | 保持同一冻结版本和地图，以五对军表建房并结算首回合初始化。10 个势力各出现一次，全部进入移动阶段。 | 代表军表的正式工厂准入。具体能力触发另有验收。[五对明细](../../build/ticket-28-wave3-human-lobby-v1/standard-faction-openings-2.85.0/result.public.json) |
| M06 · 装备与支付 | 核对已签房间。渡鸦的 Corvid Reactor 花 30 矿、Seeker Missile 花 20 矿，实战分别保留 0 CP 折扣样本和 1 CP 原价样本。圣堂五次实付 0、1、1、0、0 PE，跨两回合。虫族防守方用 Brood Instinct 耗尽势力卡，原防御骰池消费了效果。 | 复用 2.29、2.66、2.25 各自绑定的动作和冷回放。新混合军表的嵌套反应单独验证。[逐项回执与来源](../../build/ticket-28-wave3-human-lobby-v1/signed-resource-coverage.public.json) |

## 正式地图上的风暴投放

战桌的 head-east:profile-cell-1 宽 471、深 43 千分之一英寸。原有标记摆放代码自己求矩形中点，生成了内核无法接受的半整数。移动模块已有适配同一张地图的物理格转换。标记摆放改为共用该转换，保留原有重叠判定。在同一张正式地图、同一房间的 r0 上，地形内的位置依然拒绝，原先误报的空地 (22, 2.3) 英寸已由施法查询返回合法坐标及支付卡。[原格边界与查询回执](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/medic/action/map-cell-regression.public.json)

## M05 · 把高地最终落点规则接入完整 Match

旧的 FAQ 组件曾用九个 Marine 验证。正式 2.85 房间的状态里没有这条规则。2.86 候选从同一冻结 release 核对 FAQ 和核心规则字节摘要，在正式工厂装配既有规则，同时供空间查询和房间使用。新的 Standard 房间用六个 Marine 从高地上移动一英寸，一个模型的底盘伸出边缘、中心仍在台上。实战查询返回精确可行，签名后六个模型均落在申报坐标。将该模型中心再向外移 0.1 英寸，实际房间拒绝。r4 结束激活，重开后四步重放一致。桌面预设版本继续为 2.84。此处使用可编辑的规则高台，测试的是该落点规则。[本轮高地结果](../../build/ticket-28-wave3-human-lobby-v1/high-ground-286/result.public.json) · [高地查询及拒绝对照](../../build/ticket-28-wave3-human-lobby-v1/high-ground-286/query.public.json) · [双规模 Run、冲锋、收拢和高地的全部来源](../../build/ticket-28-wave3-human-lobby-v1/signed-movement-coverage.public.json)

## 两个动作停点

- Medic 原 r10，暮光圣堂的 Psionic Gale 命中 Marine 后，防守席确实收到 Life Support。r11 使用能力并支付，r12 由防守席实际选择伤亡，原伤害池结算为 2。两分支的最终差额取自同一 r10。[选择菜单](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/medic/action/decision.public.json) · [使用动作](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/medic/action/main-r11.public.json) · [伤亡后继](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/medic/action/main-r12.public.json)
- 原 Khassar 测试中，高阶圣堂的 Psi Blast 可选蟑螂；Adept 的 Glaive Cannon 当时只可选刺蛇。测试指定后者射蟑螂，随后误用了通用 Pass，已停止。验收脚本现要求同一把武器、同一名受委派单位的公开菜单包含指定目标，并核实友军刺蛇与目标距离。有限搜索没有找到位置时会留下停点。[原 r0 两把武器的各自菜单](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/action/r0-choice-diagnostic.public.json)

## 同一次 Psionic Gale 的实际伤亡

从 r10 的同一伤害窗口分支。6 个 Marine 已有 2 点伤害，新伤害是 4，两支的原始结算摘要完全相同。使用 Life Support 后总池 6 减至 2，防守方移除 1 个 Marine，余 5 个。放弃时总池为 6，移除 3 个，余 3 个。两支都交回施法席位，已按各自绑定的签名重新打开和重放。[伤亡与资源对照](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/medic/action/outcome.public.json) · [用／弃签名](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/medic/action/paired.public.json)

两份原先无法开局的军表已逐一核对稳定 ID、来源摘要、所属单位或卡、实际适配器，分别 54 和 27 个定义。将本轮结果与旧正式建房清单按冻结定义和来源摘要汇总，已索引人族 23/59、虫族 40/51、神族 52/52。此索引记录可追溯的军表准入，用于定位仍缺对照的定义。使用能力的步骤以房间动作为准。[逐项索引](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/definition-evidence-index.public.json)

同一房间的占点查询读到了伤亡后的人口变化。在 5 号任务点，用 Life Support 一支持有 2 点占点人口；放弃一支的 Marine 自身人口落到 0，全队在该点合计 1，仍由同一玩家控制。该查询只读局面，未结算分数。另取已签名的 Nova 冲击，12 只跳虫余 10 只，人口仍是 1，4 号点控制仍属虫族。[两支占点明细](../../build/ticket-28-wave3-human-lobby-v1/medic-post-casualty-control.public.json) · [冲击前后](../../build/ticket-28-wave3-human-lobby-v1/impact-post-casualty-control.public.json)

## Khassar 委派射击的实际反应

同一原军表及地图，调整隔离棋位后，公开菜单明确给使徒的 Glaive Cannon 提供蟑螂目标。圣堂所属方在 r1 签出委派射击。r6 的攻击记录同时绑定使徒、蟑螂和得到 Lunge 资格的刺蛇。选择放弃后，r7 交回原席位，4 个使徒保留并产生 3 点非致命伤害。七项签名的完整冷回放一致。[摆位与合法目标](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/action/qualified-layout.public.json) · [r6 反应](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/qualified-action/decision.public.json) · [放弃后的动作与重放](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/qualified-action/pass.public.json)

### 刺蛇发动 Lunge 的领队证明

在相同 r6，2.85 的空间查询返回「未找到可证明的路线」。两只刺蛇使用 1.575 × 3.937 英寸的矩形底座。原算法为另一只可当领队的刺蛇估算最少平移距离时给出了零。这里有正的距离下界，原算法无法据此认可向使徒靠近的领队。2.85 发动分支停在 r0，正式签名动作数为零。[查询原件](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/qualified-action/spatial-query.public.json) · [原停点](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/qualified-action/use-search-stop.public.json)

候选 2.87 使用旋转矩形的外接圆、每个圆形目标的位置、原生测距取整和整数坐标求出保守下界。在此棋位，挑战领队资格的另一只刺蛇至少要平移 0.366 英寸才可能达到指定距离。西侧刺蛇的一种旋转与墙重叠，产品按原地形拒绝。东侧刺蛇给出了可行的 0.366 英寸路线。这条路线用于比较哪只刺蛇能领队，玩家提交的实际移动为 0.300 英寸。

产品运行时从原 r6 完成查询、动作构造和结算。东侧刺蛇从 (23.225, 8) 到 (23.225, 7.700)，西侧从 (21.500, 8) 到 (21.500, 7.482)。委派的使徒受到 3 点非致命伤害，行动权交回高阶圣堂所属玩家。原来较长的提案仍未获证明。此项验证覆盖给定队形与路线的结算；自动搜索耗时、本次发动的房间签名与冷恢复分别记录。[实际参数和后继](../../build/ticket-28-wave3-human-lobby-v1/khassar-grid-leader-287/product-step.public.json)

## M13 两种法术由同一玩家选择顺序

原 Standard 军表支付 Storm 后只剩 1 PE，Gale 需 2 PE。隔离验收通过军表工厂多选了一张 Gateway，29 项定义全部准入。第一次选择 Gale 中心与模型重叠，规则拒绝，保留 r5。改用正式投放查询，在 (20, 6.6) 英寸实际施法并支付两张卡。r12 的突击末公开菜单同时列出两种法术，圣堂席先选 Gale，再结算 Storm。其间守方选择伤亡。r17 的人口下降还触发了新的可选反应，夹具起初漏处理，修正后依次由各优先席明确放弃。r20 进入近战，重开数据库后从起始信封重放全部 20 笔签名，终态逐字段一致。

本房验证同一席位的两种异名法术；生成与标记回收使用已签名的腐蚀胆汁房，双方结束突击后结算两个目标，移除标记并进入近战。[双法术菜单](../../build/ticket-28-wave3-human-lobby-v1/simultaneous-storm-gale-287/order.public.json) · [Gale 的投放与支付](../../build/ticket-28-wave3-human-lobby-v1/simultaneous-storm-gale-287/cast-twilight_templar__high_templar_.public.json) · [20 步和冷回放](../../build/ticket-28-wave3-human-lobby-v1/simultaneous-storm-gale-287/result.public.json) · [胆汁标记回收](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/native-round-start/successor.json)

## Khassar 发动分支的正式签名

以同一 r6 的完整状态建立 2.87 隔离房。房间只接受 1 笔发动，签出的两只刺蛇落点分别是 (21.500, 7.482) 和 (23.225, 7.700) 英寸。委派使徒承受 3 点非致命伤，四个模型均留场，行动权回到高阶圣堂所属的 player1。重开数据库并重放这笔签名，完整信封相同。放弃分支沿用 2.85 原 r7 的既有签名与冷回放。[正式发动与冷回放](../../build/ticket-28-wave3-human-lobby-v1/khassar-grid-leader-287/signed-use.public.json) · [放弃与冷回放](../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/qualified-action/pass.public.json)
