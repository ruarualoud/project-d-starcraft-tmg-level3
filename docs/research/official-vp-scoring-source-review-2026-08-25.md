# StarCraft TMG 官方 VP、Cleanup 与终局规则来源审计（2026-08-25）

## 结论

截至 `2026-08-25T03:01–03:05Z`，当前可直接复核的一手来源仍是官方 128 页英文核心规则 PDF、官方 Print & Play 任务卡、官方 FAQ，以及官方 Command Center 所读取的 Firestore 数据。

对 Ticket 11 的第 12 个 bounded slice，最稳妥的范围不是“一次完成所有任务计分”，而是：绑定当前 `mission_hold_position` Standard 记录，在 `Enemy Supply destroyed this Round = 0`、无待结算 End-of-Round effect、非最终回合且所有 Token/Marker 类型已知的状态中，完成双方同时计分、10+ VP 特殊胜利检查、非终局 Cleanup 和非平分 Initiative。任何非零 Supply 损失、Out-of-Coherency casualty、最终回合、歼灭、平分 Roll-Off、未知 Marker 或其它任务卡都必须 fail-closed，留给后续独立切片。

原因是：

- 官方明确支持“本回合跨 Supply 档位下降量”参与计分，而不是只在整支 Unit 被摧毁时计分；
- 官方明确把无法合法保持 Coherency 而移除的模型称为 casualty，因此它会触发 Current Supply 档位更新；
- 但官方没有明确说明这类由己方移动/放置造成的 casualty 应把 Supply VP 归给对手、归给造成者，还是不计分；
- Marker affinity 则没有同类歧义：完成 Mission/Deployment draft 后，`1/3=Red`、`2/4=Blue`、`5=Neutral`，且 affinity 不等于 control。

本文件只做来源研究和实现边界建议；没有提升 RuleAtom、Rules、Skill、MuZero 或 `trainingTruth` 权限。

## 研究边界与取证方法

