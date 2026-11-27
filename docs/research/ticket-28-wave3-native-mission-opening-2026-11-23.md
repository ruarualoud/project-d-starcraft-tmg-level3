# Ticket 28 · W3-11 · Wave3 原生首轮到评分

## 原因

Warp Prism v2.14 的 Standard 条件房完成签名放置信标、整卡耗尽和普通移动，并在 r14 完成第一轮控点。双方均无评分菜单。实际初始工厂返回 setup，权威 Envelope 复用了旧阶段归一化，把未知阶段映射到 movement。第一轮任务进度、标记初始化和回合 Supply 均未由任务启动动作写入，Cleanup 因缺已启动任务而无法列出评分。Standard 与 Skirmish 的新版初态共用同一个 Native 入口。

## 修复

v2.15 在两种规模的正式候选工厂共用 Native 入口，复用已有的首轮准备规则，把已核验的初始预备队状态转换为 start_of_round。准备动作只打开合法任务菜单。任务激活和回合资源由权威提交生成。权威 Envelope 对绑定 v2.15 的未准备 setup 显式拒绝。已签名版本仍由保存的描述符和原始阶段行为重建。

| 边界 | 实证 |
|---|---|
| 原 Warp Prism v2.14 | r4 确认签名信标、幂等、整卡耗尽及 Phase 从菜单消失。r5 Stalker 普通移动，r14 控点。旧 r14 哈希及描述符在新代码中精确复读。 |
| Standard v2.15 | 正式工厂使用无预摆军表及 Fire/Gauntlet，r0 保留 start_of_round，r1 签名激活任务、初始化 Supply、打开先手。无单位上场的工程场景推进到 r12 完成 0:0 评分，下一动作是终局检查。12 条签名回执关闭重开后精确重放。 |
| Skirmish v2.15 | 正式工厂使用同版 Fire 和该规模独立部署。r0→r1 签名激活、初始化 Supply、打开先手。关闭重开后冷重放一条回执一致。 |
| 缺少首轮准备 | 两个规模以真实绑定尝试未准备 setup，均明确拒绝。 |

旧候选的夹具曾误请求首轮启动及用有限动作查找参数化结束激活。两次定位沿签名 r0、r4/r5 继续。v2.15 Standard 推进观察超时后从存储核实实际仍是 r11，已准备的评分请求未提交。随后从原 r11 续提交评分，再冷重放 r12。

本项证明两个规模的首轮入口和 Standard 到评分。Warp Conduit 的 v2.15 回合末实际部署、人口和菌毯后继仍待。主 Ticket28 整体 2/16，剩 02、03、05–16。零模型调用。

- [v2.14 信标](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v214-beacon-placed.public.json)、[旧评分停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v214-beacon-score-hold.public.json)及 [旧绑定复读](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v214-held-compatibility.public.json)。
- [Standard 启动](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-native-start-standard-v215-r1.public.json)、[Standard r12 评分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-native-start-standard-v215-score-r12.public.json)及 [Standard 冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-native-start-standard-v215-score-r12-cold.public.json)。
- [Skirmish 启动](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-native-start-skirmish-v215-r1.public.json)、[Skirmish 冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-native-start-skirmish-v215-r1-cold.public.json)。
- [首轮准备和 Native 工厂](../../packages/product-composition/official-release-room-native-actions-v2.mjs)、[Match 绑定](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)及 [权威签名拒绝](../../packages/authoritative-engine/transition-v1.mjs)。
