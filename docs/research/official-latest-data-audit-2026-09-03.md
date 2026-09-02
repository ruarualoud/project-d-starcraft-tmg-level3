# StarCraft TMG 官方最新数据独立核验（2026-09-03）

## 结论

**分两层回答：**

- 本仓冻结的 Command Center 官方玩法数据在本次观察时仍与线上相同：版本仍为 `units=71 / cards=69 / rules=48`，26 个单位、37 张 Tactical Card、15 个 Rules Section，以及 10 个官方 Mission 和 10 个官方 Deployment 均未发现字段变化。
- 本仓不能表述为“完整的最新官方规则语料”。官方 [Downloads](https://starcraft-tmg.com/downloads) 已提供 `FAQ V1.0`，其服务器时间晚于本仓 2026-08-30 的冻结时间，但该 PDF 不在现有 source lock 中。

因此，准确表述应是：

> 当前冻结数据仍是本次观察时最新的 Command Center 官方玩法投影；它不是完整的最新官方规则语料，因为尚未纳入并核对 FAQ V1.0。

现有 lock 是有效且可复算的历史捕获，不应被静默覆盖。本次调研没有刷新、导入或修改任何产品数据。

## 时间、边界与方法

- 调研日期：2026-09-03（Asia/Shanghai）。
- 线上响应观察窗口：2026-09-02T20:16:25Z–2026-09-02T20:18:31Z，即北京时间 2026-09-03 04:16:25–04:18:31。
- 只访问一手来源：[官方产品站](https://starcraft-tmg.com/)、产品站直接链接的 [Command Center](https://sc.starcraft-tmg.com/)、同一官方域名下的规则下载与公告，以及 Command Center 自身配置所指向的 Firestore 项目。
- 对 Firestore 集合按 document ID 比较完整字段的规范化 JSON；对 PDF 和 Command Center 静态资源比较 SHA-256；对动态 FAQ 网页比较去除页面壳后的 7 项语义记录。
- 所有网络响应仅在系统临时目录中读取；没有执行仓库的 capture/import 脚本，没有写入 source lock、缓存、RuleAtom、生产房间或训练数据。

## 已确认事实

### 1. 一手来源链成立

[官方产品站](https://starcraft-tmg.com/) 把 “Game APP” 直接链接到 `https://sc.starcraft-tmg.com/`，并显示 Blizzard 与 Archon 的权利声明。[Command Center](https://sc.starcraft-tmg.com/) 自称 `BETA SYSTEM - ARCHON STUDIO` 和 `BETA v1.4`。其线上 [`firebase-init.js`](https://sc.starcraft-tmg.com/modules/firebase-init.js) 指向 Firebase project `starcrafttmgbeta`；下面核验的 [versions 文档](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions) 和集合均来自该项目。

这构成可靠的一手网站来源链，但不等于 Archon 对公开 Firestore 接口提供了稳定 API 合同或数字签名。

### 2. Command Center 版本与官方玩法记录未变化

线上 [versions 文档](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions) 返回：

| 字段 | 线上值 | 文档 `updateTime` | 与冻结值比较 |
| --- | ---: | --- | --- |
| `unitsVersion` | `71` | 2026-05-26T13:23:51.064119Z | 相同 |
| `cardsVersion` | `69` | 2026-05-26T13:23:51.064119Z | 相同 |
| `rulesVersion` | `48` | 2026-05-26T13:23:51.064119Z | 相同 |

完整集合 GET 均没有 `nextPageToken`。按 document ID 和完整 `fields` 比较结果：

| 官方端点 | 冻结数 | 线上数 | 线上规范化 SHA-256 | 结果 |
| --- | ---: | ---: | --- | --- |
| [`army_units`](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units?pageSize=1000) | 26 | 26 | `6fdb83d6d3eaecf8561f64f56bdfc9e0a8639ece6f9a0850b315fb2747a4525d` | 26/26 字段相同 |
| [`tactical_cards`](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/tactical_cards?pageSize=1000) | 37 | 37 | `18ab67fb67cf94100bdd1c9250c250e83f3e16a76d74e9a46d1545229a6ca455` | 37/37 字段相同 |
| [`rules_sections`](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections?pageSize=1000) | 15 | 15 | `24ab27652f49439cec87be672f22474121984b2107cb510c8a16e93fb714d973` | 15/15 字段相同 |
| [`faction_cards`](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards?pageSize=1000) | 193 | 194 | `072ade88741e16cd803c47192fb66ce226f31537644640d69b141df224b2dd50` | 官方 20 条相同；社区数据有漂移 |

`faction_cards` 的线上分类为：10 个 `mission`、10 个 `deployment`、130 个 `community_mission`、44 个 `community_deployment`。与冻结响应相比，新增的是一个 pending 社区 Mission，另有三个社区 Mission 只改变了 `upvotes`。没有官方 Mission/Deployment 字段变化。

所以 `71/69/48` 对“官方玩法投影”仍成立；它对整个可变后端并不是充分的内容版本，因为社区数据变化时该三元组没有变化。

### 3. Command Center 程序壳与既有四份 PDF 仍逐字节相同

本次重新读取了 [Command Center](https://sc.starcraft-tmg.com/) 页面、`script.js` 和其七个已冻结模块；九项内容 SHA-256 均与现有 lock 相同。页面仍显示 `BETA v1.4`。

现有 lock 中的四份 PDF 也都与官方线上字节相同：

| 官方文件 | 字节数 | SHA-256 | 线上 `Last-Modified` |
| --- | ---: | --- | --- |
| [Core Rules EN](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf) | 15,688,406 | `27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54` | 2026-06-09T13:09:11Z |
| [Protoss P2P](https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf) | 3,233,470 | `4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212` | 2026-05-07T12:34:26Z |
| [Terran P2P](https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf) | 2,609,994 | `afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c` | 2026-05-07T12:34:26Z |
| [Zerg P2P](https://starcraft-tmg.com/files/downloads/StarCraft-Zerg-P2P-Card-Sheets-A4_EN.pdf) | 3,465,781 | `6810f46ee422ac5d8f3cc169c3eda3ccb9551f01ab71a1f7e4ac8c266817b364` | 2026-05-07T12:34:26Z |

### 4. 现有 source lock 身份确实对应本仓冻结捕获

对 [`official-development-tranche-s75-111-source-lock-v1.json`](../../content/official-development-tranche-s75-111-source-lock-v1.json) 及其本地冻结字节执行现有只读验证器，得到：

| 身份 | 复算结果 |
| --- | --- |
| capture time | `2026-08-30T06:18:09.287Z` |
| source lock | `1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1` |
| Command Center snapshot | `8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105` |
| normalized dataset | `b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067` |
| versions | `71 / 69 / 48` |
| normalized records | 271 = 83 official product + 15 rule prose review-required + 173 community display-only |

三个哈希均可从仓库冻结内容复算通过，因此它们确实对应当前声明的 2026-08-30 捕获。它们是项目自己的内容寻址身份，不是 Archon 或 Blizzard 的签名发布清单。

### 5. 最新官方 FAQ PDF 不在现有 lock 中

官方 [Downloads](https://starcraft-tmg.com/downloads) 当前列出 24 个唯一英文 PDF 链接；现有 lock 只绑定上面的 Core Rules 和三份 P2P。下载页明确列出新的 [StarCraft-TMG-FAQ_EN.pdf](https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf)。本次观察值为：

- 文件标题/版本：`FAQ V1.0`；
- 5 页，333,711 字节；
- SHA-256：`eeeffb7a3a11f7616116bcd0e8fd5a437cd50c47c2454a3c865e32f34783e62c`；
- HTTP `Last-Modified`：2026-09-01T14:45:31Z；
- PDF 内部 `ModDate`：2026-08-27；
- 文本层共有 68 个 `Q:` 项，覆盖 Units & Characteristics、Measuring & Movement、Battlefield、Deployment/Entry Edges、Attack Sequence、Abilities/Tactics Cards、Keywords、Templates/Spillover。

服务器 `Last-Modified` 晚于 source lock 的 2026-08-30 捕获时间，而且该 URL 不在 lock 的 20 个来源中。这是“完整最新官方规则语料”不能成立的直接证据。

不要把这份 PDF 与 lock 中的 [网站 FAQ](https://starcraft-tmg.com/faq) 混为一谈：网站 FAQ 仍是 7 项产品/玩法概览，按现有规范化合同得到的语义 SHA-256 仍为 `e894f5f0a7da88776df7e399d2156acf69cc40284c1f231907f28dd990b0cd92`；`FAQ V1.0` 是另一份 68 问的规则澄清文件。

### 6. 没有观察到比 2026-08-23 更新的官方规则公告

本次读取的官方 [Rules news](https://starcraft-tmg.com/news/rules) 页面仍显示七篇相关条目，最新一篇是 [Immortal: Glory Through Endurance](https://starcraft-tmg.com/news/rules/immortal-glory-through-endurance)，页面日期为 2026-08-23。没有在该一手索引中观察到更晚的规则文章。

这只证明该索引在观察窗口中的展示结果；不能证明官方没有通过其它未公开或未索引渠道准备更新。

## 推断与工程含义

以下是基于上述事实的推断，不是官方声明：

1. **可以继续把现有冻结包称为“当前 Command Center 官方玩法数据”。** 本次逐记录比较没有发现单位、Tactical Card、Rules Section、官方 Mission 或官方 Deployment 漂移。
2. **不能称为“完整最新官方数据/规则”。** `FAQ V1.0` 已在线但未冻结、未拆条款、未与 RuleAtom 图做冲突和覆盖核对。
3. **社区漂移不应触发玩法规则替换。** 新增/变更均属于社区内容；现有官方玩法数据仍可保持 snapshot-pinned，但客户端若展示社区库，应使用独立的可变版本与信任标签。
4. **版本三元组只能作提示，不能作完整内容身份。** `faction_cards` 已变化而 `71/69/48` 未变化；房间、回放和训练真值仍需绑定内容哈希。
5. **如用户将来明确命令刷新，应创建新 lock 而不是修改旧 lock。** 新版应至少冻结 Downloads 清单和 `FAQ V1.0`，将 68 项映射到规则关系图并完成差异审核后，才可提升为新房间或训练数据的规则权威。

## 无法核验项

- 官方没有公开可验证的签名 release manifest，因此无法数学证明“全球绝对最新”；本报告只能证明上述官方端点在该时间窗口的状态。
- Command Center 没有公开 Firestore schema、collection 总表或稳定性承诺，无法证明四个已知集合就是全部相关后端集合。
- Firestore 集合响应没有 `ETag` 或 `Last-Modified`；本次通过逐 document 字段比较确认相等，而不是依赖 HTTP 版本头。
- 除 Core、三份 P2P 和 `FAQ V1.0` 外，下载页其余 19 份英文 PDF 本次只核对了目录存在性，没有重新完成全文语义分类，因此不能据此断言其中绝无额外规范性规则。
- `Last-Modified` 是官方服务器元数据，可证明该服务器对象的时间标记，不能单独证明文件正式发布日期或作者完成时间。

## 本次处置

- 不刷新产品数据；
- 不修改现有 source lock、snapshot 或 normalized dataset；
- 不改变历史房间绑定；
- 不把 FAQ V1.0 自动提升为 executable、production 或 training truth；
- 仅新增本调研文档，供后续显式 source-refresh ticket 使用。
