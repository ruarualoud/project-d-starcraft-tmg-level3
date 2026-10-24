# P1/P2/P5：未解问题与调查授权分离

## 实际失败

同一新产品 B Run `8aBuEV`，r3、1980/2000矿，事实方法返回“不能证明未来合法到达轮次”。战略角色被三种反馈来回推送：重复原授权被拒；它停止重复并保留未知，又被要求必须授权；于是再次重复。第三次停止，不是网络失败。

只读原件：请求 `29ef2d7dc116a64d37f2cb98593995f7526fe82c5c6964dc25fdb69607632074`、回复 `13e80dfb80512841def60dc103eac502f6764b307790b5d0b8a2b31bfa0e369e`。原11个问题包含3项必要事实和2项未决作者选择；不能为了消除错误删除它们。

## 修改

1. 共享授权判定：`investigate`必须带明确授权；`retain`/实际`revise`可不授权新调查，并保留全部必要未知。相同无变化授权仍拒绝。
2. 保留后、联合修订后两个产品调度入口统一消费该判定，不能看到requiredData就自动创建新实验。
3. 非修订结果记录`inquiryDispatch`，区分调查、未解返回、没有后续；它不是事实通过或最终发布。
4. 当前角色收到同一版本化合同；旧矛盾停止仅允许一次新合同纠正。新合同失败不能反复获得旧版本修复额度。
5. Builder满分要求、未知清单、来源核对、策略比较和最终审核保持不变；不替模型改事实分类或战略。

## 单步证据

脚本：`scripts/debug-slice272-inquiry-dispatch-v892.mjs`。最终证据：`build/slice272-inquiry-dispatch-v892-accepted.json`。

- RED：实际回复因necessary_fact存在被拒，复现真实矛盾。
- 授权门：显式null不调度；合法新问题可调度；相同旧授权、缺授权investigate、作者问题冒充事实授权仍拒绝；旧合同保持原语义。已通过后继承、不重复运行。
- 恢复器最初漏掉结构化纠错入口，实际负例发现并修正。
- 完整角色注入：原付费答复→自动补读两个来源→正常continue_work→作者确认→evidence_ready。11个问题原文/分类保留，原回复不改，草稿不变。
- 发布边界：5项未解义务保留；1980/2000短缺20仍阻塞，acceptanceGranted=false。
- 测试夹具错误：第一次要求单次dispatch立即通过；第二次遗漏正式continue_work。均保留失败，明确不算模型失败。补验按用户已有“明确修复后一次”授权执行。

0真实Provider、0Native执行、0生产状态写入。注入证明工程交接，不证明新模型已正确选择下一步，不证明工具可计算未来到达轮次，不证明策略提升。A/B实际生产须同版续行；正式Plan0/6、游戏0/12，T27 5/6、T23 33/36、剩余4片。

## 同版实际消费

旧两进程退出/无在途后，原目录A55972/B55990加载v892。B实际请求`6b220f5ad4bef662a92e91b94c07d2ed7ba490d81044fa27e6bcd651251dd180`、新回复`83f5e2df01ba1337aeab2bfd60639f4ac48aa8edf2990a187102643ccdd0c45f`，结果`dc21b7a39b39e9c1d8d433426e0856bb14f63e64b6048c7a65fda83c7747cd53`。模型自己选择retain、nextInvestigation=null，保留11问题及5未解项；结果`acc0a9b30eb8e69332b06010fc4a737fffa225cfb6bfd10c07bdee7fc92f2675`标记unresolved_return、dispatch=false、applied=false。实际检查无该决策的隐式`:investigation`后继；原正常Teach/其他工作继续。没有改模型输出、没有同调查重买，费用按原账累计。

这证明原矛盾停点已真实解除，不能证明后续路线能力缺口已补、当前Plan已最终批准或策略更优。

后续实际：B决策`1e1a27037172971e2a2cba23853aab51ca83baea8ee1a59abd13a687f4d63ecd`通过联合提交`d8fa36fe29e554e20c154ca3c718ebd56a31c0d469510f345cc867eb0acf9172`，r3→r4，草稿`9d276fe8dde1d763b278b1dc5aac812539bb944b74d6d814f7fdf5599e7beebb`。未改军表（1980矿/145气/9单位32模型），只修goliath-1用途：从未证明的反装甲优势，改为说明本次固定场景单攻击2.0556低于Marauder3.6944，保留未测范围/存活/组合收益；这些只适用于实际所测武器和场景，不证明全武器或全局优劣。作者指出预算来源519已有22条合法精确补满分支，但尚未选择；满2000目标仍未达成。新r4 Teach已经启动，A仍r2联合队形求解。最终Plan仍0/6。

### 验证器字段

`harnessLoopUsed=true`；`targetGames=starcraft_tmg`；`promptPackRoutes=roster_workflow_strategy_decision`；`harnessToolsCalled=实际角色执行器/核心工作流/只读证据/发布库存`；`uiTraceEvidence=无新增`；`agentDecisionEvidence=原付费B公开回复与注入确认`；`memoryTraceEvidence=无游戏记忆修改`；`trainingTraceCandidates=0`。错误授权、丢问题、绕过发布门、旧恢复无限续期任一出现即不准出。只证明真实决策可返回且未知不丢，不宣称最终方案已完成。
