# Ticket 23 / Slice 248 — 两次原冲锋的新流程重决策对照

## 用户要求与范围

2026-10-12 用户要求：续跑时，两次冲锋问题都用新流程重新执行，观察模型是否选择其它动作。
本任务尚未调用新模型；下述原始输入已保存。不是仅检查已掷骰后的失败结算。
对照从原声明前开始，用新流程重新决策、重新查询；不向模型提示“应该改选射击”。
原已接受动作、实际骰子和历史费用不覆盖、不重掷，不改实验军表/计划/Skill。

| 对照 | 原时点 | 原决定 | 已保存的权威输入 |
| --- | --- | --- | --- |
| C / Marine3 | 第3回合 Assault，player1，revision107 | 指定 model1 冲锋凯瑞甘 | `C/actual-C107-pre-declaration-state.private.json.gz`；原完成决策 `C/actual-C107-charge-declaration-choice.private.json.gz` |
| B / Raptor | 第3回合 Assault，player2，revision110 | 指定 model1 冲锋只剩一个模型的 Marine | `B/actual-B110-pre-declaration-state.private.json.gz`；原完成决策 `B/actual-B110-charge-declaration-choice.private.json.gz` |

以上路径相对 `build/ticket-23-three-arm-performance-baseline-20261010-v1/`。
C107 完整原状态 hash 为 `3af3db297372a4b95b3f724357fe80e84ac7175b391ef238e65d4c11f41e2252`；
B110 为 `488e10ddc53bebff6bca075714721e43ab5937fafb3f73e801b16de6a4a9e423`。
两者均仅逆转不产生位移的声明 pending/log/clock，并与原权威完整 hash 相等。
B110 已付费决策只读提取 PID3677 / exit0，不生成新房、不写原库、0 Provider。

## 执行与记录要求

1. 先修 B111 的原 mandatory continuation，再封口并统一正确性源码版本；不加载未准入性能候选。
2. 两个对照均恢复对应的原军表、地图、回合、Plan、已接受 Skill 和决策时可见信息。
   使用独立实验决策存储，不能因原完成 choice 缓存而直接返回旧决定；原 Authority 身份不伪造。
3. 原骰只留在评估侧。声明前模型不能读到后来掷出的6或原失败结果；新路径事实仅由声明前几何计算。
4. 允许模型保留 Charge、换领队/目标或改选射击、Run 等实际当前合法选项。
   “变成其它动作”不是通过条件；通过条件是证据同源、理由不把直线当可达、最终提案经同一 Rules 验证。
5. 每例保存新 Planner/Action 公开理由、查询及领队/目标范围、候选比较、Preview/Rules 结果、耗时、token 和新增费用。
   不记录或要求私密思维链。未知付费返回不盲目重试。
6. 对照报告明确区分查询正确性、模型采纳证据、动作是否变化及策略收益是否仍待完整对局/复盘证明。
   原房111继续点保留，旧接受动作不重复 Apply。

## B111 原诊断改变了修复方向

原 `bot-stage-timings.ndjson` 的当前111记录，与原查询回执
`a2576e8660749fc91eeef9e1d0fb95bfd04493ea65869f9954793fd66302ca85` 关联：

- 生成24个完整队形，24次真实 Rules 实例化，0通过；全部 `SELECTED_SPATIAL_PATH_MODEL_COLLISION`。
- 候选生成诊断：`intentFormationUnsolved=0`、`followerUnplaceable=0`，不是无法容纳完整单位。
- 原搜索16.277秒，归一化查询17.195秒；这些是旧真实记录，不是重跑测试。
- 后端独立诊断确实保留 failureCounts。模型回执不携带工程计数是原有分层，不是丢失诊断 bug。
- 当前 `chargeResolutionCandidates` 给每个队形仅 `path:[pathEndpoint]`，没有绕障路径。
- 原领队到最近接触点的直线穿过己方 `player2-vile-model-3` 的圆底盘：
  到直线中心距约0.199寸，要求两底盘中心间距1.6145寸。这个直线确实不能走。

因此下一修复应检查/补齐通用绕障路径生成，再用相同规则实例化完整队形；
不能把当前24次直线路径失败当成所有路径必败，也不能放宽底盘碰撞规则。
尚未证明某条绕行路径满足12寸、全部地形/接敌/队形规则；不能宣称 B 已修复。
原 B111 完整复现门此前三次均先卡在夹具，最后明确夹具错误已修但未补跑；
该验证循环仍停止，不通过改名或另建命令绕过三轮上限。

