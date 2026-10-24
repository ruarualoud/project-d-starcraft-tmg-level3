# T27/S272 P5：磁盘日志增长与未发出请求恢复 v926–v927

## 已完成

本轮修复两个明确工程问题，保持同一 P0–P6 产品链路、原 A/B 工作流、规则、军表及模型；未启动对局。

### v926：重复状态日志增长

实际 A 有483条历史工作，一条状态改变原来重复输出整条工作列表，约192,980字节；同时写入 observations 和 stdout。它们不是原始模型/工具证据，却随查询和修订反复增长。

- 抽出客户端观察器，记录全局计数＋真实发生变化的工作（前后状态、错误完整保存）；启动只列未完成工作，明确标记不是完整历史快照。
- 不改变产品状态、prompt、工具、费用或模型选择；完整历史仍在 workflow events 和不可变 artifacts。
- 同一个实际历史目录上，单次变化记录降到1,184字节，约减少99.4%。这个比例只代表**客户端进度日志**，不是整个磁盘或 Token 用量。
- 未变化轮询不写；终止/错误即使工作列表没变也保留；新增与异常移除可见。
- 唯一既有日志读取验证脚本读取固定旧日期/旧目录，原文件未变，不受新格式影响。

验证：`build/slice272-observation-growth-v926-red.json` → `...-green.json`，一次RED/一次GREEN；无模型/Native/生产写，无已通过验证重跑。

### 用户批准的清理

用户明确批准后，删除48个指定重复日志，释放268.66 MiB。未删源码、原始请求/回复、工具证据、费用、断点、报告和截图；删除的逐行日志不能原样恢复。

- 起止/异常摘要：`build/approved-v926-status-log-summary-1792715509470.json`
- 精确删除清单：`build/approved-v926-status-log-deletion-1792715509470.json`
- 脚本只接受两个指定 observations 文件和 build 顶层 `slice272-v9xx-*.log`，拒绝软链接、非文件或读取期间变化的目标；先保存摘要再逐个删除，不递归删除目录。

### v927：未发出请求被误当未知执行

磁盘写满退出后，核心把所有 running 工作统一转成 `DISPATCH_OUTCOME_UNKNOWN`。但已知只读角色在调用模型前必须先持久化 pending；有些断点明确尚未发出新请求，不能与真正不确定收费的请求混为一类。

实际边界：

- A event6809/r4：新一步 dispatch 前，上一调用 `e719b391…` / `9faaddca…` 已完整保存，上一 continuation `11bbd93e…` 明确消费该回复。当前无 pending，也无新的已完成调用。
- B event7309/r11：当前首次 dispatch，尚无 operation/call/pending。

实现：

1. 由**实际只读角色执行器**提供恢复证明，不由通用核心猜测所有工具都安全。
2. 校验当前 dispatch/input/绑定及已保存来源。仅允许首次尚未调用，或上一付费回复已明确归属于先前完成的 continuation。
3. 原生工具、在途请求、过期绑定、错 dispatch、缺失来源、未证明已处理的付费回复全部仍不自动续行。
4. 产品 Run 将同一证明接入核心恢复；只恢复 ready，不清调用/费用/纠错次数，不改原结果。新增结果事件记录 Host 所见的付费回复引用，便于后续精确判定。

验证：`build/slice272-unissued-read-role-v927-red.json` → `...-green.json`。RED观察工具超时后读取同一次已完成报告，**没有重跑**；一次GREEN覆盖实际A/B及六类拒绝。所有验证均内存执行，无模型/Native/生产断点写入。

## 实际恢复

恢复前空闲约2442 MiB（除本次清理外也有外部空间变化，不归功于本修复）。

- A：PID385，原 `build/slice272-product-generation-v645-hsxEYu`，起点event6809/r4。
- B：PID403，原 `build/slice272-product-generation-v645-8aBuEV`，起点event7309/r11。
- 日志：`build/slice272-v927-unissued-resume-fixed-1792715877491.log` / `...editable-1792715877522.log`。
- 仅 `--resume`，无 `--recover-provider-once`、新房或旧计费重置。实际模型继续消费证据待补录。

## 边界与下一步

T27 5/6、T23 33/36；剩S272/S248/S249/S250共4片。正式Plan0/6、新对局0/12。A111/B17条件观察、已审0（恢复起点），不能作为已发布 Skill。

优先观察真实模型是否使用 v925 改题操作、原始比较是否推进；不能把恢复/日志门通过当成策略收敛。条件经验发布、全链路合同审核及完整 P0–P6 准出尚未完成。

本轮变更：客户端日志观察器/客户端接线；明确恢复证明/核心与真实Run接线；两个具体bug的debug脚本；获批清理脚本与摘要；本报告及项目当前工作/任务/记忆。未提交。

Harness：harnessLoopUsed=true；targetGames=StarCraft；promptPackRoutes=既有分角色流程（未改策略提示）；harnessToolsCalled=产品恢复入口；uiTraceEvidence=本轮无UI操作；agentDecisionEvidence=待实际新回复；memoryTraceEvidence=原128条观察保留；trainingTraceCandidates=0新增已审；rollbackOrDemotionRules=任何无法证明未发出的请求继续阻塞，不盲重发；userVisibleChecks=原断点恢复、日志错误可见、事实来源保留。
