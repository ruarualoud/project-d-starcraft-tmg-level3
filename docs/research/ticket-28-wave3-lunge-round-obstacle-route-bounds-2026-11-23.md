# Ticket 28 / W3-11 · Lunge 挡路时的路径下界

复用冻结 U83/C84/R50 + FAQ 1.3 的同一 Lunge 付款停点。未重新执行射击、伤亡选择或反应。工作覆盖固定领队、固定端点的长度区间和对照，棋盘位置未提交。

## 证据如何形成

- 复用旧 Charge 圆障碍的切线加弧长计算。连续圆障碍的顺时针、逆时针各自给出下界。旧 Charge 仍使用同一标量计算与原容差。
- 由实际在场模型底盘建立保守障碍。矩形领队使用任意旋转下必然包含的内圆，净空模式使用更保守的规则半径。可通行对象不进入证明。只取各障碍给出的最大下界，忽略其他障碍和队形只会放宽路径。覆盖固定端点，不承担整块区域的可达性判断。
- 用共享 Move 核验一次完整路线及其余模型，得到可行上界。只有两端在授权整数精度相等，才记录固定起终点最短。计算记录仍须经 §4.5 的朝向、领队比较和摆位约束后才能提交正式反应。

| 保存棋位中的检查 | 结果 |
|---|---|
| 速度内的直线端点是否实际可达 | 直线 4.996 英寸。一个真实 Raptor 底盘单独给出至少 5.012 英寸。该端点超出 5 英寸移动额度，即使忽略其他障碍。 |
| 直线被挡时是否存在合法路径 | 原生 Move 拒绝同一端点的直线，并接受绕 Raptor 的 4.522 英寸路径和全部摆位。下界 4.152 英寸，最短性保留未决。 |
| 对称圆障碍 | 同一 Raptor 圆松弛的镜像端点两侧下界均约 6.069469 英寸。该对照证明数学分支保留等长，不证明完整棋盘存在两个等长合法选择。 |

- [源棋位、超速排除和绕行区间](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-round-obstacle-route-bounds.public.json)及[已验候选停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-round-obstacle-route-bounds-checkpoint.json)。
- [复用的圆障碍公式](../../packages/rule-atoms/official-charge-round-path-infeasibility-proof-v1.mjs)与[绑定反应回执的实时下界入口](../../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs)。

下一步缩紧全轮廓、多障碍下界并为同一棋局生成候选，再核对等长路线、领队和合法队形。正式 Match 的反应提交与冷回放仍待。本轮未调用模型，主 Standard 114/115，Ticket 28 2/16。
