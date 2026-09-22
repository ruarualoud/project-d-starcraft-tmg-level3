# Ticket 28 — 官方数据更新影响评估与增量刷新路线图 v1

- 状态：**Draft / queued-last**
- 评估日期：2026-09-22（Asia/Shanghai）
- 目标游戏：StarCraft: Tabletop Miniatures Game
- 当前锁定基线：Command Center `U71 / C69 / R48`
- 实时官方源观察值：Command Center `U75 / C78 / R48`
- 排队约束：本 Ticket 必须排在 Ticket 27，以及所有既定 Ticket 14 / 19 / 21 / 22 / 23 / 26 工作之后；只有这些工作全部验收完成，或用户逐项明确豁免后，Ticket 28 才可从 `queued-last` 转为 `Ready`。
- 本文性质：只读影响评估与实施草案；不是新 source lock、不是数据刷新结果、不是发布批准，也没有修改数据库、运行时、房间或 Skill。

## 1. 执行结论

本轮实时官方数据相对现有锁定快照的精确集合差异是：

| 集合 | 锁定数量 | 实时数量 | 新增 | 删除 | 规范化记录修改 |
|---|---:|---:|---:|---:|---:|
| `army_units` | 26 | 31 | 5 | 0 | 0 |
| `faction_cards` | 193 | 199 | 6 | 0 | 24 |
| `rules_sections` | 15 | 15 | 0 | 0 | 0 |
| `tactical_cards` | 37 | 42 | 5 | 0 | 37 |
| **合计** | **271** | **287** | **16** | **0** | **61** |

另有 `system_metadata/versions` 1 条元数据记录修改，版本从 `U71/C69/R48` 变为 `U75/C78/R48`。61 条“规范化记录修改”里，51 条只涉及时间戳、投票数、格式、大小写或引用号；真正改变官方可执行行为或资格的现有记录只有 5 条：

1. `Gather the Resources (Skirmish)` 的立即领先阈值从 `10+ VP` 改为 `8+ VP`；
2. `Daelaam` 的 `Air` 槽位从 0 改为 1；
3. `Terran Armed Forces` 的 `Air` 槽位从 0 改为 1；
4. `Zerg Swarm` 的 `Air` 槽位从 0 改为 1；
5. `Malignant Creep` 从直接势力值 `Kerrigan's Swarm` 规范化为 `Zerg`，同时以 `factionTags/tags` 保留 `Kerrigan's Swarm` 资格。

官方规则 PDF、三份 P2P PDF、FAQ V1 PDF、Command Center shell 与静态 JS 资产均与锁定快照逐字节一致；官方规则新闻索引没有新增规则文章。因此本轮不是规则原子库刷新，而是产品、任务、编军、运行时绑定和 Skill 适配刷新。

明确结论：

- RuleAtom：新增 0、修改 0、废弃 0；保留展示型原子 114。
- 产品能力定义：新增 55，已有定义文本修改 0。
- 任务定义：新增 2 条 Artefact Hunt 任务记录，现有任务运行时修改 1 条。
- Skill：现有 11 个对新快照全部 source-stale，但不删除；11 个做局部重验/局部章节重生成，新增 3 个 Skill，已有 Skill 全量重生成 0。
- 当前正式房间、进行中的对局、历史 replay 和旧 Skill 必须继续绑定 `U71/C69/R48`，不得原地迁移。
- 新增单位目前缺少足以完成全部几何认证的官方底座资料；Siege Tank 还引入 150mm 底座，Shock Cannon 引入 Blast Template，但当前官方材料不足以认证完整模板几何。这些是发布阻断项，不可猜测。

## 2. 权威来源与评估边界

### 2.1 当前锁定快照

| 项 | 值 |
|---|---|
| capturedAt | `2026-08-30T06:18:09.287Z` |
| units/cards/rules | `71 / 69 / 48` |
| source-lock hash | `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1` |
| snapshot hash | `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105` |
| normalized dataset hash | `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067` |
| Firestore counts | units 26 / faction cards 193 / rules 15 / tactical cards 37 |

基线证据：

- `content/official-development-tranche-s75-111-source-lock-v1.json`
- `packages/source-data/official-development-tranche-source-lock-v1.mjs`
- `packages/source-data/official-latest-data-binding-v1.mjs`
- `packages/source-data/official-command-center-snapshot-delta-v1.mjs`

### 2.2 实时官方一手源

只读观察时间约为 `2026-09-22T04:12:15Z`；Firestore 元数据更新时间为 `2026-09-21T13:35:42.444346Z`。

官方 Command Center / Firestore：

