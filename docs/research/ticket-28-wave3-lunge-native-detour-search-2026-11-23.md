# Ticket 28 / W3-11 · Lunge 实际绕行候选

使用冻结 U83/C84/R50 + FAQ 1.3 和已保存的已付款反应。从同一 Raptor 阻挡棋位继续，复用既定端点和其余模型的摆位。棋局没有应用新动作，射击与付费前缀没有重跑。

## 改动

用实际在场棋子底盘和阻挡地形建立整数路径搜索轮廓。圆形阻挡者按固定朝向移动底盘的外接矩形与圆的和构造凸轮廓；能清楚界定的矩形地形按底座半宽扩张。该轮廓只用于找候选，保留联合圆盘下界作排除依据。搜索尝试沿原方向出发、绕开轮廓、再沿原方向推进的路点。每条候选严格经过普通 Move 的实际底盘扫掠、地形、速度、终点和完整队形校验。

方向证据计算于共用几何入口，随几何哈希封存。普通 Move 几何合法的路线仍可能缺 Lunge 所需的出发或绕后方向。有限候选搜索不冒充连续空间全覆盖。只有证明速度不足的固定端点可直接排除。

## 实测

| 范围 | 结果 |
|---|---|
| 真实端点 (11.400, 9.241) 英寸 | 直线被 Raptor 拒绝。生成 9 条完整底盘及队形候选，最短候选 4.376 英寸，较手选 4.522 英寸少 0.146。联合下界仍为 4.152 英寸。 |
| 绕行的原始方向 | 同一最短候选的完整几何重算得到一致哈希。首段和末段都向原 Goliath 方向，回执绑定原目标模型。删除出发方向路点后，物理路径仍通过，共用入口撤销 Lunge 方向证明。 |
| 明确排除与未决 | 已知同一端点下界超过速度时，直接排除，无须搜索。缺少正确的其余模型摆位时，没有候选，查询仍是未决。 |
| 存档 | 保存带方向哈希的原生几何，不写棋子位置、反应账本、原射击序列或行动方。 |

- [实际候选列表摘要、距离与边界](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-native-detour-search.public.json)。
- [方向反例与可复验回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-native-detour-source-direction.public.json)及[下一次恢复用的几何停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-native-detour-source-direction-checkpoint.json)。
- [候选可见图](../../packages/rule-atoms/official-convex-obstacle-path-candidates-v1.mjs)和[共享规则入口](../../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs)。

仍需闭合连续空间最短路径证明，比较所有领队和其余模型的最近合法摆位，并接正式 Match 提交、等长选择、射击续行和签名冷回放。主 Standard 114/115，Ticket 28 2/16，模型 0。
