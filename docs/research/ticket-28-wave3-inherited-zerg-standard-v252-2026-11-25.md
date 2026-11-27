# T28-W3-09 / M08　旧虫族军表与 Burrow Ambush

将冻结写表器的势力、稳定定义 ID 与既有 252 条继承记录关联，虫族共 115 条。选择凯瑞甘、普通虫群及带 Malignant Creep 的凯瑞甘合法军表，沿 Standard 正式工厂核对；同房另一席沿用已准入的 Nova，结果以虫族稳定 ID 去重。2.51 有 91 条已选定义可执行，18 条待接。Omega Worm 和 Roachling 的 6 条需在生成后验证，清单逐条链接此前后继证据。

| 2.51 对照军表 | 双方所选定义 | 尚缺 |
|---|---:|---:|
| kerrigan | 92 | 0 |
| swarm | 60 | 15 |
| malignant | 44 | 3 |

普通虫群场景首次选择的两支精英单位合计占 3 个精英槽，来源军表当时只提供 2 个。加选 Hydralisk Den 后军表合法，保留首次拒绝。

## 相同升级的正式部署

三种单位的冻结卡文与已接入蟑螂的伏击逐字相同。旧版归档了完整能力，Wave3 正式房间的搬移列表只包含部分单位。2.52 依实际购买升级、旧发布身份和经审核的伏击条款登记，不改旧版房间的动作清单。普通虫群同表的 60 条所选定义和来源散列不变，仅这三条转为可执行。

首次严格开房仍漏掉刺蛇伏击。查明只读查询会直接传递版本开关，实际房间却按另一份默认键表静默过滤。本次改为两条入口共用同一选项解析，未知键立即报告。

[115 条逐项登记](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.52.0/coverage-ledger.json) · [旧查询](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.51.0/swarm.json) · [新查询](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.52.0/swarm.json) · [旧布局缺失的实际开房记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-hydralisk-ambush-v252/opening-stop-1.json)

## Malignant Creep 的正式开房查询

冻结卡文把 Malevolent Matriarch 限定为突击阶段的冲锋。最初适配器先筛选“任意阶段”，把本应处理的卡挡住。调整阶段检查后，在相同双席军表的 44 条定义中，来源散列全部保持一致，三条卡牌能力由待接变为可执行，查询覆盖 44/44。三组军表累计可准入的旧虫族定义达到 97/109，另有 6 条在生成模型时核对。冲锋冲击的实际结算、菌毯标记移除和冷恢复单独验证。[两版同表对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.53.0/comparison.json)

## 刺蛇的真实部署后继

正式房间选择虫族先行动。只提供一只刺蛇的位置时，预览拒绝且房间状态未改变。提供两只的位置后部署提交成功，末态坐标分别为 (12, 10) 和 (14.5, 10) 英寸，单位 Supply 为 2，下一次行动权交给人族。重新打开存储并重放三个已接收动作，r3 的完整权威状态与原件一致。全程零模型调用。[实际部署与冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-hydralisk-ambush-v252/result.json) · [不完整部署的拒绝记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-hydralisk-ambush-v252/offer.json)

## 双人工房间的冲锋宣告和普通虫群 2.54 查询

两组中凯瑞甘与 Nova 的位置、军表和任务相同。只移动提供菌毯的 Bile Launcher。宣告冲锋时，公开查询与动作菜单在菌毯内均给出 +1，在菌毯外均给出 0。两组未指定冲锋的查询及对手查询均为 0。[内侧宣告](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-malignant-creep-v253/charge-on/declaration.json) · [外侧宣告](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-malignant-creep-v253/charge-off/declaration.json)

普通虫群的相同军表共 60 条定义。2.54 的军表、定义 ID 和来源散列与 2.52 一致；新增准入普通蟑螂两种升级、Raptor 与 Zergling 各自的 Adrenal Glands、进化腔 Extended Claws、蟑螂巢 Nasty Surprise、孵化池 Feral Rage 和巢穴的 Creep Spread。另修正位移服务中遗漏巢穴的旧名单，统一读取经过审核的生成规则。三份军表累计105/109条获开房前查询准入。各能力对实际动作的作用另行核验。[2.54 同表记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.54.0/swarm.json)

## 防御卡的正式开房查询（2.55）

