# T27/S272 · P1/P2：查证窗口与原始义务交接

## 实际失败模式

同一新产品Run `build/slice272-projection-owner-v565-inlKbk`。r6地图事实问题的第3批已经完成，产品仍自动创建第4批事实角色，没有总体决策检查点。此前只有主动blocked/strategy_required、精确无新观察或真正回答时才离开事实循环；必要Native后继确实变化，并不属于“重复同一查询”。

另一个接缝缺口：回交总体规划时保留了当前未解清单、完整军表／Plan和证据，却没有明确携带**最初审核义务**。后续扩大出来的调查需求容易被误认成原始准出要求。检查点本身不能解决这个范围丢失。

## 统一行为

1. 一个工具批次结束仍不等于事实问题回答完。前几批继续原问题的机械执行，不恢复每一步都改Plan的旧方式。
2. 一个有限窗口完成后，正常交总体规划一次；默认每3个已完成工具批次，按`investigationDecisionWindow.maximumCompletedBatches`可配置。
3. 这是**决策间隔**，不是整个任务／质量／费用的查询上限，不是3次纠错上限。窗口到达不是错误，不重试、不清账、不豁免未知；总体规划可授权下一窗口。
4. 总体规划收到完整表／Plan、实际证据、未解事实和原始义务，选择有依据修订、保留或继续一项明确必要调查。不得仅把机械日志写成新Plan。
5. 原审核是可能有误的提案，不是新规则真理。模型必须区分原义务与后来增加的问题，说明后者为何必要、可选、未来条件或已被反驳；Host不替它删问题。
6. 原决定若是证据引用，保留为一等输入，由现有产品读取器解析，不埋进不可解析的literal。已排队旧检查点的**下一请求**只读补入同一原始范围，旧工作单／请求／回复不改，来源入口不当成正文已读。

## 修改与定点证明

实现：`roster-workflow-experiment-owner-v1.mjs`、`roster-workflow-read-role-v1.mjs`。

- `verify-slice272-investigation-decision-window-v627.mjs`：实际r6地图第3批处RED；修改后一次GREEN。第一批保留事实角色、第三批回总体、窗口2/5均按配置、保留全表／Plan／未知、真正回答仍独立审核、未完成批次不打断。0 Provider/Native/生产写入。
- `verify-slice272-investigation-original-assignment-v628.mjs`：实际原义务缺失处RED；断言输出超过观察缓冲，但已明确报出`actual=undefined`，不是模型或产品网络故障。修改后一次GREEN。根义务及任务逐值保留、后来方法不覆盖根任务、证据引用仍一等可解析、已有队列的下一请求也有原始范围。0 Provider/Native/生产写入。

未重跑v625/v626或其它已通过门禁；没有手改军表、Plan、模型回复或Native回执。

## 实际产品执行

- 22064安全完成1167后退出：r6、mechanicalBlockers空、semanticIssues16、activeWork10。
- 36097载入v627，同一Run实际自动建立scoring_and_timing总体检查点，完成当前advance后安全退出；不曾判该事实问题通过。
- 40139载入v628，同一产品客户端、无恢复计数重置或旧请求重放。日志`build/slice272-live-product-review-v628.log`。
- 实际1169为`roster_workflow_strategy_decision`，请求包含原scoring_and_timing审核义务和“原审核可被质疑”的范围说明；模型先读取真实actionSpace、availableUnits及草案，尚未作最终决策。这个观察不能算Plan修订或策略优化完成。

同时P3已实际完成三条Native `threat_exchange`：with-support、without-support、combined-marauder-volley均返回ok。但其真实输出仍是所选当前攻击者的per-attacker分布；筛选subjectUnitIds不等于移除支援单位，不可据此宣称测得完整支援因果收益或联合齐射总杀伤。这一范围交由事实与总体角色处理，不能靠工作单标题当证据。

## 验收边界

已证明新调度和原义务交接的局部工程行为，以及总体角色真实收到原义务；仍须观察它作出取舍、正式军表与Plan提交、受影响复审，并完成策略比较和新鲜产品生产。

T27 5/6、T23 33/36；相关剩余S272/S248/S249/S250共4片；正式Plan0/6、对局0/12。P0–P6目标不缩减。
