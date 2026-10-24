# Ticket 23 / Slice 248 — 原三房共同 v18 正确性续跑

## 范围与已通过项

本轮从原A/B/C存储与房间继续，不创建/重置房间、实验epoch或军表/地图。
源为`s248-v18-charge-path-evidence-model-route-v39-20261012`，对应
`common-v18-charge-source-manifest-v2.private.json`的39文件；包括本次五个
受影响的Charge证明/查询/Planner反馈与队形绕障模块。没有性能候选准入。
C107证明门、B111完整绕行门、两个新真实决策/合法声明均已通过，不再执行。

相对证据根：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

## 真实恢复边界

| 原组 | 原权威 revision / 阶段 / 行动方 | UI已记录动作 | 原开局Plan |
| --- | --- | --- | --- |
| A固定表+Plan | 111 / Round3 Assault / player2 | 110 | 原A/plan-workspace保留 |
| B新写表+TeachPlan | 111 / Round3 Assault / player2 | 111 | 原B/plan-workspace保留 |
| C固定同A表/无开局Plan | 111 / Round3 Assault / player2 | 111 | 不补造开局Plan |

只读原SQLite解码校对完整绑定/stateHash与实际版本特定runtimeHash；
39源文件与封口一致。旧七个Host/Web/monitor PID定点ps均不存在。
证据：`common-v18-pre-resume-boundaries.private.json`。
A111已被服务接受，尚未写进UI镜像；既有Web驱动在续跑前reconcile已接受
trace与截图，不重复Apply该动作。B111原roll6等后骰上下文仍按原生记录保留。

## 首次启动失败与定点修复

86144/86145/86146和启动观察86148实际terminal exit1，尚未启动模型决策。
三者同因`SLICE248_CURRENT_WEB_EXPORT_STALE`，不误判为新对局或模型问题。
新启动桥遗漏原`STARCRAFT_TMG_PRODUCT_WEB_ROOT`，错误使用9月29日的
apps默认dist；当前client-domain的地图/Viewer合同已在10月10日更新。

旧真实v17c4 entry三组都指向相同已验证包：
`build/ticket-23-three-arm-performance-baseline-20261010-v1/web-export-unified-contract-v2`。
其index比当前对应客户端源新，原包仍存在且满足既有守卫。
因此只补环境桥的WebRoot，从旧真实entry恢复统一目录；不忽略守卫、不改
mtime、不重建导出/安装依赖、也不改任何规则或Prompt/Skill。
失败日志/配置保留，不覆盖旧运行或首次失败。

## 修正后实际后台启动

修正后91566/91567/91568于2026-10-11T18:46:32Z启动；三PID出生均
Mon Oct12 02:46:32 2026。启动观察91571有真实句柄，并核对Host出生身份。
截至18:48:04Z，三Host与观察仍活，等待Host完成原存储恢复/六席Provider准备。
没有因为等待或观察超时而重新启动。

对应工件：

- `common-v18-original-host-bootstrap.private.mjs`：只把原计划/Web目录传给
  既有Host入口，不包含房间/规则/模型实现；清理execArgv防止传给worker。
- `common-v18r1-startup-config.private.json`：原目录、原房、111边界和同源，
  `--no-cost-limit`/`--observe-bot-stages`/原json_channels_v1保持。
- `common-v18r1-owned-startup.private.mjs`：复用原启动观察流程；全部Host
  的真实entry身份/目录匹配后，才接既有Web驱动与全停监控。
- `common-v18r1-independent-monitor.private.mjs`：复用已使用的出生绑定监控，
  某组真实High/失败就协调全部Host封动作后停Web；观察超时不当作终态。
  原费用祖先/已有通知保留，另计上轮B/C新对照¥0.316822/¥0.935760。

本段是**启动/活句柄证据**，不是新动作、在线B112成功、完整回合或完整对局。
下一必须观察真实entry、A111补录以及B/C新权威Apply/Replay/截图；有新High
按统一源码修复后再恢复全部，不给已完成答案重新计费。

