# Ticket 23 / Slice 248 — 持久化快照复用 v18（隔离，未推广）

## 恢复决策

**正式三房继续共同 v17。v18 正确性门通过，性能准入未通过，保持隔离。**
后续性能推广遵循 [完整回合与 40% 门槛](ticket-23-slice-248-owned-static-geometry-and-input-capacity-v17-2026-10-11.md#后续性能版本准入完整回合与40门槛)。
当前 v17 从第 3 回合中途进入；第 3 回合余段不能充当一个完整同版回合。
本页的三次同快照读取不是正式中位/超长 case 队列，更不是三组整动作验收。

T23 33/36、T27 5/6，主线余 248/272/249/250，完整对局 0/12。

## 原因与隔离改动

SQLite 私有读取已有完整 cipher 比对和冻结快照复用；元数据写入后也会以
完整 envelope 文本比对保留同一对象。因此再添加一个 RoomStore 身份缓存
不是本次修复。真正未覆盖的边界在 Authority：规范化缓存只接纳当前 Engine
自己创建的 envelope，原生 SQLite 解码的递归冻结对象每次都重新规范化与哈希。

隔离源码：`../ticket-23-slice-248-authority-probe-v18-20261011/`。
第一项只改 `packages/authoritative-engine/transition-v1.mjs`：

- 首次完整规范化、完整状态哈希、MatchBinding/房间/Rules 绑定验证成功后，
  严格不可变 plain-data envelope 才按精确对象身份复用私有规范化结果。
- 每次仍检查 header、MatchBinding、房间、Rules 绑定；新对象重新完整验证。
- 缓存不接受可变、浅冻结、访问器、Proxy、可变内建类型或循环图。
  判定读取属性描述符，不执行 getter；向 Rules 返回私有结果的新克隆。
- 保持现有 Engine-owned 快照路径。捕获第一次成功验证，而非假定旧规范化
  幂等或缓存生产前态；不用 hash 标签、外部 verified 标志作为命中证明。

无生产主线源修改，无 Prompt/Skill/模型/规则数据/骰子修改，无 Room 重开。

## 具体复现与唯一 GREEN

脚本 `scripts/verify-ticket-23-owned-envelope-normalization-v18.mjs` 只读原 A
SQLite 捕获，复制完整房间行至内存数据库，禁止 create/commit/Provider。
原冻结军表和电子地图用于本地 Rules 依赖恢复；这不是创建或初始化新的正式房间。

首轮控制台异步收集不完整，随后恢复到已有落盘的 r69 结果：确实为三次
规范化/哈希。第二轮补落盘阶段与错误诊断后，r70 明确 RED（3 !== 1）。
GREEN 固定第二轮的完整 r70 行，不读取后来的实时局面作为对照初态。
只做一次 GREEN，exit 0；完整三个 LegalSpace 与 RED 逐值一致。
同一验证覆盖可变、浅冻结、访问器、Proxy 修改状态后的 SIGNATURE_INVALID。
0 Provider、0 原 Room 写；旧 GREEN/全量测试/构建未重跑。

| 同一 r70 快照读取 | RED 秒 | GREEN 秒 | 改善 |
| --- | ---: | ---: | ---: |
| 首次 LegalSpace（含本地枚举） | 13.023 | 23.862 | **-83.2%** |
| 第二次复用 | 2.849 | 1.684 | 40.9% |
| 第三次复用 | 2.357 | 1.595 | 32.3% |

规范化及完整状态哈希的调用数都由 3 降至 1。RED 两者累计 8.469 秒；
GREEN 4.428 秒。该累计不等于整个动作收益。并发原房负载、GC 与冷缓存
没有被控制，不能据此证明首读变慢全由代码引起；但也不能忽略这条更慢的
实测或自行放宽 owner 门槛。因此 **不推广、不声称整体性能改善或一分钟 SLA**。

本地依赖冷恢复 RED 120.197 秒、GREEN 190.426 秒单列，不计入在线动作时间。
本脚本并非线上新增步骤；正式对局继续使用现有常驻 Host。

## 证据与下一交付

证据根：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

- `authority-owned-envelope-v18-red/`：首轮已有 r69 完整结果。
- `authority-owned-envelope-v18-red-diagnostic/`：r70 RED、阶段日志及明确错误。
- `authority-owned-envelope-v18-green/`：唯一 GREEN、完整原行及三个结果。
- `authority-owned-envelope-v18-admission.private.json`：未准入原因及源版本隔离。

下一项是捕获完整同版回合，冻结按动作类型的中位、极长、短 case 对照清单；
队形比较的私有 clone 冻结复用已做下方唯一隔离验证，但未达到性能门槛。
大记录处理边界仍待处理。
已有正常动作显示 Preview/Apply/Replay 开销仍高，已有队形比较记录显示
关系图占候选比较的大部分时间；这些属于待实测假设，不冒充已完成修复。
没有新版本加载，没有费用清零、文件删除、新依赖或子代理。

## 实际 A71 队形比较：正确性通过，性能仍未准入

只读提取原 A r70 → r71 已付费、已接受动作的完整决策记录和四份队形
比较结果；使用同一 r70 状态、同一原生 Domain、原请求与原四份落点。
没有新建 Room、重新请求模型、重新执行已接受动作或修改地图/策略。
三个已保存 overview 图不是本次 baseline；本次按原搜索请求重建 baseline，
完整 graphHash 与原记录一致后才比较四个候选。

具体 RED 证明四个私有投影 clone 的静态底座 bundle/profiles 都失去冻结
属性，导致现有严格不可变复用路径失效；四份完整比较仍与原记录相同。
隔离 `packages/online-agent-session/legal-formation-search-v1.mjs` 仅在私有
投影位置规范化后递归冻结其 `officialModelBaseGeometryDataBundle`。
首次完整验证不绕过，调用方和投影的单位/lifecycle 数据保持原有可变性。

具体 bug 脚本 `scripts/verify-ticket-23-actual-A71-comparison-reuse-v18.mjs`
唯一 RED exit1 → 唯一 GREEN exit0。GREEN 四份完整比较分别与原已接受
记录及 RED 逐值相同，调用方状态及冻结属性不变，四份私有 bundle/profiles
均冻结；0 Provider、0 原 Room 写。未重跑上述 Authority GREEN。

| 原 A71 候选 | RED 秒 | GREEN 秒 | 改善 |
| --- | ---: | ---: | ---: |
| 1：包含实际可射击伤亡概率计算 | 30.348 | 45.916 | **-51.3%** |
| 2：没有该射击概率分支 | 2.206 | 3.210 | **-45.5%** |
| 3：没有该射击概率分支 | 2.507 | 2.685 | **-7.1%** |
| 4：没有该射击概率分支 | 3.910 | 2.874 | 26.5% |

四个候选工作量不同，2–4 不能当作候选1的暖缓存对照；它们也不是正式
按动作类型选出的中位/超长/短 case 队列。三组正式 Host 同时运行，负载
没有被控制，因此既不将全部差异归因于代码，也不豁免劣化或40%门槛。
两项 v18 候选均保持隔离，线上继续共同 v17。

证据仍在同一根目录的 `A/` 下：

- `actual-A71-formation-comparison-capture-v18.private.json`：准确前态与原完整查询。
- `actual-A71-comparison-reuse-v18-red/`：原完整结果及失去冻结的具体 RED。
- `actual-A71-comparison-reuse-v18-green/`：唯一 GREEN、完整输出及分段计时。

下一次性能推广必须等待 A/B/C 各一个完整同版回合（v17 的 R3 余段不算），
锁定同局面、同请求、同类型的中位/超长/短 case 后，中位和超长均至少40%
改善且所有被测 case 零劣化、完整结果一致，才在三组动作与截图闭合边界
共同加载一轮。证据不足或任一条件不满足时，继续现有线上代码。

## 第三个隔离候选：LOS参与者身份复用（不是性能通过）

仍只在 `ticket-23-slice-248-authority-probe-v18-20261011` 源码副本修改。
具体问题：LOS factory持有完整快照，但每次prepare都clone相同参与者，
原ownedCanonicalModelsByPiece按对象身份的缓存因新clone失效。
隔离修法：新clone和factory私有piece完整深值相同时才重绑私有身份；ID仅
定位比较对象，不作信任凭据。坐标/来源/支持面变化保持完整原验证。
调用方不变，原首次校验、所有1804地形证据、完整native LOS结果不删减。
生产LOS源与v17副本仍完全相同，隔离候选未加载。

原A71捕获的Goliath单模型和Swarmling18模型，一次具体诊断循环：

- 首次20756的夹具误把草丛当ordinary LOS输入，未到复用bug就拒绝；这是
  夹具错误，不是运行时缓存RED。改用生产native草丛适配器，保留全部地形。
- 22142真实RED：相同两次query准备19→38，明确复现身份丢失。
- 隔离修复后的唯一22866 GREEN：19→19，完整LOS结果与RED逐值一致，
  同ID换来源仍拒绝，原caller状态不变，0Provider/原房写。

仅证明重复准备次数减少50%，**没有测墙钟，不能宣称40%提速、完整性能
队列通过或推广**。三次已收敛，不重跑这个GREEN。
证据在同一根A下 `actual-A71-los-participant-reuse-v19-red/`（夹具失败）、
`...-native-adapter-red/`（真正RED）、`...-green/`（完整结果保留）。
原三房后来C81的Planner方向误判发生09:48Z，早于本探针；它需要单独
正确性修复，见C81 threat-direction correctness v35报告。
后续仍等各组完整同版回合，再按类型配对中位/超长/短case，全部完整一致、
无劣化且中位/超长均≥40%才共同换性能代码。局部准备计数不代替该门槛。

## Harness 记录

### 已有计时进一步归因与只读完整回合取样

A71 候选1的唯一 GREEN 原日志显示：投影准备2.572秒、关系图8.450秒、
静止火力34.407秒。静止火力中的 native ranged batch 准备26.653秒
（当前线程 CPU8.322秒），一次概率估计6.632秒（当前线程 CPU2.597秒）。
该次估计内216次骰子池累计0.404秒、5个按伤害复用的伤亡域0.072秒、
2个战略损失/站点控制投影3.551秒、反应机会2.180秒。
这些是原日志包含关系，不可重复相加成整动作时间；墙钟与当前线程 CPU
的差值也不等于已证明的操作系统等待时间。

准备阶段133个 attacker/target/profile 上下文键全都不同，仅12个构建成功；
不是133次同一请求重复。原生枚举的完整 target enum 和 disabled diagnostics
也是原输出的一部分，不能仅为了提速删掉非所选目标后宣称完整结果一致。
现有 native概率批次已经拥有自己的完整冻结快照；live decision port 已有
hotRecords 和冷条目压缩缓存，所以再次给这两处加同类缓存不是已证实修法。
下一隔离优化重点：精确视线准备中跨调用参与者复制/校验、完整地形证据
组装，以及模型对任务点控制的精确损失投影。保留模型输入、采样量和结果。

新增离线 `scripts/collect-ticket-23-complete-round-performance-cohort-v1.mjs`：
原 room.sqlite 只读，使用原 codec 解密 journal；检查接受后缀 revision/stateHash
连续至数据库截点，用权威 pre/postGameClock 识别下一完整回合的进入与退出。
用原 journalHash 对齐原动作 Replay/状态与桌面/控制图；完整同版回合才按
动作类型+查询类型选 short/lower-median/extreme，失败/unknown 单独保留。
只记录已有 local-query 墙钟，不推断模型或整动作耗时、不读取全部大决策库。
输出始终不是推广许可证：完整初态/请求/结果捕获、后续配对性能与一致性
证据仍要另行完成。完整回合取样是下一环节，不用 R3 余段凑数。

首次实际观测 PID10437 一次exit0，原房 A75/B82/C80，三个接受后缀都连续，
完整同版回合0/0/0、推广false；没有运行 Rules、模型、动作或性能 case。
完整回合完成分支尚未触发，不声称它已正式验收。
产物：`complete-round-baseline-observation-v17-2026-10-11T094339279Z.private.json`
及其独立 stdout/stderr，位于前述证据根。七原进程09:35实际确认存活；
09:44:51Z A75/B82/C80累计135/160/171、463/502/495图，均R3Movement，
含祖先估费¥168.661524/227.755944/196.046948，原共同v17、无新all-stop。
观察 Timeout 保留，不因此重复派发或初始化房间。

`harnessLoopUsed: true`；目标 StarCraft TMG。正式 selfplay Planner/Action、
Rules 查询、原双席记忆和 UI 回执均维持现状。此次验证调用原生 SQLite
owned-read / Authority LegalSpace 以及原生队形比较，不启动决策或新增记忆写入。
`eligibleForTraining: false`；完整结果不一致、任何 case 劣化或完整回合不足
均保持隔离，不把局部正确性 GREEN 当作推广许可。
