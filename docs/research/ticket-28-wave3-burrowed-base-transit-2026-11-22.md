# Ticket 28 / W3-10、11 · 普通空间动作穿越潜地底盘

冻结总规则 Part 11 允许其他模型穿过潜地单位的底盘，并限制终点。修前以实际候选棋位执行 Kerrigan 的普通 Move，路径检查把友方潜地 Corpser 底盘当成障碍。动作未能预览。

候选启用新版特征消费者 1.4.0。普通空间动作的中途路径从阻挡物中排除潜地单位，仍检查棋盘边界、地形、其余单位和局部部署起点。每个模型的终点使用实际底盘足迹计算最近物理边缘距离。新终点判定与原生接敌图的闭区间一致，底盘间距等于 1 英寸时仍拒绝。V4 及先前绑定采用原有行为。本轮没有新增单位或能力登记。

## 实际证据

| 场景 | 结果 |
|---|---|
| 单模型完整 Move | Kerrigan 走 5.5 英寸，穿过潜地 Corpser，合法终点 x=31.5 英寸。停在 x=30.6 英寸被拒。只去掉目标的潜地状态，原路径再次产生模型碰撞。实际提交与冷构造重放逐字段相同。 |
| 多模型摆位 | 第一个模型的终点在范围外，第二个模型落在潜地目标的接敌范围内。明确拒绝后者的模型 ID。 |
| 接敌边界 | 完整实物底盘量距等于 1000 毫英寸时拒绝，1001 毫英寸时可预览。边界夹具从量距结果选取坐标，避免把底盘宽度在多个层级重复取整。 |
| 旧版 | 实际 Skirmish 工厂仍登记 25/33，Wave1 V6 描述符与保存原件逐字段相同。 |
| 下个修复点 | 用两次真实 Pass 和先手选择进入 Combat，验证已接敌潜地 Roach 在 Close Ranks 选择 decline 后仍得到 2 颗攻击骰。该状态已保存。冻结原文要求没有完成 Close Ranks 的潜地单位完成自身激活且不攻击。 |

验证使用冻结军表、棋盘和原生动作工厂。普通穿越的提交与冷重放已验，Deploy／Disengage／Run 的单独场景和近战位移消费者仍有待验范围，此报告没有将独立的近战队形或冲锋位移准出。当前覆盖 Standard 90/117、Skirmish 25/33，Ticket 28 2/16。零模型调用。

## 回执

- [修前拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-transit-pre.public.json)
- [实际 Move 与冷重放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-transit-move.public.json)
- [逐模型终点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-transit-whole-formation.public.json)
- [一英寸边界](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-transit-exact-boundary.public.json)
- [旧绑定及 Skirmish](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-transit-compatibility.public.json)
- [Close Ranks 修复前证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-transit-close-ranks-defect.public.json)
