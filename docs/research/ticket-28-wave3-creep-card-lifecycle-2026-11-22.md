# Ticket 28 / W3-10、11 · 菌毯卡牌与生命周期

冻结发布 U83/C84/R50 下，Standard 的 Hatchery、Overlord 加入两条主动放置，Accelerating Creep 加入两条被动。Skirmish 样例只选了 Accelerating Creep，本轮登记增加两条被动。

|正式工厂样例|已登记|待接入|
|---|---:|---:|
| Standard | 51/117 | 66 |
| Skirmish | 16/33 | 17 |

隔离 Standard 场景经官方候选组件实际提交两张卡。Hatchery 移动阶段可用，Overlord 突击阶段可用。Hatchery 提交消耗原卡，同回合第二次无法使用。两棵菌毯都有 DISPLACEMENT 来源绑定，并在 Cleanup 后保留。使用已保存的第一阶段状态，经 JSON 重载执行 Overlord。

人族 Goliath 真实 Move 停在菌毯底盘 1 寸以内，既有菌毯规则消费该动作并留下范围测量回执，Token 从棋盘移除，来源绑定标记 consumed。以同一终点输入 Place 生命周期，菌毯保留。已验证位移资格，位移提交、Deploy、Run、Charge、Disengage 四类动作与完整 Match 冷恢复尚待验。零模型。

- [两套正式工厂的准入记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-card-admission.public.json)
- [落点、Cleanup 与移除回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-card-lifecycle.public.json)
- [Standard 当前 66 条待接清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-pending-abilities-after-creep-cards.public.json)