- 只使用 [StarCraft TMG 官方站](https://starcraft-tmg.com/)、[官方 Command Center](https://sc.starcraft-tmg.com/)、其官方前端实际连接的 Firestore 项目，以及官方 PDF；未使用 Wiki、论坛、BoardGameGeek、玩家总结或仓库旧数值补齐规则。
- 规则 PDF 由官方 URL 直接下载，以 SHA-256、字节数、HTTP 元数据、PDF 元数据和 `pdftotext -layout` 页码定位冻结。
- Firestore 数据由官方 Command Center 的 [mission_cards.js](https://sc.starcraft-tmg.com/modules/mission_cards.js) 与 [firebase-init.js](https://sc.starcraft-tmg.com/modules/firebase-init.js) 交叉确认项目和筛选条件，再从第一方项目 REST endpoint 直接读取；仓库快照只用于定位，不作为真值。
- PDF 页码同时记录“PDF 文件页序号 / 页面印刷页码”。核心 PDF 封面等前置页使 PDF 页序号比印刷页码大 `2`。
- Firestore 的 canonical capture hash 使用按 document name 排序的响应，筛选 `type=mission`，保留 `name/fields/createTime/updateTime`，以 `jq -S -c` 紧凑键排序 JSON 序列化并保留结尾 LF；这是一份可复算的研究捕获哈希，不冒充官方签名或官方 release ID。
- FAQ 原始 HTML 含会话字段；语义身份仅覆盖 Gameplay 七项的 DOM 顺序、NFC/空白规范化和 RFC 8785 JSON，不把整页原始 HTML hash 当规则版本。

## 当前官方产品与数据身份

### 核心规则和任务卡 PDF

| 工件 | 官方来源 | 页数 / 字节 | 内容 SHA-256 | HTTP / PDF 元数据 | 本审计用途 |
|---|---|---:|---|---|---|
| Core Rules EN | [StarCraft-TMG_EN.pdf](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf) | `128` / `15,688,406` | `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` | `Last-Modified: 2026-06-09T13:09:11Z`; `ETag: "6a281077-ef62d6"`; PDF `CreationDate: 2026-06-03 21:11:20 CST`, `ModDate: 2026-06-03 21:14:44 CST` | VP、Cleanup、终局、Marker affinity 主规则 |
| Protoss P2P | [官方 PDF](https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf) | `14` / `3,233,470` | `4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212` | 文件级 `May 2026, v1.0`; Mission 页脚 `v1.04.26` | Mission 卡交叉核对，页 `11–13` |
| Terran P2P | [官方 PDF](https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf) | `14` / `2,609,994` | `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c` | 文件级 `May 2026, v1.0`; Mission 页脚 `v1.04.26` | Mission 卡重复官方位置 |
| Zerg P2P | [官方 PDF](https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf) | `20` / `3,465,781` | `6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364` | 文件级 `May 2026, v1.0`; Mission 页脚 `v1.04.26` | Mission 卡重复官方位置 |

官方 [Downloads](https://starcraft-tmg.com/downloads) 在捕获时仍同时列出上述四份 PDF，没有独立 VP errata PDF。

### Command Center 与 Firestore

- [Command Center](https://sc.starcraft-tmg.com/) 可见产品标签为 `BETA v1.4`；捕获 HTML SHA-256 为 `340bacd589e88e9b02e7d99ff8a2966c1dd2621a22d5a76494a462ce0d170bc7`。
- 官方 [Service Worker](https://sc.starcraft-tmg.com/sw.js) 使用缓存名 `sc-tmg-v1.5`，文件 SHA-256 为 `a8ca4efb0027ec3b01928d4df1b28528fde13eb77e1703e1147488cc41332a06`。
- 官方 shell 还显示 `Admin Panel v1.3 (Beta)`。`BETA v1.4`、`sc-tmg-v1.5` 和 Admin `v1.3` 分属产品展示、缓存和管理界面，不能合并解释为规则版本。
- [Firestore version document](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions) 当前为 `unitsVersion=71 / cardsVersion=69 / rulesVersion=48`，文档 `updateTime=2026-05-26T13:23:51.064119Z`；`jq -S -c` capture SHA-256 为 `35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733`。
- [mission_cards.js](https://sc.starcraft-tmg.com/modules/mission_cards.js) SHA-256 为 `a55dcb073c0e62b93b9a8e9c25a47208ef733d5a617f75c093f430e752c4a0ca`。它从 `faction_cards` 中筛选 `type == mission` 且 `faction == the_game`，并把这些记录标为 official；社区任务使用独立 `community_mission` 类型。
- [firebase-init.js](https://sc.starcraft-tmg.com/modules/firebase-init.js) SHA-256 为 `2f6b2432228d22d5e6ec6e0c6e7794f98297dd29b941eb7239be02d0d8c7edc4`，其 `projectId` 为 `starcrafttmgbeta`。本报告不记录其公开客户端 API key。
- [当前 `faction_cards` 列表](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards?pageSize=1000&orderBy=__name__) 有 `191` 条、无 `nextPageToken`：`10` official mission、`10` official deployment、`127` community mission、`44` community deployment。完整响应 SHA-256 为 `37cc8d65241433b0bf6dc9a36e45bda1754eab5a9fcdb2cc1adcd82d29c31e1f`。
- 十条 official mission 的 `createTime/updateTime` 都是 `2026-03-09T17:52:57.805279Z`。按上述 canonical capture 合同得到 `12,599` bytes、SHA-256 `fe153180fa6e73d7bd75a0a0d6df31b659782059e6f7e5f4e4c04b3a129ee54b`。
- 社区记录在 `2026-08-24` 仍有更新，但这不能被误读为 official mission 的版本变化；`cardsVersion=69` 和十条 official mission 内容没有因社区写入而改变。
- 当前 Core game-sequence 的 Firestore 文档为 [PART 8](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/iuUyObNTQ2M8xK4IUqzC)，`updateTime=2026-05-15T14:03:27.795297Z`；`jq -S -c` capture SHA-256 为 `35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b`。其 8.9.2–8.10 正文与本次核心 PDF 对应段落一致。

结论：官方没有提供一个统一、签名的 rules/data release ID。房间必须分别冻结 PDF hash、Command Center snapshot/hash、版本 tuple、任务记录 hash和规则 executor 版本；不得仅写“v1.4”或“latest”。

## Core 8.9.2–8.9.6、8.10 的精确规则

| 顺序 | 官方规则 | 明文结论 | 实现约束 |
|---:|---|---|---|
| 0 | Core §8.9，PDF 页 `71` / 印刷页 `69` | Phase 4 严格顺序：Mission Marker Control → Score VP → End of Game Check → End-of-Round effects → Cleanup → Initiative。 | Authority 必须以一个冻结的 scoring state 执行，不能让 UI/AI重排步骤。 |
| 1 | Core §8.9.2，PDF 页 `74` / 印刷页 `72`；[Firestore PART 8](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/iuUyObNTQ2M8xK4IUqzC) | 双方依据 Mission Card 的 scoring conditions 同时统计 VP。 | 先生成双方完整 `ScoringBreakdown`，再一次原子提交；玩家一先写分再影响玩家二属于错误语义。 |
| 2 | Core §8.9.3，同页 | 特殊胜利条件满足时满足者 outright win；一方战场无模型且 Reserves 无 Unit 时，存活方 `+10 VP`；最后回合的最后 Phase 完成后进入 §8.10。 | 任一已证明 terminal 结果必须短路后续 8.9.4–8.9.6。双方同时空、多个 terminal 条件同时出现的优先级没有定义，须 fail-closed。 |
| 3 | Core §8.9.4，同页 | First Player Marker 持有者先结算 End-of-Round effects；同一玩家有多个时由该玩家排序，每个 effect 完整结算后再下一个。 | 有 effect 时不能由服务器任意排序；需要 LegalSpace choice 和可重放 effect queue。首个 bounded slice 可只接受空 queue。 |
| 4 | Core §8.9.5，同页 | 移除普通 Tokens/Markers；保留 `STAY IN PLAY`、Damage Markers、Mission Markers、表示 Mission Marker 控制的 Faction Indicators；Exhausted Tactical/Faction Cards 翻回 active。 | 每个对象必须有规则拥有的 kind 与 persistence 分类；未知类别不能猜测为“删”或“留”。Status 的生命周期还受其自身规则约束，不能把 Cleanup 概括成清空所有状态。 |
| 5 | Core §8.9.6，同页；§3.2，PDF 页 `33` / 印刷页 `31` | 非终局时较少 VP 的玩家取得 First Player Marker；同分则双方 Roll-Off，各投 `2D6`，平局重投直到有胜者，然后开始下一回合 Phase 1。 | 同分 Initiative 需要 ChanceTicket/随机承诺与完整重放；不能用 seat id 或客户端随机数代替。 |
| Final | Core §8.10，PDF 页 `74` / 印刷页 `72`；§9.1.9，PDF 页 `78` / 印刷页 `76` | 仅当游戏因 Round Limit 结束时，最终 Scoring Phase 开始时仍在 Reserves 的 Units 视为 Destroyed并按 Mission 的 destroyed-enemy 条件计分；总 VP 高者胜；同分先用 Mission tiebreaker，没有则 Draw；Summoned Units 不用于 Final Score。 | “非终局同分 Initiative Roll-Off”和“最终总分同分 Mission tiebreaker/Draw”是两个不同分支。Final-reserve virtual destruction不能在特殊胜利或歼灭终局中误用。 |

Core §2.6.2（PDF 页 `31` / 印刷页 `29`）还明确 Mission Card、Unit Card 或 Special Ability 的具体规则优先于一般 Core Rules。因此任务卡的 round gate、即时胜利、特殊 action、marker consumption 和随机激活都是 Rules 输入，不是 UI 文案。

## 当前十条 official Mission 记录

下面是 live Firestore `cardsVersion=69` 的当前数据。每一项都另含“本回合 Enemy Supply destroyed 等量 VP”；表中只列额外任务逻辑。

| Mission | Standard | Skirmish | 当前额外 VP / 终局边界 | P2P 对照 |
|---|---|---|---|---|
| Divide and Conquer | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_divide_and_conquer)：`4` rounds，`8/+2` Supply，领先 `10+` | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_divide_and_conquer__skirmish_)：`4` rounds，`4/+1`，领先 `8+` | 从 R1 比较每个 Quarter 的 Total Current Supply；仅 Wholly Within Unit；每个胜出 Quarter `1 VP`；控制 Marker 的 Unit 在 Quarter 比较中临时 `+1 Supply`；Marker 5 `2 VP`。临时 `+1` 不修改真实 Current Supply。 | Protoss P2P PDF 页 `13`，一致。 |
| Frontlines | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_frontlines)：`5` rounds，`6/+2`，领先 `10+` | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_frontlines__skirmish_)：`5` rounds，`3/+1`，领先 `8+` | 从 R2 起每个 controlled Marker `1 VP`；若本回合从对手手中夺取，再额外 `2 VP`。需要 round-scoped previous-controller lineage。 | Protoss P2P PDF 页 `12`，一致。 |
| Gather the Resources | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_gather_the_resources)：`5` rounds，`6/+2`，领先 `10+` | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_gather_the_resources__skirmish_)：`5` rounds，`3/+1`，Firestore 领先 `10+` | 从 R2 起每个 opponent-affinity controlled Marker `2 VP`；符合条件的 Assault Gather Action `+1 VP`。任务写“立即”胜利，因此通过 §2.6.2 可推断每次权威 VP mutation 后都需检查阈值；这是来源推论，必须保留 reasoning provenance。 | Protoss P2P PDF 页 `12` 的 Skirmish 写领先 `8+`，与 live Firestore `10+` 冲突。见下文。 |
| Hold Position | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_hold_position)：`5` rounds，`6/+2`，领先 `10+` | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_hold_position__skirmish_)：`5` rounds，`3/+1`，领先 `8+` | 从 R2 起，Neutral/own-affinity controlled Marker 各 `1 VP`，opponent-affinity 各 `2 VP`。Standard direct-document canonical hash 为 `dc3ed374c4b64731455402ea0d6e325a9e468d7fdc6453d995122ff877f3d1f8`。 | Protoss P2P PDF 页 `11`，一致；适合第 12 个 bounded slice。 |
| Supply Drop | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_supply_drop)：`5` rounds，`6/+2`，领先 `12+` | [记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_supply_drop__skirmish_)：`4` rounds，`4/+1`，领先 `8+` | Standard R1–4 随机激活 Marker 1–4、R5 激活 5；Skirmish R2–4 从 1/2/5 随机激活。控制已激活 Marker 时，按其 activation round 得 VP并移除。随机与 marker consumption 都必须进入权威事件和重放。 | Protoss P2P PDF 页 `11`，一致。 |