- project：`starcrafttmgbeta`
- database：`starcrafttmgbeta`
- REST base：`https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta`
- `documents/army_units?pageSize=1000`
- `documents/faction_cards?pageSize=1000`
- `documents/rules_sections?pageSize=1000`
- `documents/tactical_cards?pageSize=1000`
- `documents/system_metadata/versions`

官方规则与 FAQ：

- <https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf>
- <https://starcraft-tmg.com/faq>
- 现有 source lock 中登记的 Core Rulebook、Protoss/Terran/Zerg P2P PDF。

官方规则新闻：

- <https://starcraft-tmg.com/news/rules>
- <https://starcraft-tmg.com/news/rules/immortal-glory-through-endurance>
- <https://starcraft-tmg.com/news/rules/ravager-corrosive-death-from-above>
- <https://starcraft-tmg.com/news/rules/siege-tank-thunder-from-the-high-ground>
- <https://starcraft-tmg.com/news/rules/zeratul-blade-in-the-shadows>
- <https://starcraft-tmg.com/news/featured/new-units-join-starcraft-tabletop-miniatures-game>

本评估没有执行刷新器、导入器或数据库写入。以下“实时语义哈希”只是本次只读比对中，对 Firestore value 解码、对象键递归排序并按文档 ID 排序后得到的临时评估值，不可作为未来 source lock 或发布认证哈希：

| 集合 | 临时评估语义哈希 |
|---|---|
| `army_units` | `7fc6695de6b9189fd025d6d2c6c664c83ffd78abd48227f215f6af8164e30148` |
| `faction_cards` | `c8a8d79da35fbaf40a79ec4d1399dcfad9fffeead8eef035e66947b804c55418` |
| `rules_sections` | `638156f2fd0b6a587ed9ba53da00cbeafeabc311667fa6ab4ff5d16b97b7356f` |
| `tactical_cards` | `c2fcf2962a2c08215fe82e9572b803c0b9e1b1952ed9cf7f87c9983b66d602fd` |

新 source-lock hash、snapshot hash 和 normalized dataset hash 均为 **unknown**；只有用户批准后运行正式捕获、规范化和认证管线才能产生。

### 2.3 不变的权威文件

| 文件 | 锁定 SHA-256 | 当前结果 |
|---|---|---|
| Core Rulebook | `27639c…ea54` | 字节一致；15,688,406 bytes |
| Protoss P2P | `4e8547…a212` | 字节一致；3,233,470 bytes |
| Terran P2P | `afa3f2…109c` | 字节一致；2,609,994 bytes |
| Zerg P2P | `6810f4…364` | 字节一致；3,465,781 bytes |
| FAQ V1 | `eeeffb7a…e62c` | 字节、ETag、Last-Modified 一致；333,711 bytes |

网页 FAQ / rules-news 的原始 HTML 因展示资产 `_tv` 等参数发生字节漂移，但 FAQ PDF 的语义权威未变，rules-news 索引仍是锁定时的 7 条相关内容，最新规则文章仍是 2026-08-23 的 Immortal。网页壳字节变化不应生成 RuleAtom。

## 3. 结构化数据差异

### 3.1 新增记录

#### `army_units`：5

| 单位 | 种族 | 直接影响 |
|---|---|---|
| Immortal | Protoss | 单位目录、军表、能力 IR、射击/近战/状态、Skill |
| Nerazim Watchers (Adept) | Protoss | 新势力 Nerazim 资格、军表、Shade/位移交互、Skill |
| Ravager | Zerg | 单位目录、Corrosive Bile token/范围、能力 IR、Skill |
| Siege Tank | Terran | 单位目录、150mm 底座、Blast Template、高地/射击、Skill |
| Zeratul | Protoss | 英雄资格、单位目录、能力 IR、反应/位移/Skill |

#### `tactical_cards`：5

| 卡 | 势力/类型 | boosts | 直接影响 |
|---|---|---:|---|
| Cocoon | Zerg tactical | 2 | 卡池、能力定义、编军/Skill |
| Factory (Tech Lab) | Terran tactical | 2 | 卡池、能力定义、编军/Skill |
| Nerazim | Protoss faction card | 2 | 新势力入口、势力槽位、Skill |
| Robotics Facility | Protoss tactical | 1 | 卡池、能力定义、编军/Skill |
| Void Seeker | Protoss tactical | 2 | 卡池、能力定义、编军/Skill |

#### `faction_cards`：6

| 类别 | 记录 | 执行策略 |
|---|---|---|
| 官方任务 | Artefact Hunt Standard、Artefact Hunt Skirmish | 新 mission IR / runtime；FAQ 19、52 绑定 |
| 社区内容 | RESILIENCE、Research facility (event)、NEW DEPLOYMENT、Escape From Aiur | 展示隔离；不得进入 Rules、训练真值或正式房间 |

