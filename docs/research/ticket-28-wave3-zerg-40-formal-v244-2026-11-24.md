# 同一份虫族军表在两版正式规则中的准入结果

Ticket28 / W3-09 / M08。以该项冻结的四十条新增定义作为分母。军表含 Zagara、Defiler、Vileling、Bile Launcher，选择 Reactive Creep 和 Defiler Mound，并为 Defiler 买入 Burrow Ambush、Plague、Cancerous Bite。对手使用此前的 Nova 军表。使用标准房允许放弃未花资源的既有政策。

| 证据 | 2.43.0 | 2.44.0 |
|---|---:|---:|
| 新增定义实际被选入 | 40 | 40 |
| 其中有正式工厂消费者 | 26 | 28 |
| 工厂仍缺接线 | 14 | 12 |

两版共选中 57 条定义，含对手和其他继承能力。按逐项来源哈希对齐，发生状态变化的是 Defiler 和 Bile Launcher 的 Burrow Ambush。两项共用已验证的预备队 PLACE(18) 规则和参数编译。原来正式开场组装器只收录了部分既有单位和 Vileling 的同类能力。这次按实际选择挂入同一重定位适配器，Defiler 仍需购买升级。

| 剩余来源 | 正式工厂尚缺 |
|---|---|
| bile_launcher | Biological Structure、Source of Creep、Detection、Bombard、Indomitable |
| defiler | Plague、Cancerous Bite |
| defiler_mound | Poisonous Essence、Tunnel Network |
| reactive_creep | Reactive Tissue、Living Glob of Tissue、Creep Removal |

2.43 已从外部建房入口确认按相同缺项拒绝。2.44 正式建房明确拒绝剩余 12 项，拒绝身份与清单一致。另取已准入的 Zagara 军表，只为 Defiler 购买 Burrow Ambush：2.43 按该项拒绝，2.44 在任务开场后给出该单位自己的桌边和底座。Defiler 从蓝方桌边实际放置到 (12, 10)，占 1 Supply，行动交还玩家一；3 条签名回执冷回放相同。本次 Bile Launcher 已验证消费者登记，其余 5 条依赖齐备后再验包含它的正式房。 [Defiler 真实入场](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v244/defiler/result.json)

[冻结 40 条来源](../../coordination/wave3/new-definition-inventory.json) · [同一军表](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v243/recipes.json) · [2.43 逐项结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v243/coverage.json) · [2.44 逐项结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v244/coverage.json) · [验收入口](../../scripts/inspect-wave3-zerg-definition-coverage-v243.mjs)
