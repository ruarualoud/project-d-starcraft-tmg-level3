# Wave3 · Nova 两种形态的 Standard 准入与混编诱饵

2026-11-24，Ticket28 / W3-08 / M01、M07。对照使用与 2.30/2.31 相同的冻结军表。下表的分母是整张测试军表在该对阵中选入的定义数，含阵营卡、友军和敌军。

| 第一席 | 上次 | 2.32 产品入口 | 本次增加 | 剩余 |
| --- | --- | --- | --- | --- |
| 潜行 Nova + 特战劫掠者 | 20/27 | 24/27 | Battle Preparation、Ghost Visor、Super Stimpack、Tactical Stealth Suit | Holo Decoy、Head Shot、Operational Efficiency |
| 突击 Nova + 特战劫掠者 | 20/26 | 23/26 | Battle Preparation、Ghost Visor、Super Stimpack | Holo Decoy、Devastating Charge、Phase Reactor Suit |

正式工厂在两种单英雄军表上均返回与表格一致的待接清单。两种形态同时编入同一方时，工厂由军表规则拒绝。Battle Preparation 的登记绑定冻结单位特性、当前单位来源及军表互斥规则；能力说明文字、来源或互斥组合失配会在构造时被拦截。Ghost Visor 使用侦测与失去隐形的消费者，Super Stimpack 使用移动及远近武器的特性消费者。这里检验本次变化的正式登记，原有组件的用药、射击和视线实验没有重跑。

## 混编诱饵的双席房间

在冻结规则的工程房间中，通过产品军表工厂同时选入 Nova 的 Holo Decoy 和阵营的 Griffin Support。两者共用同一个行动单位，分别生成诱饵和无人机。只有 Holo Decoy 属于此次召唤规则的输入。初始站位与阶段在场景中声明。两支房间各有四份签名动作回执。

| 场景 | 真实提交顺序 | 检查结果 |
| --- | --- | --- |
| 潜行 Nova，第二席 | 召出诱饵 → 诱饵走 7 英寸 → Nova 走 1 英寸 → Nova 结束激活 | 诱饵窗口关闭后回到 Nova 的行动前窗口，随后轮到第一席 |
| 突击 Nova，第一席 | 召出诱饵 → 放弃即时移动 → Nova 走 1 英寸 → Nova 结束激活 | 诱饵原地，Nova 保留原有行动，随后轮到第二席 |

首次走两条路径时，两次都在 r0 摆放预览收到支付方式错误。旧查询只按行动单位取第一条可选能力，导致它用 Griffin Support 解释 Holo Decoy 的输入。现在使用公开菜单上的能力编号定位，单一结果仍支持旧查询；多个结果且没有指定能力时会明确拒绝。正式 Griffin 查询由工程填写自己的编号。验收同时检查了歧义请求、未知编号以及 Holo 预览与执行准备完全一致。修复后沿原房间续验，两房关闭并重新打开，八份回执重放所得状态与磁盘终态逐一房间相等。历史 2.31 混编虫后军表的正式运行时指纹也与原件一致。

## 下一验收边界

目前正式 Standard 准入仍拦住两支英雄军表。下一步是把诱饵的回合末 Surprise! 与 Timed Life 接入正式 Match 的同一玩家效果选择窗口，覆盖先移动 Nova、先移除诱饵、放弃、与已有回合末资产共存以及冷恢复。完成后再收两种形态各自的两个独有定义。组件 162/162，正式 Match 大项 3/26，Ticket28 为 2/16。本次模型调用 0，策略效果未测。

[潜行军表](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-modes-standard-v232/nova_stealth_mode/verified.json) · [突击军表](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-modes-standard-v232/nova_assault_mode/verified.json) · [混编拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-modes-standard-v232/mutually-exclusive.json) · [双房冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-modes-standard-v232/holo-mixed/cold-replay.json) · [旧版对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-modes-standard-v232/legacy-descriptor.json)
