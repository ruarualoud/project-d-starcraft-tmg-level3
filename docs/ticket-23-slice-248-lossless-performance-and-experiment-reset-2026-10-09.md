# S248 — 策略无损性能修复与受控实验重排

## 状态和用户决策

- Ticket 23：33/36；Ticket 27：5/6。原主线仍余 248、249、250、272 四片，完整对局 0/3。本文不关闭 Slice。
- 用户要求先确认 ABC 的真实差异、先修一分钟性能，再共同启动新实验。旧局保留为工程诊断证据，不冒充受控策略比较。
- 新矩阵为基础、种族/对手交换、换地图、同图换起始位置四种条件，每种 ABC 三组。A 固定表加适用计划，B 从头写表加适用计划，C 与 A 同表但无赛前计划。A/B 每个条件重新生成、审核计划。
- 对手要求能力/流程一致，不要求同一份具体赛前计划。新矩阵统一不给对手额外赛前计划，保留同一固定表、Skills、模型、Planner、工具与局内记忆能力，允许其自由反应。原 A 对手无计划而 B/C 有计划是实验配置混杂，不是规则错误。
- 只做保持完整策略输入、候选、采样和结果的计算/IO 优化。若这些优化无法达到目标，先向用户给出实测瓶颈和方案，不擅自削减策略。新十二局费用范围尚未单独确认，不解释为十二局各获 ¥200；原 ABC 各 ¥200 累计账不清零。

## 真实差异和停点

共享 build：`build/ticket-23-three-arm-official-standard1-20261008-v1`。

1. `ABC-actual-config-and-core-performance-20261009.json` 比较实际初始权威状态。A/C 军表、编成、升级相同；三组对手军表/编成/升级相同。官方任务、部署、规模、底盘、LOS 和资源预算相同。
2. `ABC-initial-nested-difference-20261009.json` 消除了粗比较歧义：board 仅三处房间冻结/manifest 哈希不同，地形和地图几何没有不同。B 的嵌套 gameplay combat bundle 选择了 Marauder 而非 Raynor，符合其不同军表，不能把数组位置变化当成官方数据漂移。
3. 同一仓库代码不等于相同驻留源码：旧 A/C Host 和新 B Host 的加载时间不同。新受控实验必须使用同一源码版本和统一入口，不能混用旧驻留进程宣称对照一致。
4. `ABC-user-performance-boundary-stop-20261009.json` 记录只停止本次三条 Web 派发器的确切 PID（67697/42497/21766），不关闭 Host，不取消已发请求，不改房间。
5. `ABC-performance-stop-drained-observation-20261009.json` 于 09:58Z 读取实际数据库：A39/R1 Assault，B162/R3 Movement，C128/R2 Assault；六席 Bot 均无 inflight，Provider 无 dispatched。它是只读收口观察，不是终局、完整策略验收或三份全历史重验。
6. B161 同房 FULL before/ready 连续性已由 41584 一次通过：初/现态和全部 143/178 Paid 相同。B 随后真实推进到 162；不能再说 ready 待取，也不能把恢复本身 0Provider 扩张成后继动作 0Provider。

## 性能尚未达标

每组最近 20 条有 Apply/Replay 的模型动作，已记录核心操作耗时中位数：

| 组 | 核心 P50 | 核心 P95 | 超过一分钟 |
| --- | ---: | ---: | ---: |
| A | 274.651 秒 | 577.735 秒 | 20/20 |
| B | 354.781 秒 | 790.238 秒 | 20/20 |
| C | 498.223 秒 | 1692.645 秒 | 20/20 |

来源为上述实际配置/性能 JSON。口径是已记录操作总和，不包含所有 Web/存储开销；同一 revision 的失败尝试可能被累计。不是暂停时间差计算的用户墙钟，也没有把 Agent 内的 query diagnostics 再重复加进去。

现有异步队形、批量概率、伤亡基线、Replay 前缀复用已接入；不重复实现或重复跑其旧绿门。仍存在队形查询 342 秒和多轮 Planner/Action、Preview/Apply/Replay 等瓶颈，不能凭一个内核加速宣称整次行动达一分钟。

## 本次已完成：火力交换消费现有概率批次

具体缺陷：`currentAttackEstimates` 按每个 domain/target 调独立概率入口，重复枚举相同 side/snapshot 的合法射击；已有批次接口在其他路径可用但这里未消费。

- 新具体回归：`scripts/verify-ticket-23-fire-exchange-shared-probability-batch-v1.mjs`。
- 68045 实际 RED：捕获 C82 的真实冻结数据和完整 1804 地形，仅本地隔离一模型 Marine 与两个真实敌军目标。普通 fire-exchange 入口两次枚举，要求一次失败；原完整输出保存到私有 baseline。
- 生产修改：`packages/online-agent-session/combat-estimation-runtime-v1.mjs` 的查询内 Map，按 side 懒创建已有不可变概率批次；每个目标仍独立计算全部骰子/损失，筛选、排序、错误条目和请求预算不变。缺 side 的非法旧 domain 保留独立校验，不猜席位。
- 70470 唯一 GREEN：两次变一次，完整输出 deepEqual（概率、伤亡、unknown、所有输出哈希），输入哈希不变，两个目标均成功，0Provider/0原房写。
- PreciseCoverage 的 57.997→45.564 秒带插桩/去优化，不作为正常性能认证，亦不是全局策略效果证明。已通过命令不重跑。

## 本次第二处已完成：射击 Apply 内部枚举复用

这里的“又一处类似重复”是工程重复计算，不是两局画面相似，也不是缩点策略。一次射击 Apply 已调用合法枚举完成状态/来源校验并找出 domain，接着公开实例化入口又枚举相同未变化状态。后续真正的 chance、过期动作比较、伤亡和写入不是这些重复扫描，仍须执行。

