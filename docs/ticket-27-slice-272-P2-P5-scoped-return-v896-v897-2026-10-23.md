# P2/P5：正式归还与局部来源争议闭环

所属 T27/S272；P0–P6 新流程修复，不恢复旧大上下文调查。T27 5/6、T23 33/36；正式 Plan 0/6、对局0/12，余4片。

## 实际停点

原A84610、B84617均exit0，工作流0running/0pending，进程清单无生成器。A仍2000矿/r2，B2000矿/r5。没有重建房间、清账、手改模型输出或重跑成功Native。

- A：v895已把重复恢复分支三成员归还给唯一所有者，但公共工作图不识别methodRecoveryYield报告，因此发布库存仍列三条活动任务。它不是新规则计算失败。
- B：来源争议00caed13…已正常交给策略负责人；真实544a0271…/b80edfef…选择retain并引用572/577回答单攻击SupplyLoss方向，明确584只比较伤害，同时保留地图到达/控点未知。不是未交接，而是旧返回器要求全局requiredData为空，让已回答的局部问题无法再进入独立核对。作者不能自行批准这些事实。

## 修改

1. v896：统一工作图纳入同报告绑定的恢复让出记录。裸状态、报告不匹配和在途工作仍阻塞；三卡用途缺失不被修复掩盖。
2. v897：新共享frontier-settlement合同供调度与core入队共同使用。仅实际来源争议、精确原问题逐项answered_fact及证据、无下一调查授权、未用过该原审核争议、仍在原审核范围内时，建立一次独立同源复审请求。
3. 局部返回不清全局未知，不把作者意见当事实。必要问题仍在source-repair合同中，仅解除“必须新增原件”的身份限制；后继必须通过独立来源及问题覆盖核对。新后继继承原experimentReviewRound，不能重新获得三轮。

## 单步调试证据

| 具体失败 | RED | 一次 GREEN | 实际覆盖边界 |
|---|---|---|---|
| A三条已归还任务仍活动 | build/slice272-return-ledger-v896-red.json | build/slice272-return-ledger-v896-green.json | 实际workflow→公共图→readiness；三缺卡用途仍阻塞；报告缺失/错绑/在途三负例 |
| B局部返回被全局未知阻断 | build/slice272-scoped-frontier-v897-red.json | build/slice272-scoped-frontier-v897-green.json | 实际B回复→局部返回→core入队→注入候选结论→独立来源审核构造；原问题与轮次保留；局部未决/显式调查/重复请求三负例 |

测试仅读生产原件，状态及候选答复注入内存。0真实Provider、0Native、0生产写；未运行独立审核模型。因此这些证据只证明接线与拒绝边界，不证明B事实/策略已过审，也不证明最终Plan完成。已通过的旧门未重复。

## 文件

- `packages/roster-strategist/roster-workflow-graph-v1.mjs`：统一归还台账。
- `packages/roster-strategist/roster-workflow-frontier-settlement-v1.mjs`：共享局部返回合同。
- `packages/roster-strategist/roster-workflow-frontier-return-v1.mjs`：生成带原问题及轮次的后继。
- `packages/roster-strategist/roster-decision-workflow-v1.mjs`：同合同校验入队。
- `packages/roster-strategist/roster-experiment-source-repair-v1.mjs`：一次同源复审不等于事实关闭。
- 两条对应debug脚本与生成证据；CURRENT_WORK/TASKS/PROJECT_MEMORY同步。

## v899：真实自动纠错、比较与普通战略控制返回

所属P2/P3/P5；不是最终Plan或新对局。原A23788/B23856均已安全exit0、0running/0pending后才修改共享代码。

1. B真实两概率输入先有错误菜单指针、再缺attackerUnitId/targetUnitId；产品自动反馈、模型自行修正并执行，未人工改回复。Marauder原生结果`07fcaaa68e4ba08b7480d6f29bc9789d59be8bbd5c224fd5ed25c361974adcfd`：expectedDamage=3.694444、expectedCasualties=0.5、expectedSupplyLoss=0.5；Goliath结果`b2e79ff928469d493c3bb25594ebc6ddb8730fc6a24765986860cf2fc88e80de`：2.055556、0.111111、0.111111；各36样本、同场景同Hydralisk。比较`0d11423271ef24bf37e66ba244641874cd7d62e526b0f41046844290c07c6459`确实执行。测的是marauder-1，不是军表替换后的第二Marauder；不宣称整个替换方案优越。
2. B汇总`ef13fc625edd20c5a93d4a1ad28b0f67208e8125f051d29bc345e4138c94ae30`明确保留此范围。实验负责人`d171a414…`交回战略选择；战略答复`190deeb446e44aa24932e090a505d9a789ec210a0b5fd1c9af85939c40495359`保留表/Plan并拒绝再测相同配置实例，同时仍有3必要事实与其他选择。模型声称“相同配置应同分布”只是作者论据，不是Native等价证明。随后产品退出在事件4728，无在途；不是网络失败。
3. 根因是普通strategy_required返回与最终事实关闭混用：共享settlement仅在全局requiredData和authorDecisions清空时交回。v899允许有明确decidedHere且nextInvestigation=null的直接答复返回原负责人，附精确原问题、原答复身份和控制边界；不改答复、不批准事实、不自动开新调查、不清未知。独立来源/问题覆盖审核仍在。
4. 第一次修后核心门揭示旧sameSourceReviewRequest从owner.inputs继承到另一返回边，调度新合同和核心合同冲突。现将两类单次控制回执限定在其对应交接，继承事实但重新派生控制权限；核心核验元数据，伪造factsApproved仍拒绝。
5. 定点脚本`scripts/debug-slice272-strategy-control-return-v899.mjs`只复现上述真实停点。`build/slice272-strategy-control-return-v899-red.json`真实RED，首次修后`...-green.json`保留失败；同链修正后`...-green2.json`一次GREEN：核心接受/冷恢复不重复/原3必要事实和原件不变/独立源审构造/4负例。脚本模型候选是明确注入，Provider=0、Native=0、生产写=0，不作为真实最终审核通过。
6. A本段自动修正敌方ID、摆放失败、错误父态及参数层级/selector，最终真实同父态solver结果`4b9ae1897d61916cc69c35afb1754ddacf5c3424d4af24a2b4ea3668b03f7793`已保存；还需模型明确选择应用并完成原攻击比较。没有人工补坐标或假装攻击测量完成。