十条 live mission 都没有 `tiebreaker` 字段或对应文本。因此在精确绑定这份 `cardsVersion=69` mission snapshot、且游戏到达 §8.10 的情况下，最终 VP 同分应走 Core 的“没有 Mission tiebreaker → Draw”。未来 snapshot 新增 tiebreaker 时只能影响新房间，不能反写历史。

### Gather the Resources (Skirmish) 的官方源冲突

- [Live Firestore record](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_gather_the_resources__skirmish_) 当前写特殊胜利阈值 `10+ VP`；direct-document `jq -S -c` capture SHA-256 为 `7f66d6d4cb5e523f46493080eb2e77ccc480b0d519b104f87ca8164c08883ec0`。
- [May 2026 Protoss P2P](https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf) PDF 页 `12`、页脚 `v1.04.26` 写 `8+ VP`；Terran/Zerg P2P 的重复任务卡亦属于同一 P2P 发布批次。
- Firestore official mission 的 `updateTime` 是 `2026-03-09`，P2P 文件在 `2026-05` 制作，Core PDF 在 `2026-06` 制作，但官方没有发布把这些工件绑定为同一 release 的清单，也没有说明冲突时的编辑优先级。

Project D 已选择“当前房间绑定最新 contract-verified Command Center snapshot，P2P 作为历史/交叉核对”的产品合同；在该合同下可以显式选择 Firestore `10+`，但必须留下 drift receipt。任何没有绑定该精确 precedence 合同的路径都必须 fail-closed，不能凭日期或直觉选择 `8` 或 `10`。第 12 个 slice 应避开该任务。