### 3.2 修改记录

#### `faction_cards`：24

- 14 条社区记录仅 `upvotes` 变化：展示层变化，不影响规则、运行时或 Skill。
- 10 条官方任务记录被触碰：
  - 5 条 Skirmish `refId` 顺移：Supply 6→7、Hold 7→8、Frontlines 8→9、Gather 9→10、Divide 10→11；只影响标识映射和快照校验。
  - Gather Skirmish：立即领先阈值 `10+ VP`→`8+ VP`；这是现有任务记录中唯一行为变化。
  - Divide Standard / Skirmish：`Quarter(s)` 大小写规范化。
  - Hold Position Standard：空白/格式变化。
  - 其余为时间戳变化。

#### `tactical_cards`：37

- 33 条只有时间戳/source-record 变化。
- 4 条实际资格变化：Daelaam、Terran Armed Forces、Zerg Swarm 的 Air 槽各 0→1；Malignant Creep 势力字段规范化但保留 Kerrigan's Swarm 标签资格。

#### `army_units` 与 `rules_sections`

- 已有 26 个单位在规范化对象键顺序后没有语义修改。
- 15 个规则章节没有语义修改。

### 3.3 删除记录

四个集合删除数均为 0。旧记录和旧快照没有删除、替换或原地迁移理由。

## 4. 原子、关系图、执行器与规则门影响

### 4.1 RuleAtom 精确计数

当前 FAQ 后总原子库为：

- 总 RuleAtom：1,163
- executable：1,049
- display-only：114
- review-required：0
- executor：83

本轮官方规则 PDF、P2P、FAQ 和规则新闻语义均未变化，因此：

| 动作 | 数量 | 结论 |
|---|---:|---|
| 新增 RuleAtom | **0** | 不从产品卡文本伪造核心规则原子 |
| 修改 RuleAtom | **0** | 现有规则权威未变 |
| 废弃 RuleAtom | **0** | 无规则删除 |
| 保留 display-only RuleAtom | **114** | 原样保留，不提升为执行真值 |
| 全量重生成 RuleAtom | **0** | 禁止无差别重建 |

Artefact Hunt 的任务文本属于 mission/product 定义层，不应在完成原子化审判前假装成已确认的核心 RuleAtom。若后续架构仍要求把任务条款投影成任务专属原子，其准确数量为 **unknown**，必须经过 Challenger → Reasoner → Judge 的句子级分解后再冻结；本文不猜数。

### 4.2 产品定义精确计数

现有产品能力 denominator 从 252 变为 307：

| 项 | 锁定 | 实时 | 增量 |
|---|---:|---:|---:|
| Unit definitions | 183 | 229 | +46 |
| Card definitions | 69 | 78 | +9 |
| **合计** | **252** | **307** | **+55** |

55 个新定义按种族：Protoss 29、Terran 15、Zerg 11；按产品：unit 46、faction card 2、tactical card 7；按激活：active 17、passive 18、reaction 7、weapon 13；按 runtime role：action 30、automatic consumer 7、reaction 7、system lifecycle 11。

按当前 Ticket 23 owner precedence 做唯一 owner 路由：

| owner family | 新定义数 |
|---|---:|
| relocation | 2 |
| characteristic/status | 17 |
| ranged combat | 9 |
| melee combat | 10 |
| reaction | 7 |
| battlefield asset | 5 |
| unit lifecycle | 4 |
| match lifecycle | 1 |
| unique fallback | 0 |
| **合计** | **55** |

编译器 family 命中允许重叠，精确为：battlefield_asset 6、characteristic_status 40、match_lifecycle 16、melee_combat 14、ranged_combat 19、reaction_priority 7、relocation 7、unit_lifecycle 4。命中既有 family 不等于自动可执行；55/55 都需要新 source binding 与聚焦证明。

### 4.3 能力关系图精确下界

Ability IR 至少增加 55 个 definition node 和 388 条已知编译关系边：

| 边类型 | 数量 |
|---|---:|
| `defined_by` | 55 |
| `routes_as` | 55 |
| `available_in` | 55 |
| `bound_to` | 55 |
| `observes` | 55 |
| `requires_family` | 113 |
| **合计** | **388** |

下游具体 adapter/state/relationship 边数是 **unknown**，要等定义逐条编译和 schema review；388 只能称为确定下界，不能称为完整关系图边数。

### 4.4 Mission IR 与执行器

mission denominator 从 10 条变为 12 条，即 5→6 个 Standard/Skirmish 任务家族：

