# T23/S248 + T27/S272：运行时自修复架构诊断

后续实现见[同日源码交付](ticket-23-slice-248-runtime-self-recovery-source-delivery-2026-10-08.md)：8生产文件及5项唯一红/绿检查已完成，原房/原计划尚未更新、完整实验链仍0/3。下文“0生产代码”和代码行号属于本次实现之前的诊断阶段，不应作为最新源码状态；不改写其原始证据。

## 结论和范围

2026-10-08 用户要求重新审视反复 High 是否源于架构，并要求真实人机运行时能自修复。结论：存在明确架构缺口。目前已有持久决策、Planner→查询→Action、部分格式归一化、语义纠错、规则实例化和回放能力，但尚未组成完整的自动恢复闭环；不能声称已具备无人干预的稳定完整人机对战能力。

本轮诊断使用 diagnose、codebase-design、agentic-harness-evolution-loop。只读现有真实失败、代码和本地产品状态；不创建代理、不新增模型请求、不重跑任何已通过验证、不修改生产代码或移动规则。不能以“降级 High”“增加重试上限”“直接删掉检查”替代恢复设计。

## 当前实际状态

- T23 **33/36**：余 S248 原完整无计划对局/整步性能，S249 同表同图带计划对照，S250 截图报告/复盘。原 Room/SQLite 不变，宿主41291/54477 HTTP200。本轮续跑到 r81、第2回合 Movement/player1、0–0，81接受动作、216记录调用、47,014,840 reported units、估算约¥69.836819；尚未终局。连续截图驱动61465因新 High exit1，不是还在后台对战。
- T27 **5/6**：余 S272 两类2000分军表的地图绑定计划准入。原工作台64615/57909 HTTP200，同 workspace-data/冻结地图和来源。固定表 v6、从头表 v4 都已真实生成；军表/首次进场回合不变。固定表新审核完成，8条 High 均围绕 Goliath 未知通路误写成排除结论，仍未准入；从头表新审核失败于发送状态不明，不能说审核通过，也不能直接再发送。
- 固定表本轮28→36已保存回复（1次修订、7次审核回复）；从头表Teach24→25已保存回复，另有一次未确认发送的审核，不能记为确定0费用。Builder journey与Teach分账，保守价格快照估算不等于实际扣费。
- 完整实验链仍 **0/3**。选定9官方+2经典地图配置保持，18经典图仍后置；不冒称全图/所有规则真实对局全量验收。

## 四个假设的代码核对

### 1. 错误严重程度与恢复策略混在一起——确认

`packages/online-agent-session/agent-agent-experiment-orchestrator-v1.mjs:195` 根据 Critical/High 直接计算 integrationBlocking；`:486` 遇到该值立刻 blocked，后续的 recoverableFailuresPerState 路径无法处理它。`:543` 只有显式 Provider retry 且在 transport allowlist 中才允许恢复。

因此“一个动作参数多次无效”与“规则或回放权威损坏”最终可能同样停整局。拒绝非法动作是正确的；没有先在当前动作范围内实施恢复、改选和重规划，是缺口。

### 2. 参数合同和纠错反馈不匹配——r81真实证据确认

原r81三条已付 Action 都选择 Jim Raynor 的 Orders：

- 提交 targetUnitId=`player1-marine-3`；当前域 target enum 实际只有 `player1-marine-1`、`player1-marine-2`。
- 提交 choice=`remove_activation_marker`；当前域该选择需要2CP，其 paymentCardInstanceIdsByChoice 是 `[]`（没有可用支付组合，不是许可空付款）。
- 三次只在付款卡`[player1-tactical-3]`与`[]`之间改动，目标和选择不变。
- 三次都返回 `BATTLEFIELD_ASSET_ORDER_CHOICE_INVALID`，proposalValidationRounds=3。不同付款参数使 repeated failure signature 不同，不能表示有实质进展。
- 回执将它标为 implementation_error、mayRepairSameChoice=true，却 failureDetail=null；repairContext 主要是 leadingModel/path/coherency 等几何字段，没有合法 Orders 目标、支付组合、被违反字段的针对性反馈。

外层结构化输出中 parametersJson 是字符串；外层通过格式检查不意味着里面满足当前域。域也把没有可用支付组合的 choice 与可执行 choices 一起列在 enum 中，语义需要消费者额外理解。这两点加上无针对性的反馈，形成了盲目反复修参数的失败路径。

`live-flash-decision-port-v1.mjs:8039` 到上限后直接返回 High；不是一个尚未进入规则器的网络失败。规则器正确拒绝了非法提交，不能为恢复流程而把 Marine 3 替换成另一个目标或把移除标记偷换成其它 Orders 效果。

完整只读提取：`build/slice248-daybreak-resume-web-JgsoAG/r81-runtime-recovery-architecture-readonly-diagnosis.json`。原付费输出、候选域和回执未改写。

### 3. 计划补丁没有闭环覆盖——确认

普通修订已经补上共用 verified-plan-facts/inputHash 接线，新版本相对领先10VP解释也确实正确；这不等于全部旧断言都会更新。

`roster-strategist-runtime-v1.mjs:3536` 检查输出 componentPurposeRevisions 的目标存在/不重复，再只替换这些目标；没有要求被此次 High 指向的所有 claim paths 都有“已修复/有证据保留”的结果。固定表v6因此仍继承部分旧 Goliath组件的“certified reachable=false / excluded”文本。新审核明确拿 reachable:null、unknown、unreachabilityProven=false 对照，检出8条 High，实际是同类错误传播在多个组件，不是8个独立规则缺陷。

