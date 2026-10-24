# T27 / S272 v45 — Plan 影响与写表策略闭环排查

## 当前结论

这次假设场景错误影响最终 Plan 的空间依据，不改变已检查的军表价格、编制与升级合法性。但“军表仍合法”不等于“军表的获胜路线已验证”，不能据此承诺无需调整单位组合。

当前从头写表并非先盲选军表、最后才想怎么赢：模型在 propose 阶段已经输出 victoryRoute、scoreRoute、rosterRationale、mapRationale、openingSequence、opponentHypotheses 和 counterPlans。实际新会话的路线是中央 marker 5 加一侧己方点持续得分，并通过击杀 Supply 取得额外 VP。

不过，当前实现没有完成计划与军表的双向闭环。这是实际接线/阶段设计问题，不能单独归因于模型策略能力差。

## 实际链路与证据

独立新生产会话：`iterative-web-7b9fda78-964c-4053-8ee7-caade60a6b8e`，不替换原实验 B。

1. 五次初始决策依次是 query、query、propose、propose、finish；第一次 propose 已有获胜路线和单位目的。
2. 锁表前的实际观察只有 candidate_menu、map_summary、exact_budget_repairs、map_route 与 final_review。没有 scene_context、scenario_branch、scene_query，因此不能声称关键交战、治疗覆盖或多点占领已验证。
3. 军表、进场序列审核后进入固定表 Teach；后续可修计划，但不能在同一 Teach 周期里改单位组合。
4. `iterative-roster-teach-handoff-v1.mjs:138` 已携带 `iterativePlanAdvisory`；当前 packages 内唯一引用就是该交接模块。`roster-planning-workspace-service-v1.mjs:1166` 创建 Teach 会话只保存军表和进场，未保存该初步计划；同文件约1567行调用 planPresetRoster 时也未传入。Teach 并非有证据地深化原来的完整路线，而是在锁定军表上重新构造计划。
5. `agent-selected-teach-plan-bridge-v1.mjs` 明确校验 Teach 前后军表单位与战术卡一致，没有 Teach 发现组合不足后转回写表的正式路径。

### 三个假设的判断

- 写表时完全没有胜利目的：不成立，实际已输出目的和取舍。
- 选表虽有目的，但查询机会/证据不足且与 Teach 脱节：成立，本轮无场景验证，初步计划未进入 Teach。
- 查询错误只影响日志、对 Plan 无影响：不成立，最终 Plan 明确引用这些 unknown 并留下未验证的占点主张。

## Plan 影响范围

新 Teach 共17条工具回执，其中5条 unknown、按 receiptHash 去重为4条：一个 route_to_objective 的 base_profile_not_audited，以及三个假设占点回执的 MISSION_MARKER_COHERENCY_STATUS_INVALID。不能把重复回执计作独立错误。

直接受影响的文本包括：

- `deploymentConcept.objectiveControlText`：Marine/Marauder 控制1/3/5点并保持治疗覆盖的可行性尚未确认。
- `counterResponses[7].responseText`：对多点占领方案的反制/应对依据。
- `invalidationTriggers[3].revisionRequiredText` 与 `[4].triggerText`：部分重规划条件建立在错误 unknown 上。
- `publicSummaryText` 与引用回执：仍报告旧工程错误，不能由修复代码自动冒充已重新验证。

当前唯一未收敛 High 位于 `componentPurposes.player1-tactical-2`：审核将单 Goliath 应对任意 Omega 侧翼及主力保持三个点视为无证据硬保证。完整计划也有条件性/未知披露，因此必须在修好查询后重新判断实际语义；不直接降级，不买第四次盲审，不手改模型战略来让检查器过关。

## 已完成的具体来源修复

此前假设摆放只改模型位置和 isOnField，却保留 isInReserves/coherencyStatus=reserve，导致 Native 占点核抛 MISSION_MARKER_COHERENCY_STATUS_INVALID。

`pregame-scene-laboratory-v1.mjs` 已改为整批摆放后使用共享官方底盘/连续性计算，真实区分合法布局、连续性不足与模型重叠，未强制假设合法。

唯一具体门 `verify-ticket-27-slice-272-hypothetical-coherency-v1.mjs`：RED1608 复现单 Goliath 也 unknown；第一次 GREEN4816 暴露测试夹具把三列四模型误当2×2；修夹具后唯一补验9181通过。原复杂布局实际存在底盘重叠，修后返回 MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP，而不是伪造占点成功。单模型及多模型查询可返回结果、真实分散布局 out_of_coherency、源状态不变，Provider=0、Room mutations=0、trainingTruth=false。此门已通过，不重跑。

## 应采用的写表流程（待实现，不声称已完成）

初步获胜路线 → 候选军表 → 地图/进场/对手/概率等必要查询 → Teach 挑战关键假设 → 模型决定保留路线、改路线或改军表 → 对新候选重新做合法性与受影响证据检查 → 最终冻结军表、进场和 Plan。

每次查询绑定当时的候选快照，但不把候选快照当作永久军表冻结。Teach 应显式收到前一阶段的路线、选表理由、关键假设与未决证据。需要换单位时走显式版本化修订，不能绕过军表合法性，也不需要丢掉旧的付费回复重头生成。策略偏好仍由模型/Skill 决定，工具只提供可用事实与假设结果，不添加硬编码战术权重。

固定表 A 仍保持固定表，只能调整计划；从头写表 B 才允许正式确认前返回选表。C 仍为同 A 军表、无开局 Plan。三组 Zerg 配置一致且没有独立开局 Plan。

## 运行记录排查与安全停点

ABC 已全部封口，2026-10-13T03:10:17.257Z 完成关闭；Native A r59 / B r49 / C r72。没有新建房间、改军表、清费用或回放旧动作。

六个实际席位共有180条已执行 trace（A59/B49/C72），Replay 均 true；这只证明执行/回放一致，不证明每个查询语义正确。初查发现 map.route_access 的 side_identity_required/base_profile_not_audited 和 space.solve_formation unknown 需要从完整请求/回执追踪；阶段后继未预测或无当前火力带等正常未知不能计为工程 bug。完整工具审计尚未完成，不宣称整体排查通过。

新军表生产34条付费回复及原军表/进场保持；本次本地修复和只读诊断零新增模型调用。原最终审核第三轮停止状态保留，当前 Plan 不可准入。

## 下一交付物与进度

1. ABC 与写表完整查询审计表：每个异常的实际输入、工具结论、受影响计划/动作、正常未知或工程缺陷分类。
2. 对已确认异常修共享来源合同并做一次具体红绿，不重跑已通过门。
3. 选表初步计划进入 Teach 的接线与 Teach 返回改表的显式闭环；先复现具体断点再修。
4. 模型基于正确证据修订现有 Plan；若暴露军表能力不足才定点改表，而非默认从空表重跑。审核收敛后同版原房恢复 ABC。

T23/S248 33/36；T27/S272 5/6；主线余 S248/S272/S249/S250 四片；有效完整对局0/12。20地图长期目标保留，18张剩余经典图排在核心验证后。无代理/K3、数据刷新、删除、提交或全量验证。
