# Ticket 28 · W3-10／11 · Standard 候选与达拉姆来源

## 原因与修复

Standard 与 Skirmish 均在同发布军表、任务和地图工厂完成准备。Standard 复用了候选准备返回值，原正式开房继续遵守全 Match 准入。Blink、Dae’Uhl、Mass Recall 引用各自已有旧执行器，新增执行绑定来自冻结 U83/C84/R50。Dae’Uhl 的减伤 2、最低 1 与 Mass Recall 的 6 英寸、每局一次来自同一冻结来源。Mass Recall 的新版来源组合能与 Queen 菌毯、Roachling、Omega Worm 共存，生成物清单仍准确。

Standard 新候选 Match 版本为 2.3.0。普通原生重定位在提交前拆出底层 PLACE 动作，复用携带者掉落中断。对手放置标记后，从当前状态重新匹配同一执行器、定义、来源实例和目的地，再执行原动作。旧签名版本仍使用原分支。Skirmish v2.2 已保存的运行时描述符逐字段重建一致，既有 75 回执验收未重跑。

## 实际验收

- 冻结 Dae’Uhl 与独立 Mass Recall 来源编译通过。Mass Recall 与三条虫族生命周期路线的组合编译通过，仍产出 Roachling 和 Omega Worm。减伤、实际回撤及 PLACE 后继的签名消费待验。
- 独立 Standard《Fire in the Sky》从真实军表／任务／几何准备器取得 33/33 绑定的验收军表，通过 v2.3 SQLite 签名任务开局。r1 进入移动，双方起始 Supply 5，五个任务标记均激活且等级为 1。从关闭后的数据库冷重放一条回执，匹配完整后态和绑定。可从该原房 r1 继续做受控目标和 Sabotage。
- 采用不同的验收军表验证 Fire 开局。上轮 Standard 主军表仍为 102/117，缺 15 个绑定。签名候选的 Web/App 终端、对抗和策略效果仍待。模型零调用。

## Artefact Hunt 的停点

四次准备尝试分别记录为：夹具把内置能力当购买项、达拉姆两条绑定漏接、冻结 Dae’Uhl 来源未登记、Mass Recall 不在旧编译组合范围。最后一项已定点修复并完成独立来源验证。原完整签名 PLACE 序列未追加尝试，仍待验证声明时底盘原位、对手掉落、重定位及冷恢复。

- [逐次失败及修复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-blink-release-gate-history.public.json)
- [冻结来源与旧绑定证明](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-blink-release-sources.public.json)
- [Standard 工厂准备](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-opening.public.json)
- [Standard r1 签名回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-signed-opening.public.json)
- [Standard r1 冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-cold-opening.public.json)

改动源码：[official-standard-room-factory-v1.mjs](../../packages/product-composition/official-standard-room-factory-v1.mjs)、[official-release-room-ability-admission-v2.mjs](../../packages/product-composition/official-release-room-ability-admission-v2.mjs)、[official-reaction-family-adapter-v1.mjs](../../packages/product-composition/official-reaction-family-adapter-v1.mjs)、[official-unit-lifecycle-family-adapter-v1.mjs](../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs)、[official-current-product-match-runtime-v1.mjs](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)。

Ticket 28 仍为 2/16。本项下一步是从 Fire 原 r1 核验控点、Sabotage 和交权。Standard Artefact 保留在同版签名后继待验边界。
