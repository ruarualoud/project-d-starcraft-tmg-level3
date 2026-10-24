# S248 / S272：B续跑、选定军表实验室源修复、实际性能

时间：2026-10-09 05:28 UTC。T23 33/36，T27 5/6；248/249/250/272仍开放，完整终局0/3。
本批完成的是取数接线和B恢复，不是三个完整对局或整条写表/计划验收。

## 当前房间

| 组 | 最新真实状态 | 本批证据 | 已知游戏费用估算 |
| --- | --- | --- | --- |
| A 固定表＋v6计划 | R1 Movement，revision6后阻塞 | r2首个模型动作、r3Marine部署、r4追加位移、r5结束激活、r6Kerrigan部署均已Apply/Replay | ¥8.637714，6,787,209 units，28尝试 |
| B 从头写表＋计划 | 原房r119恢复，推进r120/121，R2 Assault持续运行 | r120 resolve_charge/cb2cfca8…，r121 finish_activation/78aad3bb…，Replay均true | ¥94.163911，72,719,163 units，268尝试；另有旧请求未知费用 |
| C 固定表、无赛前计划 | R2 Assault，revision106后阻塞 | r104/r105/r106均Replaytrue；下一Raptor Run尚未提交 | ¥88.929399，67,659,080 units，244尝试 |

A原规划估费¥5.054991另外保留，A已知合计估费¥13.692705。尝试数不等于已计费请求数：
A包含此前四个NOT SENT。B那次失败已发送但usage未知，不能按零费用处理。
三组各¥200、分别累计，实际A/B/C Host均已加载200，不清零旧账。

恢复句柄（私有URL/token仅在0600文件内）：

- A：原SQLite，Host6077；Web8743已exit1，`LIVE_DECISION_PLANNER_DID_NOT_CONVERGE`。
- B：原SQLite，旧Host4368零在途正常SIGTERM退出；新Host16909、Web20693。
  `B-r119-current-source-entry.private.json`是wrapper，`B-r119-current-source-attach.private.json`是inner ready。
- C：原SQLite，Host81004；Web91753已exit1，`LIVE_DECISION_ACTION_DID_NOT_CONVERGE`。

共享证据目录：`../build/ticket-23-three-arm-official-standard1-20261008-v1/`。
`ABC-current-source-status-20261009.json`与`ABC-observed-performance-cost-20261009.json`保存本批观察，
它们是带时间的快照；继续工作应先观察原房job，不能据快照重新派发。

## 完成的源修复

真实B已锁定9单位，Foundation请求包含`player1-exact-repair-*`和`u-*`实例ID，
Product模块的每轮实验室却以默认军表创建；Workspace未传选定军表。这是工程取数错误，
不是缺失单位应被猜测，也不是可以把unknown改成0。

改动：

- `roster-planning-workspace-service-v1.mjs`：正常规划和修订均传setup及锁定/选定candidate。
- `roster-planning-product-module-v1.mjs`：同一个既有官方Factory按选定实例、编制、升级创建隔离源；
  场景Rules Runtime和地图查询端口共同绑定该源。尚未选军表的流程保留原参考源。
  对侧是冻结参考军表，不冒称隐藏实时对手。军表转recipe与原正式房间接线复用同一函数。
- `verify-ticket-27-captured-selected-roster-lab-v1.mjs`：仅复现已捕获的B查询。
  走普通Product `createPresetSession -> startPlanning -> Foundation -> Teach`；捕获Foundation回执后主动结束，
  不伪造完整计划、不调用Provider、不修改实际房间。

验证收敛：首次夹具把receipt编号写成1，而前面已有地图回执，实际编号2；原失败保留，不算有效RED。
仅修索引定位后，RED20456实际得到unknown；两处源修复后仅GREEN22909一次，结果attached＋真实receiptHash。
不重跑这一绿门。两次有效红/绿均0真实Provider。

边界：本门证明选定实例进入场景源，不证明所有模型概率、六个摆放都完整传入、场景部署合法或完整策略有效。
另发现Foundation canonicalToolRequest仍将placements截成4，而捕获请求为6；应在后续具体取数修复中解决，
当前不能把一次attached冒称完整六单位预演已验收。概率缺attacker/冲锋问题送射击工具、另一Teach wrapper分支消费，
也仍未修；正确的Foundation branchIdRef解析不应被重写。