## 交付与整体状态

本轮仅恢复启动参数与 operational 观察工件，主生产规则/Prompt/Skill未再改。
无新测试、旧绿重跑、子代理/K3、清理/删除、安装/网络shell或提交。
T23 33/36、T27 5/6；剩余248/272/249/250共4片，完整实验0/12保持。
目标仍是20图正式验收、完整对照与稳定合法2000分地图绑定Plan，不缩成启动成功。

## v18真实线上停点与v19定点修复

三Host在18:56:46Z全部就绪，既有Web驱动926/927/928与出生绑定监控929
真实接上。A补录原已接受的111 `finish_activation`，Replay=true，
`screenshots/0687-r111-player1-finish_activation-complete-board-applied.png`；
这不是再次Apply，也不是新动作。B/C均仍在原111待结算。

B于18:59:14Z报告`LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`，监控18:59:23Z
要求全停、等待在途动作封口，19:07:26Z闭合。封口期间C也报告相同High；
A最后的连接TypeError来自Host退出，最后manifest无独立High。原三房只读
SQLite均state_revision111/UI111，六席均无reserved/dispatched请求。
v18新增A5/B2/C6调用，共3344798units，完整付费返回与原账保留；不是网络
未返回，也不清零后续账目。分账成本由原Provider记录/既有祖先算法续算。

具体根因是**旧搜索失败派生的候选排除记录没有被当前求解器重验**：

- B当前唯一`resolve_charge`被原`RULES_QUERY_NO_LEGAL_FORMATION_OPTION`
  回执排除；恢复函数只允许generating且只解析旧native工具调用，漏掉当前
  provider_output_invalid与JSON Channel。新增两份JSON都合法返回，却再被
  原候选排除记录拒绝，新的绕障求解器没有执行。
- C同类排除后，后续JSON草稿候选为空；真正完整的原队形意图仍在更早的
  `provider-attempt-3b14dd4a...`，只看最后草稿就找不到。没有给C编造动作。

只改`packages/online-agent-session/live-flash-decision-port-v1.mjs`：
采用现有协议无关`responseParts`、明确retry批准与相同六个权威字段，
查找最近完整付费队形意图；候选恢复只能同实现一次，通过既有同权威Planner
normalizer重新校验该精确草稿，再走既有Host必需的完整求解/实例化。保留
全部旧回执、草稿、失败/费用历史；不放宽Rules、不直接代模型挑选队形、
不删除旧动作或重投骰子。历史纠错计数保留，只重开局部处理状态。

新测试只为两个实际bug：

- B初次9877夹具误写候选数>1，已按实际唯一候选修正；10833真实RED
  `B111_CACHED_FAILURE_NOT_REVALIDATED` ->12745唯一GREEN。拒绝未批准
  的耗尽选择、拒绝不同revision、同实现不可无限恢复、pure无原库写。
- C16808真实RED `C111_VALID_PAID_INTENT_HIDDEN_BY_LATER_EMPTY_DRAFT`
  ->17592唯一GREEN，恢复原已付费完整意图，保留8份付费返回。
- 两者0Provider/0原房写；没有重跑B已绿、旧65646绕行门或两个新模型对照。
  这些是恢复政策的定点门，不冒充在线Apply/Replay已经完成。

## v19同原房恢复启动中

共同源`s248-v19-json-formation-recovery-v39-20261012`，
`common-v19-source-manifest.private.json`39源匹配；相对v18只上述一个
生产模块改变，client包仍原已验证WebRoot，Rules binding/策略Skill不改。
原生/UI三组111、R3Assault；原A/B开局Plan、C无开局Plan保持。

