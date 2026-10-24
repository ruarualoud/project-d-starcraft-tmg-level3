# Ticket 23 / Slice 248 — C111 重复几何准备定点性能修复

状态：隔离候选通过一次定点红绿，**未加载到线上、未获性能准入**。
线上仍为共同正确性 `s248-v23-C120-reachable-endpoint-proof-v42-20261012`。
此处 v24 仅为性能候选，不是三组房间的新版本。

## 根因与唯一改动

原 C111 是 Swarmling 四模型、原冲锋骰4；沿用已保存的付费摆位意图、
原军表/地图/冻结 Runtime，不重新询问模型或改变原动作。

`chargeResolutionCandidates` 已构建一份 blockers 给目标/绕路查询，却没有
传入循环中的 `solveIntentFormationRows`。后者按每个锚点、每种 policy 再次
构建相同地形和其他底盘，以及相同目标索引。实际 RED 记录1933次准备。

候选只把既有 blockers 和一次准备的 targetIndex 传给该循环。局部值仅在
同一次同步生成期间复用，没有全局缓存/跨 room/revision 复用；每个原锚点、
policy、目标、权重、搜索预算、绕路和候选顺序均保留。此次仅修 Charge 分支，
不宣称其它召唤/换位/运输分支已经完成同样优化。

## 实际红绿与完整生成结果

新增脚本仅复现这个具体重复准备 bug：
`scripts/verify-ticket-23-slice-248-special-formation-preparation-v1.mjs`。
它从原 C111 capture 和原已保存 intent 读取输入，构建相同冻结 V1→V6 Runtime
取得真实规则域，调用真实生成函数体。不是假坐标、mock 规则或已绿结算门重跑。

| 生成阶段 | RED，原循环 | GREEN，隔离候选 |
| --- | ---: | ---: |
| 已知执行 PID / exit | 30785 / 1 | 36667 / 0 |
| blocker 准备次数 | 1933 | 1 |
| 完整生成候选数 | 44 | 44 |
| 墙钟 | 362.759秒 | 33.447秒 |
| 进程 CPU | 147.738秒 | 14.496秒 |
| 单独列出的准备/恢复 | 28.926秒 | 26.697秒 |

RED 真正失败于 `C111_SAME_STATE_BLOCKERS_REBUILT_INSIDE_POLICY_LOOP`，
不是初始化或字段错误。修候选后只执行一次 GREEN：全部44项深比较相同，
包含顺序、坐标、路径、目标、policy、意图和战术指标；完整生成结果 hash 同为
`7946e7c9ac3c0bceab2dcb99e5318340c12f1a680ac11e14e0960bf0b6ad5f38`。
原状态 hash 保持，Provider/原房写/Rules Apply 均为0。

该阶段墙钟减少90.78%、CPU减少90.19%。两个运行并非受控同负载同时段；
1933→1的实际调用量、完整输出一致及CPU变化支持此具体修复的收益，但不能
用本表声明全部动作/查询达标或将其等同线上 SLA。

原旧成功门的已保存生成CPU143.273秒、墙钟165.816秒，仅作历史归因：
本次RED CPU147.738秒相近但墙钟362.759秒，资源等待与算法工作须分开。
没有重跑那个已绿门，也不以历史较慢的总耗时挑选有利分母。

## 隔离源码及工件

下述均相对三组证据根
`build/ticket-23-three-arm-performance-baseline-20261010-v1/`：

- `C/C111-special-preparation-red.report.private.json` 及 stdout/stderr：原失败和全部生成结果。
- `C/C111-special-preparation-green.report.private.json` 及 stdout/stderr：唯一补验、全结果比较。
- `isolated-special-prep-v24-source/packages/online-agent-session/legal-formation-search-v1.mjs`：原生成体加计数/诊断出口，保留不改。
- 同目录 `legal-formation-search-candidate-v1.mjs`：实际GREEN执行源，仍含诊断出口。
- 同目录 `legal-formation-search-product-candidate-v1.mjs`：去掉诊断部分的交付源，SHA256为 `928a796b5f05b9f09c1861f152e16edf19e79dcb82da47f865d40b3b07f84d33`。

