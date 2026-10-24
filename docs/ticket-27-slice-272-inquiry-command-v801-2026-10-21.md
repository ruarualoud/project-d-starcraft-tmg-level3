# T27 / S272：下一操作的显式局部纠错（v801，执行门已通过、真实效果待）

接续 [v800合同一致性](ticket-27-slice-272-partial-author-choice-v800-2026-10-21.md)。当前 T27 5/6、T23 33/36，余四片；最终 Plan 0/6、对局 0/12。未完成产品验收，不启动对局。

## 实际生产结果

- PID76046 已退出，原 lqMWaS 保存于 e5850 / w566 / r3，无在途。
- v800真实请求 `4d0ef49e1f5d2a69be3717f05e0f75855c38cfc1106a0c65dcddb9ca7ab4dd8a`，回复 `8be34b0a8258c7cddd79ed5bc4159771f204abcd00952d093ef1b766c40422f0`。
- 实际使用新版1.12.1合同，仍返回 retain＋nextInvestigation。不是请求失败、旧代码未加载或费用问题。161121 units（158981输入、2140输出），Provider11.874秒；保留原账，不推算未知人民币费用。
- 局部纠错此前只覆盖 author_choice_requires_author_action，调查控制错误退回全量回复重写；本请求仍超过50万字符。模型重复了互相矛盾的公开理由：既把未采用2000候选当作当前表，又承认当前1490余510。不能因此批准军表。

## v801修改

只扩展已有局部战略纠错接口，不建立另一条产品链：

1. 调查授权／逐题决定冲突使用独立 v2 纠错结构。
2. 模型可显式选择 `authorize_inquiry` 并填写完整调查授权及下一操作理由。该命令机械映射为 investigate，不再让模型同时复写两个容易冲突的控制字段；不从自然语言或旧回复猜它的选择。
3. 原问题原文、未修改字段、决定、未知保留。命令不能删除已提交的 mutation/strategicChanges；真正联合修改仍用 replace_decision。
4. 调查范围、问题分类、引用、原独立来源审核和预算检查不变。已决题号不能被当成必要事实调查。
5. 同产品自动恢复仅匹配旧完整回复接口的实际停点；新局部协议不再获得同一追加。原失败、计数和费用不重置。
6. v1作者分类接口及旧原件投影保持可读。

## 验证过程与未完成点

具体脚本 `scripts/verify-slice272-inquiry-command-v801.mjs`，0真实Provider/Native/生产写。

- RED：真实调查错误请求没有进入局部控制接口。
- 修复后的投影、必要字段、错误调查题、旧完整回复拒绝、单次恢复边界均通过；共享执行确实收到 v2 命令。
- 第一次共享执行断言错误：把补读结果当作最终决策。来源559（预算）与1044（动作菜单）在产品中另有补充交付，在裸图夹具中须补读，不能伪造已读。
- 改为使用真实已交付输入，仍实际进入两项补读。按既有授权追加一次后，补读确认断言通过，但下一次 run_ready 没有调模型；最终输出仍是原补读结果。
- **根因已精确找到**：工作状态为 needs_model_choice，裸图夹具漏了产品 `workspace.advance` 在 run_ready 前调用的 `continue_work`。来源：roster-decision-workspace-run-v1.mjs 的 advance，以及 roster-decision-workflow-v1.mjs 的 continuation状态赋值。
- 已在夹具加入该命令，**未再运行**。已达到本次验证收敛边界，停止重复测试；不能把源码检查当成此门通过。生产仍停 e5850，v801未载入生产。

下一交付物只有一个：剩余 `--remaining-executor` 定点门的实际通过证据；不重跑已通过投影或v797–v800门。通过后才用原产品入口续行并观察真实模型、来源修订和军表/Plan变更。

### 用户授权后的定点结果（2026-10-21）

用户回复“试一下吧”，允许本停点继续。首次补验观察接口超过30秒后重置，原进程已终止但终态输出未保存，因此没有当作通过或生产失败。为此只给当前测试增加阶段/总耗时日志，并用独立持久日志承接输出；没有改验收断言、重跑旧门或调用真实模型。

持久运行 PID91990 已退出，结果 `pass:true`；日志 `build/slice272-v801-remaining-executor-durable-20261021.log`。只执行剩余共享执行边界：原输入→显式调查命令→两项来源补读→continue_work→模型确认→investigate提案。两次隔离模型夹具调用、21.076秒，0真实Provider/Native/生产写。原问题/原回复保留、缺失事实不获批准、军表与最终验收状态不变。