真实Host19542/19543/19544出生Mon Oct12 03:18:42 2026，
原startup机制首观察19802因启动命令漏argv[2]配置路径exit1，未启动驱动。
只补配置参数，真实新观察23127接原三Host；保留首失败日志，不重启Host。
19:23:06Z三entry尚未就绪，19:23:11Z三Host/23127实际存活、无startupFailure。
不因恢复等待重建房或再启动另一批。
工件前缀`common-v19r1-`，沿用原Web驱动和完整对局/出生绑定全停判据。
某组真实High仍必须封动作后全停、修明确根因后才能同版继续。

下一交付仍是原房新的完整结算Apply/Replay/截图；启动和局部门通过不能
计为完整回合或完整对局。无性能候选准入，完整同版回合、各类型中位/超长
至少40%改善且所有case不劣化/完整结果一致的性能条件不变。
T23 33/36、T27 5/6；剩248/272/249/250四片，整局0/12保持。

## v19真实结果与A111作用域修复

v19全部Host于19:31:58.914Z就绪，Web30930/30931/30932与监控30933接入。
A111旧付费纠正答复在19:34:29Z被误拒，监控19:34:36Z全停，19:46:13.765Z封口。
旧七PID均退出，六席reserved/dispatched为0。原生A111/B112/C111，UI均111。
B付费旧Planner恢复后求得8个完整Rules队形，新1次Action调用并正式接受112；
下一Web必须reconcile112/Replay/截图，不能再次Apply。C的已恢复付费意图确实
触发新求解，但399次队长端点全部被拒、0完整候选；C并未完成结算。

A根因是`all...fire`允许跨越任意100字符，把“all current-round Marine fire”
扩大为全部敌军火力。第二/第三份答复均明确接受Goliath Scatter Missiles暴露，
不是模型否认风险。只修改威胁名词短语量词范围，并将Action normalization升级v53，
通过既有版本化机制本地重验原付费答案；所有原始答案与费用保留。

具体门`verify-ticket-23-slice-248-A111-quantified-threat-scope-v1.mjs`：
39768真实RED（两份纠正答复误拒），43637唯一GREEN（两份均通过）；原首份真正
否认全敌军火力仍拒，“all enemy fire, including Marine”对照也仍拒。
0Provider/0原房写，不重跑已绿B/C恢复或绕行、模型对照门。

C111原4个存活Swarmling模型、原骰4/9寸预算，真实执行器允许与同一声明目标
单位的其他模型接触。50619具体RED零候选；加入同单位接触种子后52267产生117
候选但完整Rules全拒（53连续性链接、21模型路径、43地形路径）。复用执行器原
连续性谓词后62086仍全拒：链接错误清零，21模型路径、96地形路径，第三次停止。

已明确另一来源错误：绕路器收到完整地形却只筛kind=model，故其绕路仍穿越
obelisk-south等真实轮廓；顺序目标取样又在第九个模型之前耗尽预算。修复保留所有
实际地形单元的共享底盘扫掠碰撞检查，用逻辑区域外侧点生成有限绕路候选（区域
包络不替代碰撞几何、不证明不可达）；每目标分配候选预算，先粗方向后细方向。
完整Rules仍负责距离、地形、连续性和接敌，不变更骰子、规则或策略Skill。

按用户“明确修复后可追加一次”授权，唯一追加75655 **exit0/GREEN**，报告前缀
`C/C111-target-unit-contact-terrain-final`。原冻结runtime/军表/地图、4模型/骰4，
求得4个完整合法选项并逐一纯Rules Apply成功，原状态不变，0Provider/原房写。
生成44候选，实际检查19个，仍拒11模型路径/4地形路径；拒绝非法候选是正确行为。
示例绕行5段/5911milli-inches，在原9000预算内；无放宽规则。完整门353.673s，
候选生成165.816s/查询187.613s；性能仍未达标，未宣称40%性能准入。

