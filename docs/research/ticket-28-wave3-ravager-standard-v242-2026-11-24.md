# Ravager 的 Deep Tunnel 正式房间接线

2.41 的同一份军表选择 44 个定义，唯一未注册的是 Deep Tunnel。2.42 复用既有的 Ravager Burrow 标记、支付、位移、连续性和销毁组件。32 mm 来自既有项目尺寸配置，当前解释为圆形直径。[尺寸来源](../../content/source-releases/wave3-20261116-deep-tunnel-dimension-v1.json) · [2.41 准入对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/direct-admission.json)

- 移动阶段由行动方支付 1 Biomass，按规则器检查完整标记是否在任一模型 12 英寸内。查询和提交共用放置消费者。
- 回合末由先手方先选自己的效果。同方有多个标记、时限效果或战场资产时，可以挑选一个。选择深潜后可放弃，或以标记为领队摆放全单位。该项及其反应完成后，房间重新提供剩余效果。
- 对 Standard 遗物任务，携带者选择放置会先交由对方放置掉落的遗物，再恢复原单位、效果和参数。放弃深潜不会触发该分支。Skirmish 使用任务规则规定的放置时点。
- 当前验证从公开工厂建房开始。军表全部准入、实际移动与回合末收尾、冷恢复分别登记，三者须凭各自回执准出。

[正式开局门禁](../../scripts/verify-wave3-ravager-deep-tunnel-standard-v242.mjs) · [上一个胆汁场景](ticket-28-wave3-ravager-standard-v241-2026-11-24.md)

## 工厂结果

同一军表 44/44，正式工厂返回首个任务动作 `resolve_mission_start_of_round`。深潜查询在开局正确报告当前不能选择回合末位移。[正式工厂回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-deep-tunnel-v242/opening.json)

## 实际深潜投放

一只直接入表的 Ravager 在隔离房间的移动阶段从 (10,10) 向 (15,10) 英寸投放 32 mm 圆形标记，支付一张阵营牌的 1 Biomass。超出 12 英寸的放置被同一查询入口拒绝；合法预览与正式提交的动作内容一致。重复提交只复用回执，后继菜单允许移动或结束激活。[r1 回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-deep-tunnel-v242/movement/placement.json)

## 混编军表的回合末选择

在第一回合已计分的同一房间中，Ravager 的查询允许开始深潜，实际玩家菜单只提供 Nova 的全息结算。此时只有一个深潜标记需要处理。旧版全息控制器只按先手与清理阶段判定，抢先接管了新版的共享窗口。2.42 的全息能力改由 Match 调度每个实际待结算效果，旧独立控制器按原发布合同使用。[修前查询与菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-deep-tunnel-v242/round-end/menu-conflict-before-fix.json)

修正后，第一回合计分后的 r4 查询与先手虫族的房间菜单都给出深潜。选择位移时由 (10,10) 到达 (12.7,10) 英寸；选择放弃时保留 (10,10)。两支均移除同一枚标记、给出下一回合先手动作。每支四份已接受回执从初态冷回放，最终状态与原房逐字段一致。场景从已支付的投放直接连接到回合末。[两份签名回放结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-deep-tunnel-v242/round-end/result.json)
