# T27 / S272：已返回的作者选择必须被消费（v799）

所属 P1/P2/P5；前续：[v797–798职责双向交接](ticket-27-slice-272-author-handoff-v797-2026-10-21.md)。
仍为 T27 5/6、T23 33/36，剩余四片；最终 Plan 0/6、对局 0/12。
不以本次局部门禁替代完整产品验收或策略提升证明。

## 真实步骤与结果

1. 原进程 PID47570 保持存活；从 e5694 后正常完成三条来源主张审核。
2. 数值复述与证明范围声明通过。中间一条正确指出：只测量了 `marine-1`，不能把结果扩展为整个 Marine／Marauder＋Medic 组合。
3. 具体审核原件 `e6df804aa09481bb76c2b43ea2ad9a4ebd6a4d0a2a0f8d078e9d751e24fb2fbd`，保存结果 `52b937df5e75c6f8e4e752001f074ffdc41e79837bdd51503342906d10ab6850`。
   汇总结果 `a17c83d35d8c9f5c7b45ed1c60f752d9879e2bdc04f222123e35439779c05744` 保留此问题，未错误放行。
4. 来源修订将“收紧事实主张还是追加整个组合测量”的取舍交给战略作者。这里没有手动删未知或强迫模型选预设方案。
5. 作者真实回复 `589cd146544e768e346a2713779298433e35a895e3bfee1fd83d57b8cb930f38`，补读后确认回复 `451c534073750eaaf2fc7c3bc6a7e3e94e95b809319ca3ba2c64bb2fb7c613c8`，明确 `decided_here`：选择收紧为已测单目标结论，不追加 Marauder／Medic 单独测量。
   决定结果 `0fa46b4f32d253964ac6b2334007e6834368593dd829bc8fcb8aec8e3bc4631b`，正式证据 `fa5bd2d308a235d152fc38a60d1e6c7c0b43ccd2b420278890436e48bfcc1a74`。
6. 返回的来源修订仍按旧审核的 `author_decision` 立即转交，没有消费刚返回的同题决定。旧代码再次产生作者任务；这不是事实缺失或网络失败，是待办状态计算漏接最新决定。

注意：作者的选择仍不是策略质量通过。只测 Marine 是否足以支持原有更广取舍，仍须原实验覆盖与战略比较审核；不能因作者愿意收紧措辞，就自动降低原本承诺的比较范围。
作者重复误认旧 2000 分候选的问题也仍在；正式 Builder 为 1490/余510，最终预算门未放行。

## 排查假设与验证

按顺序检查：

1. 新作者决定没有参与待办计算——实际重现；`rosterSourceReviewRepairStageV1` 只解析旧 sourceReview/failedSourceClaim。
2. 返回的是旧版本或不同问题——实际作者源与当前绑定一致，问题原文一致，不能解释本例。
3. 还有真实必要事实未知——本条审核明确为作者选择；不是用 Host 改成已知。其它真实 `necessary_fact` 仍保留。

具体脚本 `scripts/verify-slice272-author-resolution-consumption-v799.mjs`：

- RED：实际审核和作者选择组合后，阶段仍为 `author_decision_return`，而非来源主张修订。
- 修复后一次 GREEN：消费同题当前已读选择；原审核与问题不改；旧版本、未读、literal、非提案、不同问题、未决调查不能消费；真实必要事实仍优先调查，原主张修订仍必须做。
- 0 真实测试 Provider / Native / 生产写；没有重跑 v797/v798 或已通过审核。
- 最终测试使用真实正式作者证据的解析封装，不把离线夹具伪称生产通过。

## 修改

只改来源修订的统一阶段计算：

- `strategyResolution` 必须是当前、已读取的角色提案；明确 retain，问题为 `decided_here` 或引用现有声明的 `authored_choice`，且有公开理由和源编号。
- 严格匹配原问题，不用关键词猜测含义，不从审阅者意见替模型选答案。
- 另存 `originalAuthorDecisions` / `resolvedAuthorDecisions`，旧审核原文不变。当前 `authorDecisions` 只保留仍未回答的选择。
- 该选择仅允许来源作者继续修订其结论，不批准事实、不改 Plan、不跳过实验覆盖审核、不消除仍缺的测量。
- 所有消费方沿用同一来源阶段计算和路由，不增第二套产品／实验路径。

PID47570 在操作边界退出；退出前旧代码已又交回一次，付费记录保留，不删除或重置。
PID65040 从原 lqMWaS 的 e5814 / w566 / r3 载入 v799；日志 `build/slice272-product-generation-v799-consume-author-choice.log`。
不重建房间，不重买已经完成的决定；后续实际来源修订/审核效果待记录。

## Harness 证据与边界

- harnessLoopUsed：true。
- targetGames：StarCraft TMG，冻结规则/地图/军表上下文未更新。
- promptPackRoutes：来源审核 → 战略作者选择 → 原事实作者修订；本次只修第三步的待办消费。
- harnessToolsCalled：同产品工作流原件读取、来源阶段计算、现有产品 run/resume。
- uiTraceEvidence：无新增 UI 验收；这是同 Web/App 产品后端链路，不声称截图证明。
- agentDecisionEvidence：上列真实审核和 451c5340 作者确认；不是开发者手填选择。
- memoryTraceEvidence：原审核/问题/费用不改；已回复选择单独关联其原件。
- trainingTraceCandidates：局部对比和取舍仍待审核，不晋级 Skill 或真实对局记忆。
- rollbackOrDemotionRules：非当前/未读/不同题不能解待办，必要事实不能靠作者选择解决；没有最终 Plan 自动放行。
- userVisibleChecks：正式军表仍1490、余510；双向交接不再仅因不可变旧问题重复转交；最终验收仍未完成。

## Diff 摘要

生产代码仅 `packages/roster-strategist/roster-experiment-source-repair-v1.mjs`：阶段版本4、显式返回选择消费及原问题保全。
另新增本具体 bug 的单测和本文，更新 CURRENT_WORK / TASKS / PROJECT_MEMORY；未提交 Git，未改其它项目。
