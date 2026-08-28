# StarCraft TMG 官方规则来源与条款分母研究（2026-08-24）

## 结论

截至 2026-08-24，StarCraft: Tabletop Miniatures Game（下称 SC: TMG）可以直接取得、可内容寻址的官方规则主语料为：一份 128 页英文核心规则书，以及三份标注为 `May 2026, v1.0` 的 Protoss、Terran、Zerg Print & Play 卡牌表。四份 PDF 均有可用文本层。官方 StarCraft TMG 站与 Archon Studio 下载站提供的这四份文件逐字节相同。

核心规则书可先建立 **192 个可复核结构锚点**：Parts 2–10 的 107 个编号章节/子章节、Part 11 的 73 个关键词/定义条目、Part 12 的 12 个编号段落。这个 `192` 是 RuleAtom 提取的源锚点分母，不是最终原子条款数。一个章节或关键词条目常含多个规范句、例外或生命周期步骤；在逐段、逐项目符号切分并由人工核对以前，不得把 `192/192` 表述为完整规则原子覆盖。

卡牌规则还构成 48 个官方页面锚点：Protoss 14 页、Terran 14 页、Zerg 20 页。每个命名能力、武器档案、升级、Faction/Tactical/Creep/Mission/Deployment 条件必须继续拆成独立条款。三个阵营表重复刊载的任务和部署规则可以共享一个语义 RuleAtom，但每个源位置仍需保留别名/重复来源关系，不能从来源分母中消失。

