# Ticket 28 / W3-10、11 Wave3 菌毯速度

冻结 U83/C84/R50 的 Queen Creep Speed、Corpser 与 Vile 的 Glial Reconstitution 已复用原生资产族规则。Queen 的升级购买、在菌毯上和 Accelerating Creep 的资格共同进入权威移动速度。三条新版来源以稳定 ID、阶段、费用和冻结原文校验。不同的 Speed 直加单独计算，同名 BUFF SPEED 取最高值。Glial Reconstitution 按当前单位和 Movement 窗口支付 1 Biomass，施放时判定是否在菌毯上，回合末清掉该 BUFF。

| 单位与样本 | 原生流程与结果 |
|---|---|
| Queen | 同一棋位，保留贴底盘菌毯时上限 7 英寸，移除该菌毯后为 4。带菌毯实际执行 6.5 英寸；同路径在无菌毯状态被速度规则拒绝。 |
| Corpser | 菌毯上支付 1 Biomass，获得 BUFF SPEED (2)；已有卡牌加成的 5 英寸变为 7，实际 Move 5.5 英寸。 |
| Vile | 菌毯外支付 1 Biomass，获得 BUFF SPEED (1)；4 英寸变为 5，实际 Move 4.5 英寸。 |

两种 Roach 均使用已有合格名册，在隔离场景按权威底盘布置。少付、同回合重复使用、在另一单位激活时使用均被拒。执行后冷读仍保留 BUFF，原生回合末清理移除该 BUFF。测试第一次误读无资源卡使用的事件名，已按原生 Biomass 回执修正。Skirmish 名册实际选中 Corpser 的这条升级；Standard 选中三条。旧发布运行时冷构造后的描述符与已保存回执逐字段相同。

Standard 注册 55/117（待 62），Skirmish 注册 17/33（待 16）。本轮准出仅涵盖组件、实际 Move 和回合末的 BUFF 清理，调用模型为零。正式整局接线在 Wave3 能力补齐后继续。

- [Queen 权威移动回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-queen-creep-speed.public.json)
- [两种 Roach 的动作与回合末回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-glial-reconstitution.public.json)
- [两个规模的实际注册清点和旧版对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-speed-admission.public.json)
- [Standard 剩余能力名单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-pending-abilities-after-creep-speed.public.json)