定点 claim repair 当前仅支持 agent-scheduled schema，不支持 fixed-roster 同等路径（`:3086`）。已有 review、ordinary revise、targeted repair 不能说是统一的两类计划自修复链。

### 4. 写表发送状态不明缺少接通的恢复接口——确认接口缺口，原请求结果仍未知

`roster-planning-secure-deliberation-factory-v1.mjs:270` 把未证实“未发出”的异常归为 AMBIGUOUS_DISPATCH_STOP；该 factory 暴露 createForRun/descriptor，但没有给 workspace 暴露对账恢复接口。`workspace-service-v1.mjs:1855` 对这个失败只拒绝下一次 review，提示 requires reconciliation。

对战 live port 已有 `reconcileProviderCommitUnknown`，不能说全系统完全没对账；问题是写表/审核未共享到这个闭环。不能盲目重发未确认请求。当前 catch 的 paidProviderCall=false 也不能作为“确定没有费用”的证据，应保留可能已付/用量未知直到对账。

## 统一修复：一个运行时恢复 Module，不再逐个错误堆外部补丁

Interface应返回三类结果：可验证执行的决策、仍在自动恢复的进度、确需人工/外部恢复的阻塞。调用者不再根据 severity 自行决定是否重发或停整局；同一模块内部按错误类型、影响范围、可恢复证据、已用轮数做决策。人机与机机的机器席位必须跨同一 seam。

### 五个具体交付物（同一工作，不另拆多个 Ticket）

1. **统一错误/恢复合同**：severity 与 kind/scope/recoverability 分离。参数/字段错误、权威状态变化、策略断言、传输失败、规则引擎/回放损坏分别处理；High保持记录，恢复证明后关闭，不靠改级别或清历史放行。
2. **规则域到模型提交的动作编译器**：从当前 Rules 域生成真正可执行的 choice/target/payment 组合。有限参数选不可变 optionId，执行端 materialize；自由队形/坐标走意图求解和实例化回执引用，不把所有动作退化为固定模板。JSON字符串不能充当严格参数合同。所有结果仍走 Preview→Apply→Replay；不能自动修成另一个战略含义。
3. **有进展的自动恢复状态机**：无歧义字段修复→带 field path/allowed values/actual values 的同意图修正→排除失败组合并改选当前合法候选→必要时重新规划。每次必须有新约束或不同候选；同原因最多三轮，不重启清零。规划目标/风险/记忆更新被保留，不能默默用 Pass 掩盖失败。当前合法替代动作没有权威证明时不能执行。
4. **两类计划共用的定点 Teach 修复**：去重 High、列受影响 claim paths 和引用依赖；每个必须返回修复或有证据的保留决定，未覆盖则仍是未修。只修受影响文本/派生算术，不重新写军表、不重写已通过的其它内容；fixed与agent-scheduled使用同一外部 Interface/不同内部 Adapter。按改动范围核验；未通过的新版不替换可用旧版。
5. **共用的持久请求对账与同房恢复**：请求标识、发送/返回/入库状态和当前决策进度落盘，已有返回优先本地重放；未发出可受控重试，未知已发出先对账。Provider不支持幂等/结果查询且原请求结果确实无法确认时，明确报告“需处理”，不能声称绝对只计费一次。游戏Apply用既有幂等/版本控制，不能重复执行。写表审核也接入，不保留只有提示文字而无恢复路径的状态。

不是让运行中的模型自动改代码。运行时修的是自己的提交、计划、候选和请求状态；规则核心真的坏了、密钥失效/额度耗尽、没有任何可验证合法方案、请求结果不可对账时，仍必须安全停止并告知。

## 准出和顺序

先做以上统一恢复工作，再恢复原r81，并继续同房无计划对局；之后同表带计划对照和复盘，顺序不变。不能把源接线小门通过当作整体稳定。

只用已有真实失败建立直接相关信号，不重复旧绿：

- r81 Orders非法目标/支付：明确指出字段错误，排除不可付choice，能改选合法动作；规则器从不接受原非法提交，不反复买相同失败。
- 固定v6的8High：覆盖全部受影响组件；未知仍未知，source不支持的排除断言消失。两类计划军表/首次进场/schedule保持。
- 从头v4发送不明：先获取已存请求证据与最终状态；不盲目重发，原可能费用不丢。仅真实具体bug允许补新的定点测试。
- 正常同房多步 + 断线/重启后恢复：界面恢复进度、每步实际Apply/Replay和截图完整，不要求用户代替AI挑选动作。

遵守每次改动只运行一次相关验证、旧绿不复跑、三轮不收敛停止报告。最终至少完成同人机机器席位入口的一场真实完整对局，才能宣称完整对战稳定；恢复成功率、重复失败率、重复执行/计费、策略降级次数和整步P50/P95另行实测。当前没有足够数据宣称100%自修复或整步一分钟。

## 本轮可观察性和边界

harnessLoopUsed=true；targetGame=starcraft-tmg；涉及planner/action/final-plan-review；tools=只读SQLite提取/原回执/本地HTTP状态；UI证据=原81步截图，未重跑浏览器或声称新UI通过；memoryTrace=原存储保留/本轮不写游戏记忆；trainingTraceCandidates=0；production source changes=0。

开发控制REPL此前因持有多个完整历史又解码整份记录发生堆内存退出，这与r81规则参数错误是两件事。此次用独立只读进程提取紧凑失败证据，exit0，两个产品入口HTTP200；不冒称证明生产服务没有任何内存风险。过程宿主/房间没有重新初始化。
