# T27 / S272：工具输入与返回事实交接修复（v788–789）

## 结论与边界

修复了两处真实产品接缝：攻击查询漏选域/字段错层后被静默当作另一查询；方法返回时只交付失败而遗漏已经完成的兄弟测量。不是更换策略模型，不是手工改军表或 Plan，也不是完整策略验收。正式草稿仍 r3、1490 矿、170 气、余 510 矿；正式 Plan 0/6、对局 0/12。T27 5/6，余 S272/S248/S249/S250 四片。

原 Run：`build/slice272-product-generation-v645-lqMWaS`，workflow `decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c`。原件、失败、费用、次数不清零；未重启旧 A–F 或正式对局。

## 1. v788：攻击查询合同统一

实际模型原件 `1b26b729…` 明确想查近战，却没有 domainId，并把 closeRanksMode、allocations、surgeTargetUnitId 写在顶层。e5383 `e931f000…` 按旧无域兼容入口查射击，得到 unknown。它是模型字段错误加接口静默忽略，不是网络漏传。

- 源实验室导出同一输入断言；模型工具发现、工作单编译、实际执行共用。
- 模型查询必须明确 domainId；近战参数放 parameters。一次反馈所有缺字段、未知字段、错类型，不替模型选武器、反应或分配骰子。
- 原生非模型接口保留原合法 unique-ranged 简写，但也不能静默吞掉额外字段。
- 已保存错误工作在实际执行前回到局部输入纠错；没有调用另一种算法冒充原查询。

门 `verify-slice272-explicit-attack-query-v788.mjs`：首次夹具未绑定实际比较目的，修正夹具后复现三项真实 RED；正确显式查询原样通过。源修复后只补三项一次 GREEN，正确查询没有重跑。0 Provider、0真实 Native、0生产写入。

## 2. v789：返回控制权不应丢掉成功事实

真实 e5352 `894486ef…` 已完成 Goliath 目标的条件近战概率查询：期望伤害 5.472222、期望伤亡 0.055556，两个损失状态。另一目标仍未测出。这不能证明完整两臂比较或策略更优。

e541x 的返回报告 `5e999578…` 保存了这些成功来源，但摘要构造只交付失败和最后模型引用。摘要 `c67d4991…` 因而声称两臂均未测，后续方法再次选择旧的未修好场景 ff21fe65，e5446/5447 又得到几何 unknown。这是明确的事实交付遗漏，不应归咎模型没有能力。

共享角色输入投影现在：

1. 沿实际输入引用和最近方法所有权找返回报告，不按文字猜、不遍历注入整个历史。
2. 按原订单步骤追踪已登记的 resolvedByWorkId，给出实际原生来源、参数、stateRef 和紧凑事实。
3. 失败原件与未完成步骤保留。修好的场景不自动替换旧场景；是否满足原比较条件仍由模型判断、来源审核确认。
4. 摘要与后续方法/决策角色使用同一投影；不是只改新建摘要、存量角色继续漏传。
5. 不因为一个分支 blocked 就将成功兄弟视为未测，也不因为一个成功兄弟就批准整个比较或 Plan。

门 `verify-slice272-returned-method-facts-v789.mjs` 使用实际保存的摘要输入和后续方法输入：两项 RED；首次修复误用了“仍可调度”判断，返回分支的事实被隐藏；最小化确认后改用事实来源/依赖有效性，第二次源码验证两项 GREEN。没有重跑其它已通过门；0 Provider、0 Native、0生产写入，保存的原输入逐值不变。

## 3. 实际运行边界及下一步

PID32140（v788）已正常保存退出，e5451/w547/r3，0 running/pending，journey paused、failure=null。这是工程装载边界，不是用户暂停或目标完成。

下一加载 v789，沿原 Run 继续：读取已完成测量与正确场景 → 只补必要未测部分 → 对照真实条件做比较 → 战略作者实际修订或有依据保留表与 Plan → 正式审核。不得把重复探查包装成新策略进展。若返回成功事实后仍反复重复，须看当前实际请求/责任链，不扩大为整场模拟。

## 4. Harness 记录