官方 [Gameplay FAQ](https://starcraft-tmg.com/faq) 当前有 7 个问答。它是可变网页而非带版本号的勘误文件；其中视线、桌面尺寸、Supply/交替激活和未来 living-rules 发布方式可作补充或交叉核对，但它没有列出逐条规则更正。官方 [Downloads](https://starcraft-tmg.com/downloads) 当前也没有单独的 Errata PDF。因此 Ticket 11B 仍不能关闭：需要完成规则书规范块、三份卡牌表与当前官方 App 数据的内容冻结、逐条切分、来源优先级判定和零未分类处置。

## 研究边界和方法

- 只使用 Archon Studio / SC: TMG 官方域名的一手材料；没有用 Wiki、论坛、BoardGameGeek、媒体或玩家总结补齐缺口。
- 采集日为 2026-08-24。网络响应时间约为 `2026-08-24T13:32–13:40Z`。
- 用 HTTP GET/HEAD 记录文件长度、`Last-Modified`、`ETag`；用 SHA-256 内容寻址；用 `pdfinfo` 检查页数与元数据；用 `pdftotext` 验证文本层、目录和关键词条目。
- 官方站的核心规则 PDF 与 Archon Studio 镜像进行逐字节比较；比较结果相同。
- FAQ 整页包含动态会话/CSRF 内容，因此原始 HTML 每次抓取的哈希不同。报告只记录重复抓取后稳定的 Gameplay 分类 JCS 规范化哈希；精确序列化合同见下文，旧式“拼接纯文本”哈希不作为来源身份。
- 本研究只写入本报告，没有把受版权保护的 PDF 或大段规则正文提交到仓库，也没有安装依赖。

## 官方来源清单

### A. 冻结后可作为规则主语料的 PDF

| Source ID | 官方 URL | 文件内版本 | 页数 | 字节 | SHA-256 | HTTP / PDF 日期 |
|---|---|---:|---:|---:|---|---|
| `core-rules-en` | [StarCraft-TMG_EN.pdf](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf) | 未显示语义版本；必须用哈希标识 | 128 | 15,688,406 | `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` | 官方站 `Last-Modified: 2026-06-09 13:09:11Z`; PDF `CreationDate: 2026-06-03 21:11:20 CST`, `ModDate: 2026-06-03 21:14:44 CST` |
| `p2p-protoss-en` | [Protoss P2P](https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf) | `May 2026, v1.0` | 14 | 3,233,470 | `4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212` | `Last-Modified: 2026-05-07 12:34:26Z`; PDF `ModDate: 2026-05-06 19:54:33 CST` |
| `p2p-terran-en` | [Terran P2P](https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf) | `May 2026, v1.0` | 14 | 2,609,994 | `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c` | `Last-Modified: 2026-05-07 12:34:26Z`; PDF `ModDate: 2026-05-06 19:27:30 CST` |
| `p2p-zerg-en` | [Zerg P2P](https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf) | `May 2026, v1.0` | 20 | 3,465,781 | `6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364` | `Last-Modified: 2026-05-07 12:34:26Z`; PDF `ModDate: 2026-05-06 19:32:32 CST` |

Archon Studio 的 [SC: TMG 下载镜像](https://archon-studio.com/downloads/starcraft-tabletop-miniatures-game) 提供同名文件；四份镜像与上表官方站文件逐字节相同。核心规则书的镜像 URL 为 [Archon Studio PDF](https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf)。由于 URL 和服务器元数据可以不同，长期依赖应绑定内容 SHA-256，而不是只绑定 URL 或 `ETag`。

P2P 文件的页面里还有更细的卡牌/场景页脚版本，例如 `v1.04.26` 和 `v1.03.26`。导入时应把页脚版本保存在具体卡牌或场景来源记录上，不能只保留文件级 `May 2026, v1.0`。

### B. 官方但可变的补充来源

| Source ID | URL | 2026-08-24 观察 | 权威处置 |
|---|---|---|---|
| `official-gameplay-faq` | [FAQ](https://starcraft-tmg.com/faq) | Gameplay 分类有 7 项；无页面日期、`Last-Modified`、`ETag` 或语义版本。两次独立抓取按下述合同均得到 2,176 字节 JCS，SHA-256 `e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92` | 作为哈希冻结的补充/交叉核对源；发生冲突时不得无审查覆盖核心 PDF 或卡牌 PDF |
| `official-rules-news-index` | [Rules news](https://starcraft-tmg.com/news/rules) | 当前列出 6 篇：2026-03-31 规则概览、2026-04-30 FAQ/交付更新、2026-07-29 新单位、2026-08-04 Zeratul、2026-08-10 Siege Tank、2026-08-18 Ravager | 规则概览作交叉核对；新单位文章是官方预览/设计说明，最终卡牌或 App 记录冻结前为 `review_required`，不得直接进入 LegalSpace |
| `official-command-center` | [SC: TMG Command Center](https://sc.starcraft-tmg.com/) | 官方 Beta `v1.4`，提供 Game Rules、Factions & Cards、Army Builder、Mission Cards、Deployment Maps 等模块；公开页允许 Guest 入口 | 是当前官方数据候选，但网页版本号不等于记录版本。必须捕获原始记录、稳定 ID、更新时间和内容哈希后才能成为 replay dependency |
| `archon-faq-update-blog` | [2026-04-30 Archon 文章](https://archon-studio.com/blog/news-1/starcraft-tabletop-miniatures-game-faq-update-your-latest-questions-answered) | 内容是发货、发行、语言和产品路线问答；没有玩法裁定或勘误 | `display_only`; 不能冒充 gameplay errata |

FAQ 的 7 个 Gameplay 项应全部登记，以免选择性引用：两项是游戏定位/时长说明；其余涉及 Supply 与分阶段交替激活、36×36 与 54×36 桌面、未来 living-rules 发布政策、底座到底座的抽象视线和规则在线可用性。只有能形成规范约束或来源治理约束的内容才可生成 RuleAtom，其余标为 `display_only`。

#### FAQ Gameplay canonical serialization

为保证实现可以复算 FAQ 内容哈希，规范化合同固定如下：

1. 从官方 FAQ HTML 中选择 `div.jsFaqCategory[data-id="9"]`，按 DOM 顺序读取 `faq_9_41` 到 `faq_9_47` 的 7 组 question/answer。
2. 每个字段先移除 HTML/SVG 标签，再解码 HTML entity。`&#x...;` 和 `&#...;` 分别按十六进制、十进制 Unicode code point 解码，所以 `&#039;` 自然得到 `'`；named entity 映射固定为 `amp=&`、`quot="`、`apos='`、`nbsp=U+0020`、`rsquo=’`、`lsquo=‘`、`rdquo=”`、`ldquo=“`、`ndash=–`、`mdash=—`；未知 named entity 保持原字节文本，不猜测。
3. 字段执行 Unicode NFC；把所有 Unicode whitespace 连续段折叠成一个 `U+0020`；移除字段首尾空格。
4. 生成数组，保持 DOM 顺序。每项为三个字符串字段；JCS/UTF-16 键顺序固定为 `answer`、`id`、`question`。`id` 的值是完整字符串 `faq_9_41` … `faq_9_47`。
5. 采用 RFC 8785/JCS 的紧凑 UTF-8 JSON 序列化，不加 BOM，不加结尾换行。哈希直接覆盖这 2,176 个 UTF-8 字节。

形状示例只显示字段，不复制完整官方答案：

```json
[{"answer":"…","id":"faq_9_41","question":"…"},{"answer":"…","id":"faq_9_42","question":"…"}]
```

两次独立 HTTP GET 按此合同均得到 `e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92`。任何条目增删、顺序变化、问题或答案正文变化都会改变哈希；会话、CSRF、cookie banner 或其它页面壳变化不会改变这个 Gameplay 内容身份。

### C. 官方下载页中不进入 RuleAtom 分母的文件

官方 Downloads 页面当前列出 23 个唯一 PDF。除上面的核心规则书和三份 P2P 卡牌表外，另有 19 份 Starter Set、独立单位、英雄、地形或促销模型装配说明。抽查显示它们主要是零件、底座和组装步骤，而不是玩法规则。

这些文件不进入 RuleAtom 条款分母；如果系统需要验证底座尺寸、组件或装配映射，应进入独立 `official_component_data` 目录并保留自己的来源哈希。不能因为它们是官方 PDF 就把装配步骤当成可执行游戏规则，也不能因为本票不处理组件数据就声称它们不存在。

## 核心规则书结构锚点分母

### Parts 2–10：107 个编号锚点

以下计数直接来自核心 PDF 的 Table of Contents，并与正文标题交叉核对。

| Part | 打印页 | 编号锚点数 | 锚点范围 |
|---|---:|---:|---|
| Part 2 Core Concepts | 28–30 | 14 | `2.1–2.7.3`，包含 `2.4.1–2.4.2`、`2.6.1–2.6.2`、`2.7.1–2.7.3` |
| Part 3 Dice and Rolling | 31–32 | 8 | `3.1–3.8` |
| Part 4 Measuring and Movement | 33–37 | 6 | `4.1–4.6` |
| Part 5 Cards and Characteristics | 38–43 | 6 | `5.1–5.6` |
| Part 6 The Supply System | 44 | 2 | `6.1–6.2` |
| Part 7 The Battlefield | 45–54 | 11 | `7.1–7.4`，含 `7.1.1–7.1.4`、`7.2.1`、`7.3.1–7.3.2` |
| Part 8 The Game Sequence | 54–72 | 38 | `8.1–8.10`，含 `8.2.1–8.2.2`、`8.3.1–8.3.3`、`8.4.1–8.4.2`、`8.5.1–8.5.5`、`8.6.1–8.6.2`、`8.7.1–8.7.7`、`8.8.1`、`8.9.1–8.9.6` |
| Part 9 Preparing for Battle | 73–78 | 15 | `9.1–9.3`，含 `9.1.1–9.1.11`、`9.2.1` |
| Part 10 Advanced Rules | 79–81 | 7 | `10.1–10.5.2`，含 `10.5.1–10.5.2` |
| **合计** | **28–81** | **107** | — |

每个编号锚点必须进一步按正文中的规范段落和项目符号拆分。例子、Designer’s Note、Abathur’s Tip、图注和普通规范文本需要保留不同 `blockKind`；它们可以互相提供测试或解释证据，但不能静默合并成同一种规则权威。

### Part 11：73 个关键词/定义锚点

Part 11 位于打印页 82–91。文本层可稳定识别以下 73 个标题：

1. `ACCESS POINT`
2. `ACTIVE PLAYER`
3. `ANTI-EVADE (X)`
4. `ARMY SLOT`
5. `AVAILABLE SUPPLY`
6. `BLOCKING TERRAIN`
7. `BUFF [Characteristic] (X)`
8. `BULKY`
9. `BURROWED`
10. `BURST FIRE Y” (X)`
11. `COMBAT TAGS`
12. `CONCENTRATED FIRE (X)`
13. `CONTROLLING PLAYER`
14. `CRITICAL HIT (X)`
15. `CURRENT SUPPLY VALUE`
16. `DEBUFF [Characteristic] (X)`
17. `DISPLACEMENT`
18. `DODGE (X)`
19. `EFFECTIVE SIZE`
20. `ELEVATION LEVEL`
21. `ENEMY`
22. `ENGAGED`
23. `ENGAGEMENT RANGE`
24. `ENTRY EDGE`
25. `FACTION TAGS`
26. `FIGHTING RANK`
27. `FIRST PLAYER MARKER`
28. `FLYING`
29. `FRIENDLY`
30. `GRASS`
31. `GROUND LEVEL`
32. `HEAL (X)`
33. `HIDDEN`
34. `HIGH GROUND`
35. `HITS X (Y)`
36. `IMPACT (X) Y`
37. `IMPASSABLE TERRAIN`
38. `INDIRECT FIRE`
39. `INSTANT`
40. `LEADING MODEL`
41. `LOCKED IN (X)`
42. `LONG RANGE (X)`
43. `MID GROUND`
44. `MISSION MARKERS`
45. `MODIFIER`
46. `NON-LETHAL DAMAGE (X)`
47. `ON CREEP`
48. `PIERCE [TAG] X`
49. `PINPOINT`
50. `PLACE (X)`
51. `PRECISION (X)`
52. `READY`
53. `REPEATABLE`
54. `RESERVES`
55. `RESPAWN (X)`
56. `SHIELDED`
57. `SIDEARM`
58. `SIEGE MODE`
59. `SPECIAL ABILITY`
60. `SPECIALIST`
61. `SPILLOVER`
62. `STATIONARY`
63. `STATUS`
64. `STAY IN PLAY`
65. `SUPPLY VALUE`
66. `SUPPORTING RANK`
67. `TACTICAL MASS`
68. `TOUGH (X)`
69. `UNENGAGED`
70. `VISIBLE`
71. `WHOLLY WITHIN`
72. `WITHIN`
73. `ZONE OF INFLUENCE`

这些不是 73 个天然 RuleAtom。例如 `BUFF [Characteristic] (X)`、`DEBUFF [Characteristic] (X)`、`BURROWED`、`FLYING`、`RESERVES`、`SPECIAL ABILITY` 和 `STATUS` 各自包含一条或多条前置条件、覆盖规则、数值方向、动作限制和生命周期效果；必须拆成子条款并维护同一关键词下的组合/冲突测试。

### Part 12：12 个编号锚点

Part 12 位于打印页 92–113，共 `12.1–12.12`：

- `12.1–12.8` 是 pre-game、round、phase、casualty、template 的快速参考，主要与前文交叉核对；
- `12.9` 是 dispute resolution，需单独判断为显示/线下裁定流程还是平台可执行政策，不能被快速参考标签掩盖；
- `12.10–12.11` 是单位、升级和 Tactical Card 点数数据；应绑定数据快照，不应伪装成纯规则算法；
- `12.12` 是示例军队，主要作为构筑示例和测试材料。

因此 Part 12 的 12 个锚点都要有处置，但处置可以是 `cross_check`、`data_record`、`display_only`、`review_required` 或拆出的 executable atom，不能把整个 Part 12 排除。

### 规则书其余区域

- 打印页 4 的 Nature of the Game 和打印页 5–27 的 Part 1 Learn to Play 是解释/示例材料。Part 1 在目录中有一个 worked example 加八个 round/phase 示例锚点；它们应转成正向场景夹具或说明证据，而不是独立规则真值。
- 打印页 114 是索引，作为定位辅助。
- 打印页 115 是 terrain key；打印页 116–126 有 11 页地图布局。它们进入官方 terrain/map 数据目录，而不是 RuleAtom 算法分母。

## P2P 卡牌页面锚点分母

三份 P2P PDF 均可直接提取文本。页面级结构为：

| 文件 | Unit 页 | Faction/Tactical/Creep 页 | Mission/Deployment 页 | 总页数 |
|---|---:|---:|---:|---:|
| Protoss | 1–7 | 8–10 | 11–14 | 14 |
| Terran | 1–7 | 8–10 | 11–14 | 14 |
| Zerg | 1–12 | 13–16 | 17–20 | 20 |
| **合计** | **26** | **10** | **12** | **48** |

卡牌原子提取至少要覆盖：

- Unit/Faction/Combat tags、Army Slot、Combat Role、model/supply profile、size/speed/armour/evade/HP/shield；
- 每个 phase 下的命名 Active/Passive/Reaction ability，成本、目标、范围、持续时间和 once/repeatable 行为；
- 每个 weapon profile 的 range、target、RoA、Hit、Surge type/dice、damage、keywords；
- 每个 upgrade 的替换/附加关系和 composition restriction；
- Faction、Tactical 与 Creep cards 的资源、Supply slot 和效果；
- Mission 的游戏长度、Supply escalation、marker 初始状态、得分、特殊胜利和附加条件；
- Deployment/Map 的桌面尺寸、Entry Edge、Zone of Influence、marker 和 terrain 几何。

相同的 Mission/Deployment 页面出现在多份阵营文件中。目录应采用 `canonicalClauseId + sourceAliases[]`：执行语义可去重，来源覆盖不可去重。任何文本或数值差异都必须产生 drift/conflict，而不是用“看起来一样”静默合并。

## 建议的源条款身份合同

规则书条款建议使用以下稳定身份：

```text
sc-tmg:<sourceSha256>:pdf-page-<n>:printed-page-<n>:<anchorId>:block-<ordinal>:clause-<ordinal>
```

卡牌条款建议使用：

```text
sc-tmg:<sourceSha256>:pdf-page-<n>:<cardKind>:<canonicalCardId>:<fieldOrAbilityId>:clause-<ordinal>
```

FAQ 条款建议使用：

```text
sc-tmg-faq:<normalizedGameplaySha256>:gameplay:q<sourceId>:clause-<ordinal>
```

其中：

- `sourceSha256` 必须是实际捕获文件的 SHA-256；
- PDF 页码和打印页码同时保存，避免封面偏移；
- `anchorId` 是 `8.7.4`、`BURROWED` 等源标题，不是实现函数名；
- `blockKind` 至少区分 `normative_prose`、`bullet`、`example`、`designer_note`、`tip`、`table`、`diagram`；
- 一条源句包含多个独立义务时必须拆为多个 `clause`，同时保存共同原文块哈希；
- 一个 RuleAtom 可以引用多个源条款，一个源条款也可拆成多个有类型原子，但必须保留可逆映射；
- 任何重新 OCR、重新排版或官方文件替换都产生新的 source revision；历史房间继续绑定旧 SHA，不静默升级。

## 官方、Project D 与参考实现的边界

以下内容不是官方规则来源，不能填补官方条款分母：

- Project D 现有 `scripts/starcraft-tmg-rules-v0.mjs` / `RULE_MATRIX`；它混合了官方引用、Project D 平台约束、UI/服务/部署要求和部分估算，适合作为实现差异索引，不是官方条款目录。
- Battle Lab、旧 StarCraft 对战器、Expo UI、Maze Tower League 架构或其它游戏的规则/房间实现；它们可提供架构模式和测试方法，不能成为 SC: TMG 规则真值。
- Project D 的几何预算、authority envelope、SeatGrant、ControlLease、日志、签名、Skill、MuZero 或 DSH 合同；这些是平台规则/安全合同，不是桌游规则。
- 新闻文章对未来单位的说明；在最终卡牌、核心 PDF 更新或可内容寻址的官方 App 记录发布前，只能是 `review_required` 候选。
- 机器翻译、Kerrigan 世界书、角色台词、玩家经验或 Skill；它们不能改变 canonical rule text 或可执行效果。

目录应给每条记录保存 `authorityClass`，至少包含：

```text
official_frozen_rule
official_frozen_card
official_mutable_supplement
official_preview
official_component_data
project_d_platform_contract
reference_implementation
community_or_secondary
```

只有前两类在完成审核后可直接支撑 executable RuleAtom。其它类别必须经过显式优先级、内容冻结和冲突审查。

## Ticket 11B 的最小可验收分母

本研究建议把 11B 分母分成三层，避免把页面计数冒充条款覆盖：

1. **Source manifest gate**
   - 四份规则 PDF 的 URL、长度、页数、哈希和版本全部冻结；
   - FAQ Gameplay 规范化正文和提取算法冻结；
   - 官方 App 的实际规则/卡牌/任务/部署记录被捕获为不可变快照；
   - 每次官方 Rules news index 变化产生 source-drift 候选。
2. **Source anchor gate**
   - 核心规则书 `192/192` 结构锚点可寻址；
   - P2P `48/48` 页面锚点可寻址；
   - FAQ `7/7` 问答锚点可寻址；
   - Learn-to-Play、索引、点数、示例军队、terrain key、11 个地图页和 19 个装配 PDF 均有明确非 RuleAtom 处置，不从总账消失。
3. **Canonical clause gate**
   - 每个规范段落、项目符号、表格行、图示约束和卡牌字段都有稳定 clause ID；
   - 每条 clause 恰有一个 disposition：`executable`、`display_only`、`review_required` 或 `quarantined`；数据/交叉核对等辅助标签必须归约到这四类之一或由合同显式扩展；
   - executable 条款有 owner、timing、preconditions、LegalSpace、effect、Chance、rejection、dependency、inverse/replay 和 focused evidence；
   - 所有重复、冲突、例外、优先级和生命周期关联可追溯；
   - 零未分类条款，且所有非 executable 条款都不能进入 LegalSpace、Agent tools、Skill facts、receipts 或 training evidence。

只有第三层的实际 clause 总数可以称为完整源条款分母。本报告建立了来源边界和可复核的锚点起点，但没有对 128 页规则与 48 页卡牌逐句完成法律式切分，所以不能给出或暗示一个伪精确的最终 clause 数。

## 当前阻塞与下一步

1. 把四份官方规则 PDF 作为原始快照正式导入固定目录，并为每份生成独立 source receipt；本研究只记录哈希，没有提交 PDF。
2. 从核心规则书的 192 个锚点开始做规范块切分；双栏、表格、图注和跨页关键词必须人工复核，不能只相信 `pdftotext` 顺序。
3. 对 48 页 P2P 卡牌逐卡、逐能力、逐武器、逐数值提取；同名任务/部署做语义去重但保留所有 source alias。
4. 抓取官方 Command Center 当前匿名可见数据，确定它相对 May 2026 P2P 和 June 2026 核心 PDF 的更新关系；没有稳定记录版本/哈希的 App 数据保持 `review_required`。
5. 接受并编码来源优先级。建议默认：同一内容哈希的当前官方 PDF > 已冻结的官方 App 记录 > 哈希冻结的 Gameplay FAQ 补充 > 官方预览文章 > Project D/reference implementation。任何真实冲突都进入人工审核，不能按这个顺序静默覆盖历史规则。
6. 建立官方规则更新监视：Downloads 文件 hash、FAQ Gameplay 规范化 hash、Rules news index 和 App source snapshot 任一变化都生成 drift report，并严格冻结旧版本以供历史展示和 replay。

## 一手来源

- [SC: TMG 官方 Rules PDF](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf)
- [SC: TMG 官方 Downloads](https://starcraft-tmg.com/downloads)
- [SC: TMG 官方 Gameplay FAQ](https://starcraft-tmg.com/faq)
- [SC: TMG 官方 Rules news](https://starcraft-tmg.com/news/rules)
- [SC: TMG 官方 Command Center](https://sc.starcraft-tmg.com/)
- [Archon Studio SC: TMG 下载镜像](https://archon-studio.com/downloads/starcraft-tabletop-miniatures-game)
- [Archon Studio 2026-04-30 FAQ Update 文章](https://archon-studio.com/blog/news-1/starcraft-tabletop-miniatures-game-faq-update-your-latest-questions-answered)
