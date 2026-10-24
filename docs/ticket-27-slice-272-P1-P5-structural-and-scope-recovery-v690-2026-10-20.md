# T27 / S272：结构自修复与证据责任范围（v688–692）

这是新P0–P6的实际停点修复记录，不是最终中文生产报告。正式Plan0/6、对局0/12，T27 5/6；相关S272/S248/S249/S250余4片。没有用门禁通过数替代产品完成数。

## 承接的真实进展

- v687返回边已实际沿多层窗口回到原combat_and_losses问题。原负责人结论及来源／覆盖审核均已通过，确认保存的Marauder→Hydralisk条件概率结果与损失后Supply等规则，未声称它是通用最优策略。
- 现写已实际构建含敌方争点者的条件场景、执行静态队形并取得后继原生菜单，尚未完成有效双臂收益结论。
- 固定表旧“任务／部署／ZoI资料不可得”主张已经被真实原文反驳。另一个来源问题是旧Plan引用，不是地图数据再次丢失。

## P1/P5 v688：字段放错层的确定性自修复

实际现写回复 `295cf0e3…` 连续将steps、stopAndReturnToModelWhen、completionStepId放在experimentScope中，而Schema将它们定义在workOrder。原错误有明确路径，三轮付费改写未改变位置。

新增 `packages/structured-generation/schema-owned-field-projection-v1.mjs`：根据同一Schema作一层、唯一归属的字段移动。仅当子层不声明该字段、父层声明且父层没有该字段时移动。步骤数组、argumentsJson、绑定、实验假设和公开理由逐值不变；父层已占用时保留冲突并继续报错。不递归搜工具参数，不补策略／规则／测量结果。

正常读角色与原付费回复重验共用该投影。原付费输出不改；outputProjection记录from/to/rule。后续来源读取、作者确认、工作单编译、规则原生执行及独立审核仍照常。

证明：`scripts/verify-slice272-schema-field-ownership-v688.mjs`，实际RED35809→一次GREEN36870；日志 `build/slice272-schema-field-ownership-v688-green.log`。正常Run使用原付费回复，0新增Provider/Native/生产写；冲突不覆盖，投影幂等。

实际采用：原产品schemaRevalidations已记录repairKind=schema_owned_sibling_field_relocation与三个精确归位，providerReplayed=false、nativeReplayed=false。不是手改回执或仅受控测试。

## P1/P5 v689：历史来源可审核，不是当前Plan证据

### 真实原因

fixed r12地图结论说activationOrderStatus=unknown、activationOrder=[]，引用的是r11两个Plan块。r12实际上已有declared顺序。v684纠正来源索引scope后，旧引用的历史身份暴露，但原子审核因此superseded，覆盖审核再无可运行工作。

### 修复

- 新来源审核合同v4显式标注每个来源的bindings/currentApplicability。历史来源仅以historical_reference读入审核，不变成当前事实或Native依赖。
- 若历史源是已注册的旧draft块，提供当前revision同一块的精确来源，供作者／审查比较，不自动改写其主张。
- 只对“自身仍属当前scope，却因历史来源失效而静默停住”的旧来源审核创建一次类型化source-context-v4复审；保存旧结果与原队列。
- 实际有五条已通过原子审核，直接复用。另一条虽写supported但requiredData非空，不是通过；它和过期引用一起继续，不能假称六条已通过。
- 新v4主张缓存按该主张实际所选来源绑定；无编号的一般主张保留完整来源范围。旧版本hash仍显式兼容。新增无关引用不应使所有独立通过项重买。

证明：`scripts/verify-slice272-stale-claim-context-v689.mjs`。RED41272；首次绿42657暴露夹具误将supported＋未解问题算通过；修正后43720又暴露夹具误要求调度顺序固定。按既有授权，在明确夹具修正后追加一次，GREEN44513。日志 `build/slice272-stale-claim-context-v689-final-fixed-order.log`。正常Run只派发两条未过项，五条有效项无新派发；0Provider/Native/生产写，历史来源未晋级当前真值。未重跑旧通过门禁。