- 新增：Artefact Hunt Standard / Skirmish。
- 修改：Gather the Resources Skirmish 的即时领先阈值 10→8。
- Artefact Hunt 所需状态至少包含：可宣称 artefact、载体、每单位最多一个、当前 Supply 降低时掉落、PLACE 后掉落、与更高敌方 engaged Supply 交战时掉落、单位被摧毁/移除/进入 reserve 时掉落、由对手在指定范围内放置掉落 marker、终局载体/ZoI/本方颜色条件计分。
- FAQ 19 已说明 claim 与 control 对 Flying/Burrowed 的区别；FAQ 52 已禁止携带 artefact 时使用 Psionic Transfer。这两个 FAQ 原子不变，但新 mission runtime 必须显式绑定它们。

`official-mission-effect-ir-v1.mjs` 当前只覆盖 10 条任务与 11 种 effect kind，因此需要新版本。需新增多少 effect kind、状态字段和执行器分支目前是 **unknown**；未完成 schema design/Judge 前不得猜数。

### 4.5 物理组件与几何阻断

实时 Firestore 没有为五个新增单位提供足以完成物理底座认证的完整几何字段；三份不变的 P2P PDF 也不包含这些新单位。已知事实：

- 官方 Siege Tank 新闻明确其使用 150mm 底座；当前已认证底座集合没有 150mm，因此 geometry、terrain、pathing、formation、engagement、range 和 mission 区域关系均需扩展。
- Siege Tank 的 Shock Cannon 使用 Blast Template；旧 Ticket 11 已因缺少官方 carrier/物理模板几何而将该路线隔离。现在出现正式 carrier，但权威模板尺寸仍不足，不能凭图片或经验补数。
- Ravager 的 Corrosive Bile 产生物理 token/范围交互；其组件几何是否足以由现有权威文本完整重建仍需证据审计。
- Immortal、Ravager、Zeratul、Nerazim Watchers 的精确底座几何在本次检查的一手材料中仍为 **unknown**。

所以 55 个定义可以先完成 source/IR/owner/gate 投影，但在缺失权威几何的产品上，不得宣称 307/307 production-executable，也不得进入新正式房间或训练真值。

## 5. 每类变化的全链路影响

| 变化 | 原子 | 图/IR | 执行器 | 规则门 | Skill | 回归 | 房间绑定 |
|---|---|---|---|---|---|---|---|
| 5 新单位 | 0 核心原子 | +46 unit definitions；新增产品/能力/资格节点 | 复用 family，但需 46 条新绑定；新几何分支待证据 | source lock、denominator、owner、geometry、aggregate | Terran/Zerg/Daelaam/Kerrigan/Nerazim 与对抗章节 | unit lifecycle、combat、status、reaction、geometry、army builder | 仅新快照房间；旧房间不可见 |
| 5 新卡 | 0 核心原子 | +9 card definitions；Nerazim 势力节点 | 9 条新绑定；卡生命周期与 automatic consumer | eligibility、card pool、owner、aggregate | faction/card package/roster 章节 | faction slot、card lifecycle、builder | 仅新快照房间 |
| 3 个 Air 槽 0→1 | 0 | 势力军表关系修改 3 | 编军合法性投影 | army legality、roster strategist | 3 个势力与相关对抗 | positive/negative army legality、Ticket 27 搜索空间 | 新快照军表；旧军表按旧版本解释 |
| Malignant Creep 资格规范化 | 0 | faction→race + tag 关系 | 资格解析与去重 | faction eligibility | Kerrigan's Swarm 及相关对抗 | 不漏、不重复、旧快照兼容 | 新快照读取新结构 |
| Artefact Hunt ×2 | 0 核心；任务原子数 unknown | +2 mission IR；载体/掉落/计分关系 | mission lifecycle、marker carrier/drop、terminal scoring | FAQ19/52、mission completeness、geometry | general + 所有势力/对抗的任务策略 | focused transition、cross-time、完整对局 | 只允许新快照实验房间，认证后才正式 |
| Gather Skirmish 10→8 | 0 核心 | 修改 1 mission IR 参数 | terminal/scoring evaluator | mission parity | general 与任务章节 | 7/8/9/10 VP 边界 | 新旧房间按各自快照取值 |
| 4 新社区记录与 14 投票变化 | 0 | display catalogue only | 无 | community isolation | 无 | 不进入 Rules/Skill/training truth | 可展示，不可作为正式规则 |
| rule/PDF/FAQ 不变 | 0/0/0；保留114 | 原规则图不重建 | 83 个既有 executor 不全量重做 | existing closure remains | 做 dependency-local revalidation | 聚焦受影响闭包 | 历史房间保持原绑定 |

