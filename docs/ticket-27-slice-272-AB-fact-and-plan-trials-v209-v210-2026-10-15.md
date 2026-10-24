# A 事实调查 / B 已存证据 Plan 修订

2026-10-15；Ticket 27 / Slice 272（未收口）。

## 本轮范围

用户明确批准两项独立操作，不启动对局、不新增一轮审核、不清零费用：

- A：只调查 `Q2-opponent-scenarios-omega-and-creep-triggers`；最多3批工具往返及1次汇总，不改军表。
- B：复用已存证据，经原产品 `/revise` 流程完成一次 Plan 修订；最多3批只读证据检索，不重新调查或模拟。

这两个操作使用不同的原工作台，可同时等待 Provider，未创建任何子代理。

## 已完成的 A 离线刷新

`common-v208-A-binding-refresh.private.json`：01:45:37.430Z–01:46:23.064Z，完成。
原产品 completed-Teach 刷新入口，绑定v3→v5，16数值/1定性/8未知引用。
Plan9、全部费用/原始回答/历史/调查均保留；新增0模型、0Native查询。
原闲置 host39300 已精准停止，未遗留新宿主。
这只刷新引用类型，并不证明 Omega Worm 原生动作可行。

## 当前执行句柄

基目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

| 组 | 一次性入口 | 进度文件 | 基线 |
|---|---|---|---|
| A | 原 `run-slice272-current-plan-teach-v149.mjs --fact-probe --run-version=209` | `common-v209-A-teach-fact-probe-progress.private.json` | Plan9 / 165calls / 29,776,463units |
| B | `run-slice272-B-saved-evidence-plan-revision-v210.mjs` | `common-v210-B-plan-revision-progress.private.json` | Plan19 / 256calls / 36,328,314units |

A observer44136/host44202；B observer46023/host46064。以上是启动时句柄；恢复前以进度文件和进程身份为准，不凭旧PID重发。

B 脚本仅编排已有产品接口，不引入新策略实现。它用排他文件保留一次请求、拒绝已有工作台宿主和未核对的付费请求，保存旧Plan与费用，完成后停在待审核；不自动调用 review 或启动房间。

## 修订边界

最新 Teach 的5条建议仍由模型判断采用或保留，而非 Host 自动改写策略。
已绑定数据不等于已验证其解释：减员保存场景的 marker1 起始/结束控制方均为空，不能被写成从已控制三点必然丢成两点的实际历史。
Orders 支付、去地形攻击估计、路线见证均须保留其原场景/时点/权威等级；不强制进攻或撤退，不以冻结快照替代战略理由。

## 结果与验收

两项原请求都已停止，没有得到新的模型回答：

| 组 | 真实终态 | 计划/已结算累计 |
|---|---|---|
| A v209 | `PROVIDER_TRANSPORT_TIMEOUT`，dispatch ambiguous | Plan9；165calls / 29,776,463units不变 |
| B v210 | HTTP400 `contextLengthExceeded`，dispatch response_rejected | Plan19；256calls / 36,328,314units不变 |

两次都没有usage回执，费用为未知，不记成免费，不清除旧账。
A的DNS323ms、TCP555ms、TLS810ms、写完请求1663ms、HTTP200响应头2589ms；读取响应体到240325ms仍未完成。不能把它误称为DNS失败或模型已完成调查。
B服务端拒绝用时13.101秒，拒绝发生在模型修订内容返回之前，不是输出格式错误。

### B v211 来源修复与一次定点验证

三项假设中，实证为重复证据展开：输入4,000,393bytes，Teach证据3,449,012bytes；当前问题列表仅28,816字符，当前总结43,704字符，查询操作27,066字符，不是这三项占主体。
原攻击结果通过原始后续回执、`computedOutcomes`及重复查询别名多次出现；Plan修订只用了投影器，未使用Teach已有同输入去重器。

`roster-revision-teach-evidence-v1.mjs`改为复用原`projectRosterTeachSynthesisPromptV1`，版本升为`current_teach_with_retained_reads_v2`，明确引用根为`experience.evidence`。每个独有值仍在当前输入里，重复对象只用指针；不把事实删到模型不可访问的档案里，不删问题、策略说明或条件。

真实B/真实修订消费者捕获：

- 第一次观察夹具错误地对比JS的undefined字段与JSON中不存在字段，失败保留，没有发模型请求；随后按实际传输JSON规范修正夹具。
- 有效RED复现同一4000393bytes输入/0去重引用；此时未改产品代码。
- 产品修复后唯一GREEN：3.723秒，输入降至1,475,149bytes（-63.1%），证据923,565bytes（-73.2%）。358处引用展开后与修复前证据逐值一致；问题/框架/当前总结完全一致；草稿与规则状态不变；0模型/0Native。
- 这证明无损输入修复，不宣称新的真实模型调用已成功。只跑本次具体bug门，旧绿未重跑。

证据：`common-v211-revision-duplication-red.private.json`（夹具错误）、`...-red-corrected.private.json`、`...-green.private.json`、`common-v211-original-revision-evidence.private.json.gz`。压缩原件只用于本次真实输入比较。

### 已授权的有界恢复（v212/v213）

