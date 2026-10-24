# T27 / S272：明确实验问题、来源依赖与原问题回交（v683–687）

本轮仍属于新 P0–P6 产品流程。修复代码与定点证明已完成，实际策略对照尚未完成；本文不是最终生产报告，不增加正式验收数量。

## 为什么还不能说策略提升

现写流程 r9 的 Raynor 问题是“前置 Orders 与后置支援在相同条件下的控点／火力收益比较”。工具814/816确实证明一次原生动作成功及支付2CP，但没有完成两方案的收益测量。事件 `orders_applied` 不等于原来确有激活标记，也不等于多出一次有效激活。最近10份总体决策中有7份相同公开理由；不能把这些重复回交计作有效优化。

当前正式Plan0/6，对局0/12；T27 5/6，T23 33/36，相关余S272/S248/S249/S250共4片。

## P3 v683：直接观察激活状态

- 缺口：原生inspect的单位投影只有模型／Supply等信息，没有每阶段的 `activatedPhases`，难以核对Orders前后实际变化。
- 修改：inspect增加当前round与每单位真实激活状态映射；复制原状态，不推断战略价值，不改变规则或单位状态。
- 证明：`scripts/verify-slice272-unit-activation-observation-v683.mjs`，真实RED95278→一次GREEN96023；`build/slice272-unit-activation-observation-v683-green.log`。冻结原生状态受控设置true/false，仅证明可观察性与源状态不变，不是已发生对战或有效再激活的证明。
- v684及之后原流程已加载；旧不可变inspect仍保持原样，新观察须实际查询。

## P1/P5 v684：来源视图不能继承引用者的Plan

### 真实故障

固定表r12的战损说明claim2及其覆盖审核尚未发出请求便标为superseded，最终NO_READY_WORK。其六份规则视图中的四份绑定旧Plan；原始官方规则本身没有这项依赖。视图创建用了 `owner.bindings`，同一视图又按来源ID复用，于是第一次引用者的Plan污染了之后的审核。

### 来源修复

- 新视图继承对应不可变原始来源的bindings。
- 冷恢复只核对真实schema、sourceEvidenceId、sourceArtifactRef和视图版本身份，校正派生索引的依赖元数据；原来源正文／付费回复不重写。
- 只恢复因这些依赖误停、当前自身scope有效、没有dispatch/input/result/pending且未被显式替代的来源审核；依赖审核仍须真正完成。
- 原始来源确实过期时仍过期；不把旧军表、旧Plan提案变成当前事实。

### 定点证明与实际采用

- `scripts/verify-slice272-projection-scope-v684.mjs`：实际停点RED5102；首次绿门5682在“所有历史完成工作都必须保持current”的过宽夹具断言失败；改为保留全部付费结果、只要求本题三个有效兄弟审核保持完成后，一次GREEN6115。
- 证据：`build/slice272-projection-scope-v684-green-corrected-fixture.log`。0 Provider/Native/生产写，恢复幂等，旧来源正文地址与付费结果保留。
- 固定表原产品实际记录9条 `source_projection_review_restored`，包括原战损claim2／覆盖审核，已继续实际后继工作。不是仅测试夹具通过。
- 随后plan_continuity修订发生一次独立网络结果未知，原pending和未知费用保留，经既有recover-provider端口至多一次受控重试，不清零旧账。

## P2/P4/P5 v685–686：事实角色与覆盖审核使用同一明确问题

### 真实缺口

现写实际请求 `ddc9617d…` 向事实角色内联整个总体“保留”决策，而其审核的question只是泛化的“Resolve only ... requiredData”。具体原对照虽然在父决策与历史设计中存在，覆盖角色却容易把前置合法性当成当前问题已答。当前队列还保留旧的泛化审核；只改未来新任务不够。

### 统一投影

新增 `roster-workflow-fact-inquiry-v1.mjs`，从父决策精确提取：

1. 全部requiredData；
2. 每个necessary_fact问题的原始理由和证据入口；
3. 父决策的精确可查身份。

这是明确标记的模型工作指令，不冒充测量或已读原始事实；事实角色不再收到整个retain/revise论述作答案模板。原对照设计仍由既有因果链交付。实验角色选择局部方法，整体军表／Plan取舍仍由总体角色负责。

新建覆盖审核与已排队覆盖审核共用同一问题投影。它们须检查实际比较谓词，而不是只检查泛化任务。原始队列输入、旧prompt、输出和费用不改写；新请求可审计地包含当前投影。

### 定点证明