- 新具体回归 `scripts/verify-ticket-23-ranged-apply-enumeration-reuse-v1.mjs` 使用 C82 完整 1804 地形的本地隔离案例：未命中正常射击序列和命中后的防守方伤亡选择，另保留修改动作计划哈希必须拒绝的检查。
- 80850 实际 RED：两个 Apply 总共枚举 4 次，要求每次一次、总计 2 次失败；原完整两个后态/事件/骰子保留到私有 baseline。
- `official-selected-roster-ranged-action-runtime-v1.mjs` 仅 Apply 内保留第一次枚举，传给已有私有 `instantiateRangedFromVerifiedState`。没有外部 prepared-facts 参数或旁路，没有跳过 exact action 比较，没有跨状态缓存。
- 82100 唯一 GREEN：4→2，完整原输出 deepEqual；正常射击、defender-owned pending choice、过期动作拒绝、输入不变均通过，0Provider/0原房写。插桩耗时有波动，不能只按枚举次数声称真实延迟降幅。

## 并行查询边界

用户询问工程查询分组/多线程。实际 `runNativeToolCalls` 和 `runQueries` 仍逐条 await；队形比较内部已有工作线程，不是所有查询都已有并行。独立只读请求可按同一冻结 authority 批次共享局面，CPU-heavy 可进入工作线程，IO 用异步并发；依赖前一结果、假设分支、最终参数实例化与 Apply 不能盲目 Promise.all。仍须保留原顺序返回、失败/unknown、权限和 revision 变化保护。当前只是确认了实际串行点，尚未声称已完成多查询分组并行或一分钟验证。

### 10:37Z 新完成：共享查询入口按需转换 Viewer

上一条用户澄清的回复只有说明，没有新的源码进展。本轮按诊断与 Harness 技能继续一个独立、实际可复现的性能缺陷，不绕过下面并行验证的三轮停点。

- 具体来源：`spatial-action-query-runtime-v1.mjs` 在检查 completed cache 和 queryKind 之前，调用整份 `projectStarcraftTmgViewerStateShapeV3`。委托查询只消费 Rules adapter 的权威回执，从未使用这份转换；缓存命中、unsupported、参数无效也不需要转换。既有 authority 校验、snapshot rotation 和 cache key 仍先执行。
- 新具体回归：`scripts/verify-ticket-23-query-lazy-viewer-projection-v1.mjs`，真实 C82 冻结局面、完整 1804 地形和真实 Room-backed 关系图；与直接底盘测距、重复缓存、unknown、LegalSpace 变化及过期 observation 一并覆盖。这是共享 Runtime 调用入口的缺陷，不是虚构图结果或独立替代实现。
- 13069 RED（10:36:13Z）先成功产生实际关系图和精确测距，完整 baseline 写入私有文件，然后因 `UNUSED_WHOLE_VIEWER_PROJECTION_FOR_DELEGATED_OR_CACHED_QUERY` 的 4≠0 失败。不是夹具/Authority 不通。
- 生产只移动 Viewer 转换到已验证参数、未命中缓存的 direct geometry 分支。14072 唯一 GREEN（10:37:04Z）exit0：不需要的转换 4→0，直接 fresh+cached 转换 2→1；新的 LegalSpace 仍重新转换一次。完整原关系图/测距/unknown/authority/所有 receipt 哈希 deepEqual，两个输入哈希不变，旧 cache 仍只加载一次 Room，stale observation 仍拒绝。
- 本次 0Provider、0原房写、¥0、trainingTruth=false；没有改 Prompt/Skill、候选、采样、权限或骰子。插桩耗时 1646→1501ms 仅该窄案例，不声明整次行动已达一分钟；不重跑此前任何已通过门。

### 并行夹具三轮停止，不能把它计作生产 RED 或 GREEN

`verify-ticket-23-live-readonly-query-batch-v1.mjs` 的三个已结束探针：99601（缺 observation authority）、820（补 authority 后仍未到后继请求）、3731（实际 Viewer shape 后明确 `prompt_artifact_too_large`）。三轮均未达到目标并行断言，已按用户收敛规则停止，不偷偷第四次。

来源已查明：测试使用 standalone artifact store 默认 512KiB，而真实 `live-opponent-provider-stack-v1.mjs` 显式使用 8MiB。第三轮三条不同查询确实计算完成/加载三次，后继本地模型请求在 artifact put 被挡；这不是实际 Provider 不通、生产容量失效或模型策略失败。另外正式 choice 已按 receipt hash 去重，四条工具请求应保留四条工具回复、只存三条唯一回执，原夹具错误地要求四条存储回执。

已只纠正该测试源码为真实生产的 maxArtifacts8/maxBytes8MiB 和三唯一回执、四工具回复、第一/四回复相同数学证据；**没有执行修正后命令、没有生产 batch 实现、没有声称完整查询并行**。保留三次 exit/stdout/stderr。若用户允许这一个明确夹具停点续验，再取得有效 serial RED 后实现并只验一次完整 parity/真实 worker 重叠/最终 authority freshness。既有局面缓存已经存在，不另建第二套。

### 10:52Z 用户批准一次定点红绿，查询间 Worker 批次已通过

以上是 10:37Z 的真实历史停点；用户随后明确批准这一个停点的有效复现及修后一次验证，不解除其他收敛规则。

