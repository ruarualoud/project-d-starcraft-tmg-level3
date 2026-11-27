# Ticket 28 / W3-11 · 已付款 Lunge 的共享移动几何

从已保存的 Lunge 付款与 Move 移交恢复，军表、棋位和反应回执都来自前一轮实际数值射击。验证使用冻结 U83/C84/R50 + FAQ 1.3，未重新结算射击、伤亡或付款。

## 源与修复

普通 Move 入口原先把阶段激活、扫掠和终点放在一个函数里。如果用该入口执行突击阶段的 Lunge，会受到移动阶段及本单位激活限制。现将实际路径与终点校验抽成共享实现。Lunge 的几何入口只接受当前回合和阶段中已由 Host 消费、哈希一致的冻结 Lunge 回执，由回执决定棋子和目标。它按当前速度、底盘、地形、边界、敌方影响区和队形校验。该入口只返回几何及证据，不写单位位置、攻击序列和行动权。

继续核对冻结总规则 §4.5。按物理底盘找各模型最接近的目标模型，用中心连线识别前进段。核对领队终点到目标的底盘距离，防止越走越远。保留反应路径的途中点，避免普通路径的共线归一化吞掉折返点或阻挡点。端点在合法射线上，且用相同规则器证明直线可以到达时，可用欧氏直线下界排除更长的走法。该判定需要相同起终点和实际校验通过，不能外推到绕过障碍和最优领队。

## 实测

| 边界 | 结果 |
|---|---|
| 突击阶段合法几何 | 两个矩形底盘的 Hydralisk 向原 Goliath。领队由 (9.600, 5.500) 移至 (10.600, 5.356) 英寸，路径 1.010 英寸。另一模型按普通队形链接明示落点。 |
| 普通 Move 差分 | 同位置的隔离普通 Move 取得相同物理路径、终点底盘、全模型队形回执。Lunge 试算保持 Assault 和原射击序列。 |
| 明确拒绝 | 穿越仍在场的 Raptor、远离射手、队形越界、错误的触发身份及被改写的反应回执均拒绝。 |
| §4.5 直线下界 | 合法前进中间点保留，路径长度与端点直线下界同为 1010 mil。折返、偏离后绕回可被合法直线替代时均拒绝。途中撞上 Raptor 的绕返在碰撞校验被拒。 |
| 验证夹具 | 第一次折返的末点与从属棋子相叠，实际底盘规则先给出重叠错误。调整从属棋位后，一次通过，无需改规则。 |

- [共用完整路径验证及实际反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-paid-move-geometry.public.json)和[直线下界、绕返与阻挡](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-move-unnecessary-detours.public.json)。
- [已有付款后状态和完整几何停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-paid-move-geometry-checkpoint.json)及[几何入口](../../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs#L1919)。

仍需对挡路局面证明最短绕行，比较不同领队并提供等长选择，证明其余模型的最近合法队形，再将几何和正式反应的位移提交接入 Match。本轮不增加开房覆盖，Standard 114/115、Ticket 28 2/16。模型调用 0。
