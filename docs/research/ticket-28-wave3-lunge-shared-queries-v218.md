# Ticket 28 / W3-11 · Lunge 领队证明与共享路线查询

普通远程反应的 Match 2.18 绑定已具备领队、速度、碰撞和队形校验。此次添加只读 `complete_lunge_move`。调用者选择当前反应域，填写支付卡、移动路径和全队摆位。若该移动欠缺领队比较证明，查询在其最后一段的前进方向搜索边界，再用执行端已有的证明校验。有限搜索缺证据会返回未决。实际移动的速度和队形仍分别按规则校验。

| 边界 | 实际证据 |
| --- | --- |
| 原房恢复 | 从保存的前两张签名回执恢复守方 r2，状态哈希与原房相同。隔离房复用同一军表、任务、几何、发布清单及 2.18 运行时描述符。 |
| 生成证明 | 原提交缺证明，权威预览拒绝。共享查询为 3.987 英寸的实际移位生成了 4.334 英寸的比较路线。后者仅用于领队判定。 |
| 查询与预览 | 领队补全、完整路径、完整队形查询返回同一个权威动作哈希和空间计划哈希。查询完成后，房间状态和修订号一致。 |
| 正式消费 | 用查询返回的参数签发一次 Lunge，支付 1 Biomass。两枚模型实际落在 (12.622, 3.800) 和 (13.290, 6.629) 英寸，交还原射手。幂等与一签冷回放一致。 |
| 反例 | 过期修订、另一席位、没有证据的完整队形候选返回未决。超过本房权威 5 英寸速度的路线被路径守卫拒绝。 |

先前隔离组件使用 4 英寸，正式军表本场为 5 英寸，原拟用的 4.334 英寸超速反例在本场合法。改按同一正式预览的 5 英寸预算验收真正超速。复用已通过的查询和预览后，从原隔离 r0 提交一次。

目前覆盖已经提供移动和完整摆位的地面前进绕行候选。任意多障碍、跨地表及自动队形搜索仍需独立证明。Web/App 双席与全发布准入尚待。Ticket 28 为 2/16。模型调用 0。

- [实证汇总](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-shared-query-v218-signed-v1/result.public.json)
- [查询与原生计划对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-shared-query-v218-signed-v1/native-query-projection.public.json)及[提交冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-shared-query-v218-signed-v1/cold.public.json)
- [原双模型正式签名](ticket-28-wave3-formal-native-binding-gap-v218.md)