1. 20149 授权 RED（10:43:20Z）：普通 Live `preflight → openMatch → decide → native tools`，实际 Room-backed graph /完整 1804 地形；四个工具请求/三唯一回执/两个本地 supervisor 调用均成功到达预期诊断边界，然后因 `LIVE_PLANNER_INDEPENDENT_QUERIES_STILL_SERIAL` 失败。worker0、Room加载3次，完整 baseline 保存。`LOCAL_PROBE_END_NO_EGRESS` 是本地第二个模型夹具故意停止，不是原房或真实 API 错误。
2. 生产实现：一个浏览器安全的只读查询分类合同；独立 CPU Worker 池与纯查询 Worker；Room Adapter 按完整 authority 分组，从 Store 获取/复制一份完整冻结 Rules state，结束时重新读 Store 比较 revision/state/binding；私有 owned-snapshot 入口不向 caller 暴露。Worker 仍调用同一实际 Adapter/pure Rules 函数，不另写概率/图算法、不传 journal/seat grants/Provider/凭据。工作线程上限4，结果按请求索引还原；传输失败只对缺失只读结果使用同一函数/同一快照恢复，不重发模型请求。
3. 共享 Runtime 在旧 authority/domain 校验和已有完成/inflight 去重之后，把连续的独立请求批量送入 Adapter。普通 Live native-tool 与 JSON-query 路由共用这一批次；保持工具消息、warnings、回执顺序，四条请求仍四条回复、三唯一数学回执。Skill/记忆、formation、branch、最终实例化和 Apply 不进入 CPU 池；不存在把依赖一股脑 Promise.all 的通路。
4. 真正人机与机机共享 fixture 的两席 `rulesQueryBatch` 和独立 backend diagnostics 已接线；不是只添加一个测试专用 pool。旧驻留 Host 没热替换，这个代码接线不冒充实际 Web 新源码加载或完整人机验证。
5. 30361 唯一授权 GREEN（10:52:15Z）exit0：三个实际 Worker ID、计算区间重叠；Room读取3→2（初读/终核）；四条工具回复及完整 result/order/geometry/authority/receipt hashes 与串行 baseline deepEqual；输入未改，期间 revision 变更的两条查询均返回 High/unknown `RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION`。0Provider/0原房写/¥0/trainingTruth=false。仅关系图实际并行案例，本门未在 Worker 中逐种认证攻击概率/火力交换/传输恢复。

插桩窄流程 7297.515→5574.720ms；串行主线程受 PreciseCoverage、Worker 未被相同插桩影响，因此不能宣称无偏加速百分比，更不是一分钟整行动结果。已有已通过门没有重跑，原 ABC 房间、费用、截图、记忆和 paid 历史未动。

用户随后问三类计算“本身”内部拆分：本次完成的是**不同查询之间**的 CPU 分组。三类都已列入同一池，但**单条大查询内部**按独立关系/攻击池/目标拆分仍是 S248 的待办；必须先核对依赖、共有前处理、确定性采样和合并顺序/哈希，不切骰子或删除模型/目标，不构造 nested pool 争抢。下一步同时查权威存储链路，不用这一小批次替代全行动目标。

本次并行 source diff（同 S248，不新增 Ticket）：`readonly-query-kinds-v1.mjs`、`readonly-query-worker-batch-v1.mjs`、`readonly-query-worker-v1.mjs` 新增；`room-backed-spatial-rules-query-adapter-v1.mjs`、`spatial-action-query-runtime-v1.mjs`、`live-flash-decision-port-v1.mjs`、`scripts/support/ticket20-human-agent-demo-fixture-v1.mjs` 定点接入；唯一具体回归为上面已停止/授权续验的 Live script。独立诊断不进入模型回执，异步观察失败不能更改事实。旧局/源/冻结数据没有重签或重初始化。

### 从已有记录分出非 Agent 耗时，不重新跑对局

对已存 `ABC-actual-config-and-core-performance-20261009.json` 的同 20 条/组，只做 `recordedCoreMs - operations.agent_decision` 算术：A/B/C 非 Agent 核心中位数 120.081/113.983/143.654 秒，19/17/18 条单是该部分已超过一分钟。查询时长本身在 Agent 内，不能再加总到整行动。来源含旧 Host epoch、同 revision 的失败累计与原机器竞争，不是新加载性能基准，也不能把 Agent 减 query 余额说成纯模型等待。

这改变下一优先级：独立查询并行不是唯一瓶颈；Preview/Apply/Replay/RoomStore/合法枚举也要沿当前实际入口逐项剖析。仍只修无损重复工作，不能用跳过 Apply/Replay 或减少策略推理实现虚假的一分钟。

只读分析已有 C78/C82 CPU profile（不是重跑 profiler）：C78 的1485 samples中 GC421、Authority clone222、legacy rules deepClone201、RoomStore decode86；C82 的1274 samples中 idle356、GC224、Room clone140、decode99、Hosted Bot clone86、Viewer clone53。原 profile 文件保留，采样包含旧源码和当时竞争，不能算当前优化后的时间百分比。当前 `referee-crypto-v1.mjs` 已具有无路径字符串的正常 canonicalizer，不能重复实现其旧优化；下一实际反馈环应针对 Room/Authority 克隆与解码的重复调用及大查询共有前处理，先具体复现再改，不移除验签/Replay 或接纳外部 prepared state。

### 11:17Z 原生房间解码重复工作已消除

实际正式 Web Host 和 SQLite/PostgreSQL Adapter 均使用 `createStarcraftTmgPrivatePayloadCodec`。Store 每次仍读取最新持久密文，但原生 codec 对同一未变 aggregate 每次都重新解析密文、AES-GCM 解密。它不是可省略的新记录鉴权，也不能用 stateRevision 缓存：seat/control/recovery 更新可以保留同一 Rules stateRevision/stateHash。