## P1/P2/P5 v690：假设评估不应跨角色串责

现写地图负责人已用970和187回答Entry Edge、ZoI、补给和任务，并引用816的标记坐标；816碰巧属于Raynor实验。旧门因“引用任何hypothesis-bearing来源”而强迫当前角色评价Raynor实验，实际原角色没有被分配该实验（activeHypothesisTests为空），所以重复三轮停住。

修复：强制假设评估只适用于明确控制链分配的设计。引用另一实验中的坐标、支付或局部事实不转移它的战略问题；原假设负责人仍必须提供supported_under_conditions／refuted_under_conditions／inconclusive及来源。自愿提出的评估仍须验证真实声明和引用。来源、覆盖及当前必要事实门未放松。

原付费地图答复可经类型化hypothesis_assessment_ownership_scope正常重验，不新增Provider改写或隐式批准Plan。请求记录责任范围版本与实际分配数量。

证明：`scripts/verify-slice272-hypothesis-assessment-owner-v690.mjs`，真实RED47400→一次GREEN48958。同一正常Run中原未分配场景通过；受控显式分配同设计时仍被原假设评估门拦住。0Provider/Native/生产写，旧付费回复不改。日志 `build/slice272-hypothesis-assessment-owner-v690-green.log`。

## 尚未完成，不能混作交付

1. 原实际条件对照还需完成收益测量、独立审核、总体采纳／保留和受影响复审，不能以Orders合法或静态队形成功冒充策略提升。
2. 当前两条流程需清完必要工程问题并完整生成。已有合法2000军表不等于新修复版无人干预稳定生产；最终新鲜同产品流程验证仍需完成。
3. P6正式发布／房间桥仍未实现完。本轮只检查了现有接口：journey仍硬编码formalPlanAccepted=false、无workflow正式发布端口；旧对战Plan桥要求旧版开局schedule，不能冒充已接入新建议型Plan。必须保存服务端当前审核通过的正式军表／Plan，再在实际同地图／同军表房间验证读取和记忆接续，不能调用旧Teach重新生成一遍。
4. 最终中文逐步报告、实际prompt／工具结果／修改对照及流程图须基于最终实际执行，再启动约定分组；本文件不替代这些交付。

## 生产恢复入口

- 原现写workflow `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1`，目录 `build/slice272-product-generation-v645-M86Cg9`，r9／2000／9单位；PID49815载v690，日志 `build/slice272-product-generation-v690-editable.log`。旧37336已终态。
- 原固定workflow `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34`，目录 `build/slice272-product-generation-v645-I7zekC`，r12／2000；PID44953载v689已请求当前操作后安全退出。确认终态后才可同原目录加载v690，不并开writer，不因观察超时重启。
- 原房／旧A–F不恢复，不更新数据、不安装、不删除、不提交；本轮无子代理。

## 用量截点（两条新workflow累计，非本轮新增）

| 流程 | 已完成回复 | Tokens | 可按冻结快照计价部分USD | 尚未按该快照计价回复 | UTC截止 |
|---|---:|---:|---:|---:|---|
| 现写 | 504 | 37,967,681 | 5.036619060 | 9 | 2026-10-20 02:16:44 |
| 固定 | 646 | 53,843,550 | 6.851169156 | 6 | 2026-10-20 02:15:32 |

总Tokens91,811,231；已计价部分估USD11.887788216。15份不能按该快照计价的回复不算零费用；另有3条费用未知dispatch，原记录保留。按traceId去重，使用实际cache命中／未命中与请求时段；不是服务商账单，不是全项目总账。没有费用停机或计数清零；后续继续累计。

## v689/v690真实结果与P1/P5 v691–692

### 实际纠错和最终组汇合