## 本次交付与剩余范围

- 已交付：两例精确原声明前输入/旧付费决定；B111 原生失败诊断定位；本对照执行合同。
- 未交付：B 绕障修复与恢复门、新模型两次重决策、统一原房续跑、完整对局。
- T23 33/36、T27 5/6；剩248/272/249/250共4片，完整实验0/12。

## 原决策可见上下文已准备，尚不是新的模型决定

新增实际准备入口：
`scripts/prepare-ticket-23-slice-248-charge-comparison-context-v1.mjs`。
它读取已有精确声明前state、旧paid choice、原LiveDecision记录中的已接受
Skill snapshot及当前Plan、同一scope的记忆前缀。LiveDecision使用现有
`decodeStarcraftTmgLiveDecisionRecordV1`，不另实现gzip存储协议。
原SQLite均以readOnly打开；只在独立新目录写结果，不复制/删改原房数据库，
也不把旧completedDecision复制进新LiveChoice缓存。没有模型、Rules求解、
Preview/Apply、恢复门或性能case调用。

这次发现的必要实验边界：**相同revision也可能包含旧决策开始后形成的答案**。
B110旧choice创建于15:42:44.171Z，其后同revision110还写了turn_plan/
plan_reflection/decision_purpose/action_intent；不能仅以revision<=110保留。
记忆按原choice.createdAt严格截断，保留之前的真实Plan和既有可查询记录。
生产后续行动正常读取已完成动作记忆不受此实验切线影响。

| 原例 | 准备进程 | 记忆切线UTC | 保留 / 排除记录 | 最后保留sequence | 当时模型 |
| --- | --- | --- | --- | --- | --- |
| C107 Marine3 | 48548 / exit0 | 2026-10-11 13:14:25.686 | 285 / 18 | 285 | deepseek-flash |
| B110 Raptor | 48547 / exit0 | 2026-10-11 15:42:44.171 | 428 / 6 | 428 | deepseek-flash |

C保留Plan `7d4eb5360e8465bed52615c0e56f56a5b367ced2145bbbae050d96468b377b80`；
B保留Plan `5fdccb72ce589ded24b9314d5187f2a80105c4313f200dcdfaa3e20f9b65dca2`。
两例都保留当时的总规则1.0.1、对应种族及定向对抗Skill，而不是用今天文件
覆盖冻结snapshot。旧paid输出的文件引用放在evaluationOnly，不在modelSourceContext。
原后来骰6和旧失败结果仍不得进入新模型输入。

证据位于三组evidence根的
`charge-new-flow-context-preparation-v1-20261012/{C107,B110}/`；
`source-context.private.json.gz`分别317290/382908字节，
`preparation.private.json`和各自exit记录保存实际结果。0Provider/0原库写，
没有原接受动作重演，也没有B111第四门或新性能验证。

这只交付**原上下文素材包**，不是完整HostedDecisionInput或实际模型对照。
完整原始state只作Native投影输入，禁止直接序列化给模型。仍须：

1. B111原恢复门获定点追加答复并通过，统一正确性源码封口。
2. 用相同Native seat-view/action-space和记忆投影构建完整决策输入，
   运行独立新Provider/LiveChoice存储，不复用旧决定；旧原生scope不伪造。
3. 各执行一次真正Planner/Action查询/决策及同Rules校验，记录费用、理由、
   动作是否变化；没有新答案时不得将这份素材包当成“对照成功”。
4. 原房111同版续跑并完成整局；策略收益留给完整对局/复盘判断。

T23 33/36、T27 5/6、余4片/完整0/12保持；本准备不是另外包装的完成Slice。

## 绕行源码已实施，定点恢复门待追加答复

改变的实际源码：

- 新 `packages/online-agent-session/model-obstacle-route-planner-v1.mjs`：
  一个只读模型障碍路径模块。真实轮廓外的有限候选节点，确定性 A* 选择路径；
  最短直线下界和原移动长度预算剪枝，底盘完整边界检查。每段都调用执行侧
  `evaluateOfficialSweptPhysicalFootprintCollisionV1`，不是中心点碰撞。
  无解返回 unknown，不生成失败结算证明，不具有 Rules/Apply 权限。