- 新具体回归 `scripts/verify-ticket-23-room-aggregate-decode-reuse-v1.mjs`：捕获 C82 完整 1804 地形与实际约 14MB aggregate，导入一次性内存 SQLite，通过普通 `RoomRuntime.readRoom → SQLite RoomStore → native codec` 读取 public、P1、P2 三个完整视图。只替换本地 bearer fixture，保留 captured grant IDs/权限/Rules；不是原 grant/recovery/lease/Apply 验收。用原生 `Decipheriv.setAAD` 计数，未替换解密结果。
- 50362 有效 RED（11:11:35Z）完整读取及隔离检查已成功，baseline 已保存，最后 `UNCHANGED_ROOM_AGGREGATE_REPEATED_AES_DECRYPTION` 断言为 3≠1；不是夹具或权限失败。
- 唯一生产修改是 `packages/room-store/room-store-v1.mjs` 内部的 validated JSON text LRU。cache 按固定 codec/key 的 AAD 身份加完整持久密文匹配，每次返回新 `JSON.parse` 对象，不共享 mutable aggregate；密文变化先丢旧条目再执行原全部 metadata/AAD/key/tag/JSON 校验。只有成功验证的 aggregate string 被复用；journal/initial-envelope/custom codecs 不自动套用。上限4条/64MiB encoded+plaintext UTF8计量，超出只走冷解码，不拒绝合法房间；这不是物理堆内存上限。可用 `cacheAggregatePayloads:false` 单独关闭优化，不更改描述符/Store六方法/CAS。
- 55704 唯一 GREEN（11:16:52Z）exit0：重复解密 3→1，三份完整原视图 deepEqual；public/P1/P2 私有卡资源隔离、caller/replay currentAggregate 对象改动隔离、同 stateRevision 的 control 更新、密文 tag 篡改拒绝、其他房间 AAD/错误 key 拒绝、恢复有效密文及 opt-out 两次冷解码均通过。capture/本地fixture未变；0Provider、0原房写、¥0、trainingTruth=false。
- 窄完整回归 6063→5066ms 包含各种安全/ownership检查和 baseline IO，不是用户完整行动基准，不报告无偏百分比或一分钟达标。旧通过门没有重跑。驻留 Host 没有热换源码，当前不能声称线上已消费此优化。

### 单条计算内部的分组方案（源码确认，尚未实现/验收）

用户再次问关系图、攻击“频率”及火力交换本身能否多线程。若指的是 `attack_probability`，其数学含义是攻击概率/伤亡分布；武器印刷 Rate of Attack 本身是取数，不需要线程池。

| 计算 | 可独立分组 | 必须保持的依赖/合并 |
| --- | --- | --- |
| 关系图 | subject-target 单位对的完整底盘几何/LOS；单位-任务点；每单位 clearance | 先汇总全部 pair minimum 才能给 engagement 的全局 gap proof；共享完整 engagement 与特殊地形 LOS 上下文，最后按原顺序/优先级排序，再执行原 maximumRelations 与生成全局哈希 |
| 攻击概率 | 优先完整 domain-target 任务，各任务使用原完整样本/Rules resolver | 每 side 固定快照和合法枚举准备只做必要次数；不同攻击结果按原顺序收回；单攻击再拆样本时必须先保留原确定性随机流、原样本索引与首次出现的伤亡选项顺序，不让 worker 各自重置 seed |
| 火力交换 | 完整当前关系图与各合法攻击估计是独立前驱，可并行；各 domain-target 可进一步排队 | 收齐 graph 和 attacks 后才选 bestAttack、排序并生成 alternatives/estimateHash；不把 opponent next LegalSpace 的 unknown 变成零，不合成未经合法预演的敌方反击 |

真实代码中 `sampledReveals` 使用连续有状态 xorshift 随机流，`lossStateCounts.selectionExamples` 按出现顺序保留原前12项。因此不能直接每线程“重新随机采一份”、先按各分片截断再任意拼接，也不能对每一组调用完整 graph 后相加（会改变 scope/全局 proof/排序/receipt）。用原完整任务优先于拆一个骰池，风险与搬运成本更低。

实施应让查询间和查询内任务服从一个可观测 CPU 调度预算，而不是每个外层 Worker 再起4个子池；当前 query-batch 是每批最多4，尚不是所有 formation/query/room 的统一全局预算。小任务串行/批量，足够重的纯任务进工作线程；`Promise.all` 不能把同步 JS 数学循环变成多核计算。每 worker 使用自有不可变数据/局部缓存，不并发写共享 Map，按原任务索引稳定合并，最后仍核对最新 Room authority。线程调度/IPC诊断不进入模型事实。

交付顺序：已有重复解码收口 → 内部火力组合任务和关系图依赖分组的具体复现/定点改动 → 仅本次相关完整输出/哈希一致性验证 → 新源码正式完整动作计时。是否达到1min要用实际结果，不凭线程数量推断；这些内部分组目前只是明确设计，不计开发完成或新关闭 Slice。

### 11:43Z 单次火力交换内部 Worker 任务完成，稳定性能仍未验收

上一 goal turn 分类为 progress：原生重复解密有生产修改和实际红绿证据，不是状态复述。本轮保留原完整目标、先完成可复现的单查询串行缺陷；没有重初始化/续派原房、重跑旧通过门或开始新付费对照。

- 65550 有效 RED（11:27:05Z）：新增具体 `verify-ticket-23-fire-exchange-inner-workers-v1.mjs`，普通 Room Adapter `queryBatch([fire_zone_exchange])`，捕获 C82 完整1804地形、实际Marine与两个实际目标的本地假设。完整成功输出/baseline保存后因 `SINGLE_FIRE_EXCHANGE_GRAPH_AND_ATTACKS_STILL_SERIAL` 失败；actual Worker0、任务0，elapsed17,884.750ms；初/终Room读取2，0Provider/0原房写。不是夹具/来源错误。
- 生产 `combat-estimation-runtime-v1.mjs` 抽出同一筛选、预览验证和最终汇总函数，保留原同步入口。内部 work compiler 在父进程使用已有 native preview batch，按 side 共享准备并生成完整 graph任务及每个 domain-target 的完整攻击任务；Worker仍调用同一 `estimateAttackProbability`、原连续RNG、全部骰子/Rules/伤亡后果，未拆样本、未改变前12例顺序，局部 casualty batch 不跨快照。错误保留为原 failure条目或 graph typed error，不把 Rules失败当成传输故障。
- `readonly-query-worker-batch-v1.mjs` 把查询间和火力查询内任务先扁平化进同一每批最多4的池，稳定索引回收后汇总原完整结果；未完成的纯传输结果才本地恢复。Worker不创建子池，旧式完整fire消息拒绝进入嵌套池并由原本地恢复处理。它仍不是多房间/formation全局线程调度的完成证明。
- `room-backed-spatial-rules-query-adapter-v1.mjs` 用私有 owned-result closure完成相同响应包装；外部请求不能提供可信preview/aggregate/result。公开 `.query` 单条fire与 `.queryBatch` 走同一工作计划；无效authority回原验证而不递归。结束仍读取实际Store检查state/binding。Worker只持完整冻结Rules state，不带journal/grants/Provider/密钥。
- 71259 唯一 GREEN（11:33:08Z）exit0：3实际Worker、3任务计算区间重叠，ENTIRE原Adapter响应/graph/probability/loss/casualty选择/全部哈希 deepEqual；直接单查询响应也相同，计算期间另席revision变化返回High/unknown，输入/capture未变，0Provider/0原房写/¥0/trainingTruth=false。该命令没有再次执行。

