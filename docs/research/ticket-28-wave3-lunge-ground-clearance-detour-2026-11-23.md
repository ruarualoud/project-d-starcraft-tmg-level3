# Ticket 28 / W3-11 · Lunge 绕行与旧能力缺口归因

## 缺口在哪一层

旧 Slice 236 把 Lunge 登记为可执行。验收由调用方构造反应触发，代表用例是 Dae’Uhl。Slice 243 的 252 是定义登记数，正式提交、回放取证来自 Marine C-14 与 Strike。这两份记录没有证明 Lunge 能由实际射击结算进入守方菜单，再移动并交回射手。随后 Wave3 以显式能力族装配新发布，定义身份映射与运行时消费者是两份事实。Zealot Charge 的同源绑定初版漏继承，Queen Psionic Link 曾通过第一层登记，却在 Native Match 重建目录时漏接。主 Standard 军表的问题在正常工厂可复现。夹具误绑及非法摆位的历史失败单独记录。

## 受阻路径复现

从已保存的已付款 Lunge 状态构造隔离棋位，Hydralisk 位于 (9.6, 5.5)，Raptor 挡住 (11.8, 5.5)，Goliath 为朝向参照。使用已有权威队形检查及原生物理 Move。目标点固定在 (14, 5.5)。9 英寸上限，直线路径被同一 Raptor 拒绝。起点、终点和通行规则保持相同。

| 核对项 | 实际结果 |
| --- | --- |
| 候选与执行通行尺度 | 旧候选外包络用完整底盘；已绑定的全地面 Move 扫掠采用尺寸通行圆，终点仍用完整底盘。新候选调用同一尺寸函数。 |
| 优化候选首轮 | 单圈计算有绕行轨迹，加上不挡直线的 Goliath 圆会把 Raptor 圆弧切成数段。旧折线生成器将相邻弧之间的切点各自取整。碰撞内核定位到这些连接段与 Raptor 底盘间通行距离不足，两个方向的解析候选皆被拒。其他合法候选最短 5.052 英寸。 |
| 定点修复 | 生成折线前合并同一个圆、同一个旋向的连续弧。29 次有限试算，合法候选 16→24。上下侧都出现 4.995 英寸合法候选，原生校验仍须逐段使用。试算前后同一工程状态哈希。 |
| 证明范围 | 选定终点的连续圆障碍下界为 4.993 英寸，与已知合法上界仍差 0.002 英寸。找到等长候选只能说明这两个摆法同长，完整最短、所有等长选项、复杂队形与正式 Match 准入仍待。 |

## 同源影响

| 范围 | 现有证据 |
| --- | --- |
| 普通 Move / Run / Deploy / Disengage | 原生空间执行共用模型及地形的尺寸通行合同。两处变更限 Lunge 的候选搜索和只读证明。单独的 Charge 查询与执行未引用折线生成器，不能将本反例算作 Charge 缺陷。 |
| 特殊入场 | Ventral Sacs 曾跳过原生部署后继。Warp Prism、Dropship、Khalai Pylon 已分别有签名证据。Pylon 近端/远端敌方菌毯与 Rapid Ingress 的组合同房证据仍待。Match 的后续版本对 Ventral 使用泛化特殊 Deploy 后继，已核该版本声明与路由。 |
| 射后反应 | 数值、模板、Nova 刷新、Overwatch 已有独立签名片段。Vile 与 Restoration／模板／Overwatch 的组合留待对应父事件证明。 |
| 一次性 PE 折扣 | Blink 已复现旧公用报价漏 Pylon 并签名修复。Twilight Templar Warp-In 与 Void Blink 同属该付款适配器，仍须确认合法同房可用条件与实际消费。 |

后续准出检查以同一发布的有向交接链为准，稳定定义→开房装配→Native 目录→实际触发或合法菜单→消费→后继→冷恢复。按共用执行族记录已验证场景，独有的触发或后继保留自己的检查点。旧版原已存签名继续按历史发布验证，本次沿用已存回放结果。

- [前后数据、拒绝码与候选哈希](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-ground-clearance-detour.public.json)、[两模型直线签名及冷恢复](ticket-28-wave3-lunge-multi-direct-signed-2026-11-23.md)。
- [旧验收、发布装配与特殊入场归因](ticket-28-wave3-inherited-capability-gap-audit-2026-11-23.md)、[PE 报价影响面](ticket-28-wave3-khalai-signed-lifecycle-2026-11-23.md)。
- [候选搜索](../../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs#L2112)、[圆障碍折线生成](../../packages/rule-atoms/official-round-obstacle-path-bound-v1.mjs#L168)、[同版 Match 特殊入场事件](../../packages/product-composition/official-current-product-match-runtime-v1.mjs#L1158)。

Ticket 28 / W3-11。主 Standard 114/115，整体 2/16。本次零模型，没有签新的 Room 回执。
