# Wave3、Wave4 单位媒体验收清单

2026-11-27 的 Wave3 2.99.12 已完成 45 个单位的网页媒体验收。见[人人对战候选和双席证据](../wave3-human-playtest.zh-CN.md)。以下为 11 月 24 日的历史基线。

归属为 T28-W3-15 及 Wave4 对应产品项。2026-11-24 依照 Wave3 与 Wave1 的[单位差分](../../../../build/ticket-28-wave3-assessment-20261112/normalized-diff.json)读取新增单位，按稳定 ID 查询现有[战场通讯目录](../../../../packages/client-domain/battlefield-media-catalog-v1.mjs)。表中结果仅表示媒体键解析。卡图、实际文件、显示和播放分别验收。

| 势力 | 冻结单位 ID | 当前解析的战场媒体键 |
|---|---|---|
| Terran | `auto_turret` | 待映射 |
| Zerg | `bile_launcher` | 待映射 |
| Zerg | `defiler` | 待映射 |
| Protoss | `high_templar` | 待映射 |
| Terran | `holo_decoy` | 待映射 |
| Protoss | `immortal` | 待映射 |
| Protoss | `nerazim_watchers__adept_` | 待映射 |
| Terran | `nova_assault_mode` | 待映射 |
| Terran | `nova_stealth_mode` | 待映射 |
| Zerg | `ravager` | 待映射 |
| Terran | `raven` | 待映射 |
| Terran | `sabotage_drone` | 待映射 |
| Terran | `siege_tank` | 待映射 |
| Terran | `spec_ops_marauder__marauder_` | 待映射 |
| Protoss | `tassadar` | 待映射 |
| Protoss | `twilight_templar__high_templar_` | 待映射 |
| Zerg | `vileling__zergling_` | 已于 11 月 26 日移除错误父级匹配，仍缺专属媒体 |
| Zerg | `zagara` | 待映射 |
| Protoss | `zeratul` | 待映射 |

## 卡图来源

逐条读取冻结写表器的 19 个新增单位文档，全部有单位身份和规则字段，均未随附图片地址。Expo 自带的 U71 目录仍是 26 个旧单位，本地导出的 26 个单位的 `frontUrl` 都为空。下一版须将实际可展示的卡图与冻结单位 ID 关联，并通过写表页面查看成图；复制规则数据本身不能证明图片已加载。Wave4 冻结时重新核对其原件中的媒体字段。

[Wave3 冻结单位文档](../../../../build/ticket-28-wave3-assessment-20261112/army_units.json) · [Expo 自带目录](../../../../apps/starcraft-tmg-expo/assets/data/official-product-catalogue-v1.json)

## 在现有产品中怎么验

1. 从军表进入双人工正式房间，检查数据库、写表卡图、战桌棋子，以及选中后的中立和动态通讯头像。对有两队同型单位、切换模式或由其他单位孵化的情况，用发布内的单位或模式记录绑定媒体。当前战桌绘制、选中面板和语音都用投影的 `unitId`。应覆盖不含单位名的自定义实例 ID；同一单位换房、重连后仍应显示正确。
2. 按发布渠道检查实际可用的语音。选中、确认、受伤、阵亡分别触发，核对事件归属、去重、静音和重连行为。使用有来源的共用声音要登记；无适用语音的衍生物须写明依据。现有公开默认资源与可使用原声的渠道分开验。
3. 战桌 BGM 沿用本地选曲。Web 与 App 分别验播放、暂停、循环、音量，以及响起单位语音后仍能继续播放。已有 Nova、Zagara 和 Zeratul 的副官头像可单独核对来源和用途；副官面板与棋盘须各自留证。
4. Wave3 保存逐项资源路径、来源、共用关系、桌面和窄屏截图及播放结果。Wave4 冻结后，以 Wave3 为基线生成新的增改清单，包含新增、改名、模式切换及可复用的资产，再执行同一产品验收。

[战场投影](../../../../packages/client-domain/battlefield-presentation-v1.mjs) · [Expo 资源入口](../../../../apps/starcraft-tmg-expo/lib/level3/battlefield-media-assets-v1.ts) · [战桌与播放](../../../../apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx) · [副官头像来源](../../../../content/characters/companion-portrait-asset-registry-v1.mjs)

## 已核实可供评估的英雄头像

Nova、Zagara、Zeratul 各有 6 张已登记的副官状态图。本次读取 18 个文件，SHA-256 全部与角色登记相符。它们可用于核对角色身份和通讯头像；单位模式图标、棋子与卡图仍各自需要实际绑定，在 Web 和 App 中查看。Nova 的隐身和突击形态分别验收。