在同一份 60 项军表里，进化腔 Carapace 和监察王虫 Oversight Mode 的来源 ID、来源散列与前版一致，两者均获正式开房前查询准入。三份军表所选的旧虫族能力累计 107/109 项通过该查询。这个数字只统计开房查询。[2.55 同表记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.55.0/swarm.json)。

## 凯瑞甘冲锋从宣告到冷恢复

正式房间两席在相同位置宣告冲锋。冲锋前位于菌毯上的凯瑞甘投 4 颗冲击骰，按 3+ 命中；对照组同样投 4 颗，按 4+ 命中。两组冲锋都成功、收尾时均已在菌毯外，均把行动权交给对手。各 7 条签名动作从初态重放后，完整状态与实战结算一致。比较对象为命中门槛；两组骰面不同，伤害差不用于判断策略。[菌毯内宣告](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-malignant-creep-v253/charge-on/result.json) · [菌毯外宣告](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-malignant-creep-v253/charge-off/result.json)。

## 巢穴 Predation 的阶段与正式准入（2.56）

冻结卡上写明 Any Phase，后半句的 Close Combat Weapons 描述武器类型。普通虫群单带这张卡时，旧工厂按描述词推断出近战阶段，首次开房拒绝。新版在选到巢穴时启用已有的卡内阶段标签解析，再把同一来源带到公开菜单、近战和恢复构造器。同一份 60 项军表相对 2.55 只有 Predation 改为准入，余下 1 项为监察王虫 Pneumatized Carapace 的冲锋掷骰后反应。三份军表累计 108/109 条获准入；巢穴卡实际打出及其近战效果仍需另验。[同表查询](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.56.0/swarm.json) · [首次拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.56.0/swarm-stop-1795538228105.json)。

## 菌毯肿瘤从放置到移除

使用原 44 项军表，孵化场放置菌毯肿瘤，公开属性查询确认凯瑞甘位于菌毯上。Nova 完成移动，底盘到标记边缘间距为 0.8 英寸，规则生成带来源和测量散列的移除事件，此后凯瑞甘已离开菌毯覆盖。保存并重新打开房间后，5 条签名动作精确重放。[实测落点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-malignant-creep-v253/tumor/before-removal.json) · [移除与冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-malignant-creep-v253/tumor/result.json)。

## v2.57 普通虫群 60 项均可进入正式开局

同一冻结军表在 v2.56 有 59/60 项准入，v2.57 为 60/60。逐行核对，仅监察王虫卡 Pneumatized Carapace 的状态从 pending_family_adapter 变为 executable_exact。三份已查军表合计 109/109 个登记项可准入。这一数字只证明开局能力登记；冲锋骰后用卡与放弃、实际位移及冷恢复单独记录。

## 监察王虫骰后公开选择与恢复

两个人工席在 v2.57 正式房间完成宣告并由权威规则掷骰。第 2 个修订点原骰为 3、距离上限 7 英寸，公开菜单只含用卡及放弃。两条已签名回执从初态冷重放后，完整状态一致。两种选择共用此原始掷骰状态。[同表冻结准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/inherited-zerg-standard-2.57.0/swarm.json) · [骰后菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overseer-charge-v257/prefix-menu-r2.json) · [冷恢复停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overseer-charge-v257/prefix-result.json)。

## 放弃冲锋反应与巢穴近战后继

正式放弃监察王虫反应后，原骰 3、上限 7 英寸、卡牌 ready；实际冲锋及冷恢复通过。巢穴 Predation 的实际近战在第 4 步结算，允许敌方反应为 false，冷恢复通过。用卡分支第一次建房遇到并发 SQLite 写锁，其他分支完成后已串行续验。 [放弃后移动](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overseer-charge-v257/pass-result.json) · [巢穴近战](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overseer-charge-v257/predation-result.json)。

## 监察王虫两支从同一原骰完成

三份冻结军表 109/109 个继承虫族定义可准入。监察王虫同一原骰 3 的两支均移动成功，用卡附加骰 2、卡耗尽，放弃保留就绪卡；两支各 2 条签名回执冷恢复一致。Predation 近战在 r4 冷恢复一致。 实际两支均可走 7 英寸，本次额外掷骰低于原骰，未观测到距离增大的局面。[用卡的两骰、落点及后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overseer-charge-v257/use-result.json) · [放弃对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/overseer-charge-v257/pass-result.json)。