本次源码diff：`roster-workflow-frontier-settlement-v1.mjs`新增普通控制返回；`roster-workflow-frontier-return-v1.mjs`承接并隔离每次权限；`roster-decision-workflow-v1.mjs`同合同校验；一条具体bug脚本及本说明/TASKS/CURRENT_WORK。未修改规则原子、模型权重、地图、军表或历史模型回复。

原目录同码续行：A51441/B51434，REPL `activeRuns1148`，日志见CURRENT_WORK；是否实际消费并最终收敛仍需真实观察。A r3/B r5、正式0/6、对局0/12、余4片不变。回退/降级标准：若控制返回被当作来源通过、未知被删除、成功工具被重放，则本能力不验收；不以能入队宣称策略提升。

## 尚待交付

v899真实续行补记：B实际创建`study:frontier-return:84a959e0465098db`，已跨过原4728停点；真实回复`1caea6ac6367bc51e6ea4f4f78ec40eddcece61b4e44859b22cecc40c33d3f01`读取当前809/811/817与历史572/577来源，随后`6526d8879d56c50ca0121b5dc38514610fb3d8f9221672d537e5e60c9dda3cb9`为evidence_reads_pending_recheck。A`8222376d…`为正常observed-choice边界、未执行未来索引；`c3315ba7…`已补读同父态solver候选。最后核实A51441/B51434均live，事件5178/4779、无needs_repair；这证明真实交接被消费，不证明原必要问题已关闭或最终策略提升。无新的Plan提交或最终验收。

原A/B同码真实续行、实际来源结论/Plan修订、最终发布；六项能力证明仍未全部成立。P6中文逐步全流程报告须来自最终实际执行，不能以本定点修复记录替代。未开战、未提交。

harnessLoopUsed: true；targetGames: starcraft-tmg；routes: experiment_planner→strategy_decision→experiment_planner→independent source review。本轮无UI/记忆晋级，trainingTruth=false。若来源未覆盖或实际复审不收敛，保留未解及原次数，不宣称策略通过。

## 真实续行与 v898

同原目录A14553/B14561实际运行后：

- A模型经正常联合提交r2→r3，草稿`f9ae2ca6544b52e80bf0719e23c794c8af0be71e6c7a3a3e004f13cb25d25c28`。军表逐值不变，2000矿/120气，修改componentPurposes/deploymentConcept，补Barracks Tech Lab、Supply Depot、Academy三卡用途；仍未证明Marauder/Goliath策略比较。
- B真实请求`bcfc130a…`及`11fc9e9f…`收到sameSourceRecheck=true、必要问题仍1项。模型读取572/577原概率字段后自行纠正SupplyLoss来源，结果`8bea37c15a95b2d61d2989220e21e4f49b4ebd98316c4b16ee6dc2e2fc7786dc`，无重新计算攻击。独立审核`b230c0ef1e688a2f728ade526d71209f3e58bb6c0e05b377a9d21a23cc46756d`仍判needs_evidence：实际测量marauder-1，不是授权的第二Marauder替换分臂，且历史军表不同。该真实缺口没有被作者retain或本修复放过；正常source-revision轮次2已归还策略。
- A真实还引用早期方法失败。追踪发现根实验两个orderRepair祖先被Plan-only更新标superseded，导致已完成原生结果及summary无法汇总。这是v894局部选择修复未覆盖的顶层方法同类入口，不是模型应该重做实验。

安全退出两组、0在途后，v898在原local-method-scope模块扩展明确事实目标下的orderRepair祖先，且新建纠错任务从事实绑定决定Plan为历史参考；有显式Plan依赖、事实版本变化或正式撤销仍拒绝恢复。原回复/次数/成功Native不改，不发新模型调用。

`build/slice272-method-parent-scope-v898-red.json` → 一次 `build/slice272-method-parent-scope-v898-green.json`：真实两祖先恢复，沿实际调用者同样的批次路径可得到成功summary，三负例及幂等；0Provider/Native/生产写。旧门不重复。修改仅local-method-scope、workspace-run及此具体复现脚本；尚需真实续行确认父负责人消费。

真实v898：A23788、B23856原目录同码。A事件5027/5028恢复两父方法，后继`study:method:c44635edd3b4ec25`的真实回复`11ea20c2175330dd7d5f726c86fec01e093613c61ee785211e81b9e3aaf2ac2e`已说明“前批完成两静态几何场景，未进行攻击测量”，并按需读取场景与攻击工具合同。这是父负责人实际消费，不是单测推断；尚未完成攻击对照。B真实`ca2ef8ca…`仍保留当前表，作者给第二Marauder问题answered_fact分类只是提议，不授事实批准；新局部返回继续独立审核，禁止把它写成已完成比较。