同版v20/40源码（4修改生产模块）启动原Host **A81619/B81618/C81617**，出生
`Mon Oct 12 04:35:46 2026`；既有启动观察器81623带正确配置参数运行。配置
`common-v20r1-startup-config.private.json`，三组原目录/房间/军表/Plans/WebRoot及
旧账不变，边界A111/B112/C111；旧v19七进程已经退出。全部原entry于20:43:09.587Z
就绪，观察81623 exit0；Web A87978/B87979/C87980与监控87981接入，20:44:04Z
出生绑定七句柄实活，尚无新all-stop。旧progress.json仍failed111/UI111，是旧停机
投影，不是当前新任务失败；当前drive-status没有新failure。B112只reconcile/Replay/
截图，不重Apply。启动不是线上新动作验收；实际Apply/Replay及完整局仍待观察，
T23 33/36/T27 5/6、余4片/整局0/12。

## v20真实封口与v21截图恢复

v20原三房20:43:09Z全部ready。A在下一Agent决策前的全页截图遇到默认30秒
`page.screenshot`超时（capture609/main1151），Web87978退出；不是模型或规则
错误。统一监控20:45:52.327Z请求全停，20:53:04.686Z完全封口，旧七PID退出、
六席Provider reserved/dispatched0。期间C原生查询得到4合法队形并完成真实
冲锋结算到112。封口权威A111/B112/C112、UI111/112/111；B对账已有706图，
C112仍待Web Replay/图，不能重Apply或仅凭权威revision声称截图验收。

本次新增C1已结算调用/378425units/¥0.461674。分别累计A186.076115、
B250.064098、C211.491964，未跨下一个200/300/300通知线；不抹历史失败/未知费。
封口元数据 `common-v20-sealed-boundaries.private.json` 保留原房和费用来源。

具体复现 `verify-ticket-23-slice-248-page-capture-recovery-v1.mjs` 引用真实A
stderr并执行实际driver内部capture段：98460RED同TimeoutError，99119唯一
GREEN同页面/路径恢复、编号只分配一次；页面关闭/非超时错误仍拒、只读重试
最多3次。0Provider/原房写；**真实浏览器恢复仍待**，不把夹具当线上截图。
只有两个生产文件修改：`owned-live-capture-v1.mjs` 增加公共全页捕获及元素
fallback复用；`run-ticket-23-slice-248-agent-agent-web-v1.mjs` 全页入口接入并
记录捕获时间/恢复告警。120秒单次观察窗口、禁用CSS动画、不跳过截图屏障；
没有改变Rules、动作、骰子、计划、Skill或Provider，不重跑已绿规则/恢复门。

共同正确性v21 `s248-v21-owned-page-capture-recovery-v40-20261012` 明确区别
此前隔离的ready-query性能候选v21；性能候选均未准入。40源码哈希清单已更新。
原Host A1124/B1126/C1125于20:58:28Z启动，出生Mon Oct12 04:58:28 2026；
启动观察1128用正确argv[2]。配置 `common-v21r1-startup-config.private.json`、
同前WebRoot/Plan目录/原房/旧账，B/C已接受动作只补证据，未新建房或epoch。
此启动时刻尚未认证线上截图；以下实际观察覆盖该历史停点。

### v21实际续接与证据（21:14Z）

启动21:05:20.912Z完成，1128正常exit0；同原三Host接既有Web6945/6946/6947、
出生绑定监控6948。监控21:14:03Z未产生新all-stop，短HTTP超时仅为观察失败，
不是Agent/Provider终止证据。最新动作文件随后已记录A113/B114/C114，均第3回合
Assault、Replay true、截图观察revision与接受revision相同。

A112是保留付费输出恢复后的Swarmling Run，明确接受当前Goliath Scatter风险，
只声称避开当前Marine射击；113结束激活。B112原Charge已对账，113 Impact、
114结束激活。C112原Charge已对账，113 Impact、114结束激活。没有重Apply已接受
冲锋，没有新增房间或骰子，没有额外Provider调用；费用仍A186.076115、
B250.064098、C211.491964，继续分别记账。

