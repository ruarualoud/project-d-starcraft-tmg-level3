# T27 / S272：测量与真实配置的共享来源修复

日期：2026-10-22。P1/P2/P3/P5当前验收失败；不新增Ticket。T27 5/6、T23 33/36，余S272/S248/S249/S250共4片，最终Plan0/6、对局0/12。

## 已完成与边界

本轮修复了可复现的数据接线缺口，6项定点模拟累计通过；0Provider/Native/生产写。原模型回答及正式r4合法2000矿170气未改。接下来仍须真实模型修订、独立审核和战略取舍，不能以这些测试代替最终策略产物。

## 复现和原因

上一真实运行停e8540。审核已读攻击1213/1233/1242，却没读候选配装1231/1240，把三个均保留Ares的配置当作Ares与替代升级的比较。

排查三个假设：原配装不存在；原配装存在但来源未串联；全部数据送达仍被误读。证据支持第二种至少确实存在：攻击1233的`inputBindings[0]`给出候选`sourceWorkId`及不可变`sourceResultRef`，该结果包的`value`与已发表候选1231原件逐值一致。但共享来源遍历只处理`evidenceRefs`，没有处理这条实际工具输入绑定。已有场景矩阵也只比较几何，没有配装因素。

候选1231为Ares＋Haywire，1240为Ares＋Scatter。来源分别是`aa96e62d1931f8b3b9adde3a534a8a69c33673965911b915e61466110682bc30`、`7f6ddda4637b1eae1331d7802d6af9b4ec9d1d77dfb3f54f26b30fd78959d8c2`的`/receipt/candidateInput`。分支标签不是配置证据。

## 共享实现

1. `roster-workflow-evidence-lineage-v1.mjs`增加正式工具输入绑定边。核对已保存结果包装与已发表原始回执的内容，而非要求两种包装的哈希相同。错源、缺失原件、内容错配进入明确未决；循环不无限遍历。
2. 新增`roster-measurement-configuration-v1.mjs`：按Native查询的参与单位，解析同context/sourceState的实际候选；默认实验室只匹配该次测量军表身份的保存配置，不能随手套当前同名单位。
3. 同一角色来源入口提供逐值候选原件及配置差异矩阵，列出共同升级、各自增减项及其它变化字段。缺失/冲突不是空配装或零效能；差异表不批准因果推论、几何一致性、升级优劣或最终战略。
4. 生产角色选择器补逐句来源/假设审核的来源状态加载。与此同时，这些局部角色不因此继承未分配的祖先实验或整体策略职责。

规划、事实方法、Teach、资料汇总、整题审核、逐句审核都经同一来源投影；仅对本任务实际引用/读取的测量生成配置，不默认发送整个历史。

## 注入验证

脚本：`scripts/verify-slice272-configuration-provenance-v835.mjs`。

| 场景 | 检查结果 |
| --- | --- |
| 真实1233/1242→输入绑定→1231/1240 | 修前缺配置来源，修后可追溯 |
| 错结果引用、丢失原件、错工作身份、循环 | 不授予错误来源；未决原因可查，循环终止 |
| 实际三配置 | 三者都显示Ares；两候选源原件实际交付；不信only标签 |
| 错候选context、不同历史army | 不借同名单位补配装；unknown不变零 |
| 生产角色选择器 | 逐句审核能加载来源，不额外读祖先实验 |
| 真实请求组装＋脚本化回复＋工作流保存 | 1次模拟往返；新矩阵和原件实际送达；必要缺测保留、军表/Plan不变、未批准 |

首次RED：`build/slice272-v835-configuration-1792598912308.json`，4项失败。
第一批GREEN：`build/slice272-v835-configuration-1792599105640.json`，4/4。
生产调用点追加：`build/slice272-v835-configuration-1792599324441.json`，5/6；实际请求接缝通过，角色选择器漏逐句审核为真实失败。
最后仅补该失败项：`build/slice272-v835-configuration-1792599488624.json`，累计6/6，前5项继承不重跑。没有全量测试、模型调用、Native重测或原件修改。

## 下一步

从原e8540正常方法修订续行，先核实际请求配置矩阵与原件是否送达，再看模型是否承认/修正Ares未改变这一事实和原比较范围。若仍错误，区分语义判断与新的接线缺口，不据脚本化答案宣称真实模型通过。旧7条无关来源检查不重跑，原账不清，A–F及对局不启动。

## Harness记录

- harnessLoopUsed: true；targetGames: starcraft-tmg。
- promptPackRoutes: fact method / source review / strategic owner，共享来源，不共用职责。
- harnessToolsCalled: 本轮仅只读已有Native记录及内存工作流；无新规则调用。
- uiTraceEvidence: 本轮未进行UI验收。
- agentDecisionEvidence: 本轮新增为明确标记的脚本化分支；真实取舍待。
- memoryTraceEvidence: 不写真实对局记忆；旧模型原件不变。
- trainingTraceCandidates: 无。
- rollbackOrDemotionRules: 配置错源、请求未送达或真实语义不合格，不授最终Plan资格。
- userVisibleChecks: 完整军表/Plan策略验收仍未完成。

Diff：3个生产文件（含新增配置模块）及1个具体bug注入脚本；未安装、未提交、未创建子代理。
