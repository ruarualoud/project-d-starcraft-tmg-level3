# Ticket 28 · W3-10／11 · 旧能力继承与 Skirmish 阶段后继

## 已确认的两个迁移缺口

- **旧能力的执行归属未被新组装继承。** Wave3 开房先核对冻结身份，再通过分族注册表显式绑定执行器。源码别名用于查找同一条定义，不会自动把旧版执行器注册到新区。对新候选尚未登记的 15 条 Standard 定义与旧权威目录逐一对账，15 条均是 executable_exact。Marine 的缺项是近战 Strike，C-14 射击原有能力不需重做。Skirmish 开局曾有“准入 33/33，原生消费者 21/33”的同类分歧，补齐消费者后两者均为 33/33。
- **同一阶段的全局动作在 Wave3 路由中缺失。** 旧 Match 在移动、突击、战斗分支合并各执行器、任务动作和 Pass。Wave3 v2.1 的原生激活分支只读原生组件菜单，直接跳过旧分支的阶段控制。用完全相同的已签名部署后态调用两版合法菜单，v2.1 对 player2 返回 3 个参数域、零有限动作；v2.2 保留 3 个域并回到 1 个 Pass。另一席仍拿不到 Pass，部署尚未结束时也不能 Pass。修复复用原 Pass 执行器，依据原生动作所有者判定可否加入 Pass 或任务行动。旧运行时签名保留其版本行为。
- **此前验收覆盖不足。** 冻结来源、逐项绑定、开局和首队交权检查未读取交权后的整阶段菜单。后续验证 r8 另有一次夹具错误，直接调用 Match 枚举漏传正式房间绑定。该次改用保存房间的真实 LegalSpace 并从同一 r8 继续。它和旧版已复现的菜单漏项分别归类。

## 同类影响和范围

| 边界 | 证据与处置 |
|---|---|
| 正式入口 | Web/App 本地服务目前仍通过既有房间工厂选择旧 Match。Wave3 两规模工厂的最终发布准入仍关闭。这里属于发布未接齐。候选签名房间不能作为端上已接线的证据。 |
| Standard 旧定义 | 102/117，待 15。包括 7 条卡与 8 条单位能力。旧权威执行登记见逐条对账；顺序沿旧执行族复用未变化的消费者，并核对同版后继。 |
| 阶段和任务动作 | Pass 与 Sabotage 之前经过同一条被跳过的旧菜单分支。v2.2 恢复组合，并将原生 finish_activation 和阶段变化纳入原有生命周期处理。Skirmish 覆盖 Pass 和 Artefact Hunt 回合流程。Standard Fire in the Sky 的实际 Sabotage 仍须验证。 |
| Standard 携带物重定位 | 现有闪烁→对手放置→恢复已有条件签名证据。当前源码对 release_native 先直接 apply，PLACE 前挂起和恢复查询仍按旧 ability 分支处理。须在同一 Standard 新版发布中核对掉落发生在位移前。此处当前是明确的路由覆盖缺口，未以新版标准房间实提交。 |
| 生成物覆盖 | 开局分母来自军表定义。Omega Worm 等在对局中生成，不能以 33/33 或 102/117 代替生成后消费者验收。此前虫洞横排摆位停在预检，实际部署和配额后继待走。 |

准入判定沿用已有验证手册。从正式入口对同一发布核对：能力身份、菜单所有者、同版权威提交、完整后继和签名恢复。每个公共阶段和强制前置选择至少使用一个真实产品后继，复用已过的单项证据。

- [旧版与新版同快照菜单差分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-skirmish-phase-menu-regression.public.json)
- [Standard 15 项旧版权威登记逐条对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-skirmish-phase-inherited-standard-audit.public.json)
- [上一步开局、Supply 和绑版冷恢复](ticket-28-wave3-skirmish-release-match-opening-2026-11-22.md)
- [此前 Standard 闪烁掉落条件验证](../../build/ticket-28-wave3-mission-source-20261121-v1/artefact-hunt-standard-place/REPORT.zh-CN.md)
- [当前阶段路由和后继源码](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)
## 本次签名流程

同一候选 Room 在五回合内完成移动、突击、战斗、清理、任务计分和终局。计分提交在 r10、r26、r42、r58、r74，前四回合均 0:0，第五回合 1:1。r75 按任务回合上限结束，终局合法动作与参数域为空。验证采用两席脚本顺序提交，主要使用 Pass，未覆盖正式客户端操作、争夺战斗或策略效果。模型调用为零。旧版快照和原房间未写入。

- [五回合计分与终局公开记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-skirmish-phase-terminal.public.json)

从关闭后的 SQLite 重新组装冻结规则及 v2.2.0 运行时，读出并重放全部 75 条签名回执。回放的完整状态、stateHash 和 matchBindingHash 与保存终局一致。

- [冷恢复与完整签名重放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-skirmish-phase-cold-replay.public.json)

准出仍需完成 Standard 携带物重定位和 Sabotage 后继、剩余 15 项旧定义、生成物边界及正式房间装配。Ticket 28 完成 2/16。