## 6. Skill 失效、局部重验与新增计划

### 6.1 当前清单

Ticket 18 当前有 11 个产物：

- 总规则/通用：1
- 势力：4（Terran Armed Forces、Zerg Swarm、Daelaam、Kerrigan's Swarm）
- 有向正反对抗：6（Terran↔Zerg、Terran↔Daelaam、Terran↔Kerrigan's Swarm）
- 单独 race Skill：0；当前体系以 faction 为 Skill 边界。

全部 11 个都绑定 `official-frozen-71/69/48+faq-v1`。对旧房间它们仍有效；对 `U75/C78/R48` 新房间全部 source-stale，必须拒绝直接加载。

### 6.2 精确处置数量

| 分类 | 现有数 | 对新快照失效 | 局部重验/局部重生成 | 全量重生成现有 Skill | 新建 | 删除/废弃 |
|---|---:|---:|---:|---:|---:|---:|
| 总规则/通用 | 1 | 1 | 1 | 0 | 0 | 0 |
| 势力 | 4 | 4 | 4 | 0 | 1（Nerazim） | 0 |
| 有向对抗 | 6 | 6 | 6 | 0 | 2（Terran→Nerazim、Nerazim→Terran） | 0 |
| race-only | 0 | 0 | 0 | 0 | 0 | 0 |
| **合计** | **11** | **11** | **11** | **0** | **3** | **0** |

更新后建议 pack 数量为 14。种族视角的受影响势力 Skill：Terran 1、Zerg 2、Protoss 1；Protoss 另新增 Nerazim 1。种族只是统计维度，不新造 race-only Skill。

“局部”具体指：

- 通用 Skill：只刷新 source manifest、任务覆盖、产品/编军概览和相关 probes。
- 4 个既有势力 Skill：只刷新 `unit_roles`、`card_packages`、slot/eligibility、mission choices 与受新定义影响的策略章节。
- 6 个既有有向对抗 Skill：只刷新新单位/卡带来的 threat、counter、roster 和 mission branches。
- 旧版 11 个 Skill 与旧 release manifest 原样保留，供旧快照/历史 replay 使用；不在原文件上覆盖。
- 新 Nerazim 势力 Skill 和两个最小有向对抗 Skill 属于新生成。是否扩成五势力全矩阵不是本 Ticket 默认范围，必须另获用户批准。

所有增量 Skill 必须经过 source conformance、held-out judge、negative cases、cross-time replay 与完整对局 A/B；这些门通过前，不得进入 training truth、正式 opponent agent 或默认房间。

## 7. 非全量重生成策略

1. 以 source-lock 与 definition/mission dependency graph 计算影响闭包，不按文件时间戳全量污染。
2. RuleAtom 目录保持不变；只重验被新 mission/runtime 引用的现有原子，尤其 FAQ 19/52、Supply、PLACE、engagement、destroy/remove/reserve、ZoI 和 terminal scoring。
3. 55 个新产品定义只走新增 definition → family owner → adapter → evidence 链；已有 252 个定义只跑契约级回归，不重新生成文本。
4. 现有 11 个 Skill 只替换受影响章节，保留未命中依赖图的内容 hash；每个修改章节单独附 source refs、judge 结果和旧/新 hash。
5. 社区记录始终留在 display-only catalogue，阻止其进入 mission runtime、RuleAtom、Skill 证据和训练样本。
6. 新旧 snapshot/release/Skill manifest 并存；用房间创建时的不可变版本绑定选择，不迁移历史房间。
7. 任何 held-out 或 replay 失败只回滚对应 definition/mission/Skill chapter，不回滚或重建整个规则包。

## 8. Tracer-bullet Slices

建议 Ticket 28 冻结为 10 个可独立验收 Slice，编号承接 Ticket 27：273–282。每个实现 Slice 都必须纵向穿过 source → normalize/IR → LegalSpace/Apply → replay/UI or Skill probe，而不是只堆一层 schema。

### Slice 273 — HITL 刷新授权与权威源充分性门

- 类型：HITL。
- 依赖：Ticket 27 与 Ticket 14/19/21/22/23/26 全部完成或被用户明确豁免。
- 工作：用户明确批准正式只读捕获；冻结官方端点、观察时间、版本预期、社区隔离政策；决定缺失底座/Blast Template 权威数据是等待官方材料，还是允许相关产品保持 quarantined。
- 验收证据：批准记录、source allowlist、unknown/blocker 清单、不得写 Firestore 的运行约束。
- 回滚：无数据写入；撤销授权即停止。