- `packages/online-agent-session/legal-formation-search-v1.mjs`：同高度冲锋队形
  保留所有原直线候选，另外加入绕模型候选，不挤占原候选生成额度；按终点复用
  路径计算。模型给出的意图/权重、领队、目标、原骰与队形程序都不替换。
  高度变化仍用原入口处理，地形/接敌/全部跟随底盘仍需同一完整 Rules 实例化。
- `scripts/verify-ticket-23-slice-248-B111-charge-continuation-v1.mjs`：原具体
  恢复门增加成功绕行路径、原12寸预算及完整原结算的定点断言；没有另建门规避上限。

这部分以原真实 B111 的24次直线碰撞记录作为失败证据，**尚未运行**修改后的门，
未创建新普通测试/子代理、未重跑旧绿、未启动原房、未调用新模型。
三轮恢复门停止仍有效。已向用户请求路径修复后仅追加该门一次，答复尚未收到；
不会把自动长任务续行当作解除用户规定的三轮上限。
候选搜索不是完备路径算法：有限节点找不到路径不证明场上没有路线；
模型绕行通过也不独自证明地图地形/全部跟随模型合法。完整验收范围保持原门。
这些文件再加之前三处同源证据修复，尚未封成/加载新的在线共同源码清单。

## B111 已通过，两例原生输入已交付，真实新决策启动

用户已批准 B111 增加一次，并补充：以后根因明确、修复落实的三轮异常，
允许追加一次对应验证；不授权无代码变化的重复运行或无限循环。

本次实际追加64312发现34候选中有1个完整 Rules 实例接受，随后被夹具的
`compareBatch: jobs.map(() => null)`阻塞。此旧占位之前因为0接受队形而未触发。
仅改该门接线，使用已有真实
`projectStarcraftTmgFormationRelationshipComparisonV1`；没有放宽比较合同。
65646补验exit0，总50.292秒，原6模型Raptor、原骰6、原12寸预算都保留：

- 原24直线队形仍保留，另生成10绕行队形；4路线请求找到2条，另2条unknown。
- 遍历到第16个候选后找到1个完整接受结果，前15个仍为真实底盘碰撞拒绝。
- 成功领队三段路径长11.966寸，全部跟随模型与接敌/地形/底盘规则由同一Rules验证。
- 完整原生实例化及纯Rules结算均通过；没有改原房、重掷或调用模型。
- 这证明这一原停点可完成，不证明有限绕行算法全域完备，也不是在线Apply/Replay。

实际门证据：`B/B111-charge-continuation-native-comparison-v2-20261012/`
的report/exit；失败64312保留在authorized-route-v1目录，不删改失败记录。
已通过门不再重跑。

新增原生输入入口：
`scripts/prepare-ticket-23-slice-248-charge-native-input-v1.mjs`。
它调用同一正式双席工厂的resumeRoom、Native seat projection、LegalSpace、
SpatialObservation/ActionSpace、continuity与按需记忆查询，不创建任何新房。
readRoom/legalSpace首轮漏解包已定点修正，65910/65911均exit0：
C107合法1 finite/17 domains，B110合法1 finite/13 domains；记忆285/428不变。
原Plan正文及hash保留；hydrate会改恢复元数据，因此明确替回捕获的原Plan，
包装重新编译、Room行政元数据继承，不宣称与旧完整Prompt逐字节相同。
原完整private state只给Rules/Native投影，不进入模型输入；旧答案和后来骰隔离。
原生输入证据：`charge-new-flow-native-input-preparation-v2-20261012/{C107,B110}/`。

真实执行入口：
`scripts/run-ticket-23-slice-248-charge-new-flow-comparison-v1.mjs`。
在B111成功门后使用相同Native查询/记忆端口、原Flash profile、原冻结三类Skill，
建立独立新Provider/LiveChoice存储，各只调用一次完整decide。不是直接让模型
接受旧结论，不预先要求改选射击，原declaredCharge仍是合法声明选项。
新提案由同一后端完整private state与Rules再实例化/纯结算；无原房写、旧动作重放，
未知付费请求不自动重发。公开理由、查询/Plan、费用由新原生存储保留。