- v685正常Run模型接缝：RED8209→一次GREEN9134，`build/slice272-fact-inquiry-v685-green.log`。准确问题／理由保留、整份战略决策不再内联、Raynor原设计仍在、创建审核检查同一问题。
- v686真实已排队覆盖接缝：RED14359→一次GREEN14806，`build/slice272-queued-inquiry-coverage-v686-green.log`。原队列输入逐值不变，实际构造请求收到准确问题。
- 两门均0 Provider/Native/生产写，受控捕获实际正常Run请求，不证明模型已完成对照或策略改善。之前已通过门禁没有重跑。

## 当前真实流程入口

- 现写：原 `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1`，`build/slice272-product-generation-v645-M86Cg9`，r9／合法2000／9单位；PID15225载v683–686，日志 `build/slice272-product-generation-v686-editable.log`。
- 固定：原 `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34`，`build/slice272-product-generation-v645-I7zekC`，r12／2000；PID16531载同版，日志 `build/slice272-product-generation-v686-fixed.log`，对上段原网络pending至多重试一次。
- 旧86182已保存退出；86201、6953均终态。每次先精确核对新PID，不能因观察超时重启或并开writer。
- 下一验收：实际有意义的条件对照→支持／反驳／证据不足→独立审核→总体采纳／保留及受影响复审。仍欠P5整体验收、P6正式发布／房间桥与最终中文逐步报告，再启动约定对战组。

## 费用与记忆边界

本轮未重置费用或增加硬预算。已有统计截点见v680报告；新增请求及未知费用继续留在原trace，不以旧截点冒充本轮结算。所有实验仍是独立条件场景，不能写成真实对局历史、普适策略或自动晋级Skill。

## v686真实采用与P4/P5 v687回交修复

### 不只是接线单测

- 固定表原网络pending的一次已有产品恢复已真实返回。战损来源已回交为record_facts：Marauder Quad K12对Hydralisk的实际36样本估计（平均伤害5、平均伤亡0.8611），明确排除可选反应和多队联合齐射，未声称策略改善。
- 固定表plan_continuity作者读实际211与731后明确反驳“任务／部署／ZoI资料不可得”；实际来源审核与覆盖审核均supported。不是手工删旧未知。
- 现写真实作者从Kerrigan单位12、Queen单位21找到Crushing Grip／Creep Tumor的归属，后续事实请求只余Raynor对照，而不是继续把单位能力误认为必须出现在阵营卡63。
- 现写真实提出敌方争点单位的双臂对照工作单，包含场景、两臂控点查询及Orders；其参数正在正常原生纠错。工作单提出不等于实验完成，尤其原分支已经使用过Orders，仍需检查有效前态标记／资源控制及收益口径。

### v687实际失联原因与实现

固定表后继事实及总体record_facts已完成，但原combat问题在有限窗口时交给策略负责人。它仍带investigationHandoff，原审核组只按旧goalId等待，永远看不到更深后继的结束。最终NO_READY_WORK不是新模型／原生查询失败，而是返回边缺失。

新增 `roster-workflow-frontier-return-v1.mjs`：只跟随明确的investigationHandoff、investigationFor和恢复决策的inputs.investigation关系，识别同scope、已经实际记录且requiredData为空的后继总体答复。把原问题、已审核事实与该解释送回原事实负责人，不按ID前缀猜关联，不将子问题成功直接标为父问题已答。

核心enqueue原子保存原handoff历史并接续原goal；仍保留全部付费结果、原语义／纠错计数和当前scope。未确认dispatch不能被绕过。原负责人仍须完成原范围结论和独立来源审核，之后正常汇合／受影响复审。该返回不批准Plan。

`scripts/verify-slice272-frontier-return-v687.mjs`：实际固定停点RED23143→一次GREEN24348，正常Run确实构造原负责人请求／转交已审核事实／原handoff历史与付费结果保留，0Provider/Native/生产写。证据 `build/slice272-frontier-return-v687-green.log`；不重跑旧门。

最新进程：fixed旧16531已终态，原workflow由PID24986载v687继续；editable15225已请求当前操作后保存退出，确认终态前不能并开writer，终态后同原workflow加载v687。原r9/r12与正式0/6、游戏0/12不变，后续以精确PID和磁盘状态为准。

实际采用更新：fixed原event5865已记录 `strategy_returned_to_experiment`；原负责人真实形成新结论，排入4条来源审核及覆盖审核，尚未批准父题／Plan。editable15225随后确认终态，同原workflow由PID26185加载v687，日志 `build/slice272-product-generation-v687-editable.log`；两原流程同版，不重置军表／Plan、账或历史。