**功能一致性通过不等于性能通过。** 上述第一请求36,929.485ms，对原17,884.750ms更慢。证据必须保留，不能只报道并行成功。该运行没有分项记录，无法追溯性断言它一定是冷启动、GC、机器争抢或任务算法导致。

针对已观测退化，只新增非模型诊断字段：work planning起止、dispatch时间、Worker kernel起止/任务种类。没有改Prompt、回执、候选、样本或成本控制。一次独立性能观察不是重跑刚通过的parity门；首77112在执行前因inline shebang失败，0计算，修正内联文本/模块路径后78530一次成功，保留两个launch/exit/log。生成 `build/ticket-23-three-arm-official-standard1-20261008-v1/fire-exchange-inner-worker-phase-observation.json`：

| 阶段 | 本次耗时 |
| --- | ---: |
| 本次完整单查询（非完整 Agent 行动） | 14,258.654ms |
| 公共work准备 | 2,413ms |
| graph Worker kernel | 1,037ms |
| 第一个attack Worker kernel | 4,883ms |
| 第二个attack Worker kernel | 11,106ms |
| 各job派发→kernel开始 | 164–173ms |

Worker耗时重叠，不能相加当作整查询时间。这个新观察没有重复执行概率/哈希一致性断言、没有新LLM请求；成功响应/graphHash/estimateHash已记录。它表明**这一次**最长单目标概率/伤亡kernel是critical path，冷启动派发不是主因；不能用单次14.26秒推断稳态加速率，或据此解释上一36.93秒全部差异。稳定性能尚未验收，旧驻留Host没有热载这些源，不得把这些局部证据当作正式Web/完整人机/1min通过。

本轮具体diff：4生产文件（combat、Room Adapter、readonly pool、Worker），1个具体串行缺陷回归，3份本地launch组（有效RED/唯一GREEN、性能观察首失败与修正成功）；文档/CURRENT_WORK/rootTASKS/PROJECT_MEMORY。普通关系图内部的model-pair拆分、单攻击内部的计算分组仍未完成；现在火力组合的图和完整攻击已能并行。后续以实际critical path为准，避免再把已很短的graph分组当成主要收益。下一步定位最长伤亡kernel可共享/重复的工作及实际完整行动的剩余瓶颈，保持全部策略材料；性能不能无损达标时需与用户讨论，不静默删减。

### 12:00Z 最长概率 kernel 的重复整局复制修复

上一 goal turn为progress：火力单查询内部任务确实修改正式共享入口，完整原输出及并发revision保护通过；时延波动不包装成性能通过。本轮按diagnose/Harness继续查询内部实际数据复制，原20地图/固定表计划对照/稳定2000写表目标保持，不以局部CPU门关闭整片。

来源：`strategicLossOption` 为每个选择先调用 `casualtyProjectedState` 做完整state clone计算tacticalMass，随后 `missionMarkerControlConsequences` 再做同一个损失后state clone；`projectMissionMarkerControl` 只要把根phase临时设cleanup又完整clone。已有 `createOfficialSelectedRosterCasualtyStrategyBatchV1` 本来已经deep-clone/deep-freeze一份私有快照并缓存相同选择，不能把这个既有所有权重复实现或移除。

1. 新具体 `verify-ticket-23-casualty-owned-state-copy-v1.mjs` 使用同一个C82捕获本地假设、完整1804地形、实际当前6模型Raptor和C14目标domain，执行原概率batch/真实Rules/36原样样本。6是捕获存活数，不是把18模型上限改成6。全概率输出直接对比上一保存的完整原fire响应，不重跑旧fire门。只包装native `structuredClone` 统计具有完整board/pieces/officialCombatBundle的复制，实际返回仍由native原函数产生；按调用栈区分来源。
2. 89834有效RED（11:52:33Z）：完整原概率/伤亡/哈希相同、capture/输入不变，7种真实loss examples中损失后state整局复制14、marker helper复制8、marker Rules内部复制8、其他14；最后因 `OWNED_CASUALTY_CHOICES_REPEATEDLY_CLONE_WHOLE_RULES_STATE` 的14≠0失败，非夹具/数据失败。窄耗时17,638.342ms。
3. 唯一生产文件 `official-selected-roster-ranged-action-runtime-v1.mjs`：只在已有private prepared batch路径，损失后状态用copy-on-write root/pieces＋只克隆受损Unit、freeze新分支；完整不可变原terrain/catalogue/其他Unit仍在，不删除任何数据。tacticalMass和marker共享这一相同后态。marker helper仅在私有owned路径浅复制根设置cleanup，真实Rules resolver依然做自己的terrain转换/校验。公开ordinary projector入口仍用原完整clone，私有ownership flag/owned后态不能由远程query/外部prepared参数提供。原native query batch快照clone/freeze、dice、选择、Supply/控制/接敌逻辑均保留。
4. 91850唯一GREEN（11:54:42Z）exit0：损失后state整局复制14→0、marker helper8→0；真实Rules内部8和其他14明确保留。ENTIRE原概率/result/casualty consequences/全部哈希与旧参考及本次baseline deepEqual，capture/输入hash不变，0Provider/0原房写/¥0/trainingTruth=false。窄17,638.342→12,401.859ms包含clone计数调用栈插桩，不宣称无偏百分比、生产完整行动1min或稳定整体加速。没有再跑已通过命令。

