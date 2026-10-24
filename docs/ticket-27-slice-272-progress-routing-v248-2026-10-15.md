# S272 v248：按问题推进，来源缺陷回流选型

## 已实现

延续 v245 的成熟 evaluator–optimizer / 工具发现 / 可恢复工作流设计，不另造 Teach 或 Rules。

- 新迭代上下文 v13：格式错误与重复查询分别计数。同一错误在没有成功决策期间出现三次仍停止；不是全任务只许三次。旧待结算请求保留原上下文。
- 晚期来源 High 可以返回原选型 Agent，查询、改完整军表或通过 `revise_plan` 只改 Plan，不再强制仅改文字。缺少选型论证也不阻挡反馈送达；但这些反馈显式 `acceptanceBlocked`，模型不能把 High 直接接受为最终 Teach。
- 来源审核按未解问题是否实际关闭判断进展，不再按“做过三份审核”停止。问题身份使用路径／类别而非答复 ID；三次没有关闭问题仍停。A 的固定军表权限不扩大，固定表的文字修订路径保留；B 可重新选型。
- 新事实调查采用动态窗口：有不同的有效结果便允许下一依赖批次；只改 query ID、复用结果不算新进展。连续两批无新证据或模型明确无后续查询时交回汇总，保留未知。工具执行失败保留请求、原因、原生修复提示，不能当策略不可行的证据。语义相关性仍由调查与最终审核判断，工程层不假装能判定策略优劣。
- 旧显式授权的有限调查、已有付费提示不自动改大。未确认的网络派发仍停止；不进行盲目重发。
- 修复实际恢复陷阱：本地重验旧答复失败、尚未派发新请求时，原代码也留下 `pendingDecision`，误变成网络未结算。现在保留“零发送重验失败”记录且不制造 pending。普通产品 Run 在旧版本失败遇到已更新合同后，可以进入一次新合同决策；同版本不收敛不会靠重启重置。

## 定点验证（不重跑旧绿）

所有证据在 `build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

1. `progress-routing-v248-fail.json`：混合错误被算作三次、High 未送达、错误接受与旧文字路由。首次后两项夹具缺地图回执和资格端口，修正后只复现那两项，保留 `progress-routing-v248-remaining-fail.json`。产品修复后一次 `progress-routing-v248-pass.json`，四项通过。使用真实 session/journey，外部端口为明确夹具，不冒称真实模型或真实来源资格通过。
2. `progress-window-v248-fail.json` → `...-pass.json`：第三份新证据允许第四批；重命名同结果不冒充进展；能力失败停止并可见。三项通过。这验证生产窗口合同，不代表一次真实模型调查已完成。
3. `retained-recovery-v248-fail.json`：零发送重验失败被误留 pending。未知请求保留 pending 当次已通过，不重跑。修复后 `...-pass.json` 仅补验零发送分支；旧 28 次计费记录／旧迭代均不变。

本地门禁 0 Provider、0 正式房间变更。没有全量测试、旧门禁重跑、规则更新或 Skill 晋级。

## 生产与剩余交付

验证后准备仅让 B 从原 r29 / 合法1020分 / 已结算失败恢复，经原 Web 产品 Run 入口使用新代码；不重建军表/房间、不清旧费用。runner 新增 `--resume-v248`，明确禁止用这个模式让 A 重生成已完成 Plan3。

仍须以真实产物验收：提前 Teach 是否促进选型、工具缺口是否得到正确处理、最终合法2000表＋地图 Plan／来源与论证均通过。窗口去重不能单独证明策略有效，也不能宣称所有工具已完备。发现真正缺失能力，记录原请求与 Native 合同并补同一工具，不手写答案或另造规则器。

### 实际启动（UTC）

- B：09:29:01 启动 PID34534，原迭代会话 `iterative-web-d9b3d71f-3134-4403-91e5-ba8828da4432`；09:31:22 已到新 `teach_framework_learn` 请求30，提示174951 bytes。这不是重建对局，也不能和旧选型请求直接作性能比较。启动前累计28次已报12999339tokens，旧未知费用保留。
- A：09:30:38 启动 PID36149，`--resume-review-v248` 只恢复原会话 `rws-7757b021-ecd7-4612-98cb-7311fc344e5c` 的 Plan3 缺失来源审核，既有完成分片走原有保留回复复用。审核完整后该模式停止，不自动修 Plan/Teach/开局。启动前累计20次已报2852481tokens。
- 两者均由原产品装配/HTTP入口执行，当前尚无真实完成结论。后续先读各自 `fresh-generation-v240/progress.private.json` 和进程状态，禁止另起重复 runner。新增用量以实际回执增量计算，未返回费用保持未知。

A 已有新 Plan3 尚未接受。四局保持停止；T27/S272 5/6，T23 33/36，主线剩272/248/249/250共4片，完整实验0/12。

## Diff 摘要

6个产品文件：`roster-progress-supervisor-v1`（新）、`iterative-roster-plan-session-v1`、`iterative-roster-flash-model-port-v1`、`agent-selected-roster-journey-v1`、`roster-teach-capability-guide-v1`、`roster-teach-framework-v1`；3个具体缺陷复现脚本；原生产 runner 增加恢复模式。无规则器、地图、军表原稿和对局代码变更。

## Harness 记录

`harnessLoopUsed:true`; game=`starcraft-tmg`; routes=现有选型/Teach/fact_probe；能力监控=实际失败请求与源修复合同；UI证据=本轮无；决策证据=接口夹具，不是真实战略成绩；memory=保留旧错误/费用/公开反馈；trainingTraceCandidates=未晋级、`trainingTruth:false`。若发生假进展、未知请求被重发、High被接受，停止新生产并保留旧证据，不回滚权威规则或覆盖旧产物。
