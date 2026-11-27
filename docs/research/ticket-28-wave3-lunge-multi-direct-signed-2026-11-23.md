# Ticket 28 · W3-11 / 两模型 Lunge 领队和签名回放

冻结 U83/C84/R50 + FAQ 1.3。隔离 3.194.0 使用原签名 Standard 军表和真实的两模型 Hydralisk、Goliath、Raptor 棋子。坐标和朝向为声明工程条件，初始棋位通过权威完整底盘和队形检查。

工程从已付款棋位复验 §4.5。对其余每个可当领队的模型，用当前物理边缘距离加底盘内切半径，减掉允许旋转时的最大外接半径和合法接近边界。再向下取整，并为两次距离取整留出余量。这个下界允许替代领队作最有利旋转且忽略阻挡。选中领队的实际合法直线为 2.356 英寸，到达攻击者外侧 1.001 英寸。另一模型即使在放宽条件下也至少要走 5.953 英寸。跟随模型也达到地面对地面合法下界，整体队形合法。

在隔离运行时，房间预览和 Apply 均重新核验领队与队形，将证明哈希写入原生动作和位移回执。该选择仅为当前已证明的直线动作开路。停止在边界之外的缩短行程没有完整领队证明，仍受阻的 4.376 英寸样本也未取得最短证明。默认旧组合继续限定单模型，已存 3.191.0 描述符逐字段一致。

| 停点 | 观测 |
| --- | --- |
| r1–r2 | Goliath 实际发射 Autocannon 并由原生伤亡选择结束批次，两模型 Hydralisk 保存在原目标资格里。 |
| r3 | 攻击方过手后，守方获得真 Lunge 域。提交物理合法但离目标较远的跟随位置时，预览拒绝，签名状态哈希不变。 |
| r4 | 一条签名收据同时消费 1 Biomass，保存领队、跟随者和确认证明。原 Goliath 射击序列仍存在并收回行动权。 |
| r5–r6 | 射手先结束原生武器序列，再结束 after_action 窗口。行动权交给虫族。发生过验证脚本将原射击序列读取为普通激活、以及混淆两个结束类型的问题。最终分别从 r4 和 r5 续验，使用实际菜单。 |
| 冷恢复 | 关闭重开后通过原绑定回放六条签名回执，终态哈希一致。 |

[领队证明与对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-leader-and-formation-proof.public.json)、[正式预览拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-multi-direct-signed/refused.public.json)、[签名后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-multi-direct-signed/live.public.json)和[冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-multi-direct-signed/cold.public.json)。

Stage 1 继续。一般受阻路线最短、等长备选与无法到达边界的队形证明尚待，之后接正式 Match 和 Web/App。本片没有准入完整 Match 或测试策略效果。Standard 114/115，Ticket28 2/16，模型调用 0。
