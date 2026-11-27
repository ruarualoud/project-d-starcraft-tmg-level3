# Ticket 28 · W3-10/11 · Omega Network 召唤与生成后继

## 本次修复

冻结卡面要求地面落点，任何敌方模型的底盘距离都必须大于 10 英寸。旧版在该判断中复用了可激活单位过滤，漏掉敌方 Structure。隔离场景用真实官方虫洞单位投影复现了误放。新版只对已绑定的 Wave3 能力启用共用底盘、地面和障碍校验，并纳入敌方建筑。旧执行器的保留夹具仍产生原动作及结算哈希。

- 在同一候选工厂中，越界、碰撞高地、离普通敌军过近和离敌方建筑过近均被拒绝。
- 合法落点提交后，阵营卡耗尽，召唤落在原激活窗口内。生成的是 Supply 0、无法控制或争夺任务点的 Structure。状态冷读重放一致。
- 同回合虫洞不提供菌毯。隔离的次回合夹具里，存活虫洞开始供菌毯并阻止再次生成。已毁夹具中重新召唤会使用新的持久身份，保留旧尸体编号，棋盘上仍只有一个活虫洞。此夹具没有执行伤亡或正式回合推进。

## 保留的下一边界

已从真实候选召唤回执重新打开同一发布。虫洞单位的 Omega Network 仍为 pending_family_adapter，显式生命周期构造器当前拒绝其冻结定义。阵营卡绑定仅覆盖生成。下一步要接虫洞本体的部署和回收，验证后续回合最多 2 Supply、实际入口放置、当次领先模型接触触发和冷恢复，并确认 Detection 与 Structure 的正式消费者。正式房间仍未准出。

Standard 100/117（余17），Skirmish 32/33（余1）。以上分母只含所选开局军表与阵营卡，不含生成单位的后继。Ticket 28 仍为 2/16。模型调用为零，未评价策略效果。

- [旧版漏算建筑反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-producer-before.public.json)
- [落点与兼容](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-placement-guards.public.json)
- [召唤结算](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-producer.public.json)
- [生成消费者缺口](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-generated-consumer-gap.public.json)
- [Standard 覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-standard-inventory.public.json)
- [Skirmish 工厂](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-skirmish-admission.public.json)
