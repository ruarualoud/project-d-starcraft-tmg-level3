# Ticket 28 / W3-10、11 · Tunneling Claws 与 Burrow Ambush

## 冻结来源与改动

Wave3 U83/C84/R50 沿用既有能力标识和行为。原路径把已购 Tunneling Claws 的潜地 Corpser 当普通单位处理，跨过 Kerrigan 底盘时返回 SELECTED_SPATIAL_PATH_MODEL_COLLISION。旧的移动后保留状态曾单独从升级名称读取。

候选现在从同一份已编译 Relocation 来源判定权限。确认单位已买升级且仍潜地时，Move 和 Run 允许在行进中穿过其他单位底盘，落点仍由原全底盘、队形与地形验证。执行与查询使用同一投影，落点结算后保留 Burrowed 和 Hidden。Burrow Ambush 复用已有 Entry Edge、18 英寸 PLACE、敌方底盘间距、Supply 和激活结束逻辑。未增加规则原子。

## 已验收

| 样本 | 实际证据 |
|---|---|
| Corpser Move | 从修前保存的潜地状态推进 4 英寸，越过 Kerrigan 仍保留两种状态。尝试停在另一模型底盘上被拒。冷读重新提交回执一致。 |
| Vile Run | 在准备好 Movement 激活资格的突击夹具中，Run 4 英寸越过同一底盘，保留两种状态，冷读重放一致。 |
| 通路对照 | 同一队形和路径，未购升级的潜地 Roach、已购但未潜地的 Corpser 均被拒。 |
| Corpser、Vile、Swarmling 伏击 | 三条合法军表升级分别提交，模型数为 3、3、18。拒绝漏摆模型和落在敌方 10 英寸内的队形。按原供给投影消费，每次成功后交给 player1，卡资源保持原状态。查询与预览生成同一动作，冷读重放逐字段相同。 |
| 版本对照 | Wave1 V6 描述符保持与原件逐字段相同。Standard 90/117、Skirmish 25/33。 |

修前路径探针曾使用超出完整模型队形规则的直线摆位，改为符合原生连贯性的三角阵形后准确复现。旧 Movement 组件断点未含开局 Supply，首次伏击菜单按既定供给闸拒绝。第二次使用实际首轮初始化器由同版 Fire in the Sky 规则算得 5 Supply，再完成三案。模型调用为零。

本轮为候选组件的动作和冷重放证据。正式房间、完整近战 Close Ranks、普通单位穿越其他潜地单位的终点限制仍待验。Ticket 28 整体 2/16。

## 回执

- [修前路径拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-relocation-tunneling-before.public.json)
- [Corpser Move](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-relocation-tunneling-move.public.json)
- [未购与未潜地对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-relocation-tunneling-controls.public.json)
- [Vile Run](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-relocation-tunneling-run.public.json)
- [三种伏击](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-relocation-ambush-summary.public.json)
- [Standard 能力登记](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-relocation-standard-inventory.public.json)
- [Skirmish 与旧版](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-relocation-compatibility.public.json)
