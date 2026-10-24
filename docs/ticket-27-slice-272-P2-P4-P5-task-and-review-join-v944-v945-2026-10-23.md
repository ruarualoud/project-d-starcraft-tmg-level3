# P2/P4/P5：任务不丢失，多域修复由一个作者提交

## 当前结论

T27/S272，T27 5/6、T23 33/36，余 S272/S248/S249/S250 四片；正式 Plan 0/6、新对局 0/12。A 未启动。

本轮不是重做旧实验，而是沿新产品流程定位并修复两条实际导致重复的工程边：

1. **v944：适用性问题被公共入口覆盖为空。** r18 的真实调用本来要求只检查旧比较是否适用，实际 prompt 却没有该问题，随后又改了一次同一用途，产生 r19。
2. **v945：单域作者抢先使其他域失效。** 已存在联合修订汇合点，但通用调查交接抢先创建单域作者。r17 组件用途先改成 r18，尚未处理的反制等任务随版本变化失效。

这两项均已有实际失败复现与定点修复。B 原目录当前从 event8912/r19、0 在途继续，PID3533，日志 `build/slice272-v945-joint-review-live-1792740251473.log`。原 PID72895、91637 均保存当前操作后退出，未重建、未清账。实际联合作者消费与全 Plan 收敛仍待，不以测试通过替代。

## 1. 实际请求证明：不是单纯模型重复

原件目录：`build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/artifacts/`。

| 步骤 | 实际输入／输出 | 变化和结论 |
|---|---|---|
| r17 → r18 | 组件用途作者结果 `d7c1eb0e99dd4996d6cc4285f8a34808b7bc525b4204a70c926e29c2ae3a9cd6` | 八项用途修订；军表不变；其他审核修复尚未合并 |
| r18 适用性派发 | 工作 `…:purpose:v2:closure-reconsider:r18`；请求 `05cf70a33f60570ee53816e2cfd78b991bf6e00ff2add209dfbd39970b5b548c` | 实际 `workflow_role_assignment.inputs.question` 只有 `source:literal`，没有 value |
| 重复修订 | 结果 `7550d906fd45a5acb99b91ef3f30e68fa8680da9a82f09be5ead815fb39210d2` | 再次解释 Goliath 阈值、替换 Builder 引用，r18 → r19；没有新路线、部署或军表变化 |
| 局部审核 | `dfc0ab94d328c181e6e5f91710ae4102c57b576d486d9bc2efb140e7a7a782e6` | 三项支持本次有范围保留；仍不是整份 Plan 通过 |
| r19 Teach | `eb080f7ad807b15861d32b08e9c595673b4d67b190384a8ecf94d0b8ed49acc1` | 不再要求编辑 Goliath 用途，转向到达轮次／控制范围 |
| 作者 | `fd4d951479a8cef17b0e476beb6b5a3f5d9e3a79e791ef51178e7bc9614d68ed` | 明确保留已有取舍，授权两项调查；没有新的 Plan 提交 |
| 调查 | `08c9adc66eb1f70d6a7b9f0d2428b7b6a71a68e830b98795aca40ebfa04c0e4b` | 读取来源后返回 blocked，0 个 workOrder，声称工具不能测到达／控制范围；此能力缺失解释尚未被证明正确 |

原 prompt 与公开回复都通过上述结果的 `originalReplyRef`、工作 `operationState.calls[].requestRef/replyRef` 可定位。不是手写模型答案，也没有输出隐藏思维链。

### v944 原因及修法

调用方写 `inputs.question={source:'literal',value:问题}`，但公共 `requestDecision({question,inputs})` 在合并后无条件写入 `question:{value:question}`。顶层 question 未传，因此覆盖成空值。

- 调用方改用统一顶层 question，原任务内容不变。
- Decision／Teach 共同的入口接受既有 literal 写法且无损保留，两个位置有冲突或确实没任务时在发模型之前报出，不替模型编问题。
- 旧空任务与回复保留，不篡改成“当时已经正确交付”。

此项只证明任务传递错误及修复，不证明它是所有重复的唯一原因。Plan 变更后的适用性复核仍必要，不能自动把历史通过当当前通过。

## 2. 联合修复：先汇合，再写一份 Plan

### 原来实际发生的顺序

`r17 六域审核 → 五个修复域 → 组件用途先返回 strategy_required → 通用机制派单域作者 → 改用途提交 r18 → 其他旧版本域和反制作者失效`

代码同时已有 `review-resolution:r17:decision` 联合入口，但它只等待所有事实被接受，作者选择类返回不能进入；单域通用入口却能抢先提交。这与 P2 分块查证、P4 联合决策的设计不一致。

### 修复后的顺序

`各域独立查证／补读 → 各域到真实控制返回点或来源审核通过 → ONE 联合作者 → 一次联动修订／有依据保留／授权剩余调查 → 受影响审核`

- 仅带 `resolutionGroupId` 的审核域交接进入联合作者，不影响一般实验的独立事实续行。
- 通用交接仍使用同一窗口、能力返回、来源争议判断；投影模式不登记成功、不发模型、不写状态。
- strategy_required／blocked／窗口返回可以交作者决定，但不是已核事实；联合输入显式标记 `factsApprovedByHandoff=false`、`planApproved=false`。
- 声称 answered 的事实必须先通过既有独立来源审核，不能借“控制返回”绕过。
- 只读取该组当前最新负责人，不用旧已完成答复冒充尚未完成的新答复；同组只创建一个作者，冷恢复幂等。
- 不自动完成原问题，也不让作者忽略地图、支付或控点等必要未知。