- v690原付费地图答复已由正常产品记录hypothesis_assessment_ownership_scope并成功继续，无新增同回复改写。作者还经来源反馈自行纠正“activated/unowned”误述，保留真实physicalPresence=false／待地形布置，未手工改产物。
- v689新来源审查实际指出：r11 unknown/[]不能支持r12当前声明。作者实际改写该结论为r12 declared／已有顺序，并说明scoreRoute不拥有那些字段。随后三域事实汇入真实 `review-resolution:r12:decision`，总体retain、requiredData=[]；已排入三个受影响round2复审，不是仅单测通过。
- 现写r9也实际进入六域最终审核，部分组件用途／战损依据／对手反制／历史问题仍需处理。进入最终审核不等于通过。

### v691：历史查询是待处理义务，不是必须为真的当前断言

固定表round2把已经被反驳的“资料不可得”旧判断再次判为requires_revision。修复正常审核输入转换：只有带originQuestionIds的历史问题明确标为resolution obligation，检查其当前有无证据支持的处理结果；旧假设被真实证据反驳可以算问题已处理。旧原文、ID、当前域准则均保留，不强迫当前已正确的Plan为历史日志再改一版。当前Plan仍断言错误内容或必要事实仍开放时继续失败。

`scripts/verify-slice272-carried-question-meaning-v691.mjs`最初两次试图重排其他运行域的夹具分别错在完成依赖和旧scope，未到达目标请求；收窄为正常读角色实际调用的纯输入转换接缝后，真实RED61333→明确来源修复后一次GREEN62062。按既有三轮后明确修正可追加一次授权执行。日志 `build/slice272-carried-question-meaning-v691-green-pure-seam.log`。0Provider/Native/生产写；这只证明问题合同，不证明模型实际复审已通过。

### v692：原件、导航视图、精简视图必须共用来源身份

固定表随后真实停在ROSTER_WORKFLOW_BINDINGS_INVALID。实际最后事件发布了“experiment-source-facts的experiment-source-facts”，根因是只识别receipt_view，没有归一source_facts。视图被再次包装，既增加上下文，又尝试以旧Plan scope发布新的派生源。

修复沿两种视图显式保存的原件ID递归解析，并核对sourceArtifactRef，检测缺失／循环；不按ID前缀猜原件。来源别名号仍可追溯。当前来源最多一层精简索引；历史来源直接用已经注册的原件做只读审核，不新发布旧scope索引，不改绑成当前真值。所有旧视图和付费记录保留，未删除。

`scripts/verify-slice272-source-view-canonical-v692.mjs`：实际停点RED64337→一次GREEN65298，正常Run越过原发布停点并到下一角色，历史审核覆盖不再静默superseded，旧artifactRef保持。0Provider/Native/生产写。日志 `build/slice272-source-view-canonical-v692-green.log`。旧通过门不重跑。

最新原流程：fixed旧54534已终态，同原目录PID65793载v692；editable49815已保存终态，同原目录PID65795载v692。日志 `build/slice272-product-generation-v692-{fixed,editable}.log`。每次先精确ps，不能因观察超时重建或并开writer。正式0/6、游戏0/12、相关余4不变；继续实际受影响复审／条件比较，P6正式发布和对战桥仍未完成。

### 同版实际r10提交（不是最终验收）

现写event5598记录 `review-resolution:r9:component_choices:strategy-frontier` 实际提交r10，仍9单位／2000，rosterRevision4。其公开理由指出组件用途原来只是标签，没有明确 rejected alternatives 和具体协同链；现在修改componentPurposes/publicSummaryText，解释重复Marine、重复Medic、新A-13 Medic和升级包的用途／替代取舍。当前部署正文也引用969给出的实际进场边和ZoI，保留逐单位真实部署/路径必须由Native执行的边界。

这是实际Teach质疑→总体Plan修改→受影响审核的进展，不是策略改善的量化证明。作者把Raynor Orders比较改列optional，但项目的六能力“策略比较”要求不因此取消；原净收益对照仍未完成，不能用论证变长或Plan升级号替代。r10六域审核继续，fixedr12实际越过原嵌套视图停点继续round2地图来源审核；两进程均已精确确认存活且无failure。正式产物仍0/6、对局0/12。
