# Ticket 28 · W3-10／11 · 三张旧位移卡的同发布接线

冻结 U83/C84/R50 的 Standard 候选 v2.5 使用现有位移执行器。两张卡的完整冻结原文经校验才生成路线。正式军表、任务与几何准备器输出 19/19，正式开房准出仍有独立门槛。

## 实测与修复

| 边界 | 签名或规则器证据 |
|---|---|
| Armed and Ready | r3 的六枚 Marine 从非入口左边部署，占 1 Supply，Barracks 耗尽。把相同选择改为入口边 top 时，真实房间拒绝且状态无变化。 |
| Timing Push | r5 的十二枚基础 Zergling 从非入口右边部署，占 1 Supply，Six Pool 耗尽。先提交靠近对方已部署队伍的预览，规则器拒绝。实际部署和收尾均提交。 |
| Armed and Ready 的当回合前置条件 | 第二回合 Barracks 已刷新，第三队 Marine 起初有特殊部署域。另一支生物单位普通 Deploy 后，Barracks 仍然 ready，第三队仍在预备队，特殊部署域消失。 |
| Go! Go! Go! | r26 一整队实际平移 1.8 英寸并耗尽 Barracks。2.1 英寸预览被拒，未变更房间。额外移动停在 before_action。r27 同一单位完成普通 Move，再进入 after_action 并于 r28 收尾。 |

原生位移菜单此前先调用只允许场上单位的 Special Ability 校验，挡住预备队的特殊 Deploy。新版把明确的预备队路线交给已有的入场窗口、Supply、卡牌状态和几何校验。修复前签名到了选择移动首动的 r2。修复从同一候选房 r2 继续，保留原前缀。首轮准备夹具遗漏 Kerrigan Swarm 的必选菌毯卡，按实际军表要求补齐。

冻结 Go! Go! Go! 的额外移动路线使用 before_action，已完成动作后的窗口沿本来的当前阶段保存。特定普通 Move 的后继已经实测。错边、近敌和超长反例的 Room 外层错误码均为 PROPOSAL_INVALID。

## 恢复、统计和后续

从关闭后的 SQLite 恢复相同候选，重建同一签名规则绑定。全部 28 条回执重放，完整状态、stateHash 和 matchBindingHash 均一致。上一版 v2.4 的既有描述符按原清单精确重建。

Standard 主军表由 101/115 到 105/115，剩 10 项。新增主军表登记包含三张位移能力及 Six Pool 的 Feral Rage。测试表所需的基础 Zergling Metabolic Boost 也已完成同来源编译和登记，这两项战斗消费另验。零模型调用，整体 2/16。

- [正式工厂候选登记](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-movement-cards-opening.public.json)
- [r3、r5 部署与反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-movement-cards-deployments.public.json)
- [第二回合判定和动作后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-movement-cards-movement-successors.public.json)
- [28 条回执冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-movement-cards-cold-replay.public.json)
- [Standard 剩余定义](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-movement-cards-main-standard.public.json)
- [v2.4 原描述符重建](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-movement-cards-legacy-binding.public.json)

改动文件为 [位移执行器](../../packages/product-composition/official-relocation-family-adapter-v1.mjs)、[准入装配](../../packages/product-composition/official-release-room-ability-admission-v2.mjs)、[原生动作装配](../../packages/product-composition/official-release-room-native-actions-v2.mjs) 和 [Match 版本](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)。
