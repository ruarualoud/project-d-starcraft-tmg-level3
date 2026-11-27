# Ticket 28 · W3-10／11 · Roachling 后继与 Hatchery 对照

## 权威动作证据

- 移动阶段从已保存的召唤后态开始。签名候选 Room 提交 Corpser 移动和结束激活至 r2。Roachling 维持召唤阶段锁，轮到对方。状态重建保留 3 个既有稳定能力绑定。
- 以实际移动结果建立突击阶段的隔离检查点，调用原生先手动作。Corpser Run 并结束后，菜单只给 Roachling 联动行动。Roachling Run 并结束后释放联动，交给 player1。突击房间 r4。重新打开两处 SQLite 后核对签名和回放。移动两条、突击四条回执精确一致，并重建了突击 r2 的待办。
- 从突击后态建立近战接触夹具，声明母体已不在场。Roachling 通过真实 Room 提交 Claws，对 Goliath 掷 6 颗命中骰，续过护甲与闪避，生成 Close Combat 回执和 1 点累计伤害。签名回放精确。
- 从突击后态另建第二回合移动对照，声明母体已不在场以及 Hatchery 就绪。Roachling 有普通移动菜单，Underdeveloped Claws 查询返回禁止 Burrow，Hatchery 的 Lie in Wait 菜单不给它。Raptor 有同一能力菜单，真实提交后获得 Burrowed。Roachling 仍保持原状态。

这些房间的阶段、近战接触及母体缺席是明确标记的隔离场景。正式 Match 的顺序推进、联动战斗双方接战条件与客户端持久恢复仍属正式验收。

## 这次补齐的共用链路

- 产品组件从实际生命周期来源识别召唤，交给通用母体联动。即刻移动仍由冻结来源单独授权。战斗阶段资格绑定官方 8.8 接战要求。
- 重建状态时保留原有显式能力来源映射。正式开房从同版召唤资料预注册 Claws。实际出招依据当前棋盘与交战图。
- 将已支持的菌毯主动与被动资产经原适配器接到组件的菜单、预览、应用及查询。复合装配共用 CP／BM／PE 资源合同和护甲阈值策略。
- 隔离突击预检曾缺少 Corpser 已完成移动这个 Run 前提，现以前一签名阶段回执续行。Claws 命中提交后按原停点完成护甲和闪避，保留原骰，不重掷。
- 检查两种规模的正式工厂。Standard 102/117，尚缺 15 条。Skirmish 33/33，后继仍明确停在完整 Room 装配。Ticket 28 2/16。模型调用零，策略效果未测。

- [移动及当前阶段锁](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-linked-movement.public.json)
- [突击联动与交权](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-linked-assault.public.json)
- [冷恢复与签名回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-linked-cold-recovery.public.json)
- [Claws 伤害及签名回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-linked-claws.public.json)
- [Hatchery 正反对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-linked-underdeveloped-claws.public.json)
- [正式开房及 15 条待接清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roachling-linked-formal-admission.public.json)
