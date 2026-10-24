# P2/P5：停止事实修订与审核的控制争议循环

2026-10-24，T27/S272。T27 5/6、T23 33/36、余4片。正式Plan0/6、新对局0/12。

## 具体失败与原因

原B `slice272-product-generation-v645-8aBuEV` 停在r21/event11041，PID11850已退出，0在途。最后一次事实角色结果为 `43f84ca7be669514ec85ba98b01eacf8a0eab8111af2ff284fb1a3f9de2da5f4`；对应来源审核为 `8992e087bb46d4ba7682c21326d1335e0b2aa51d1952677df0611ef76ea18ce5`。

审核支持已引用的位移、后态菜单等事实，但否决“能力不可用”的解释：本次授权范围的停止条件已达到，不等于无法在任何场景测量最早到达。原到达问题仍是必要未知。旧调度将此再次交给事实角色修订，三次后无可执行后继。原件没有丢失；错误在职责分流。

## 本次修改

- `roster-workflow-experiment-owner-v1.mjs`：当前、同源、精确绑定的blocked审核，若来源检查通过，而覆盖检查否决且只保留原typed inquiry的必要问题，返回独立 `source_control_dispute`。保留原结论、双方原文、问题分类、来源身份；不改成answered，不认证能力缺失。
- 同模块的作者续行工厂将争议及审核原件加入现有战略作者入口。作者决定不同的有界方法、修订所依赖的计划主张或有依据的条件性保留；Host不选策略。
- `roster-decision-workspace-run-v1.mjs`：普通调查和多域汇合共用原有 `returnInvestigation`；这种争议在首次出现时就停止事实修订，不等待三轮，也不增加纠错轮数。使用既有hold/幂等交接，不建立第二套流程。
- 新事实缺口、来源否决、错误原件、过期作用域和无typed问题身份，不走此通道。它不是所有循环类型均已覆盖的宣称。

## 定点验证

仅新增针对本次真实缺陷的 `scripts/verify-slice272-source-control-dispute-v967.mjs`。

1. RED，PID29715，`build/slice272-v967-red.log`：实际仍是requires_revision，未退出重写循环。
2. 修复后PID30616，`build/slice272-v967-green.log`：真实争议/首轮即交回/原问题保留及错误来源、新缺口、错误身份等拒绝分支通过。产品Run部分遇到离线夹具缺失历史场景恢复方法，不是生产缺陷。
3. 只修该夹具并补剩余项，PID31274，`build/slice272-v967-remaining.log`：保留全部工作图/证据/结果，只省略本测试不验证的Native恢复事件；实际Run创建一个战略作者、hold原事实任务、保留r21及原必要问题。冷恢复不重复派发、不新建事实修订。前段已通过项不重跑。

离线检查均0Provider、0Native执行、0生产状态写。原模型回复、审核否决与费用不改。没有运行无关门禁。

## 真实产品观察

通过上述检查后，确认原生产仍r21/event11041、0running/0pending，使用同产品HTTP客户端恢复原B：PID32197，日志 `build/slice272-v967-control-dispute-1792774083036.log`。未使用网络恢复开关、未清轮次、未新建房间或导入替代Plan。

真实调度已创建一个strategy-frontier，并hold原事实任务，没有创建第四个事实修订。作者输入 `4a3366dc0106ec21ab3e8b2eb2f558b3855b545b8989f65f85564ad0add6ba5e` 保留双方审核原文、来源和resolved=false的原问题。

### 真实请求暴露的遗漏与补齐

首请求 `1162532efee50d67ff40b83deee9ffbe573580efb02bfa3f89194b1a0cf5bd37` 已包含source_control_dispute，但没有strategy_owner_assignment。新returnReason漏接既有作者上下文投影器；旧事实角色约束仍作为当前输入而非历史材料。首回复 `346283202205651f90a00ec2ed9db3966f14d97b4a1967cfe94cca49eb413782` 不再重跑同实验、不再宣称能力不可用，但只保留当前Plan与必要未知，没有下一操作，被 `strategy_required_work_has_no_next_step` 拒绝。

发现后对32197请求一次SIGTERM，等待当前产品操作保存退出，没有强杀或并开进程。补齐 `roster-workflow-strategy-owner-context-v1.mjs`：只识别同负责人、当前审核原件、全部非批准标志匹配的新控制返回，进入同一作者分块器；旧事实任务归历史，当前争议与未解保留。新具体缺陷脚本 `verify-slice272-control-author-delivery-v967.mjs`，RED36172→一次GREEN36598（logs `slice272-v967-delivery-red.log` / `slice272-v967-delivery-green.log`）。验证了真实输入以及实际角色executor的发出请求，不只测函数；0Provider/Native/生产写，既有已过门不跑。

捕获的请求字符637062→925811，后者包含已经补读的原件及纠错内容，阶段不同，不能作为等价性能比较，更不能称本次分块已降本。只证明正确作者职责节点与争议进入了实际请求。该补齐尚未由新进程真实加载。

### r21→r22：实际发生了修改，但没有证明策略更好

安全退出等待期间，原产品当前操作通过既有纠错发出第二请求 `639ed40609f93c31495a70ee6b0008478dd733de13ebf2edf892b62e5014de75`，回复 `8af48f93e8cfbe81991140fa55687325b26d6978a4446e868322ca0b101db570`。结果 `c18a6d7d8f858688b5d5b0a110e1db69dff8605487361d22c08cec09ff2e50a8`，提交回执 `27b7302c2d09c4c2a5fd5eb821ee1665a8f2dfe032a2f476cab81aaf7b5a7265`，草案 `9eec1377a600fff9a2ccd78b035626d90d920ca31196db426350da93b41b61d4`。

- 军表逐值不变；scoreRoute路径、计分规则文字、fallback不变。
- 目标由第2/3/4/5轮末累计2/5/9/13，改为第3/4/5轮末累计2/5/9。
- 原到达问题仍是necessary_fact。没有新实验，也没有实测第3轮到达。
- **未解决的来源风险**：第二回复把“未测得第2轮到达”写为“测得不存在第2轮到达”，这是错误推断；原r21 scheduleStatus本来也是declared。不能把调低目标称更好策略或把提交成功称来源审核通过。下一应核对这一实际理由和受影响审核如何处理，不重复本题事实改写、不强制继续降低目标。

两次调用总478324 units（195605+282719），Provider latency合36.677秒（19.391+17.286），不是全链时延；保留历史费用，未在本报告猜测人民币价格。0新Native/新房。PID32197已确认退出，原B最终event11134/r22/0running/0pending；本轮无新进程。正式Plan0/6、新对局0/12。

若再次出现同问题、同证据、无有效决策或状态推进的循环，立即停止受影响链路，不能以重启/加轮次继续。

## Harness证据边界

- harnessLoopUsed: true；targetGames: starcraft_tmg。
- promptPackRoutes: experiment planner → independent source review → existing strategy decision。
- harnessToolsCalled: 离线只读保存原件与实际Run调度；真实产品恢复观察另记，未声称新增Native测量。
- uiTraceEvidence: 本轮无新UI验收；使用Web/App共用产品Run，不改变前端接口。
- agentDecisionEvidence: 原事实结果和审核原件均保留；新真实作者决定待观察。
- memoryTraceEvidence: 原问题与来源持久保留，不写入实际对战战史。
- trainingTraceCandidates: 无，未发布条件经验或训练真值。
- rollbackOrDemotionRules: 若交接丢失问题、接受未核能力断言、重复派发或绕过新事实缺口，停该路径修复，不能放行Plan。
- userVisibleChecks: 同一争议不会继续派事实角色重写；正式Plan仍未准出。
