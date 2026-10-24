# Ticket 23 / Slice 248 — C111 高地覆盖键性能候选：未准入

状态：具体重复编码已复现并消除，完整原生结果一致；**测量没有性能收益，
不加载线上、不作为性能基线**。原共同正确性v23/42保持。

## 来源与实际执行

上一完整C111比较的真实CPU probe62990指向高地评估构造、查找键和序列化。
本次只取同一真实C111 capture的Marine1→Swarmling首个存活模型对，保持
全1804地形、真实源包；同一个原生owned batch执行两次完全相同的模型查询。
不是整次solver/Web动作，也不重跑旧已通过查询。

首夹具69772/exit1把原grass直接传给高地内核，停于
`ELEVATION_SPECIAL_TERRAIN_DEFERRED_TO_SLICE86`，不是目标缺陷RED。
修夹具后，诊断副本只导出原射击模块原样的`terrainAsOrdinaryForLos`，不重写
转换规则。所有依赖指向原源码，未复制DB/素材/仓库或新房间。

71094/exit1真正复现：首查询1804次覆盖键JSON编码；相同查询又编码1804次，
累计3608，失败于`C111_IDENTICAL_NATIVE_OVERRIDES_REENCODED_ON_CACHE_HIT`。
此后才修改隔离候选，72246唯一GREEN/exit0。

## 唯一候选改动与结果

原native缓存按真实geometry对象及完整overrides的JSON串查询。候选改为
同context/geometry中的完整字段值匹配：键名、所有有限标量、不可变字符串
数组都参与；字段多寡/顺序不同只会错失复用，不能混用不同值。可变数组、
undefined或其它非平面值走原构造/完整规范化，未删字段/评估或放宽Rules。
公开结果仍使用原canonical serializer、完整摘要和冻结流程。

| 此两次模型对查询 | 原实现RED | 隔离候选GREEN |
| --- | ---: | ---: |
| 首/第二次累计键编码 | 1804 / 3608 | 0 / 0 |
| 新字段完整缓存命中 | 不适用 | 1692 |
| 查询墙钟 | 1.594550秒 | 2.218323秒 |
| 查询进程CPU | 0.869992秒 | 0.897238秒 |

全部1804条地形assessment及完整原生LOS体/摘要一次深比较相同；两查询hash均
`29efb5a40af6ee6abbc98e8c2c3f0ff01a1dd0f70207f8985b79bc929a50db66`。
原capture及转换后的物理输入未变；Provider/原房写/Rules Apply均0。

CPU约增加3.13%、墙钟约增加39.12%。两次不是受控同负载试验，但不能用
这一点忽略实际劣化，也不能用“少了编码”代替性能结论。结果为正确性通过、
性能不准入；这个具体设计停止，不追加已绿重复验证。

## 工件与恢复

证据根：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

- `C/C111-native-elevation-projection-red-v1.report.private.json`：原适配夹具失败。
- `C/C111-native-elevation-projection-red-v2.report.private.json`：真正重复编码RED。
- `C/C111-native-elevation-projection-green-v1.report.private.json`：唯一修后门，完整输出对比及耗时。
- `isolated-elevation-projection-v25-source/`：两个诊断内核副本和原射击适配诊断出口，**不是产品交付源**。
- `scripts/verify-ticket-23-slice-248-native-elevation-projection-reuse-v1.mjs`：仅此具体缺陷的门。

工件保留实际失败/结果，不改写成功、不删除无效尝试、不加载诊断源。
后续分析较大的完整评估构造/序列化；原C111 query-local geometry reuse v24
仍独立隔离，已经通过的生成/完整查询门保持，不重复执行。

`harnessLoopUsed=true`，targetGames=StarCraft TMG；原Planner/Action/Skills/
记忆/骰子不改。无新增训练晋升，trainingTruth=false。性能候选任一case劣化
或缺完整回合/按类型40%数据即不加载；本次已触发该拒绝条件。

Ticket23 33/36、Ticket27 5/6；余Slice248/272/249/250四片，完整局0/12。