当前仍有真实Rules resolver内部terrain projection复制8和其他完整复制14，不把这些抹掉或假称整个概率已经无复制。先定位它们与Preview/Apply/Replay的实际剩余关键路径，再决定最小且不影响原规则输出的优化；不把策略/样本预算削小掩盖工程成本。

新的原房只读观察95922（11:58:24Z）success，生成 `build/ticket-23-three-arm-official-standard1-20261008-v1/C-after-casualty-copy-fix-native-observation-20261009.json`：原C仍revision128/R2Assault/player2/0–0；P1waiting_human/P2active但二者无inflight；P1 Provider completed106/failed1、P2 completed169，均terminal。本次只读取实际数据库并保存小摘要，没有解锁/派发/修补原Room，不宣称新的动作或终局。驻留Host没有热载新源码，正式完整行动性能尚未取到；旧Paid/费用/截图保持。

本轮diff：1个生产ranged文件的私有损失后投影优化；1个具体回归及red/green/private baseline；小原C观察；本文件/CURRENT_WORK/rootTASKS/PROJECT_MEMORY。无新Rules版本/Prompt/Skills、代理/K3、网络请求、安装、删除、全量构建、提交或旧绿重复。原主线仍248/249/250/272四片，T23 33/36、T27 5/6、终局0/3。

### 本轮 Harness / diff 摘要

- harnessLoopUsed:true；targetGames:StarCraft TMG；promptPackRoutes:selfplay_agent_prompt（未改路由）。
- harnessToolsCalled:共享 spatial query → 实际 Room-backed relationships、官方底盘测距；缓存/unknown/stale authority；普通 RoomRuntime.readRoom → SQLite → 原生 AES-GCM codec；Room Adapter单条/批次fire → 共用完整攻击概率/伤亡kernel；native概率batch→真实Supply/marker控制/tacticalMass后果、原C数据库只读观察。
- uiTraceEvidence:本轮不派发原房动作、无新增 Web 截图；原逐动作截图保持，窄门不替代人机端到端验收。
- agentDecisionEvidence:完整原 query receipts/parity baseline与完整fire原响应；本地并行探针未产生最终策略决策，0真实 Provider。
- memoryTraceEvidence:未改局内记忆、TurnPlan 或原 paid history；trainingTraceCandidates:0/trainingTruth:false。
- rollbackOrDemotionRules:完整回执/未知语义/authority/stale 保护变化即退回对应局部优化，不减 strategy；codec freshness/ownership/privacy变化则关闭 aggregate decode reuse。
- userVisibleChecks:距离结果不变、缓存不重复转换、过期观察仍拒绝；完整三席视图不变、变化/篡改密文不能返回旧数据；完整伤亡概率与占点/接敌/移动损失后果不变，输入不被copy-on-write修改；整行动1min/完整对局仍未通过。
- 累计 source diff：先前两个 enum reuse、lazy Viewer转换、查询间common-kind/Worker/Adapter/Runtime/Live/两席fixture接线；codec/decode具体回归；本轮fire内部任务/稳定合并/私有完成/统一池与具体回归和性能诊断。普通graph内部拆分与单攻击内部拆分未完成；不能再说所有单查询内并行均未实现。无提交、安装、网络、代理/K3、删除、全量构建或旧绿重跑。

## 12:18Z 原生地形占点投影整局复制修复

上一轮仅回答查询内部并行边界，没有推进代码；本轮重新核对现有源码和停点，继续原目标，不关闭 Slice 或重建原房间。

来源：`official-mission-marker-control-kernel-v1.mjs:terrainAsOrdinaryForControl` 全复制 state，但只覆盖 `projected.board.terrain`。实际下游 effective-size batch 自建所需快照，marker visibility 同步读取单位/标记并返回新 visibility/hash；没有修改或向 caller 返回借用的单位/资料对象。不能把这种只读局部视图的优化扩展到异步或可写状态。

1. 新具体回归 `scripts/verify-ticket-23-marker-control-projection-copy-v1.mjs`：C82 已保存捕获的局部合法攻击假设、完整1804条地形、当前6存活Raptor/原36样本/7伤亡例，概率结果与已存整个原版输出比对；另直接运行原生控制 resolver 的可变输入及冻结输入。冻结变体通过原生 terrain creator 将两条普通地形分别改成 impassable/ramp，并移除一条草丛，明确是本地覆盖变体，不冒充原房地图或全地图验收。统计只包装 native structuredClone，实际复制仍原样执行。
2. 14260 有效 RED，12:17:07Z 启动、exit1：先得到完整成功概率/直接控制结果并保存 baseline，源/输入不变、草丛415等覆盖断言通过；概率路径真实整局复制8、两个直接调用各1，最后因 `READONLY_TERRAIN_CONTROL_COPIES_WHOLE_RULES_STATE` 失败。不是接口或夹具失败。
3. 唯一生产文件改动：投影新建 root/board 容器，原 terrain map、每条普通/特殊地形的 owned clone、metadata/hash、原规则核验全部保留。同步借用 pieces/markers/资料；不冻结或修改 caller 对象，不新增外部可信 prepared 参数。没有改变骰子、样本、Supply、LOS、控制或排序。
4. 15389 唯一 GREEN，12:18:15Z 启动、exit0：复制计数8/1/1全部变为0；ENTIRE概率/伤亡/占点/接敌后果及哈希与旧参考、本次 baseline deepEqual，完整两个原生控制响应不变。普通、草丛、impassable、ramp、removed及冻结输入覆盖；capture/state/两直接输入hash不变，可变 caller 的单位和资料包没有被冻结。0Provider/0原房写/¥0/trainingTruth=false。本轮不重跑旧概率/fire/codec/Live已绿门。