| 角色 | 已核验状态数 | 来源 |
|---|---:|---|
| nova | 6 | [状态与文件](../../../../content/characters/nova-portrait-states-v1.mjs) |
| zagara | 6 | [状态与文件](../../../../content/characters/zagara-portrait-states-v1.mjs) |
| zeratul | 6 | [状态与文件](../../../../content/characters/zeratul-portrait-states-v1.mjs) |

## 现有单位语音可复用范围（2026-11-25）

核对开发渠道的原件，目前有 Marine、Medic、Goliath、Zergling、Hydralisk、Queen 六套，每套选中 2 段、确认 2 段、受伤 2 段、阵亡 1 段。42 个文件均有 Ogg 容器签名和非空内容。此检查只证明文件在库，实机播放留在各版本的产品验收。Vileling 当前误取 Zergling 的声音。逐个变体验证其游戏声音来源；若游戏原版确实共用某条语音，单列原始事件和证据。名称相似不足以认定共用。

实际客户端先检查单位的静态头像绑定，再解析动态头像和语音。仅增加目录键会导致两个端仍可能取不到整套素材。Web 由当前站点加载，原生端依赖配置的媒体或 API 地址；两端都要从选中同一个单位开始验到出图、出声。现有战桌从本地选择 BGM，语音和 BGM 各有播放开关，共用音量。

[语音原件目录](../../../../assets/client/battlefield/voice/development-internal) · [Expo 加载顺序与来源](../../../../apps/starcraft-tmg-expo/lib/level3/battlefield-media-assets-v1.ts) · [战桌播放事件](../../../../apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx)

11 月 26 日复核正式目录。Zergling 和 Roach 保留自身的媒体键，七个专属变体均不会误选父单位。各变体的游戏媒体仍需补充。[逐单位实际结果](../../../../build/ticket-28-wave3-catalogue-coverage/result.public.json)

## 两版都要在真实房间核对的声音事件

选中单位由点选触发。行动确认从权威回执取行动单位，受伤和阵亡从同一回执取受影响单位。两版各用一次“消灭最后一个模型”的场景，核对该单位从棋盘移除后仍能识别正确的阵亡声；再投递同一回执，确认声音只响一次。用双方不同兵种可以听出是否错误播放了攻击者的声音。战桌音乐单独选取本地曲目，在这一过程中检查播放连续性。当前为验收条件，尚无两版实机播放结果。[产品声音事件入口](../../../../apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx)

## 棋子游戏原件与虫族变体（2026-11-25）

9 月 S136 的战桌把游戏通讯头像按底盘轮廓裁切。原件渠道使用游戏动画及原声，公开静态备选另记。当前读取 WebP 容器，实际动画帧数为 Marine 76、Medic 75、Goliath 50、Zergling 75、Hydralisk 75、Queen 55。每种各有 7 个 Ogg。六套动画的来源文件均为 SC:R 的 HeadAnim。语音目录按 SC1 的 What、Yes、Pissed、Death 事件保留原件；客户端把 Pissed00/01 用于受伤提示。BGM 为玩家本地选择的游戏音乐，安装包未附经典曲目，战桌负责播放、暂停、循环与音量。

| 冻结兵种 | 实查的当前媒体 | 两版验收要求 |
|---|---|---|
| Zergling | 游戏动态头像及语音 | 保留基础兵种的绑定 |
| Raptor、Kerrigan Swarm Raptor、Swarmling、Vileling | 四个独立 ID 均缺本变体的动态素材 | 每种绑定可辨识的本变体游戏素材 |
| Roach | 静态备选，当前无原声 | 补游戏素材并验证播放 |
| Corpser、Vile、Roachling | 三个独立 ID 均缺本变体的动态素材 | 分别补图、核对声音及来源，Roachling 按衍生单位单列 |
| Ravager | 无战场媒体键 | 独立单位，单独补齐 |

旧本地网站有些文件按变体分别命名，但 Raptor、Kerrigan Swarm Raptor、Swarmling 三图字节相同，Roach、Corpser、Vile、Roachling 四图也字节相同。它们不能作为已有独立动态素材的证明。卡面或副官静态图都不能替代实际棋子动画。

Goliath 的默认授权渠道曾绕过现存 50 帧原件而选静态驾驶员。已去除该覆盖。用 Expo 真实资源解析函数、Web 和 iOS 两种平台参数、三个媒体渠道定点复验，六个组合均选中预期文件；这次未做设备画面或扬声器验收。

[九月棋子验收](../../../ticket-14-slice-136-web-static-browser-acceptance-2026-09-03.md) · [原始游戏媒体和音乐说明](../../../../content/client/battlefield-media-provenance-v1.mjs) · [当前媒体解析](../../../../packages/client-domain/battlefield-media-catalog-v1.mjs)