C112棋盘图位于原C目录 `screenshots/0721-r112-player2-resolve_charge-complete-board-applied.png`，
receipt `649f9fb70775411da8ea96afe0d106cb4025947580089350dd1917e4efc17349`。
真实v21捕获已成功，但未观察到真实超时恢复；夹具恢复证明与线上普通捕获区别保留。

Medium复盘项：保留C112叙述仍说11000冲锋上限；实际原骰4加Speed5的Rules/search
使用9000，5911合法路线已正式接受。旧叙述和历史unknown都保留，不临时改Prompt
或Skill，也不将该数字叙述漂移误判为非法结算。仍需完整局和后续策略复盘。

T23 33/36/T27 5/6、余248/272/249/250四片、完整局0/12保持；没有性能候选准入。

### v21三组新决策（21:20Z）

21:18:37Z只读核对七原PID及出生时间，全部实际存活；21:20:47Z监控无新all-stop。
原动作记录已到A114/B115/C115，第3回合Assault，三条Apply/Replay一致、截图revision
匹配，无截图告警。没有新房、重置骰子或旧动作重Apply。

| 组/动作 | 真实选择及公开依据 | 本动作模型调用 | 棋盘图（原组screenshots/） |
| --- | --- | ---: | --- |
| A114 | Goliath2 Scatter射Raptor；保留Marine站点；明确伤亡/Supply交换尚未知 | 2 | 0716-r114-player1-ranged_attack-complete-board-applied.png |
| B115 | Medic冲锋近处Kerrigan Raptor；考虑后续Combat；拒绝10126大于10000的另一路冲锋 | 4 | 0723-r115-player1-charge-complete-board-applied.png |
| C115 | Goliath2 Autocannon射Corpser；按当前火力/核心单位贡献选择；拒绝够不到的冲锋 | 2 | 0739-r115-player1-ranged_attack-complete-board-applied.png |

上述是不同历史局面的真实决策样本，不构成Plan效果的因果对照，不在运行中给模型
注入新的策略权重。公开理由/备选/查询回执保留于各原 `actions.ndjson`，隐藏思维链
没有保存或披露。累计A186.484876、B250.893984、C211.818050，仍分别通知200/300/300。

B115已保存阶段时间：Agent含模型/查询102.557秒；Preview15.837、确认5.541、
Apply24.063、Replay26.179秒。Web上一张before完成21:13:02.736Z，到该动作全部
applied证据21:17:56.977Z，真实窗口294.241秒。Capture39.316秒已包含refresh14.735
和page11.881；manifest31.197秒与Host尾部执行重叠，不能将这些嵌套/重叠值相加。
保留性能长尾问题，未达一分钟，未完成每组同版整回合/各类型40%准入条件。

本轮只更新三个恢复记录文件，无新生产修改/测试/已绿门重跑。接下来原房继续，
新High按同版共同封口处理，明确根因后只追加获准的定点验证。

## v21计数High与v22原房续跑

真实B116 Medic冲锋接受后，3模型队形显示1寸内5、3寸内16。实际生产
`formationSolverMetrics` 使用己方与目标的笛卡尔距离展开后计数，误标为己方
模型数；同字段被 `paretoVector` 使用，故为High决策材料/候选筛选错误，而非
单纯文案。目标Unit+model别名只解析6个目标，没有重复；不是失去模型快照漂移。
此前C112的4模型“17模型”也来自该投影，原合法结算不因此改写。

具体新门 `scripts/verify-ticket-23-slice-248-formation-model-count-v1.mjs`：
31963 exit1/RED，执行真实生产私有函数与实际Rules底盘距离，3己方/6目标出现
7/16，失败断言不是格式/初始化问题。共同封口后只修
`packages/online-agent-session/legal-formation-search-v1.mjs`：按每个己方模型的
最近目标底盘距离判定阈值，结果schema从v3到v4。加权摆放score/权重、底盘距离、
Rules执行/冻结身份不改；Pareto轴自然使用正确的唯一模型数。