最后一份逐字节等于GREEN源去掉计数和私有诊断出口；该机械对应关系已核对，
没有另跑测试。仅复制三份约150KB模块，其他依赖引用原源；未复制DB、大素材、
整个源码树或新建权威房间。诊断视图不能作为产品Host加载。

## 未完成与准入边界

上述红绿是生成阶段证据。随后另测完整公开 solver 查询，结果见下节；
模型选择、Adapter 末尾权威状态复读、Preview/Apply/Replay/UI 仍未覆盖，
准备耗时不计在线动作。
已绿B111/C111/C120、计数和截图门都未重跑；无策略Prompt/Skill/数据刷新、
子代理/K3、安装/清理/提交或线上热改。

下一步继续原三房，积累各组完整同版回合，再将干净候选绑定到届时共同正确性
源做必要完整请求测量。只有各类型中位/极长均至少40%优化、所有case无劣化且
完整输出一致，才在三组共同安全边界换版。单个44项生成一致不满足该条件。

## 完整查询对照：一次真实执行、完整结果相同

在既有具体 bug 脚本增加 `full_solver_query` 模式。控制47156与干净候选47157
同批启动，各只执行一次，均正常exit0。该模式保留原C111局面/意图/域/Runtime，
使用真实V1→V6实例化及生产比较工人、原共享CPU调度；不以假比较或mock规则
缩短查询，也不重新执行已绿生成门。冷准备另列。

| 完整公开 solver 查询 | 共同v23控制 | 隔离v24候选 |
| --- | ---: | ---: |
| 查询墙钟 | 608.622877秒 | 204.203698秒 |
| 查询进程CPU（含本进程工人） | 335.233755秒 | 179.892696秒 |
| 单独冷准备 | 31.869896秒 | 32.398540秒 |
| 真实Rules实例化调用 | 19 | 19 |
| 返回完整队形 | 4 | 4 |

两报告完成后只做一次深比较：全部公开查询结果、请求、域、原状态及Runtime
一致，完整结果hash均为
`f16366fe792e71af191def9600faf53cfe270f1670316314204f5a868c48d658`。
控制源码hash `dfc0c75143f222ade4853d3c78c28972b83c0d1af518a15d6c7cb9d27fa866ab`，
候选为上节的干净交付源。原房写/Provider/Rules Apply均0。

本次墙钟减少66.45%、CPU减少46.34%。同批运行仍受原三房和各阶段资源争用，
不是受控独占性能试验；仅证明此完整Charge case没有输出丢失并存在明确CPU收益。
候选204秒仍偏慢，不称一分钟SLA；单case也不能代表按类型中位、极长或无劣化。
原共同v23/42线上保持不变，performancePromotionAdmitted=false。

工件在同一证据根：
`C/C111-full-solver-v23-control-v1.report.private.json`、
`C/C111-full-solver-v24-candidate-v1.report.private.json`，各保留stdout/stderr。
原报告不回写成准入成功。

候选的阶段分解：生成38.326秒，生成至实例化完成74.855秒；独立比较批次
约129.265秒。四工人每个约123.8–124.8秒墙钟、30.5–30.9秒CPU；其中关系图
约9.0秒CPU、静止火力约20.5秒CPU。调度queue5毫秒，不把CPU工作、资源等待
和队列等待混为一项。没有减少概率样本、候选、目标或策略材料。

为定位剩余129秒长尾，只新增同一具体脚本的 `comparison_profile` 模式：
从已保存首个完整选项重建真实比较job，以原baseline hash和完整比较结果核对
输入，启用已有生产工人的CPU profiler。62990唯一执行exit0，完整保存比较结果
深比较相同；查询81.645秒、包含工人的进程CPU41.425秒，工人线程CPU30.739秒。
该探针单工人、带profiler，与四工人整批负载不同，不能拿81秒直接与129秒算
优化比例。没有再次跑生成或完整查询，也没有加载线上。