- harnessLoopUsed: true
- targetGames: StarCraft TMG
- promptPackRoutes: 现有 roster_workflow_experiment_planner / fact_summary / strategy_decision / Teach，共用角色输入投影；不新增战略偏好。
- harnessToolsCalled: 正常产品 probability / inspect / 私有场景工具；定点门只读取原件及调用协议函数。
- uiTraceEvidence: 本批无新 UI 验收；运行仍为与 Web/App 共用的产品工作流，不是另造实验执行器。
- agentDecisionEvidence: 上述实际模型/工具原件、原始脱敏请求仍在原 Run artifacts。
- memoryTraceEvidence: 假设实验与在线战局记忆隔离；没有发布为真实对局经历。
- trainingTraceCandidates: 工程错误与修复证据可作回归样本；本批未产生可直接晋升的策略训练真值。
- rollbackOrDemotionRules: 未测不等于零、快照不等于到达、单臂成功不等于比较通过；原来源可回溯，不自动晋升 Skill。
- userVisibleChecks: 本报告说明每个实际错误、来源、修改与验证边界；完整最终中文流程报告仍待真实最终产出。

## 5. v789 真实效果与 v790 权限统一

v789原任务实际发出的请求已含 returnedMethodFacts；e5463 `fedb220b…` 明确识别 Goliath 已测，e5483 `542fa429…` 改为读取该实际估计而非重新测量。说明新增事实确实送达并影响了下一步，不能只用门禁推定。

同一轮还暴露源合同矛盾：源故障指令要求先应用 formation_scene，局部输入修复权限却只许 inspect/spatial/probability，实际新请求被 `ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED` 拒绝。v790新增一个纯数据合同 `pregame-query-repair-contract-v1.mjs`，源实验室、旧故障投影、角色权限共用：

- 仅明确 `pregame_hypothetical_geometry_repair_v1` 的源故障允许私有 formation_scene 前置；不开放新scenario/native_action/跨回合。
- 先读同题已完成修复来源，模型可明确选择已有修好场景，避免重复构造；Host不替模型改stateRef或宣称不同条件等价。
- 原查询完成后禁止继续生成队形；同状态武器备选查询的已有语义不变。
- 全部参与者及场景范围仍由原生边界检查，准备动作不算父测量完成。

定点门 `verify-slice272-source-repair-permissions-v790.mjs`：真实旧请求先RED；修复后权限断言通过，但原模型另有 selection/selections 字段错误，测试错误预期“整单通过”。保留原请求并纠正该断言，只补尚未通过的部分一次GREEN；原错字段仍准确拒绝，未静默修模型。0 Provider/Native/生产写，不重跑v788/789。

PID41553已正常保存退出e5484/w549/r3，无在途请求；下一原Run载v790续行当前读取/纠错。正式数字不变。仍需证明另一侧实际测量、完整同条件比较、作者采用及正式发布，不能称全部缺陷消除。

## 6. v790 实际归还／v791 局部摘要范围

真实 e5491 `f922323e…` 已引用既存成功测量完成 Goliath 侧的局部回答，没有再执行该概率查询。其条件明确保留 repaired state、decline、20骰，不得与旧请求 close_ranks/count1 自动当作同参数。Marine侧仍读取实际域与来源，完整比较未完成。实际付费请求已含新的 formation_scene 局部权限，模型描述“此前禁止”是旧失败历史，不是新权限没接上。

本次代码自查发现 v789 将 fact_summary 接入共享来源层时，连同全局军表/决策引用目录一起带入，扩大了局部角色材料。v791将其限制为原有输入＋本题returnedMethodFacts，不继承战略材料。追加的唯一具体故障模式 `verify-slice272-returned-method-facts-v789.mjs --summary-scope-only` RED→一次GREEN；此前两项已通过门不重跑。这是本次引入问题的修正，不宣称模型因此策略更优。

PID47115已正常保存退出e5510/w551/r3，无在途请求。下一载v791同Run继续；不重买成功Goliath测量，不手动选择另一侧参数，不放行最终Plan。

已启动 PID50405，同原Run，日志 `build/slice272-product-generation-v791-local-summary-durable.log`；最近核对为初始化中、roomReinitialized=false，不能把启动当验收通过。下一先核实时进程与 e5510 后新记录，勿重复启动。

费用口径：从v788日志创建时间2026-10-20T21:37:04.946Z起，到e5510的11个完成付费调用，输入849,273、输出10,230、合计859,503 units；Provider耗时累计72.576秒，不是端到端墙钟。该批回执未带价格，人民币金额不猜测；原历史及未知费用保留。