## B原房连续性

B所有请求已终态、Bot无在途；完整before/closed/ready快照保留初始Envelope、当前119 Envelope及两席全部256行。
连续性20457一次exit0：全部字段/行严格相同，0Provider、无重建房间。
旧唯一failed已发送、usage未知、无已完成输出可重放；保留原记录，在已授权续跑预算内使用既有retry入口续行，
不会把旧费用改零。四个新尝试后r120/r121真实推进，新增已知估费¥1.573415。
新Host已加载当前共享查询、目标合同和工具单字段容量修复。

## A/C本次停止及下一步

按三轮收敛保留停点，不继续重复付费改写。

- A阻塞在**对手Zerg**规划：选择`persistent_reserve_entry_edge`能力，
  三次`PLANNER_REQUIRED_FUTURE_ACTION_PLAN_MISSING`。这不是A的赛前v6没导出，
  也不是请求没通。应对照原返回、未来计划字段及候选绑定，检查缺内容还是协议传递/解析不齐。
- C对Raptor Run的预测反复写Marine1本回合射击。动作前确有AGG-12/Rocket Launcher射界；
  所选队形后该对模型可见对数0、对应本回合射界为空。第二/三次理由仍引用动作前事实，
  第三次增加了条件措辞，但检查器仍拒绝。需要审核条件预测与事实声明的结构化边界；
  不能把工程缺口直接归咎模型，也不能假装旧位置事实证明移动后风险。

原失败、公开理由和回执均保留；没有采集隐藏思维链，没有改规则真值。

## 性能仍不合格

本批不是控制变量旧/新性能A/B，不能由不同动作直接得出加速比例。

| 当前记录 | 实测 |
| --- | --- |
| A成功决策，r2→3 | Agent213.292秒；尚不含网页读回 |
| B恢复r119→120 | Agent218.471秒；尚不含网页读回 |
| C下一动作未完成 | space.solve_formation894.654秒；整段Agent1199.617秒 |
| C此前r102 | Replay464.321秒；历史记录，不重复执行 |

C此次最大已知耗时在队形查询backend，不能再以早先十几秒的其它case证明当前达标。
该backend包括候选摆放和后态比较，现有日志还未把它们分开；下一步先分段定位，
特别检查18模型×多对手×1804地形单元的视线/威胁重复计算，再做保持完整结果的优化。
不靠删Skill、删敌军或限缩模型策略来凑一分钟。

## 后续优先级

1. 当前P0：A未来安排合同、C条件预测/动作后事实边界，修已知停点；B继续同房，不等A/C重建。
2. 当前P0：赛前查询完整转发、正确分支、射击概率与冲锋可达工具语义；上述选表源绑定已修。
3. 当前P0：队形query/后态威胁与Replay性能来源；一次对应门＋真实动作观察。
4. 按用户顺序P1：已有修复后，再统一排查计划→执行闭环、计划补全、检查器/模型协议对齐。
5. 终局后P2：三组策略评价、带截图报告、场景限定复盘及WikiSkill/EvoTest实验。
6. 后置P3：其余地图与全部任务/规模矩阵、App真机；保留完整范围。

本批diff：两处生产接线、一项具体bug回归、A阅读版模型数6→9的说明更正及工作记录。
原房军表从未因阅读版笔误改成6；原初始Envelope确认Marine各9、三队27，友方全表33模型。
无旧绿/全量/新Provider验证/代理/K3/安装/删除/数据刷新/提交；Slice未关。

Harness：harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=harness_optimizer_prompt/
selfplay_agent_prompt/既有roster策略与Teach。工具为原房drive、只读SQLite、Rules/Apply/Replay、
普通Product规划入口和本次唯一绿门。UI/公开决策证据是每动作截图和actions.ndjson；记忆保留同房。
trainingTraceCandidates=0，trainingTruth=false。若当前请求仍丢实例或不绑定同源，局部修复不得晋升为生产完成。
使用ctx2skill技能仅检查既有Skill/计划来源，没有生产或晋升新Skill。