用户已分别回答“允许 B 定点恢复一次”和“允许 A 受控恢复一次”。两者保留未知旧费用。
02:03:36.604Z 启动B v212（observer58421/host58467）；02:03:37.159Z 启动A v213（observer58422/host58554）。两项已终止，结果如下，不重复发送。

- B使用：`run-slice272-B-saved-evidence-plan-revision-v210.mjs <base> --resume-after-context-fix`。排他生成v212进度，核对原拒绝与已通过修复，精准停止旧B宿主再加载当前代码，复用原v210请求；不新调查/审核/开局。已通过的语法/无损门均未重跑。
- A使用：原v149入口，以v209报告为来源，`--resume-network --run-version=213`。复用同一请求的一次重发、同一事实调查额度，不新建调查/清零历史。

### A 本地恢复路线错误、v214修复及v215真实验证

v213在发送前返回`ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED`。此时`retryDispatch=[]`，授权仍为`authorized`，并未真正重发或消费额度。
原因来自产品路线选择：首次从completed阶段启动时忽略旧纠错，正确走独立fact_probe；中断恢复时phase变成investigate_evidence，被历史pending纠错误导回旧调查路线。旧纠错context是`d3a89eed...`，当前被重发的context是`426000f1...`，二者无关。

修复只改来源判断：在显式`factProbeContinuation.startRound`及之后保持fact路线；窗口外原legacy恢复不变。没有删除旧纠错，也没有放松请求正文一致性检查。

- 具体实际A红测复现`true !== false`；修后唯一绿测通过，包括原记录/授权保留与legacy窗口不变。
- 现有恢复入口接受这种“请求未变更检查拒绝、尚无重发”的停点，仍核对原未重试dispatch和同一授权；修改入口语法检查一次。
- v215继续同一个未消费授权（observer66669/host66755），不是新调查或新增重试次数。
- 真实结果证明`contextUnchanged=true`和`requestBodyUnchanged=true`，原dispatch仍在；新的retry请求为`roster-teach-framework-7049a529-ab8d-4642-8407-09c570410db6`，只指向原`d084580d-9c5a-4230-a657-a62f8df1f758`一次。
- 这次确实发出后，授权变为`consumed`。服务端最终返回HTTP503 `service_unavailable_error`，不是容量或格式错误；Provider latency23.335秒，02:15:31.312Z记录失败。没有完整模型回答或usage。

因此恢复工程错误已修并得到真实验证，但Omega事实调查仍未完成；不得把503改成成功或继续使用已消费授权。

### B v212真实结果

新输入调用没有再返回上下文400；收到HTTP200响应头后正文未完成，在240.378秒超时。
DNS377ms/TCP594ms/TLS868ms/请求写完2258ms/响应头3750ms；不能误称为DNS解析失败。
02:09:09.555Z保存`PROVIDER_TRANSPORT_TIMEOUT`。请求`roster-revision-d4b34333-db84-4147-8b1c-279e507a2064`保留为ambiguous/未知费用，未产出Plan20。

### 本轮账本与后续

本轮实际发送B1次、A1次；A v213本地拒绝为0发送。两次实际发送都没有usage，费用未知，不能写成零费或清零。
A仍Plan9/165已结算calls/29,776,463units；B仍Plan19/256已结算calls/36,328,314units。原400与旧timeout也保留。
当前两个原工作台宿主空闲，所有对局停止；本轮不再追加付费请求。仍需A实际事实结果、B实际修订，随后才能判断计划准出；服务恢复不能以本轮结果推定。

B真实修订完成也不等于新Plan已通过独立审核；A调查完成也不自动代表原未解消失。
四局继续停止；T27 5/6、T23 33/36，主线余272/248/249/250共4片，完整对局0/12。

## Harness 记录

- harnessLoopUsed: true
- targetGames: starcraft-tmg
- promptPackRoutes: fact_probe_prompt / roster_plan_revision
- harnessToolsCalled: 原工作台Teach独立调查、原Plan修订、retained_evidence（是否实际使用待结果）
- uiTraceEvidence: 本轮后台接口，无新增UI验收
- agentDecisionEvidence: 原工作台publicOutputs/providerDispatches及进度文件
- memoryTraceEvidence: 原Teach回答/证据历史保留，Plan旧版本保留
- trainingTraceCandidates: 无；trainingTruth=false
- rollbackOrDemotionRules: 原生证据不足或语义解释错误不晋级；保留历史，禁止盲目重试
- userVisibleChecks: B重复输入无损证明、A恢复路线实际同请求证明；当前A503/B正文超时，旧账完整；新Plan和Omega事实结论仍未得到

## Diff 摘要

- 1个产品模块：修订证据复用现有无损去重器并注明引用根。
- 1个操作脚本：原产品Plan修订单次启动/已修上下文拒绝的一次恢复；不实现第二套策略或规则。
- 1个具体bug验证脚本：捕获原B输入、原件压缩保存、展开等价检查。
- 本轮追加1个框架来源修复、1个现有恢复入口准入修正、1个A具体恢复路线bug门；仅红绿各一次及入口语法一次，真实重发保持原context/body作为最终执行证据。
- 本报告、CURRENT_WORK、根TASKS/PROJECT_MEMORY更新。无新代理、依赖、删除、提交、官方数据更新或全量验证。
