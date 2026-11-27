# Ravager 的近战与孵化后攻击

Ticket28 / T28-W3-09 / M08。冻结 U83/C84/R50，正式候选 2.43.0，双方由工程驱动人工席位。

## 直接入表的 Ravager

从[冲锋结算](ticket-28-wave3-ravager-charge-v243-2026-11-24.md)的 r8 分支，起始完整状态哈希一致，棋位未改动。第一回合两方先后放弃剩余突击行动，r2 必须处理已放置的 Corrosive Bile。r3 进入 Combat，玩家一选择玩家二先行动，r4 公开菜单提供 Claws。

Ravager 保持接敌位置，分给掠夺者两颗攻击骰。骰面 3、1，命中阈值 4+，造成 0 伤、0 个模型移除。双方结束本次结算后，玩家一的公开菜单提供掠夺者的 Strike。该动作未在本分支执行。

本分支新增 8 条正式回执，冷回放到 r8 的完整状态逐字段一致。 [宣告与武器档案](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-claws-v243/declaration.json) · [投骰和对方菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-claws-v243/result.json) · [验证入口](../../scripts/verify-wave3-standard-ravager-claws-v243.mjs)

## Cocoon 生成的 Ravager

原房第三回合 r21 签署 Morph，第四回合 r39 得到实际生成单位。独立 2.43 房用相同部署卡重建版本绑定，沿用历史单位、模型与棋位。六名敌方 Marine 从预备队开场，需通过规则入场后才能作攻击目标。部署绑定的三个版本签名发生变化，卡片、入场边、标记、规则和其余字段已逐项比对相同。第一份夹具把部署签名也要求相等，第二份夹具给 Marine 指定的路程超过该单位当次部署速度。后续在同一 r2 按规则给出的 4 英寸速度和底盘半径计算终点，六个模型经蓝方桌边正式进场。r6 首次切到 Assault 时公开菜单仅提供先手选择；夹具曾在这里提前检查武器，现改从真正的单位行动窗口检查。以上均为夹具问题，三次原始记录已保留。

[原生孵化与回合记录](ticket-28-wave3-cocoon-cleanup-successor-v223-2026-11-23.md) · [部署对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/cocoon-ravager-attack-v243/deployment-lineage.json) · [产品入口](../../scripts/verify-wave3-standard-cocoon-ravager-attack-v243.mjs)

### 第四回合实际射击结果

六名 Marine 从蓝方桌边布成两排，排头中心坐标 (44.56, 3.27)。r7 孵化所得 Ravager 可选择 Plasma Discharge、冲锋或 Run。该次选择射击，4 骰 2 命中，触发对轻甲的 Surge，最终伤害 2，移除 enemy-model-1。r10 行动权回到 Marine，C-14 rifle、冲锋、Run 和放弃均出现。10 条正式回执冷回放精确。[实战射击结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/cocoon-ravager-attack-v243/result.json) · [同局面可选动作](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/cocoon-ravager-attack-v243/firing-window.json) · [Marine 后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/cocoon-ravager-attack-v243/menu-r10.json)

### 同一 r7 的冲锋分支

从同一 r7 的原始回执恢复。孵化 Ravager 向 Marine 冲锋，冲锋骰为 2，实际可走上限 10 英寸，落在 (44.56, 5.475)。IMPACT 2 掷出 5、3，按 4+ 命中造成 1 点伤害；无模型移除。下一个突击行动属于 Marine。该分支 6 条回执冷回放一致。进入 Combat 后，虫族正式菜单出现 Claws，可对同队 Marine 分配 2 骰。[冲锋结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/cocoon-ravager-charge-v243/result.json) · [近战声明](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/cocoon-ravager-claws-v243/declaration.json)。

工程验收由两个人工驱动席位选择动作。

近战实际掷出 5、2，命中门槛 4+，结算伤害 0。下一方 Marine 的公开菜单给出 Strike。从冲锋结束状态重放 7 条回执，与结算后的完整状态相同。[近战与冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/cocoon-ravager-claws-v243/result.json)。