窄验证22,032.238→19,012.164ms包含计数、原概率及两个额外控制调用，不是公平生产基准、稳定比例或完整行动一分钟证明。没有重新统计其它所有复制，也没有加载这些改动到旧驻留 Host；正式地图/计划/终局验收不因此增加。

### 下一正式行动瓶颈的源码证据

只读核对实际 `RoomRuntime.replayRoom`：1458..1460先 `authorityEngine.verifyCheckpoint`，随后1468..1472调用 `authorityEngine.replay`；后者再次验证同一 checkpoint 并 normalize/hash完整状态。该重复路径存在，但本轮尚未测量两次调用的实际成本，不能宣称它已修复或就是全部回放延迟原因。原生回放还有 Store 当前/初态/日志搬运、依赖校验、tail执行和最后视图；不能省略 Replay 或使用旧计时当作新源码性能。下一反馈环应沿正式回放入口复现这一重复，保留初/现态绑定、检查点/回执篡改保护、完整输出和 caller 隔离，之后再计时 Preview/Apply/Replay，不能继续仅用概率局部结果宣布性能达标。

本轮新增 source diff：一个 marker control 生产文件、一个上述具体回归、RED/GREEN/private baseline和本节；CURRENT_WORK/root TASKS/PROJECT_MEMORY同步。Harness：harnessLoopUsed=true、targetGames=StarCraft TMG、promptPackRoutes=selfplay_agent_prompt未改、harnessToolsCalled=原native概率batch/marker control/terrain creator/effective-size/visibility；uiTraceEvidence=无新Web动作或截图，agentDecisionEvidence=原完整概率/控制响应，memoryTraceEvidence=未改，trainingTraceCandidates=0。完整结果/输入所有权变化则撤回此局部优化，不删策略材料。没有代理/K3、网络/模型请求、安装、删除、全量构建、提交或旧绿重跑。

仍T23 33/36、T27 5/6，余248/249/250/272四片、终局0/3；原20地图/2000军表Plan/完整受控对局与复盘目标保持。

## 后续交付物

### 14:52Z 当前性能口径修正与chance work复用

70.769秒仍不应准出；本轮增加独立计时发现6概率Worker各重复构建父线程已准备的context。40597原请求16.594s/full输出相同，首诊断完成事件计数错误保留；修为stage过滤后42545保存trace有效RED，不重复执行数学。Native private previewWork把完整自建/验证context送入原owned work protocol；公开chance/Apply保持原路，完整domain/PD核验、所有样本/伤亡/排序不减。45029唯一修后原r114GREEN：6context转交/0重建/完整6攻击，ENTIRE响应与70.769s参考相同，query15.546s。原Room/Host/Provider无变更；无旧绿/全量/代理/K3/网络/安装/删除/提交。