## `Enemy Supply destroyed this Round`：已证明与未证明

### 官方明文可以证明的部分

1. Core §6.1（PDF 页 `46` / 印刷页 `44`）定义 Current Supply Value 由剩余模型数对应的 Supply Profile 档位决定；casualty 使模型数跨入更低档位时必须立即更新。
2. Core §6.2 同页规定：Mission 按本回合 destroyed Enemy Supply 计分时，本回合被 destroyed 的 Supply Value 在 Scoring Phase 加到分数。
3. Core Part 1 worked example（PDF 页 `29` / 印刷页 `27`）明确展示双方 Enemy Unit 的 Supply Value 各下降 `1`，双方各得 `1 VP`。因此这不是“只监听 UnitDestroyed”的整 Unit 奖励，而是 Supply 档位下降量。
4. Core §4.4（PDF 页 `37` / 印刷页 `35`）规定，模型无法找到保持合法 Coherency Link 的位置时“immediately removed as a casualty”；casualty 本身按 §6.1 会触发 Current Supply 档位更新。
5. Core §8.5.4（PDF 页 `60` / 印刷页 `58`）还规定 Disengage 时无法离开 Engagement Range 的模型会被移除并视为 Destroyed；这同样是可能改变 Supply 的非普通 attack 路径。
6. Core §7.4（PDF 页 `56` / 印刷页 `54`）只在最后一个模型倒下时把整支 Unit 定义为 Destroyed。结合前述条款可知，`Supply destroyed` 与 `Unit Destroyed` 不是同一个事件。

