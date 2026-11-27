# Ticket 28 / T28-W3-03、12、14 — Wave3 离线代答验收

本次用一份新版输入、一份 Codex 代答验证新增数据能否被选择并通过同源 Builder 审计。同时检查正式产品的新版准入。留下一次代答、一次原生审计和一次准入结果。既有 R1-DS 及已过的 Wave3 组件验证未重跑。

## 实际经过

1. 从 Wave3 U83/C84/R50 的正式 Builder 工具读取达拉姆 Standard 2000 菜单，从空表构造一期候选。样例只知道对阵 Terran，未知对方军表与地图。样例提示用这次真实菜单和冻结 Feedback 卡文构成。工程仅在代答后把单位名和规模解析为对应的原生标识。
2. 代答选择小队 Zealot 和小队 High Templar，保留同价 Sentry 作为替代。选择依据是对手使用机械或灵能单位自身能力时才评估 Feedback 价值。移动阶段的支付、8 寸范围、视线、伤害发生时点及卡牌来源除外条件都保留。敌表、阵地和比较结果保持为待证。
3. 同一工具原生审计返回合法的 300 矿、0 气、5 模型、3 Supply，剩余 1700 矿。此为起始候选，完表和终审未执行。目录绑定与 Force Wall 组件发布的底层数据 SHA256 一致。
4. 正式写表产品工厂用已登记的 Wave3 Force Wall 组件发布请求 planning 用途。发布解析器返回 `OFFICIAL_RELEASE_COMPONENTS_MISSING`，列出 `roomFactory`、`missions`、`strategySkills`。拒绝发生在旧数据加载及 Provider 之前，隔离工作流目录未创建。当前样例提示为定点检验材料。正式首轮 Prompt、Plan 和 Teach 尚未产生。

## 压缩下一次验证

待三个组件均可由同一新版 ReleaseContext 解析时，选一份从空表开始的新版实际产品流程。从外发前保存原始 Prompt，再按实际角色合同分轮代答。把当前样例的三项检查纳入同一次轨迹。

- 作者读取当前菜单或规则回执，选入新增单位或升级，真实 Builder 重新审计合法且预算达标。
- Plan 写清新增能力服务哪个目标、成立条件和放弃条件。Teach 对同一事实或策略取舍只质疑一个明确问题，作者据证修订，或说明为何保留。可靠性以事实能读回、角色能消费并自动进入后继为准。
- 保存最终检查点后关闭并重新打开产品，确认军表、计划、工具回执和 release 一致。独立模型质量与策略效果以后另记。

通过本次样例的只有 Builder 候选接线与正式产品拒绝边界。完整产品及策略效果待验。未调用外部 Provider，未开局，未更改规则、原启动断点或既有发布。

- [样例提示与 Codex 代答](../../../../build/ticket-28-wave3-offline-agent-validation-20261122/prompt-and-reply.public.json)
- [正式 Builder 菜单、候选和原件](../../../../build/ticket-28-wave3-offline-agent-validation-20261122/native-builder.public.json)
- [正式产品准入结果](../../../../build/ticket-28-wave3-offline-agent-validation-20261122/product-admission.public.json)

## 本次冷核对及验收判据

对照当前解析器的 planning 要求和仓库内带发布 ID 的 Wave 3 清单，尚无同时登记七个 planning 组件的清单。上述 Force Wall 清单仍差三项。11 已签名的 Standard 任务证据不能自动充当 planning 的 missions 组件。保留已存离线答复及首个准入证据，本次未重跑。

后续只跑一个具有区分度的正式样例，固定 U83/C84/R50、同一地图任务与未知 Terran 敌表。从空表起步，至少保留一个 Wave 3 新单位或能力供真实 Builder、Plan、Teach 和冷恢复共同核验。首轮及后继一律使用产品即时生成的 Prompt，每个不可合并的角色边界答一次。只有验证步骤错误或产品明确拒绝时，才在留档后处理对应断点。

验收盯两个独立条件。首先，同一发布的规则回执同时用于合法性与角色表达，作者须能区分可触发的单位能力与战术卡造成的伤害。其次，Teach 的答复须被产品消费并推进作者后继，重开后绑定及公开取舍一致。计费模型稳定性、对局表现属独立验收。

- [正式规划发布要求](../../../../packages/source-data/official-release-context-v2.mjs#L5)

## 单样例执行卡

**输入固定**：Wave3 U83/C84/R50，达拉姆、Standard 2000、对方已知 Terran 势力但未知军表。选一张可由同一 release 绑定的已验收地图及任务。军表从空开始，已存 300 矿样例仅作对照。隔离 Journey 使用产品的外层入口，Provider 边界接本地离线作答。每次只取当前角色的实际 Prompt、合同和已授权可见证据。需要另开上下文时只传该请求。

| 步骤 | 最少动作 | 可观测的通过条件 |
| --- | --- | --- |
| 准入 | 零次代答。核对一份同版清单及实际产品装配 | roomFactory 与 rulesRuntime 返回可调用工厂，地图任务与 Skill 包由同一 release 读取。三个缺件未齐时直接保存缺件，不触发作者。 |
| 写表与初稿 | 作者按实际 Prompt 选入 High Templar 并形成 Plan。工具可同批读取单位、合法选择和任务信息，工程负责身份、预算和状态绑定 | 产品从空军表推进到原生审计通过的候选，再保存对应 Plan。新能力在最终军表仍可追溯。未知敌表保持未知。 |
| Teach 与回交 | 复用同一稿和同一份新事实，只比较一项实际取舍。优先验证 Feedback 是否改变高阶圣堂与已有替代单位的选择 | 在 1 PE、8 寸、视线、目标类型均满足时，能区分单位自身能力完成后触发与战术卡效果不触发。作者可据此改表、修改 Plan，或有依据地保留。产品消费后自动推进。 |
| 冷读 | 关闭同一隔离 Journey，再按原 ID 读回一次。无代答 | release 绑定、军表摘要、Plan revision、Teach 与原生证据引用一致。无新房、无新计费。 |

每个真正需要决策的角色答一次。产品要求先读后提交时保留两段原生请求，把同角色独立读取合并成一批。正常案例和规则例外由同一个 Teach 请求覆盖，复用既有原生单位／卡牌分流回执，只另验角色是否收到并正确引用。具体失败保存原 Prompt、回复和状态后分类，修复后仅验证那个交接。完成判断针对这条功能路径，跨模型稳定性和策略效果保留待测。

本次只读核对了 9 份带 U83 的仓库发布清单。最接近 planning 的 Deep Tunnel 与 Force Wall 组件发布均缺 roomFactory、missions、strategySkills。现有任务发布登记的是 missionSource，不能替代产品 missions。正式构造器还会验证工厂接口并装载策略包，清单中补上名字本身不构成通过。复用已有准入结果，本次未再次创建 Wave3 Journey。

- [产品规划构造器](../../../../packages/product-composition/roster-planning-product-module-v1.mjs#L234)
- [Feedback 原生组件证据](../../../../build/ticket-28-protoss-wave3-20261120-v1/feedback/REPORT.zh-CN.md)