已有观测的细分：攻击批次准备CPU15.730秒、四个概率估计合计5.030秒。
其中Goliath伤亡控制投影CPU2.194秒；其它估计的同项命中已有缓存、合计仅约
1毫秒。不是所有概率环节都重复慢。Profiler命中完整高地评估构造、其键编码、
完整序列化和摘要；profiler采样值是受争用的采样时长，不当作可相加的线程CPU。
原记录 `C/C111-comparison-cpu-profile-v24-v1.report.private.json` 保留，不重跑。

对覆盖键编码做了另一个具体红绿：首夹具漏真实grass适配停在已有规则检查，
改为调用原射击模块的同一个转换函数；71094真实RED1804→3608次编码，
72246唯一GREEN0→0、1692次完整值缓存命中，全部1804地形评估及摘要相同。
但小案例CPU0.870→0.897秒、墙钟1.595→2.218秒，**不满足无劣化，不准入**。
见 `ticket-23-slice-248-C111-elevation-lookup-performance-v25-2026-10-12.md`。
不再重跑这条已绿门；后续优先分析更大的完整评估构造/序列化热点。

00:21:10Z共同原房monitor A127/B131/C131，Round3 Assault、running/no all-stop。
末次actions实际读取A127/B130/C131，Replay=true且截图revision同；此为回执
元数据检查，不是新目视图审。已接受动作仍只对账不重Apply。
累计A192.347424/B257.752190/C217.147545，分别旧账累计、不清零。
Ticket23 33/36、Ticket27 5/6、余四片、完整局0/12保持。

23:40:45Z原房已截图 A121/B125/C125，均Round3 Assault、running/no all-stop；
最新回执Replay=true且截图revision相同。C120原骰失败已在C121闭环，未重投或
重Apply。分账累计A190.658146/B255.629124/C215.067717，费用不限、通知200/300/300，
本次隔离红绿新增Provider费用0。T23 33/36、T27 5/6，余248/272/249/250四片，
完整局0/12。实际后续状态以现有monitor和原回执为准，不因短观察超时另起房间。

末次原actions.ndjson读取进一步到A122/B126/C126：A Goliath1射击、B Raptor
激活收口、C Goliath1激活收口，均Replay=true/截图revision同；原board文件分别
0769-r122、0794-r126、0811-r126。monitor23:43:48Z仍running/no all-stop，
progress文件可以稍滞后，后续据原生接受回执对账，不重Apply。

## Harness 记录范围

- `harnessLoopUsed`: true；`targetGames`: StarCraft TMG。
- `promptPackRoutes`: 原线上A/A Planner→查询→Action路径保持，本轮未修改或另作prompt审核。
- `harnessToolsCalled`: 现有Web driver继续原房操作；隔离脚本仅冻结Runtime enumerate与真实Charge生成函数，不调用Apply。
- `uiTraceEvidence`: 原actions.ndjson的A121/B125/C125回执/Replay/截图revision一致；本轮未新增目视图审。
- `agentDecisionEvidence`: B125原公开理由为Raptor Run接近marker5；C124/125为Goliath1对Vile的射击流程，未改写原模型输出。
- `memoryTraceEvidence`: 保留原房记忆/Plan；观察到原线上record_outcome完成，未改记忆合同或进行新记忆验收。
- `trainingTraceCandidates`: 无新增晋升，trainingTruth=false。
- `rollbackOrDemotionRules`: 候选持续隔离；完整请求不同、任一case劣化或40%/完整回合条件未齐，都不加载。
- `userVisibleChecks`: 新的正式动作证据继续落盘；该阶段快例不表示完整Web操作变快，保留原SLA缺口。
