# Ticket 28 · W3-10/11 · 三项旧阵营卡与先手保护

## 原因与改动

复用 Wave1 已有执行器及冻结别名，为所选 Wave3 军表登记 Terran Tenacity、Wild Mutation、Zerg Creep。修前工厂的三项均未登记。

Terran Tenacity 另外存在旧规则执行缺陷。旧原生能力已记录同阶段保护，对方首次 Pass 仍会无条件改写持有人。本次给显式发布绑定记录保护语义，由共用 Pass 及先手卡合法菜单按回合、阶段和持有人读取。Pass 仍正常记录为该阶段首次 Pass。未带保护语义的停点按旧口径回放。

## 实证

- Terran Tenacity 从候选菜单提交，原卡耗尽，立即拿到先手。结束激活后，对手首次 Pass 保留玩家 1 的先手，双方 Pass 后进入 Assault，Movement 的保护不再生效。清理刷新后，同一局再用被拒。Pass 后态冷读一致，修前已保存的无新标志停点仍得到同一旧状态哈希。
- Wild Mutation 从已有菌毯位置提交，原卡耗尽，得到 +1 Speed 和第一把武器 PRECISION (1)。实际提交 Needle Spines 后 Precision 变回 0，Speed 保留到 Cleanup。菌毯外无动作，清理移除增益并刷新卡，射击后态冷读一致。
- Zerg Creep 经正式共用开房军表审计。500 分 Kerrigan’s Swarm 选恰好一张 Creep 卡通过，零张和两张都被同一规则拒绝。
- Standard 覆盖 96/117，余 21。Skirmish 覆盖 28/33，余 5。当前是候选动作与规则消费者的结算验证。正式房间签名和持久恢复仍待装配。本次没有模型调用，未评价策略效果。

## 余项

Kerrigan 的 Crushing Grip 与 Mutating Carapace 已有执行入口，但旧目标选择只检查距离。Wave3 应复用总规则 10.1 对应的权威视线和距离，并验证墙后、超距及合法目标。Leaping Strike 与 Omega Network 还需核对 PLACE、完整底盘及召唤后继。

- [修前先手被覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-faction-missing-before.public.json)
- [Terran Tenacity](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-faction-tenacity.public.json)
- [Zerg Creep](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-faction-zerg-creep.public.json)
- [Wild Mutation](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-faction-wild-mutation.public.json)
- [Standard 剩余定义](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-faction-standard-inventory.public.json)
- [Skirmish 开房准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-faction-skirmish-admission.public.json)