39893唯一GREEN/exit0：两阈值均3，Pareto计数3，Unit+model别名等价，空目标0/null，
1000/3000包含及3001排除；0Provider/原房写。只证明该真实计数/Pareto接缝，
不冒充完整搜索、Rules结算或线上策略提升。没有重复已绿的规则/截图/恢复门。
红绿报告位于证据根 `B/B116-formation-model-count-{red,green}.report.private.json`。

封口事实：21:31:23.595Z原三Host按出生绑定请求SIGTERM；C正常退出后既有监控
21:36:11.601Z进入共同关闭。A/B实际退出signal SIGTERM；这不能表述为已证明的
正常完整job退出。六席账本均无reserved/dispatched/ambiguous，付费返回均保留。
原生A115/B117/C118，UI115/117/117，C118只补证据。被动网页退出延迟，确认Host
全不存在与六席open0后定点停止原6945/6946/6947，21:42:11.353Z监控closed，
21:42:25Z旧七PID全部不存在。没有强杀付费worker、新房或重Apply。

操作教训：手工High封口必须单一SIGTERM发行者；root接管前先让被动monitor退出，
或交由monitor完成全波次，不能两者同时给draining Host再发信号。该操作规范避免
本次双发行者的中断风险；不声称已实现新的生产自动恢复器或运行验证。

`common-v21-sealed-boundaries.private.json` 保存原生revision、UI已记账值与六席
Provider状态；尚未落入UI动作费用的完成回复不会删除，下次ready入口对账。继续
A/B/C分别计费/每100通知、无费用上限/不清零。

共同正确性v22 `s248-v22-formation-own-model-count-v41-20261012`：41源码清单
含新增具体门，唯一生产修改为上述投影，明确区别隔离失败性能v22。原Host
A42689/B42690/C42691于21:46:36Z启动，出生Mon Oct12 05:46:36 2026；
观察42972带正确配置argv[2]，21:54:49.931Z启动完成；Web A49409/B49410/C49411
及monitor49412接入，21:55:54Z实际七出生绑定句柄均活。同原Plan目录、WebRoot和
原军表地图；未新建room/epoch。冷启动8分13秒属于恢复开销，不计正常动作延迟。

22:01:58Z共同监控：A115/B117/C118、第3回合Assault、三组running，无新all-stop；
3秒HTTP观察超时不是任务终止。C118原已接受的Goliath2射击现Replaytrue，截图
`screenshots/0758-r118-player1-ranged_attack-complete-board-applied.png`绑定118，
759张证据累计；仅补对账/证据，未再Apply。新线上队形查询实际消费计数v4仍待
后续证据，不能用已通过计数门冒充在线接线或策略收益。

Ready入口对账了原已付费未落入旧UI的返回，未重发；累计A188.634265/B251.945212/
C213.050188，调用266/247/199，reported units53,505,775/54,840,142/35,917,595。
三组分账/无费用上限、不清零；下次通知A200/B300/C300。v21完整调用增量26次、
4,756,713 units/¥5.997488，包含尚未用于接受动作的返回，不等于26个执行动作。

本次diff：一个生产模块、一个具体bug门、CURRENT_WORK/本文、根TASKS/MEMORY；
恢复配置/脚本/清单在build证据目录，只机械复用既有续跑入口。无新策略提示、
Skill/官方数据/Rules改动，无代理/K3/安装/清理/提交。T23 33/36/T27 5/6，余4片，
完整局0/12保持，性能候选未准入。