70004(C107)/70005(B110)于2026-10-11T18:20:52Z实际启动。
证据目标：`charge-new-flow-live-comparison-v1-20261012/{C107,B110}/`。
**此处记录启动而非结果：尚无新模型返回，不声称改选动作或策略改善。**
原三房111未启动；等待实际对照结果后封统一正确性代码继续原房。
T23 33/36、T27 5/6、剩4片、完整0/12保持；未加载v22/v23性能候选。

## 两个真实模型结果已完成，并通过合法声明实例化

| 原例 | 新真实进程 / 调用 | 新选择 | 与旧提案比较 | units / 新增估费 |
| --- | --- | --- | --- | --- |
| C107 Marine3 | 70004 / 3次Flash | 用当前射击批次攻击Corpser，理由是C-14六贡献模型12hit dice，加AGG-12两hit dice，压制前排与控点能力 | 改选，不再冲锋凯瑞甘 | 756696 / ¥0.935760 |
| B110 Raptor | 70005 / 2次Flash | 仍用model1冲锋原最后一个Marine模型，理由是Raptor较可牺牲、其它Terran单位本阶段已激活 | 原领队/目标/提案不变 | 251499 / ¥0.316822 |

这次新增合计5次真实调用、1,008,195units、¥1.252582；B/C分别记账，原费用不清零。
请求均使用deepseek-flash、原profile与原冻结三类Skill，独立LiveChoice/Attempt库。
同Authority派生的choiceKey可能相同；独立库的新2次/3次已付费attempt才是
“重新决策”的证据，不能只凭choiceKey或文字不同声称新模型调用。

两次模型都已正常completed。原执行脚本末尾对需要chance的动作直接apply，
分别出现SELECTED_RANGED_CHANCE_REVEALS_REQUIRED/SELECTED_MELEE_CHARGE_ROLL_REQUIRED。
这是评估入口遗漏权威骰子阶段，不是生成失败，也不能因此再次付费生成。
改为完整同Rules实例化证明合法声明；需chance的结算明确留待权威流程，
无chance才纯apply。使用刚取得的新paid返回补评，74996/74997均exit0，
没有额外Provider、任何骰子生成、原房写或历史动作重放。

最终证据：`charge-new-flow-paid-result-evaluation-v2-20261012/{C107,B110}/`
的report与new-decision；第一次paid返回/费用原样留在live-comparison-v1目录。
Rules自身给出的chance count为C25、B1，这不是25个hit dice，也不是已投结果；
报告中resolutionPendingAuthoritativeChance=true，不虚构战损或胜负。
B111原roll6绕行完整结算已在独立实际门65646通过，两者不可混成同一个验证。

结论边界：

- C这次改选射击，说明新流程会产生不同选择；其7条查询是6个关系查询及
  1个射击实例化，没有Charge路径证明/反馈。因此**不能证明改选是路径证据修复导致**，
  也不能以一个随机模型样本宣布长期策略改善。
- B保留Charge并不自动失败：原roll6确有完整合法绕行；声明前没有暴露这个roll。
  新公开理由承认骰子可能失败。但仍将已Supply0的目标描述成可带来Supply减少，
  并叙述后续Combat阶段Fight；这些是不严谨的策略/规则叙述Medium材料，留复盘，
  不向Prompt注入“应该放弃冲锋”、不覆盖策略Skill。
- 没有改写原A/B/C的111状态与接受记录，没有真正执行C的新射击结算。
  查询同源修复与B后骰必选结算已验证；在线原房Apply/Replay及完整策略价值仍待续跑。

已准备共同正确性代码清单
`common-v18-charge-source-manifest-v2.private.json`：v18/v39、39源码，明确含
三处Charge证据接线与legal-formation-search/model-obstacle-route五个受影响文件。
旧37源码清单未含队形模块，第一次38源码准备也未补入它，二者均不用于新上线。
这里只封当前正确性代码，不重新绑定旧版本，不准入v22/v23性能候选，原房尚未加载。

本轮diff：新增两个原生输入/真实对照入口、B111原门的真实比较器接线，
更新本报告/CURRENT_WORK/父TASKS与PROJECT_MEMORY；没有新普通测试、
旧绿门重跑、子代理/K3、数据刷新、删除或提交。
T23 33/36、T27 5/6、剩4片、完整0/12保持。
