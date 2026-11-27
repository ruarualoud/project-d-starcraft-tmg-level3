# Ticket 28 · W3-11 · Standard Fire in the Sky 控点与 Sabotage

继续候选原房 r1，沿 U83/C84/R50 + FAQ 1.3 的 Match v2.3.0 绑定执行。原 r1 已进入移动阶段，但仍待该阶段的首位行动者选择。r2 从真实菜单完成选择。该验证使用两席脚本提交预设动作，零模型调用。

| 签名 revision | 已验行为 |
|---|---|
| r3、r5 | Medic 与凯瑞甘分别从真实入场边部署，规则器接受整队底盘和路径。 |
| r10、r12 | 同两单位在突击阶段合法 Run。 |
| r19 | 原生控点评估后，Medic 控制 3 号点，凯瑞甘控制 4 号点。两个点分别关联各自颜色。 |
| r20 | 第一回合结算为 0:0。 |
| r30 | 第二回合 Medic 从合法菜单执行 Sabotage。3 号点等级 1→2，进入 after_action。重复提交用原回执，不能重复加级。 |
| r31 | 完成激活后交权给 player2。凯瑞甘可对 4 号点发起其合法 Sabotage。 |

R2 选择前，另一席无 Sabotage 候选；等级 1 的本单位候选仅允许升至 2。执行后，当前激活无重复 Sabotage 或 Pass，必须先收尾。r31 关闭后从磁盘恢复，基于 r19 签名检查点精确重放 12 条回执，完整状态哈希和房间绑定均匹配原后态。历史已通过的回放未重复执行。

本次覆盖普通地面控点、等级变更和交权。中立高地 5 号点的可达、控制及计分倍率待独立验证。正式房间工厂发布准入及 Web/App 待验。Standard 主军表仍为 102/117；此原房使用绑定完备的隔离验证军表。无生产源码改动和模型调用。

- [r19 权威控点回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-control-receipt-19.public.json)
- [r30 Sabotage 回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-sabotage-receipt-30.public.json)
- [r31 交权及反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-sabotage-handoff.public.json)
- [r19 至 r31 的冷重放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-sabotage-handoff-cold.public.json)