### Slice 274 — AFK 正式 source lock、规范化快照与差异证据

- 类型：AFK；只读网络，写入仓库候选 artefact 前仍需 Slice 273 授权。
- 依赖：273。
- 工作：正式捕获 U/C/R、四集合、元数据、PDF/FAQ/news hashes；生成新 source-lock/snapshot/dataset hash；证明 16 新增、0 删除、61 修改，并把纯元数据/展示变化与执行变化分开。
- 验收证据：可复算 hashes、集合 diff、community isolation negative test、旧锁不可变证明。
- 回滚：删除未晋升的候选 lock artefact；运行时继续使用旧 lock。

### Slice 275 — AFK 任务纵切：Artefact Hunt + Gather 8 VP

- 类型：AFK。
- 依赖：274；若 Artefact 物理 marker 证据不足，则可完成 IR/Judge，但 production executable 保持阻断。
- 工作：版本化 mission IR；完成 Standard/Skirmish、claim/carrier/drop/place/engagement/destruction/reserve/ZoI/final score；绑定 FAQ 19/52；把 Gather Skirmish 阈值参数改为 8。
- 验收证据：任务 source parity；7/8/9/10 VP 边界；所有掉落原因正反例；Flying/Burrowed claim；Psionic Transfer negative；旧任务 replay 不变。
- 回滚：房间 manifest 回指旧 mission IR；候选 Artefact runtime 不对旧房间可见。

### Slice 276 — AFK Terran 纵切：15 定义、Air 1 与 Siege 几何

- 类型：AFK，遇权威几何缺失自动 quarantine。
- 依赖：274；Ticket 27 roster contract 已冻结。
- 工作：Siege Tank、Factory (Tech Lab) 共 15 个定义从 source 到 IR/owner/adapter；Terran Air 槽 1；150mm 底座能力；Blast Template 未认证部分保持 C/H blocker。
- 验收证据：15/15 source binding、编军正反例、owner exclusivity、geometry/pathing/LoS/terrain probes；模板缺失时明确拒绝而非近似执行。
- 回滚：Terran 新产品 feature gate 关闭；旧 Terran manifest 保持可用。

### Slice 277 — AFK Zerg 纵切：11 定义、Air 1 与资格规范化

- 类型：AFK。
- 依赖：274。
- 工作：Ravager、Cocoon 共 11 个定义；Zerg Air 槽 1；Malignant Creep race/tag 资格兼容与去重；Corrosive Bile token/范围在证据不足时隔离。
- 验收证据：11/11 binding；Zerg/Kerrigan's Swarm 资格不漏不重；token placement/range positive-negative；旧快照解析不变。
- 回滚：新 Zerg 产品/资格 resolver 版本撤回，旧 manifest 保留。

### Slice 278 — AFK Protoss/Nerazim 纵切：29 定义与新势力

- 类型：AFK。
- 依赖：274。
- 工作：Immortal、Nerazim Watchers、Zeratul、Nerazim、Robotics Facility、Void Seeker 共 29 个定义；Daelaam Air 槽 1；建立 Nerazim faction eligibility、slots、builder 和 Ticket 27 strategist 输入。
- 验收证据：29/29 binding；Daelaam/Nerazim 边界正反例；英雄/单位/卡资格；Shade/PLACE/reaction 聚焦 replay；未知底座必须显式阻断。
- 回滚：Nerazim faction manifest 不发布；旧 Protoss/Daelaam 继续使用。

### Slice 279 — AFK 聚合门与 307 denominator

- 类型：AFK。
- 依赖：275–278。
- 工作：聚合 307 definitions、12 missions、关系图；运行 exact-once owner、source completeness、negative availability、army legality、Ticket 27 roster projection 和受影响 cross-time replay。
- 验收证据：307/307 或逐项 quarantine 的显式分母；55 nodes/+388 known edges；无 silent fallback；旧 252/10 快照 replay hash 不变。
- 回滚：不晋升 aggregate/release manifest；各纵切 artefact 保持候选态。

### Slice 280 — AFK Skill 增量生成与 held-out 审判

- 类型：AFK；任何付费模型调用前另需用户批准预算与 provider/model。
- 依赖：279 中相关产品已可认证；被 quarantine 的产品不得写成可执行建议。
- 工作：11 个旧 Skill dependency-local patch/revalidation；新建 Nerazim 与 Terran↔Nerazim 三个 Skill；运行 Judge、negative cases、cross-time replay；保留旧版。
- 验收证据：11 partial + 3 new；0 existing full regeneration；每章 source refs/hash；held-out 无规则漂移；无社区内容污染。
- 回滚：Skill manifest 回指旧 11；删除未晋升候选版本，不覆盖历史 artefact。