### 官方资料不能证明的部分

本次 Core PDF、live `rulesVersion=48` PART 8/Glossary、十条 Mission、P2P 和 [Gameplay FAQ](https://starcraft-tmg.com/faq) 都没有定义下列归属：

- “destroyed Enemy Supply”是否无条件等于对手所有 Current Supply downward deltas，还是只计算由该玩家造成的 deltas；
- 由 Unit 自己的 Move/Deploy/Charge/Disengage/Place 导致的 Out-of-Coherency casualty，应该把 Supply VP给对手、给造成该 reposition 的玩家，还是不计；
- Friendly、反射、环境、双方共同 effect、无 actor effect 或连锁 effect 的 casualty 如何归因；
- 一次模型移除使 Unit 跨越多个 Supply 档位时，正式账本是否必须逐档记录，还是只取 before/after 差值；
- 最后一个模型被移除时，Destroyed Unit 的 post-current-supply 是否形式上视为 `0`；§8.10 对 Reserves 的 virtual destruction给出结果方向，但没有通用事件公式；
- 多个来源在同一原子 resolution 中共同造成 casualty 时如何分摊。

因此只能安全地断言：Out-of-Coherency removal 是 casualty，并会在跨档时造成 Supply 下降；**不能断言该下降的 VP 归属**。尤其不能因为“它是对手的 Unit”就静默把 VP记给当前玩家。

### 实现上的 fail-closed 合同

- 每个可计分 casualty receipt 至少记录 `unitId / owningSeat / causalActionId / causalSeatOrNull / causeKind / modelCountBefore/After / currentSupplyBefore/After / supplyDelta / ruleAtomIds`。
- `supplyDelta = max(0, currentSupplyBefore - currentSupplyAfter)`，但只有 exact official Supply Profile 与完整 casualty lifecycle 都已冻结时才可计算。
- 当前一手资料只足以为 worked-example 同型的、明确由 opponent attack damage 造成的 Supply 档位下降建立首批正例。
- `out_of_coherency_removal`、self-caused Disengage loss、Friendly/environment/unknown attribution 一律 `RULE_UNSUPPORTED` 或 `SCORING_ATTRIBUTION_UNRESOLVED`，不得计 `0`、不得默认送给对手、不得进入 training truth。
- 不能只比较 round start/end 的模型数：中间可能存在 Respawn、Reserves、Summon、回场或多个 causal event；计分需要 append-only round-scoped Supply delta ledger。
- 当前已执行的 attack/casualty executor若没有写完整 `supplyDestroyedThisRound` lineage，8.9.2 必须拒绝非零 Supply 计分，不能在 Scoring Phase 事后猜测。

## Marker affinity：赋值时机与数据来源

Core §9.2 与 §9.2.1（PDF 页 `79` / 印刷页 `77`）给出完整流程：

1. Draft Roll-Off 胜者先选择自己是 Red Player 还是 Blue Player；该颜色决定 Entry Edge、Zone of Influence 和整场 Mission Marker affinity。
2. 双方完成 Mission draft 和 Deployment draft，各选出一张卡。
3. 两张卡选定后执行 Step 4 Marker Affinity：Markers `1/3` 关联 Red，`2/4` 关联 Blue，`5` Neutral。
4. Marker affinity 只表示 Marker 上印的玩家颜色，不授予初始 control。

Core 的 Mission Marker table（PDF 页 `72` / 印刷页 `70`）再次交叉列出相同映射和“draft 完成后设置”。当前 Firestore mission 记录只说 `own colour / Opponent colour / Neutral`，并不携带 seat-to-colour 或 marker-to-colour 权威字段。

所以实现必须：

- 在服务器完成 draft 时冻结 `seatColorAssignment` 和 `markerAffinity={1:red,2:blue,3:red,4:blue,5:neutral}`；
- 由 MatchBinding/authoritative state提供 affinity，不能由客户端、UI、AI或当前 controller推导；
- control 与 affinity 分开保存：control 会按 §8.9.1 sticky-control 改变，affinity整场不变；
- 如果颜色选择、draft receipt、marker ID 或 exact deployment/mission binding 缺失，Hold Position/ Gather等 affinity-based scoring fail-closed。

这部分没有未决的数值歧义；未决的是现有房间状态是否已经保存了完整 draft/colour provenance，需在实现第 12 slice 前由代码证据确认。

## 建议的第 12 个 bounded slice

建议名称：`official-hold-position-standard-scoring-cleanup-v1`。

### 明确纳入

- exact Core PDF hash：`27639c...ea54`；
- exact live mission record：[mission_hold_position](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards/mission_hold_position)，canonical capture hash `dc3ed374c4b64731455402ea0d6e325a9e468d7fdc6453d995122ff877f3d1f8`；
- Standard format，Round `2–4`；
- 已由上一 Mission Marker Control slice产生并冻结的五个 marker control结果；
- 服务器冻结的 Red/Blue seat assignment 与固定 affinity；
- `Enemy Supply destroyed this Round = 0`，并有零 casualty/supply-delta ledger witness；
- 双方基于同一 before-state同时得到：Neutral/own controlled marker `1 VP`，opponent-affinity controlled marker `2 VP`；
- 原子写入双方 scoring breakdown、score totals、rule/source lineage和 replay event；
- 得分后若某方领先 `10+`，按 Mission specific condition进入 terminal并短路；
- 未 terminal 且 End-of-Round queue为空时，按 8.9.5清理已知类型对象、刷新 Tactical/Faction Cards；
- 清理后总 VP 不同，由较少 VP者取得 First Player Marker并进入下一 Round Phase 1。

### 明确排除并 fail-closed

- 任意 `supplyDelta > 0` 或缺少 round-scoped零 delta witness；
- Out-of-Coherency、Disengage、Friendly、environment或 unknown causal casualty；
- Round 1、Round 5/final score、Reserves virtual destruction、Summoned Unit final exclusion；
- annihilation `+10 VP`、双方同时无模型/Reserves、多个 terminal trigger同时成立；
- VP同分的 Initiative Roll-Off；
- 任意待结算 End-of-Round effect或玩家排序选择；
- unknown Token/Marker/status/card kind 或未知 persistence；
- Skirmish、其它 Mission、community Mission、client-authored scoring text；
- 任何缺失/漂移的 PDF、mission、catalogue、runtime或 MatchBinding dependency。

这个切片的价值是打通一次真实的 `control → simultaneous score → terminal-or-cleanup → initiative → replay` 闭环，同时不虚构当前缺失的 Supply attribution 和终局全覆盖。它只能标为 incomplete development subset，不能因此声称完整 8.9/8.10、production rules或训练真值已完成。

## 实现检查点：第 14 个规则器切片

第 12、13 个切片已分别实现受限的 Hold Position Standard 零 Supply-delta 计分和 10 分领先特殊终局检查。第 14 个切片没有转而猜测 Army Elimination：Core §8.9.3 的“surviving player gains +10 VP”仍未明确等同于直接胜利，也没有解决双方同时为空或多个 terminal trigger 同时成立时的优先级，因此该分支继续保持 `review_required`。

本次只实现可以完整证明的 End-of-Round 空队列：Standard Round 2–4，且同回合 marker control → VP scoring → non-terminal end-game check 前缀精确存在；当前官方 Marine 与 Hold Position source record hash 精确绑定；没有 selected upgrade、status、combat effect、card resource 或 board effect marker；由 Rules 推导出的候选 effect queue 必须为空。成功时只写入 hash-bound `effectQueueProof` 并推进到 `cleanup_and_refresh`，不改分数、模型、战场或卡牌资源；任何未知/非空来源、顺序漂移或不完整依赖都失败关闭。非空 effect 的 First Player 优先、同席自选排序和逐项结算仍是独立未完成切片。

当前 slice / catalogue / runtime hash 分别为 `9e5609659d0f51d1dd696ce56f746b6ae27e5aaa4ab7cb01a12635f69b8d78de` / `0a697bcbc01cea1f3bd44ea1be06a33e8c4103f4c7a05e4d3ebf2b3d6da42e9c` / `a331acde4d25a2a121f6b0707e6a34828370c768510487fdcfc40b47e872a85f`，规则器口径为 166 executable / 746 review-required / 114 display-only，14 个纵向切片；完整 foundations 为 66 份报告、`639/639`。这些证据没有产生 Skill、DSH、MuZero、memory 或 training promotion。

## 后续必须独立完成的切片

1. **Supply-loss ledger 与 attribution adjudication**：先覆盖明确 opponent attack 的 bracket delta；Out-of-Coherency/self-loss在得到官方裁定或显式人工规则包前继续 quarantine。
2. **Initiative Roll-Off**：2D6、平局重投、ChanceTicket、receipt/replay。
3. **非空 End-of-Round effect queue**：First Player先、同席可选择排序、逐 effect完整结算；已证明为空的队列不在此缺口内。
4. **Annihilation terminal**：`+10 VP`、存活方、双方同时为空和多 terminal trigger的未决优先级。
5. **Round-limit final score**：Reserves virtual destruction、Summoned exclusion、mission tiebreaker/Draw。
6. **Frontlines**：本回合 previous-controller lineage与夺取 bonus。
7. **Gather the Resources**：Assault Gather Action、中途 VP mutation后的即时终局检查，以及 Skirmish `8/10` 官方源冲突处置。
8. **Supply Drop**：Start-of-Round随机激活、activation-round lineage、marker removal与重放。
9. **Divide and Conquer**：精确 Quarter geometry、Wholly Within、临时 objective-control Supply modifier。
10. **Cleanup completeness**：所有官方 Token/Marker/Status/Card类型的生命周期矩阵与未知类型拒绝。

## FAQ 与未决问题

[Gameplay FAQ](https://starcraft-tmg.com/faq) 当前七项没有 VP、Cleanup、Supply attribution、同时 terminal或 tiebreaker 专门裁定。其当前规范化语义为 `2,176` bytes，SHA-256 `e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92`；页面没有语义版本、ETag或 Last-Modified，未来必须按内容 hash重新捕获。

仍待官方资料或显式裁判政策回答：

- Out-of-Coherency/self-caused casualty 的 destroyed-Supply VP究竟归谁；
- Friendly/environment/共同因果与跨多个 Supply 档位的归因细则；
- 双方同时没有 battlefield model和 Reserve Unit时的结果；
- 特殊胜利、歼灭和其它 terminal trigger同一检查点同时满足时的优先级；
- 歼灭条款的“surviving player +10 VP”与“直接胜利”关系；
- Gather Skirmish 的 Firestore `10+` 与 P2P `8+` 哪一个是出版方语义上的最终值；
- 当前房间 schema 是否已经冻结 draft colour receipt、完整 Token/Marker persistence和 round-scoped Supply-delta lineage。

在这些问题解决前，严格冻结已支持子集；缺依赖或遇到未决边界就隔离，不做静默兼容。历史规则和 P2P差异仍可展示，但不得静默参与当前规则计算。