已确认无旧运行进程/在途请求，PID92739 用原产品入口从 e5850 / w566 / r3 续行；日志 `build/slice272-product-generation-v801-typed-inquiry-command.log`。下一验证对象是实际模型是否使用新命令及后续来源/战略闭环，不能把隔离门通过当作真实纠错成功。正式军表仍1490余510，最终0/6。

### 真实模型交接已推进

请求 `88194c266a792208af010f38ce9ac6127e0f5febcd1bf184463dd87aa662c222` → 回复 `81ed6526b15e2f4dcba621b95c604a3e5fd35a6f65922c6104f6b41a4b4eb339`：模型自主选择 `authorize_inquiry`，不是 Host 改写旧回复。

- 实际修改问题3/4/5的说明与分类，明确当前1490、缺510；旧精确2000候选尚未采用，不能冒充当前花费。
- 保留已比较的局部选择；把此前误标已回答的预算编辑问题恢复为必要未知。
- 模型明确选择只调查问题3/5，给出候选目标、缺少的观察及停止条件；正常投影为 investigate，草案/Plan不变。
- 当前作者任务成为 evidence_ready，e5865 / w567 已进入新的事实调查角色。没有再卡在 retain＋调查的重复格式纠错。
- 163494输入＋968输出＝164462 units，Provider11.275秒。与v800累计本段325583 units；这不是整个长期任务总账，不虚构人民币价格。
- **证明范围**：真实局部纠错→战略操作→事实角色交接成功；不证明新候选已返回、军表已补足、原比较覆盖已通过或最终策略提升。

### 后续真实职责往返（非最终验收）

1. 事实角色复用已保存候选。一次错误字段 `/receipt/audit/upgradeRows` 返回 path_missing；正确升级数据在 `/receipt/audit/armyResourceBudgetResult/upgradeRows`。大型 units 数组有明确 fetched_not_delivered 导航，不能把取回当作完整交付。没有人工改它的回复。
2. 首次事实返回 `1bb24d3c537ef0c66ba8355fba02daa846167204381dc13d5fa0279679ab71e4` 正确区分“候选存在”和“尚未采用”，交回作者。
3. 作者 `d766e882bfe582e4e0addea7fb63cf1729f2763d3c6bc3e4e40a9b79e20faad0` 重复授权被原 unchanged_investigation_authorization 拒绝。自动补读/修订后 `560776e444e0e306afff620aebe3264de8202edca88b9b23a21f88deac77bd96` 明确了不同候选范围；无需工程补字段或重新授次。它是否应直接采用而不是再查，仍是效率/策略待评项，不称为最佳选择。
4. 后续事实角色 `df39818dc359ee48c2ed063b11025e2bab6c86d56caff1b2b995b16f88a3ec22` 返回 answered：合法精确2000候选存在，当前仍1490，真实剩余是510，选择/采用/同步Plan属于战略作者；不声称已经提交。
5. e5949 / w574 排入4条来源主张与1汇总；e5969 已在读取/确认，尚未全部通过。PID92739仍存活，无新的 needs_repair 停机，正式draftRef仍 `1396a5159b662d6f21a71d418453a66e860c66662b404197753d46ba8c209480`。

从本轮起点 e5850 至 e5949，新增11次完成模型调用：1011162输入＋8361输出＝1019523 units，Provider合计123.059秒（不是墙钟/总任务费用）。审核后续调用不含在此数中；所有原账保留。没有据此宣称预算补足或策略提升。

## Harness证据与diff

- harnessLoopUsed：true；targetGames：冻结StarCraft TMG。
- promptPackRoutes：战略下一操作纠错 → 显式调查命令 → 原调查校验／独立审核。
- harnessToolsCalled：原件读取、共享角色执行和图调度（隔离内存测试）；v801无生产调用。
- uiTraceEvidence：无新增UI测试；不宣称端上已验收。
- agentDecisionEvidence：上列真实拒绝回复；测试命令仅夹具，不能冒充模型策略改进。
- memoryTraceEvidence：原问题/回复/费用/失败完整保留。
- trainingTraceCandidates：无新通过材料，不晋级Skill或对局记忆。
- rollbackOrDemotionRules：缺授权、错误题号、隐式丢弃修改或新协议再次恢复均不能放行。
- userVisibleChecks：修掉重复控制字段，但最后执行门尚未通过；正式表1490余510。
- 修改文件：roster-workflow-semantic-repair-v1.mjs、roster-decision-role-instructions-v1.mjs、roster-workflow-read-role-v1.mjs、roster-decision-product-journey-v1.mjs；新增具体测试与本文，更新任务入口。未提交Git、未改数据、未恢复旧对局。
