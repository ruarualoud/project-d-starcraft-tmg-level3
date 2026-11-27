# Ticket 28 / W3-10、11 · Queen 放置菌毯

冻结 U83/C84/R50 复用已有单位生命周期执行器，精确校验 Queen 卡文、Any Phase 和 1 BM。Standard 正式工厂登记升到 52/117，待接 65；Skirmish 样例未选 Queen，维持 16/33，待接 17。两套尚未准入整场 Match。

从已保存的 Hatchery 后继进入条件化移动阶段，实际预览并提交 Queen 能力。相离半寸与空支付均拒绝。将待执行状态 JSON 回读后提交，真实支付 1 BM，菌毯贴两底盘生成，Queen 激活窗口仍开放。同回合第二次菜单不再提供该能力。现有 Accelerating Creep 为新标记绑定 STAY IN PLAY 和 DISPLACEMENT。

验证了历史标识保护。先消费已生成菌毯，再在独立的同回合条件场景保留该已消费绑定，新的生成使用后缀 3，原标记为 2。这个条件场景用于检查标识分配，同一局内重复施放仍受可用性校验。

下一道位移缺口已定位。现有位移生产器只从 Bombard 等旧能力发现位移来源。需要让它验证 Queen、Hatchery、Overlord 的原生来源绑定，再进行实际移动、位移、移除和保存恢复。零模型。

- [Queen 实际组件回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/queen-creep-placement.public.json)
- [正式准入验证](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/queen-creep-release-admission.public.json)
- [Standard 65 条待接入清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-pending-abilities-after-queen-creep.public.json)