22:06:59Z真实推进到A116/B118/C119，三组running/no新all-stop。A116 Goliath2射击
Raptor、B118 Corpser宣告冲锋Medic、C119结束Goliath2激活，各自Replaytrue且截图
revision一致；对应board图0732-r116、0745-r118、0764-r119。B118有6新调用、
1,050,588输入+6,488输出units/约¥1.291850，当前仍待原骰子/完整队形Rules兑现，
不把宣告当冲锋成功。A116复用原已付费返回；C119唯一规则后继0调用，未重复模型
请求。累计更新A188.634265/B253.237062/C213.050188，其他准入与完成计数不变。

## v22 C120封口、完整端点证明修复

本节覆盖上述v22运行快照。C120 Vile向Marine1宣告Charge已Apply/Replay/截图，
原骰4加Speed5，上限9000；随后唯一结算域产生零候选，Host报告
`LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE` High。监控22:14:32.922Z
请求全停；全部Host退出、六席Provider reserved/dispatched/ambiguous0后，只对
残余被动A49409核对出生并定点停止，未给Host追加第二波信号。
22:26:53.557Z完全闭合；旧七PID不存在。权威原生A117/B121/C120，已截图UI116/120/120。
A117/B121只是下一次补Replay/截图，不能重Apply；C保留原待结算骰子与付费意图。

具体门 `scripts/verify-ticket-23-slice-248-C120-charge-continuation-v1.mjs`：
84249真实RED/exit1，原状态hash、原付费Planner、冻结V1→V6完整runtime匹配，
910个策略试摆均在领队实际碰撞前滤被拒、0生成/0实例化。此为真实零候选，
不是初始化/字段夹具错误。只读几何分析显示可达接触锚点均被其他底盘或地形占据；
旧复合路径证明已覆盖目标Unit前8个模型，但第9个未决，不能直接宣布失败。

两个生产修复：

- `official-charge-composite-cross-section-proof-v1.mjs`：保留旧成功cut证明；仅在
  cut未决时，对整个可达接敌整数端点区域作完整分区覆盖。移动域扩大至max+2，
  接敌域保守扩大、碰撞内域收缩；每个小区域必须证明超出移动/接敌域或全部被占。
  覆盖不完整继续unknown，全部活目标模型必须覆盖，不靠有限摆位搜索判失败。
  不更改冲锋规则、骰子、底盘或地图；这是原Rules充分证明的覆盖补全。
- `legal-formation-search-v1.mjs`：仅消费Rules已有的强制失败参数域及全目标证明，
  输出原类型的精确失败参数，完整instantiate/apply仍会复算并拒绝伪证明。

98650唯一GREEN/exit0：原C120/3模型/骰4/9000、原付费意图与状态保持；1个强制失败
完整实例化并纯Rules Apply成功，原stateHash不变，0Provider/原库写/旧动作重演。
查询11.733秒、完整门35.385秒；这是正确性定点案例，不是在线Apply/Replay、策略收益
或完整性能40%准入。此前已通过的B111/C111/计数/截图门均不重复。
红绿工件在证据根 `C/C120-original-charge-{red,green}.report.private.json`。

最后已入账A188.634265/B254.227457/C213.597184不是最终对账；A117/B121及C120
后续已完成付费返回保留，下一ready入口继续计入原账，不盲重发。继续分别无上限计费，
通知线A200/B300/C300。下一步共同正确性清单/原房Host/Web恢复，A/B补证据、C原骰
实际结算后继续。隔离性能v22/v23未准入、不加载；各组完整同版回合/按类型中位超长
≥40%且全case不劣化/完整输出一致的性能条件保持。T23 33/36/T27 5/6，余4片/整局0/12。

### v23同原房恢复启动

共同正确性 `s248-v23-C120-reachable-endpoint-proof-v42-20261012`，
`common-v23-source-manifest.private.json`42源。与v22相比只有上述两生产模块改变，
加本次具体C120门，不拷入隔离性能候选。原Host A3359/B3360/C3361真实于
22:59:06.595Z启动，出生Mon Oct12 06:59:06 2026；操作启动器3357正常exit0，
观察器3363带正确argv[2]配置路径。仍原roomId/dataDirectory、原A/B Plan目录，
C无开局Plan，WebRoot为已验证 `web-export-unified-contract-v2`。