### Slice 281 — AFK 新旧房间、replay 与发布绑定

- 类型：AFK。
- 依赖：279；若要加载新 Skill，则还依赖 280。
- 工作：新房间固定绑定 U75/C78/R48 候选 release；旧正式房间、当前进行中对局和历史 replay 继续绑定 U71/C69/R48；验证同一服务双版本路由和恢复。
- 验收证据：新旧房间矩阵、resume/replay hash、manifest mismatch fail-closed、回滚演练；不得改写当前正式对局。
- 回滚：禁用新 release ID，新房间创建回退旧 release；已有旧房间无变化。

### Slice 282 — HITL 完整对局 A/B、Skill 晋升与发布决定

- 类型：HITL；人类批准预算、对局矩阵、晋升和训练真值。
- 依赖：280–281；所有 C/H blocker 已关闭，或用户明确接受按产品 quarantine 的缩小发布。
- 工作：独立完整对局 A/B、专家可读 replay 审核、行为质量与规则合规比较；决定是否晋升新 Skill/release。
- 验收证据：完整 match records、judge verdict、成本账单、回滚演练、明确的人类签字。
- 回滚：不晋升或撤回新 release manifest；旧 lock/Skill/room 继续有效。

## 9. 工作量、模型与费用

### 9.1 工程量规划区间

以下是在不安装依赖、不修复无关债务、复用现有 family compiler/room binding/SkillOpt 基础设施的规划估算；外部权威资料等待时间不计入。

| Slice | 人日范围 |
|---|---:|
| 273 | 0.5–1 |
| 274 | 1–2 |
| 275 | 2–4 |
| 276 | 2–4 |
| 277 | 2–3 |
| 278 | 3–5 |
| 279 | 1–2 |
| 280 | 2–4 |
| 281 | 1–2 |
| 282 | 1–2（不含对局 wall-clock） |
| **合计** | **15.5–29 人日，约 124–232 工时（按 8h/日）** |

不确定性主要来自：五个新单位的底座/组件证据、Blast Template 几何、新 mission effect schema、55 定义中 family adapter 的实际缺口，以及完整对局长度。若权威几何持续缺失，应缩小发布范围而不是扩大估算并猜测实现。

### 9.2 模型调用、token 与费用

确定项：

- Slice 273–279 与 281 的 source、IR、执行器、回归和房间绑定可以设计为 deterministic，计划付费模型调用为 0。
- 本次评估本身没有触发付费生成、刷新或完整对局。

历史校准值，不是 Ticket 28 预测：

- Ticket 18 五个基础产物阶段记录约 34.1M tokens、¥15.72。
- Ticket 18 额外有向对抗与收口阶段记录 63,199,798 tokens、¥26.399。
- 现有一次完整 H-A 对局记录为 419 calls、23.58M tokens、¥36.496。

Ticket 28 精确 calls/tokens/cost 均为 **unknown**，原因是尚未冻结 provider/model、章节 batching、输出上限、held-out 数量和完整对局矩阵。为了不把历史消耗误写成承诺，Slice 280 与 282 启动前必须分别提交：

1. provider/model 与单价快照；
2. 最大调用数、输入/输出 token hard cap、人民币 hard cap；
3. 达到任一 cap 自动停止并保留候选态；
4. 是否允许从上次通过的章节 cache 继续，而不是重跑全部 11 个 Skill；
5. 完整对局的数量、座位组合和最大行动/回合预算。

在这些输入未批准前，不提供虚假的费用区间。历史数字只用于用户设预算时的量级参考。

## 10. AFK/HITL、依赖与队列

| Gate | 默认方式 | 人类必须决定的内容 |
|---|---|---|
| 排队进入 Ready | HITL | 既定 Ticket 是否全部完成或逐项豁免 |
| 正式官方源捕获 | HITL→AFK | 明确刷新命令、官方端点与只读边界 |
| deterministic 实现/验证 | AFK | 无；失败时 fail-closed |
| 缺失底座/模板资料 | HITL | 等待官方证据，或保持对应产品 quarantine |
| 付费 Skill 生成 | HITL→AFK | provider/model/call/token/cost caps |
| Skill promotion | HITL | held-out 与 complete-game 证据是否足够 |
| 新 release/正式房间 | HITL | 发布范围、quarantine 列表、回滚窗口 |
| training truth | HITL | 独立于 runtime release 的再次批准 |

队列规则必须同时满足：

