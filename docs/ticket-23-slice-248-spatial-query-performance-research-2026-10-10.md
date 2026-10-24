# T23 / S248：空间查询变慢归因与无损算法优化调研

2026-10-10。T23 33/36、T27 5/6；开放248/272/249/250，新12组实验0/12。
本次直接在主会话调研，不启动代理/K3。只读现有源码、已有终态记录及一手技术资料；
不重跑绿门、不做付费请求、不创建房间、不修改生产代码。研究结论不是性能准出。

## 1. 哪里变慢：已测事实与未证明原因

同一实际C106 marker2完整Host请求；前源查询101.006289427s，当前140.599073504s。
整个回执、responseHash、780生成/28检查/16原生实例化/4最终选项相同。
冻结standard-d6-1的1804地形行、概率样本、完整诊断没有减少。
当前普通LOS源SHA：c2aa661c88e4d246fa5d7619cbb4dae4da11e8daca0b9b7c2df2ad47275b8ae0。

| 阶段 | 前源秒 | 当前秒 | 增加秒 |
| --- | ---: | ---: | ---: |
| 搜索／原生实例化 | 31.517 | 48.177 | 16.660 |
| 四选项并行比较 | 68.857 | 91.724 | 22.867 |
| 查询总墙钟 | 101.006 | 140.599 | 39.593 |

其余查询包络差额只增加约0.067s。搜索与并行比较是串行的大阶段；四worker之间
并行，不能把四条线程耗时相加当用户等待时间。每个worker内部关系图→静止火力→
移动火力连续执行，最慢worker当前三阶段87.810s，前源66.383s。

| worker | 图墙钟前→今秒 | 图线程CPU前→今秒 | 火力墙钟前→今秒 | 火力线程CPU前→今秒 |
| --- | --- | --- | --- | --- |
| 0 | 12.214→23.184 | 9.223→10.652 | 48.798→58.466 | 30.209→31.332 |
| 1 | 13.035→23.699 | 9.579→10.911 | 53.039→63.886 | 34.152→35.128 |
| 2 | 13.009→24.024 | 9.597→10.907 | 49.781→58.457 | 31.147→31.559 |
| 3 | 13.617→23.303 | 9.687→10.965 | 53.297→62.527 | 33.937→34.019 |

火力并非“完全没变”：线程CPU增加0.082–1.123s，但墙钟增加8.676–10.847s；
关系图线程CPU增加1.278–1.429s，墙钟增加9.686–11.015s。移动火力当前0.141–
0.232s，不是主热点。准入队列6ms，worker故障/本地恢复0，也不是这轮主因。

