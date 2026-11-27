# Ticket 28 / W3-10、11 Wave3 Medic

Medpack 与已购 Stabilizer Medpacks 增量接入冻结军表。沿用卡牌支付与 HEAL，范围、另一友方生物目标和视线由同一个合法菜单约束。Life Support 的反应资格与减伤计算共用底盘范围。旧版反应保留原路径。新增规则原子为 0。

| 边界 | 实际证据 |
|---|---|
| Medpack | 3 个 Medic 模型在 4 英寸内，稳定器提供第 4 个计数。支付 1 CP 后治疗 4 点，Raynor 伤害标记 5→1，余血 3→7。自己、机械单位和超范围目标被排除。Medic 保留本次激活，同轮重复使用被拒。用序列化初态重放得到同一后继哈希。 |
| Life Support | 从射击的伤害前窗口开始，完成双方反应优先权、1 CP 支付与序列化后的结果读取。减免为 4，目标既有伤害标记在该阶段保持 5，留给正式分伤消费者结算。完整射击、近战和模板的回交接线仍待验收。 |
| 旧版本 | Wave1 V6 运行时描述符与保存档案逐字段相同。 |

Standard 注册 70/117，待 47（人族 9、虫族 38）。Skirmish 注册 19/33，待 14。Ticket28 完成 2/16。Queen 及 Medic 的剩余反应继续按 Wave3 本体处理。

- [治疗和 Life Support 实测](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-medic-support.public.json)
- [Skirmish 工厂覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-medic-skirmish-coverage.public.json)
- [旧版运行时指纹](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-medic-legacy-control.public.json)
- [Standard 剩余能力清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-pending-abilities-after-medic.public.json)