22:59:17Z三entry尚未ready，无第二次初始化；观察器等待既有Host ready后接
原Web驱动及单发行者出生绑定monitor。下一步A117/B121补Replay/图、C120原骰实际
失败结算，禁止重Apply已接受动作。此为实际启动事实，线上Apply/Replay尚未验收。
工件前缀 `common-v23r1-`。费用仍保留全历史、ready再对账、分别无上限通知。

### v23三组就绪与原接受动作补证

全部entry于23:10:20.062Z ready，启动23:10:20.519Z完成；原Web A12447/B12448/
C12449、monitor12450接入。23:11:32Z只核对七个已知PID的出生时间，实际全部存活。
冷恢复11分14秒不计入正常行动延迟。23:13:23Z三组progress running，无新job失败/
all-stop；短HTTP Timeout仅是观察超时，不能据此再次启动或重发模型请求。

A117原已接受的Raptor伤亡选择现已Replay=true，
`screenshots/0739-r117-player2-ranged_attack-complete-board-applied.png`观察revision117，
原receipt `e2007266c7dd53cd458fb88efe1292e2b1279004e384f2ef42a1d25476f1fbba`。
B121原Goliath Autocannon射Vile已Replay=true，
`screenshots/0764-r121-player1-ranged_attack-complete-board-applied.png`观察revision121，
原receipt `26c2022a2488b7a06555cc5a6242bfeb043caaf2b594f88054cbd512bdbe399d`。
两条仅补录原动作回执与截图，不是再次Apply。C120原骰4结算及新回放/图仍待。

ready与Web对账后累计A189.183625/B254.577202/C213.916630，保留完整付费历史与
未用于接受动作的输出，不将费用对账误报新模型调用。通知线200/300/300不变，
完整局仍0/12。仅恢复记录更新，无新测试/旧绿重跑/源码热改/性能准入。

### C121原骰失败真实闭环

原C120现正式接受121，并非重投骰子或模型另选动作。只读公开journal122确认
preStateHash为原 `82fe68f55f59733604ab429ca372a6f3f116a5ee873db17100adda7d6e5cc434`，
原roll4/cap9000、outcome failure、`charge_failed`、modelPositionsChanged=false。
Rules实际复算9个目标模型证明；第9个使用完整可达接敌端点覆盖，103个分区，
保守移动外域9002，证明hash `c50ed16995a253d7f04e8e66a53b9550a35a7b04bf0329fbd5c4b1ddbf825f2a`。
不是把有限零候选当证明，也没有放宽原9000移动预算。

正式receipt `f351f9879e3524e9485523951d5c72583f781d6ba23834b2dbf1ed90b1bdac6c`；
实际Web Replay=true、观察revision121，
`screenshots/0781-r121-player2-resolve_charge-complete-board-applied.png` 已目视检查。
原Vile位置保留；单候选确定结算providerCalls0，无新增计费或策略Prompt变更。
C120阻塞的线上Apply/Replay/截图链现在完成，整体Ticket/完整局计数不增加。

23:18:36Z三组progress running、无新all-stop。轻量原房读曾见B122/C122已经接受但
网页尚未补全，下一步只补其证据，不能重Apply。继续原房当前激活及后续合法动作。

保留一个真实零模型调用性能样本：C该动作agent_decision6.656秒，Preview15.244、
确认9.639、Apply32.077、Replay40.098秒；首次read_room完成23:12:49.328Z到
record_outcome完成23:15:09.546Z的观察跨度140.218秒，不能把嵌套子项相加。
UI证据随后才完成，仍远非一分钟交互；6.656秒决策不能冒充整动作提速。
与旧零候选输出不同，故不是无损40%配对性能验收或候选准入。当前共同源仍不热改。