- Ticket 28 不抢占 Ticket 27 Slices 267–272。
- Ticket 28 不绕过 Ticket 14 的外部设备验收，也不绕过 Ticket 23 当前正式对局、Ticket 26 的待办或用户认定的 Ticket 19/21/22 剩余门。
- 当前正式房间和当前对局绝不能作为刷新实验对象。
- 如果先完成部分 Slice，候选 artefact 仍保持未发布、未训练、未绑定正式房间。

## 11. 回滚与兼容策略

1. 所有 artefact 使用新版本 ID 和 content hash；禁止覆盖 U71/C69/R48 文件。
2. 房间在创建时固化 `sourceLockHash + releaseHash + skillManifestHash`，resume 时 mismatch 必须 fail-closed。
3. 旧 11 个 Skill 永久保留给旧快照；新 14-pack 只用于通过门的新快照。
4. 规则层没有变更，因此回滚产品/任务版本不需要回滚 RuleAtom catalogue。
5. 某个新产品失败时允许逐产品 quarantine，但 denominator 必须显示“已知总数/可执行数/隔离数”，不可把隔离项从分母静默删除。
6. 社区内容若误入执行或训练管线，整批候选 release 判失败并回滚到旧 manifest。
7. 新完整对局暴露问题时，只撤回新 release/Skill manifest；保留证据、失败 replay 与旧稳定版本。

## 12. 明确 unknown / blocker

| 项 | 当前状态 | 解除条件 |
|---|---|---|
| 新正式 source-lock/snapshot/dataset hashes | unknown | 用户批准后运行正式捕获/认证 |
| 4 个新增单位的精确底座几何 | unknown | 官方产品表、组件清单或等价一手证据 |
| Blast Template 精确物理几何 | unknown / blocker | 官方模板尺寸或可认证官方资产 |
| Corrosive Bile token 的完整物理几何 | unknown | 官方组件证据审计 |
| Artefact Hunt 新 effect-kind / executor 精确数 | unknown | mission schema design + Judge |
| 下游 adapter/state/graph 总边数 | unknown | 55 definitions 编译完成 |
| Skill 模型 calls/tokens/cost | unknown | provider/model/batching/caps 获批 |
| 完整对局数量与成本 | unknown | A/B 矩阵与预算获批 |
| 是否扩展 Nerazim 到全势力有向矩阵 | unknown / out-of-default-scope | 用户单独批准 |

## 13. 完成定义

Ticket 28 只有在以下全部成立时才可标记完成：

- 正式 source lock 可复算并证明 U75/C78/R48 与精确集合差异；
- 社区数据与官方规则/训练真值严格隔离；
- RuleAtom 保持 0 新增/0 修改/0 废弃，或任何后来发现的真实规则源变化经过独立新评估；
- 55 个新 definition、2 个新 mission、1 个任务参数修改都有 source binding、owner、正反例与 replay 证据；
- 307 denominator 不漏项，所有不可执行项显式 quarantine；
- 11 个旧 Skill 只做局部重验/局部重生成，3 个新 Skill 通过 held-out；旧版均保留；
- 当前和历史房间未被迁移或污染；新旧 release 可并存与回滚；
- 完整对局 A/B 与人类批准完成；
- release promotion 与 training-truth promotion 分别授权，没有隐式晋升。

## 14. 本次 ctx2skill 审计记录

- `ctx2skillLoopUsed`: true（仅用于评估与路线图设计）
- `targetGame`: StarCraft TMG
- `roleRoute`: rule-skill-builder / fact-probe
- `sourceRead`: locked official bundle + live official Firestore + official PDFs/FAQ/news
- `skillsRead`: 11
- `skillsGenerated`: 0
- `ruleAtomsGenerated`: 0
- `judgeTestsRun`: 0
- `crossTimeReplayRun`: false
- `promotions`: 0
- `runtimeMutation`: 0
- `roomMutation`: 0
- `databaseWrite`: 0
- `blocks`: authority geometry gaps, refresh approval, provider budget, complete-game promotion evidence

## 15. 尚需用户批准

1. 在所有既定工作结束后，把 Ticket 28 从 `queued-last` 提升为 `Ready`。
2. 运行正式只读捕获并在仓库产生新的 source lock / snapshot / normalized dataset。
3. 对缺失底座、Blast Template 和 token 几何，选择等待官方材料还是按产品 quarantine 后缩小发布。
4. 接受最小 Skill 范围为“11 个局部更新 + Nerazim 势力 + Terran↔Nerazim 两个有向对抗”；若要全势力矩阵，另行扩 scope。
5. 批准 Slice 280 的 provider/model、call/token/人民币 hard cap。
6. 批准 Slice 282 的完整对局矩阵与预算。
7. 分别批准新 release、Skill promotion 与 training truth；三者不可互相替代。