这不是整行动1min：模型、多轮查询、Preview/Apply/Replay尚待同链路验证。仅加计时未改数学时已有16.594s，故跨轮70.8->15.5主要差异不能全归于本修复，负载因果未量化。7752原C极慢formation已完整完成/full旧输出一致，162.370s仍FAIL60，12生成/4实际实例化/4选项；需测内部阶段，不猜原因。23独立输入现5记录/18待执行，T23 33/36/T27 5/6/余四片/终局0of3保持。详细文件与操作证据见[分类型最新结果](ticket-23-slice-248-real-per-type-performance-cases-2026-10-09.md#1452z-概率线程重复context实修单查询155秒不是整体验收)。

### 本轮新增：正式checkpoint重复校验与真实分类型性能集

实际C128/full1804terrain、原encrypted SQLite全初/现态/journal/最新checkpoint导入RAM，resumeRoom/attachBot=false/issueHumanRecovery=false，经正式RoomRuntime.replayRoom。29732先得到完整响应但夹具错将必要coldrestore计入冗余，保持原记录、不称有效RED。修正目标从1到2以后31635有效RED：完整旧响应/输入/签名改变/匹配改变/改签但stateHash错/accessor保持，真实规范化3次/签名校验2次；仅最后冗余断言失败。

只改 `authoritative-engine/transition-v1.mjs:verifyCheckpoint`：engine内一个private完整checkpoint core+signature内容hash和bindinghash的已验证小结果memo；每次依然validateMatchBinding、计算完整输入身份，成功才缓存，不保存caller state。accessor/非普通数据原路；失败不替换memo。命中返回新的small frozen结果，没有外部verified开关。正式wrapper与engine的验证边界不删除，必要冷恢复保留。

33422唯一GREEN：复制3→2、crypto校验2→1，完整正式replay/privacy输出、所有上述防护deepEqual、原source/aggregate/bundle未变、0Provider/0原房写。修正RED3,661.172ms、GREEN3,616.201ms；最初29732baseline3,761.653ms也保留。收益很小，不能作为分钟延迟已解决。没有重跑任何旧绿或该GREEN。

原C完整128/两席276Paid全终态/0inflight的只读capture38560已准备，但用户明确改变下一步为重放真实历史慢请求，因此没有SIGTERM原Host或热载。原房状态保持。最新进一步要求每个类型都有自己的短/中位/极长，再统一准出；详见[真实分类型案例](ticket-23-slice-248-real-per-type-performance-cases-2026-10-09.md)，不能混淆全局中位/unknown快捷返回。七query类型17独立输入已采集，4个记录/13待完成，资产/fire独立档位仍缺。原火力282.262s/revision114已得98.974s，随后同一输入context复用修后75.877s；仍未通过性能，不启动新局。完整行动Preview/Apply/Replay和LLM链路仍另待综合验收，不能以微基准关S248。

1. S248：继续证明并消除重复规则/快照/几何计算；每次仅具体缺陷红绿。实测完整动作耗时未达标前不启动新对照。
2. S248/S272：统一受控配置/源码、补全两类写表计划与地图绑定，在同一正式人机机器席链路创建新实验；旧费用、房间、记录原样保留。
3. S249：终局后比较动作工程正确性、长期计划延续和策略，才进行可归因复盘/Skill 演进；不把模型弱策略写进 Prompt。
4. S250：截图/逐动作/骰子/公开理由和费用报告；禁止把未终局或未独立审查记录标成训练真值。

没有子代理/K3、网络调用、依赖安装、删除、全量构建、无关测试或 Git 提交。旧 High 不按性能优化自动豁免。

### 13:29Z 真实火力差异判定与preview context复用

55172同原实际请求完整query98.974s，18差异集中geometry摘要及派生hash。独立核对原Paid保存graph五个Marine1目标边，原生`unit_spatial_relationship`已有ownStationary10/ownMove13/enemyMove1；旧摘要边型漏读为0。新geometry摘要正确；整个原fire graphHash、attackEstimates、伤亡与failures均保持。不是性能优化改变概率，更不能为了旧输出一致把正确摘要重新清零；精确引入该旧bug的历史提交本轮未定位。原证据保留`real-r114-fire-summary-difference-analysis.json`。

来源实修：`createOfficialSelectedRosterRangedPreviewBatchV1`已自有clone/deep-freeze快照、完整native枚举和physicalGeometry；枚举contextFor算过合法context，之后preview通过同domain/参数核验再重复contextFor却未传共享geometry。现在模块私有WeakMap只注册该owned snapshot；按side/piece/target/profile及canonical PointDefense选择键复用成功context。公开普通路不注册、不跨快照，不暴露caller可信开关；原domain深比较/phase/target/PD源和骰子校验全部发生在复用前。回调只为诊断、异常不改事实，不进入Prompt或模型回执。

只有3生产文件定点修改：`official-selected-roster-ranged-action-runtime-v1.mjs`内部context memo；`combat-estimation-runtime-v1.mjs`传诊断；`room-backed-spatial-rules-query-adapter-v1.mjs`接既有非模型diagnostic端口。原案例重放脚本可额外指定同来源同原请求的完整修后参考，分别保存历史原回执与reference，不改历史证明、抽样或Rules版本。

80381唯一修后原r114验证13:29:26Z结束：6context constructed/6reused/6完整attack任务；完整response与保存的修后99秒参考deepEqual，原sourceRowsHash/恢复state/LegalSpace/observation/输入不变，0Provider/0原房write/¥0。实际query75.877s，work准备28.302s、graph kernel45.111s；6攻击kernel14.898至20.862s在4线程共享池内重叠，不能全部相加。之前准备50.925s/graph45.143s，结果证明重复context已消除，非无偏AB百分比或稳定1min证明；75.9秒仍FAIL。冷setup76.116s、restore29.412s、context31.749s分开保留；完整行动还有模型/Apply/Replay，本轮未称通过。

旧源码只读suite64834为避免中途源码变化混用，仅自身SIGTERM于13:21:50Z且signalCode确认终态；未动原Host/Provider。其3个完整通过案例保留，不重跑；实例化median98未完成，不称通过。下一设计尚未实施：graph不依赖preview，却被planning barrier阻塞，可提前派发；后续共有geometry精确复用与graph单位对/LOS/objective/clearance分组，保留global engagement proof和原顺序/hash，全部共享一个有界CPU池，不对子任务重跑整个graph。45秒内部各项尚未计时，不夸大确定收益。T23 33/36/T27 5/6/余4/终局0of3保持。

### 13:46Z 准备/graph依赖拆分唯一红绿，继续其它真实案例

94587原75.877秒trace的有效RED证明graph被准备阻塞；3生产文件仅combat内部head派发/Adapter私有回调/pool有界提前队列。立即postMessage而不是等父线程online事件，保持head同对象/唯一索引、原全6攻击和原次序，最后依旧authority核验与仅缺失结果本地恢复。

96307唯一原r114修后GREEN：graph提前30.020秒，准备32.202/graph39.984/ENTIRE response及hash与75.877秒参考相同。Query70.769秒仍FAIL60，六攻击kernel17.235/17.116/17.280/17.705/19.135/16.810秒分波次共同使用4Worker，后半波成为critical path；不宣称稳定整行动1min。0Provider/0原房write/¥0，原Host未热载，旧绿不重跑，graph内部/preview内部进一步分组未冒充完成。

更完整的分项和A/B新档位在[分类型性能记录](ticket-23-slice-248-real-per-type-performance-cases-2026-10-09.md#1346z-独立graph提前派发已实施结果通过但速度仍失败)。A/B各一次采集补齐七类型21独立基准+2C压力=23，4记录/19待执行，原freeze配方正确恢复，下一7752原C r71极慢队形一次真实输入重放进行中。正式目标与33/36、5/6、余4、终局0/3保持；不能因局部GREEN开始新对局或关闭目标。

本轮Harness：harnessLoopUsed=true、targetGames=StarCraft TMG、promptPackRoutes=selfplay_agent_prompt不变、harnessToolsCalled=原共享query/Room Adapter/native preview/同池graph+攻击；uiTraceEvidence=无新Web动作，agentDecisionEvidence=完整旧/新原回执及分项，memoryTraceEvidence=不变，trainingTraceCandidates=0。完整输出/顺序/authority或未完成结果恢复变化即撤回对应调度改动；不以删除策略材料修复。源码3生产文件+一个真实案例runner的聚焦验证/源recipe恢复；无新常规测试/代理/K3/网络/安装/删除/全量/提交，其它项目保持。