## 3. 单步验证与夹具问题，如实区分

所有测试只写内存状态和测试结果文件；Provider=0、Native=0、生产状态写=0。没有全量测试、已通过门重跑、新代理、删除或提交。

### v944

`scripts/debug-slice272-decision-question-v944.mjs`

- `build/slice272-v944-decision-question-red.json`：真实公共 Run 确实把已提供问题覆盖为 undefined。
- `build/slice272-v944-decision-question-green.json`：一次三项通过——嵌套任务保留；Decision／Teach 同合同；冲突或缺任务不派发且旧记录不改。

### v945

`scripts/debug-slice272-review-join-v945.mjs`

1. `build/slice272-v945-review-join-red.json` 首次夹具错误：缩小工作图却保留全图派生页目录，造成同 ID 目录冲突；不是目标 bug 的有效复现。
2. 修夹具后 `...-red2.json` 有效复现：一个域完成而兄弟未完成，仍生成一个会写 Plan 的单域作者。
3. 产品修复后 `...-green.json` 中第一项“等待兄弟，不抢写”通过；汇合部分失败。其第二项看似通过，但夹具修改了保存对象却没重载 Run，实际仍测试旧状态，**不将其计作有效来源隔离证明**。
4. 采用用户已有明确修复后一次补验许可，只执行 `remaining`：每个注入分支按公共 Run 冷恢复读取；`...-remaining-green.json` 三项通过——未经独立来源审核的 answered 不汇合、全部控制返回只建一个联合作者、冷恢复不重复／不改原件。已通过的第一项没有重跑。

这是分段完成的证据，不能把含失败的文件名 green 当整体通过。

## 4. 当前剩余问题与下一步

**真实续行追加**：同 PID3533 已到 event9000/r19，创建六域最终审核；作者 `90510d77fc1b00e95ec59d529ee05ec05c115f5f3f7d5afb18c72bca16e95047` 实际 retain、mutation=null、保留两项 requiredData 和 capability_unavailable，不再为本次回交编辑用途。未批准事实／Plan。

但原作者仍明确声称 `firstRoundInitialization capability path is missing`，此句已由同源原件反证：`2a76205ae51e63dc2737e8f3d21c36b9fde0a007716e38f912af1403c7262b2e` 的 `/operations/7/specContract/capabilityContracts/firstRoundInitialization` 明确存在，并声明可通过原生首轮初始化、选先手、部署／移动链取得条件到达见证。另 `/operations/4/queryContracts/mission_marker_control` 标为 `domain:optional_candidate`，全部选择字段是 optional，不能把“必须先有domainId”当不可查询依据。**这些只反证泛化的能力缺失理由，不证明所有路线可达、最早轮次、未来控点或这次 Plan 可行。** 当前待查：blocked 能力主张没有独立来源审核就交给作者时，是否会持续传播假前提；先观察当前审核回交，必要时修这条职责边，不手改原答。

最新调查把历史冻结源的 pending_terrain、不能跨回合和不能证明最早到达，组合解释成“控制范围与到达均无可用路径”。这还只是模型输出，未执行新 Native 试验；不能据此认定工具真的不支持，更不能清掉必要未知放行。

下一步沿当前职责交接核对其实际原件、首轮初始化／局部到达能力和 Rules 控制判定来源；若具体工具确有缺口再修同一产品能力。禁止为证明计划自动模拟整场未来比赛。等新的最终审核修复组出现时，要观察 v943 当前章节交付和 v945 单作者汇合是否实际生效。

旧摘要 1980/11 升级、未完成的反制和地图事实仍不算解决。军表当前合法2000矿/145气并不证明策略胜率或整流程可用。

## 5. 调用量及 Harness 边界

具名段“r18适用性作者＋其审核＋r19 Teach＋作者＋调查”共14次：输入1,918,557、输出21,938，总1,940,495 units，Provider延迟合计165.851秒。它是已保存的这五项工作之和，不含后续战略返回，不是端到端耗时或整个项目账单；旧费用及未知费用继续保留，没有拿到服务商实际人民币账单。

- harnessLoopUsed：true；targetGames：StarCraft。
- promptPackRoutes：strategy_decision／local_teach／final_review／experiment_planner。
- harnessToolsCalled：公共 Run enqueue／synchronize；生产继续同一 HTTP 产品生成入口，测试未调用 Native。
- uiTraceEvidence：无新增 UI／对局验证；不能把本轮当 Web 验收。
- agentDecisionEvidence：上表原作者、Teach、审核、调查结果及其原始请求／回复。
- memoryTraceEvidence：原事件和原件保留；不将条件场景／能力缺失解释写成真实对局记忆。
- trainingTraceCandidates：本轮未晋级训练真值。
- rollbackOrDemotionRules：若联合输入遗失某域、未审事实被批准或旧任务被改写，撤下该新调度边，不以清历史、手填理由或重置轮次解决。
- userVisibleChecks：定点修复已过；最终可读 Plan、策略提升、真实全流程收敛仍未验收。

## 修改文件

- `packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs`：统一问题入口；审核分组交回唯一联合作者。
- `packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs`：适用性任务使用正确的顶层 question。
- `scripts/debug-slice272-decision-question-v944.mjs`、`scripts/debug-slice272-review-join-v945.mjs`：仅复现并验证上述两个真实 bug。
- 本报告、CURRENT_WORK、TASKS、PROJECT_MEMORY：记录实际恢复点、证据范围和未完成工作。