因此：**变慢阶段已定位，根因尚不能定案**。墙钟减当前线程CPU的差额可能来自调度、
其它线程工作、GC/等待等，不能全标为CPU争用，也不能把整段增加全归当前编码改动。
搜索没有线程CPU分项；两次实测没有整机隔离条件，不能作受控代码A/B。
线程CPU指当前线程user+system用时，不是整个进程CPU；ELU也不是CPU占用率。
来源：[Node process.threadCpuUsage](https://nodejs.org/api/process.html#processthreadcpuusagepreviousvalue)、
[Node eventLoopUtilization](https://nodejs.org/api/perf_hooks.html#performanceeventlooputilizationutilization1-utilization2)。

恢复16.154s、上下文6.445s属于实验准备；setup37.005s包含恢复，不重复相加，
不计正常行动。此处无模型调用，并非带模型完整行动；正常行动Replay仍应计入。
旧源暖态A7的95.877s不可冒充当前版本成绩。

## 2. 源码已经做了什么，不能再重复包装

- 普通LOS已有完整两底盘包络粗筛、逐model/terrain邻近缓存、远处完整行缓存；
  高差LOS已有私有model准备复用及固定证据复用；两核已有完整规范文本/精确SHA前缀复用。
- 原生射击batch已有整批准备、距离/LOS/probability共享；关系图已有调用内物理缓存。
  下一步必须查实际跨阶段命中/生命周期，不能再泛泛新增同名cache。
- 伤亡投影已复用固定地图校验；动态存活、Supply、支撑和控制仍重新计算。
- 搜索后4选项比较已并行；`shared-cpu-admission-v1.mjs`已有跨进程SQLite准入。
  但它只协调参与者，不锁定真实CPU，也不控制其它产品/进程负载。
- 当前flat编码红绿证明5306次通用递归→0、重复布局排序5306→1及完整字节等价，
  **没有证明总CPU/内存分配减少**。仍有逐行Object.keys、字段检查和对象分配。

主要源码位置：

- `packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs:574`：先创建全部可见性
  端点组合再find；`:768`每条LOS仍遍历1804行。
- `packages/online-agent-session/legal-formation-search-v1.mjs:3055`：关系图后才做
  静止火力；`:2775`独立建立反事实射击batch；`:3457`先收齐搜索再提交比较。
- `packages/online-agent-session/combat-estimation-runtime-v1.mjs:354`：已有
  `observePreparation`，可细分射击准备，不必新建另一实现。
- `packages/online-agent-session/formation-comparison-worker-batch-v1.mjs:48`：
  每batch新建worker，workerData包含完整state；`:90`结束时全部terminate。

## 3. 成熟方法与本项目适用性

### P1：固定地图空间索引，而不是每条射线扫描全部地形

Box2D的AABB树用包络查询先找候选，再由精确几何判断；GEOS的STRtree适用于二维
矩形索引，pbrt的BVH可把树线性化以改善访问布局。
来源：[Box2D动态树](https://box2d.org/documentation/group__tree.html)、
[GEOS STRtree](https://libgeos.org/doxygen/classgeos_1_1index_1_1strtree_1_1STRtree.html)、
[pbrt BVH](https://www.pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies)。

本项目推论：地图在owner内固定，优先实现无依赖的静态packed AABB树/STR式索引，
不先引入完整物理引擎。索引所有独立1804行，不将30轮廓组错误当30独立规则地形。
查询**完整两底盘包络加现有一寸与容差**；强制加入声明支撑地形，其余近候选走原核。
只对原“distant”证明完全成立的行复用原完整默认assessment；按原索引重建完整输出。
开口、高差、边缘距离仍精确计算，不用中心射线代替底盘，不用浮点近似生成合法证明。

这里仍有完整1804输出/规范哈希的O(N)成本；索引只省无关精确判断/邻近查找，不能
宣传整个查询变O(log N)。当前粗筛已存在，新增收益取决于遍历、近区比例和准备费用；
实施前必须用分项CPU确认，不承诺十倍或一分钟。

### P1：关系图与射击共享私有prepared geometry，按依赖增量重算

GEOS prepared geometry预先建立几何内部索引，适合对固定几何反复作谓词查询；
Shapely明确指出修改后新几何需重新prepare。
来源：[GEOS prepared geometry](https://libgeos.org/usage/c_api/#prepared-geometry)、
[Shapely prepare](https://shapely.readthedocs.io/en/stable/reference/shapely.prepare.html)。

本项目推论：同一候选的图与火力都读相同真实底盘/地图，当前构造独立context的
边界值得查。先统计相同model对是否跨两阶段重复计算，再扩展已有私有准备owner，
而不是在公共API上信任相同ID/hash。未移动的真实模型对可复用纯几何，变动单位相关
对重算；地图、形状、坐标、支撑、高差、状态/来源及规则版本须完整依赖绑定。
纯距离/LOS可跨反事实phase准备复用，行动许可、激活历史、伤亡和概率上下文不能
因为位置相同就复用。保持所有对手/武器/禁用诊断/样本/输出排序，unknown不变safe。

具体低风险候选：`directVisibilityWitness`按原left/right顺序惰性测试，避免先
分配全部端点组合，返回第一个完全相同witness；visibilityPoints及完整底盘bounds
按私有模型预备。此项潜在收益须看调用次数与CPU，不能用局部计数替代总性能。

### P2：持久worker池、固定地图预热、统一CPU预算

Node官方建议为反复CPU任务使用worker池；workerData按structured clone复制，
可以显式传输ArrayBuffer或共享SharedArrayBuffer，但传输会使原buffer失效。
来源：[Node workers](https://nodejs.org/api/worker_threads.html#worker_threadsworkerdata)、
[Node worker池建议](https://nodejs.org/api/worker_threads.html#worker-threads)。

本项目推论：保留有界池、每个固定地图owner一次准备，只发送当前revision动态差量与
job，可以减少反复clone/缓存冷启动。先测实际clone/bootstrap/准备CPU，后决定是否
用只读协议的共享数组；SharedArrayBuffer本身不保证不可变。不得跨房间泄漏、
复用旧revision、detach仍被权威核使用的内存；故障保持原只读恢复与确定结果顺序。

当前batch91.724s与最长已测连续worker阶段87.810s之间只有3.914s包络差额，且
不是纯启动。**仅省线程启动不是主解法**；若池能保留昂贵固定地图准备，收益发生在
内部阶段，必须单独测量。availableParallelism仅是并行度估计，不能证明四worker
没有争用，也不能证明capacity10是物理核心保留。
来源：[Node availableParallelism](https://nodejs.org/api/os.html#osavailableparallelism)。

三房间实验保持相同算法/完整工作量；以共同准入控制CPU密集阶段，Provider等待
不持CPU配额。先评估1房延迟和3房吞吐/尾延迟，再选工作池大小，不能只加线程。

### P3：候选比较流水重叠，不减少搜索或提前给模型结果

首个合法选项可用后即启动独立worker比较，继续原顺序搜索，最后统一按原顺序
收集全部4结果。必须是同一不可变state，搜索/原生实例化/异常传播保持等价，不能
让部分结果提前影响Planner。若主线程同步搜索，要安排不依赖online回调后才发的
初始任务，否则表面异步仍无法重叠。

收益上限是“第一个合法选项出现后剩余搜索时间”，不是全部48.177s。已有另一源
实测首项30.280s、搜索35.812s，上限只有5.532s；当前版本该上限尚未提取，不冒用。
优先级低于内部CPU热点，不能为流水而改变候选选择/排序/样本。

## 4. 建议下一步及具体交付物

1. **分项归因记录**：在现有观察回调补搜索线程CPU、射击enumeration/LOS准备、
   probability/chance、casualty/control、结果编码与worker启动/传输计时；记录
   每阶段wall/当前线程CPU，必要时GC观察但不把高开销采样时间当产品成绩。
   缺失测量先补，不用当前一轮证明完全因果。
2. **共享准备＋静态索引实现**：选已证明热点，复用已有owner/缓存接口。只为具体
   重复bug做失败复现，然后定点修复；保留全输出和原非法来源拒绝。
3. **受影响完整case成绩**：代码改完只测直接受影响原请求一次，保留原输入、完整
   响应与当前source版本。再记录慢/中/快的直接受影响类型及3房并行实测，不凭单例
   宣称所有case通过。历史恢复/setup另列，正常Apply/Replay/记忆不削减。
4. **性能准出结论**：区分算法CPU减量、机器等待、模型耗时、单房延迟和三房吞吐。
   由owner决定是否停止优化；未获准不启动12个正式实验。

拒绝以提速之名删候选/对手/地形/Skill/计划/记忆/概率样本、降低几何精度、
合并独立地形有效尺寸或取消正常规则校验。地图规则表示重构如有必要，应独立版本
研究，不作为这轮无损优化偷换冻结规则。

## 5. 证据与交付边界

当前：`build/ticket-23-three-arm-official-standard1-20261008-v1/lossless-next-four-batch-20261010-v1/native-los-flat-encoding-v1/original-c106-once-v1/real-performance-C106-retained-marker2-formation.private.json`。
前源：相同build批次`owned-los-static-evidence-v1/original-c106-once-v1/`。
当前19683 exit0；完整终态、源hash及delivery.private.json已存在，不重启/重验。
本次只新增本调研、更新终态报告/CURRENT_WORK/根Tasks及耐久测量知识。
0生产源码改动、0新测试、0对局动作、0Provider费用；A95.197314/B138.052447/
C124.279803各¥200累计保持。T23/T27和新实验完成数不增加。

research用于一手来源调研与本地证据对照；diagnose保持归因边界；harness演进规范
保留完整事实与策略输入。harnessLoopUsed:true；targetGames:StarCraft TMG；
uiTraceEvidence:not_measured；agentDecisionEvidence:complete_retained_tool_result_only；
memoryTraceEvidence:untouched；trainingTruth:false；trainingTraceCandidates:0。
