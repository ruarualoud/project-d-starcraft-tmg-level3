# Ticket 18 / Slice 174：初始Skill与演化链分离、来源纠错实证

本步回答两个问题：初始Skill是否和后续优化混层；来源审核失败后是否有可执行纠错机制。
结论是V1合同分类确实混层，但七个初始策略维度没有被复盘数据污染；现已用不可变投影分离，并实际走通一次来源失败纠错。

## 混层诊断

最小复现直接比较V1 `STRATEGY_AXES.general`与初始运行时职责：V1强制包含`review_adaptation`，断言失败；
它不是仅在Markdown中混排。随后检查七个真实候选的roleHistory，没有`review_adaptation`或reflection产物，排除内容污染。

V1生成合同和已付费产物保持冻结。新投影形成：

- 初始总规则策略候选：7维，`objective_plan`、`activation_tempo`、`movement_position`、`threat_trade`、
  `resource_timing`、`uncertainty`、`opponent_response`。
- Skill演化策略候选：1维，`review_adaptation`；只允许离线优化器在完成房间开发轨迹和来源/规则确认失败后使用。
- router manifest：初始运行时不加载演化候选；优化器不得原地修改初始候选；两者目前`runtimeLoads=[]`。

分离门5项通过，Provider 0。初始候选hash：`2238071822aa110b1fd0a1340a19c7d638488c7f226bbe7016e96b5219abd440`；
演化候选hash：`8af6d590f6fa128a0750877efcc9bc9c3841e77af6d37743fc04eeeee518e5e0`；
manifest hash：`2507ee13f713541e54707618aacb8e6465071674d3cd4b1a6c9dfda2bdcd96df`。

## 来源审核检查什么

来源审核不只是检查引用ID存在。它需要分别识别：

1. 正文是否捏造官方规则没有的事实；
2. 正文是否与所引来源相反；
3. 引用是否支持具体句子，而非主题相似；
4. 是否漏掉时点、对象、频率、例外或前置条件；
5. 是否把策略启发式写成规则结论；
6. 多处来源是否冲突，或规则服务是否没有可执行覆盖。

当前11字段模型审查只是一种独立意见来源，锚点存在不等于理解正确，不能单独把`sourceReviewPassed`置为true。

## 失败后的纠错状态机

新增来源审核/纠错边界：

```text
候选
  → 绑定字段/句子/当前候选hash/官方来源片段的审核记录
  → 无问题：仍需完整覆盖与非模型证据
  → 官方来源唯一明确：Host白名单字段补丁
  → 可由模型改写但需判断：定点模型补丁，Host只应用获准字段
  → 来源冲突或解释不唯一：停止，人工裁决
  → 修改后的候选重新审查全部受影响内容
  → 重跑旧回归与相关Case
  → 仍失败/无变化/循环：隔离，不组装、不发布
```

所有路线保留原候选、失败意见、来源证据和费用。纠错计划验证parent/policy/audit hash，禁止空修改、无关字段修改、
旧版本循环和heldout作为教学输入。模型负面意见本身没有编辑权；规则来源也不能被策略Skill反向修改。

## 实际失败与修正

独立阅读发现`opponent_response`写成“对手通过Pass改变激活顺序，抢先行动”。冻结官方原文规定：

- 第一名Pass的玩家取得下一阶段First Player Marker；
- 标记持有者在每个阶段开始时选择哪一方先行动。

因此原句混淆当前阶段、下一阶段和“取得选择权/自己自动先行动”。审核记录绑定原候选、`opponentBranches.0`和两段官方来源，
分类为`contradicted_by_source`，route为`exact_host_field_patch_allowed`。

Host只修改`opponentBranches`：

- 对手首先Pass并取得下一阶段标记，随后在下一阶段选择首个行动方；
- 本阶段完成仍有价值的剩余合法激活；下一阶段等待标记持有者选择后再重算，不假设己方先行动。

其余10个字段逐hash保留。修正后真实模型重新审查11字段，0 open / 0 uncertain；这证明定点修正后的模型意见，
仍不冒充七维完整来源审核通过。

实际3 calls / 912,019 tokens / 估算¥0.478422；全历史累计129,745,019 tokens / 估算¥86.548346。
无格式失败、重试、402或在途请求。报告hash：`6fd29058d1c3e2b34bb3df9440428c416eac54ddfb0240587efb5438087c2a9c`。

只读重启从真实SQLite复用3个审查和1个候选检查点，重现修正候选及7+1分离结果；
凭据、DSH、Provider、写入和账本变化均为0。5项回执hash：`dcb1d4a0345400cb17364e6fadc02cf5a8b140baff5144ffe0694938e8ab3daa`。

可读初始7维候选：[initial-general-strategy-candidate.md](../build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/opponent-pass-source-correction-v1/initial-general-strategy-candidate.md)。

## 当前进度与下一步

- 初始总规则策略正文：7/7已生成。
- 定点来源问题：`activation_tempo`和`opponent_response`已各修正一次；不等于两整维来源通过。
- 完整独立来源审核：0/7。
- 演化策略候选：1/1已分离，真实复盘/heldout/整局验证0。
- 正式总规则Skill：0/1；两族和双向对抗正式Skill仍0/4。

下一步为七维逐句完整来源审核。每个发现按上述三路处理；所有确认修正收口后再补开发Case、保留heldout、
执行规则重放和决策消费，之后才组装一个draft总规则Skill。

ctx2skill：`ctx2skillLoopUsed=true`、目标`starcraft-tmg`、路由`rule_skill_builder`、promotions为空、
`trainingTruth=false`。本步没有在线对战、记忆晋升或训练数据写入。

