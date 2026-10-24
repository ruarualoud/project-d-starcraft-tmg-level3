# B 组模型纠错：实际失败诊断与工业恢复方案 v59

日期：2026-10-13。范围：Ticket 27 / Slice 272，先 B 后 D。
状态：**诊断及方案已完成，以下改造尚未实施，B 尚未通过正式准入。**
本次调研不追加模型调用、不改军表/Plan、不重放对局、不创建代理。

## 结论

有成熟的工程模式可以借鉴，但没有一个框架能自动消除所有事实幻觉。
目前 B 的问题以纠错控制流和事实协议设计为主，叠加真实的模型语义错误；
不是简单的网络不通、JSON 解析失败，也不能靠增加审核轮次解决。

应把现在“整批模型复核全部通过，才允许纠错”改为：

`逐条提取命题 → 规则/查询证据校验 → 保存已完成项 → 补证或定点修复 → 校验改动及关联项 → 当前版本 Teach 接受 → 准入`

审核意见只是待验证的挑战，不是事实。审核服务失败不等于 Plan 有错；
Plan 的已证实 High 也不能因为审核失败而变成通过。两者必须分别记账、分别恢复。

## 1. 当前真实停点与证据

B 的当前军表仍是合法 2000 分、8 个单位；当前 Plan 为 v6，
`4a2f0c16d4e26c9dc295e958ea2e8477d30c9bb5e60da2d65594e08decb47a41`。
没有手工修改数字，没有新 B/D 对局准入。

原来的未完成来源审核已断点续完 12 个分片。当前审核有 7 条原始 High，
来源资格复核先完成三次请求，再在明确修复后追加一次，仍未收敛。
最新停点是 `ROSTER_WORKSPACE_REVIEW_RECOVERY_CALL_LIMIT`，不是请求没返回。
最近四次资格请求全部拿到了结构化输出。

实际证据来自：

- `build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json`。
- 同目录下 `B-evidence-alias-input-v58.private.json` 与 `B-v57-priority-continuation-progress.private.json`。
- [前期修复与原始停点](ticket-23-slice-248-payment-recovery-and-roster-review-v52-v53-2026-10-13.md)。

| 实际问题 | 已观察到的行为 | 原因及影响 |
| --- | --- | --- |
| 两点总分错绑 | Plan 写 player2 每点 1 VP、两点合计 1 VP/round；事实目录明确合计 2；资格模型仍判 `source_supported` | 引用正确的单点数值，不等于证明整句话正确。命题没有完整绑定玩家、点集合、单点/总和及条件。 |
| 几何范围混用 | 原始审核用“从进场边到点的距离”否定“Goliath 到中场后威胁接近路线” | 查询的起点、终点、姿态与假设不同，且精确位置查询是 unknown，不能作为不可行证明。最新资格模型已识别这点，但整批结果未准入。 |
| 合法证据路径写错 | `projectionIsNotObservedScore` 写在 raw-query 投影路径，实际位于同回执的 math projection | 让模型复制数组索引和长路径，产生引用位置错误；不应耗费整轮语义重生成。v58 已做同回执、唯一且值相同的本地别名恢复，原付费输出未改。 |
| 单项失败堵整批 | 7 项必须一起成功，2 项未绑定就抛错；自动改写没有开始 | 审核器失效和计划失效被合并为同一个阻塞，缺少逐条完成/待补证状态。 |
| 新证据没有统一复用 | 资格复核有规则计算出的 marker-group/army-slot 目录；修文另行构造 `sourceFacts`，没有直接接收同一个 `premiseFacts` 包 | 同一事实在不同阶段以不同形态出现，修文模型仍可能重新推算或沿用旧错误挑战。不是每轮都缺事实，而是协议不统一。 |
| 尝试预算与失败详情不完整 | 追加调用达到上限时异常从 `deliberate` 直接抛出，没有附带此前局部 binding issues/attempts | 最终记录只剩 call-limit；若直接再启动，按失败详情长度计算的预算可能变化，不能据此安全恢复。 |

v58 检查能拒绝裸 marker ID 被当作组总分，也能发现实际 VP 原句未被检查。
这保护了准入，但它仍主要是在校验“引用和字段”，并未完整证明所有自然语言命题。
不能把它称作通用语义验证器，更不能以此认证模型会自行修好。

### 输入与重试数据

最近四次资格请求的 input units 分别为 138,872 / 142,293 / 142,287 / 144,341；
输出分别为 3,358 / 3,352 / 3,352 / 3,362，总计 581,217 units。
其中第二、第三次的完整输出 hash 相同：
`21a5584d3bf04dff606ecadbb11b7240c13ebde139b717d32030a0835c211d22`。
这说明当前反馈没有带来可观察的修复进展，不能继续当作独立机会盲抽。

大上下文和重复目录是已测量的输入负担；它们是否直接造成语义误判还需受控比较，
本次不把相关性冒充因果。缓存命中降低了部分费用，但不会自动消除歧义。

当前 B Teach 工作区累计 86 次已完成调用、5,555,265 units；历史未知费用保持未知。
这不是全项目费用或 B 对局费用，本次调研没有新增生产模型调用。

## 2. 成熟实现能解决什么

这些是维护中的官方文档所描述的机制，不是“安装后已经在本项目实测”的结论。

1. **结构输出与业务事实分开。** 当前接入已向 DeepSeek Responses API 发送
   `text.format.type=json_schema`；本轮不是缺 JSON Schema。
   官方定义它约束输出结构；它没有替代我们的游戏计分与几何规则。
   [DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/)

2. **由业务校验器给出具体修复反馈。** Pydantic AI 支持异步 output validator，
   通过 `ModelRetry` 让模型根据校验错误修改输出；普通异常则需要独立恢复处理。
   Instructor 也将校验错误加入下一请求，并在耗尽后保留失败尝试、最后回复和用量。
   借鉴的是错误反馈和失败材料保存，不是让另一个 LLM 充当规则真值。
   [Pydantic AI output validators](https://pydantic.dev/docs/ai/core-concepts/output/)，
   [Instructor architecture](https://python.useinstructor.com/architecture/)

3. **按失败类型选择动作，而不是统一 throw/retry。** Guardrails 提供本地 fix、
   reask、filter、refrain、exception 等不同处理。
   对本项目：本地修复只能用于已证明等价的引用/形状问题；不能 filter 掉真正的 High，
   也不能把错误计分自动改成有利策略。其模式可借鉴，默认配置不能照搬。
   [Guardrails corrective actions](https://github.com/guardrails-ai/guardrails/blob/main/docs/how_to_guides/rail.md#-specifying-corrective-actions)

4. **恢复的是步骤，不是重跑整个功能。** LangGraph 将网络暂态错误、模型可修复错误、
   用户缺信息和未知工程异常分开，并用保存的状态进入对应分支。
   它的任务/断点模式会恢复已完成结果；副作用仍需设计幂等。
   [LangGraph error handling](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph)，
   [LangGraph functional task/checkpoint design](https://github.com/langchain-ai/docs/blob/main/src/oss/langgraph/functional-api.mdx)

5. **重试预算必须有一个清晰归属。** Pydantic AI 明确区分输出、工具、SDK、传输及
   durable execution 的重试；多层配置可能乘出远多于预期的真实请求。
   本项目应把“网络发送重试”和“语义修改尝试”分开保存，而不是相互借用额度或覆盖记录。
   [Pydantic AI retries](https://pydantic.dev/docs/ai/core-concepts/retries/)

推荐借用这些模式改现有 JavaScript 模块，**不为此安装 Python 框架或重写整个平台**。
仅引入 LangGraph/Instructor 不能解决目前“单点事实支持了错误组总和”的语义错绑。

## 3. 建议统一恢复协议

### A. 同一个只读事实包，四个阶段共用

生成、审核、修复、准入统一使用现有 Rules/Builder/查询生成的事实包。
复用已有数据版本、Plan 版本、回执身份，不新建签名链。

每个事实明确：对象/玩家、数量、单位、条件、作用域、来源和结果状态。
例如总分事实要明确 `scoringActor=player2`、`markers=[2,4]`、
`quantity=group_total`、`value=2`、`condition=controlled_at_scoring_window`；
它不证明当前控制，也不证明实际获分。

模型用稳定的 fact/evidence ID 选择证据，Host 投影真实路径和值。
不要继续要求模型手抄数组索引、长路径，再给它重复的原始/派生目录。
原句仍保留；引用覆盖必须绑定整条命题，而不仅是其中一个正确数字。

对旧纯文本 Plan，只能逐条提取命题并核对明确的作用域；提取有歧义就进入待补证，
不能靠泛用正则“猜出正确语义”。新生成的确定数值可直接引用结构化事实后展示，
减少要求模型自行抄写/加总同一数字。模型仍负责策略用途、取舍及预测。

### B. 审核器状态与 Plan 缺陷状态分开

每项保存 `verified_supported / verified_contradicted / needs_evidence`，
另外保存格式/来源/服务错误。对确定性事实，状态由作用域绑定及规则结果决定；
LLM 的 supported 标签不能覆盖一个已验证的矛盾。

- 正确引用、槽位或计分命题：保存成功结果，不因另一项失败要求再审。
- 已证实的错误：进入定点修复，不必先得到整个资格模型的漂亮回复。
- 无法证明的审核指控：隔离审核意见，补原始事实/必要查询；不能把意见直接喂成改写命令。
- 明确的条件策略预测：仍是预测，审核不得用 unknown 路径把它改成不可能。
- 存量尚未解决的 High：保持阻塞准入，不能因为隔离了坏审核就视为通过。

关键区别：**修复流程可以继续处理未完成项；正式对局不能带未解决 High 入场。**
审核意见错误也允许被证据正式否定，不能要求模型把原本正确的计划改坏来满足审核。

### C. 只修失败项，但保留关联上下文

请求包含失败原句、同段上下文、相关对手假设/应对/得分路线，以及关联事实。
全表、全计划与所有回执留在工作区，通过现有工具可查，不每次全量塞入输入。
这是相关上下文切片，不是只发孤立的半句话。

修复返回指定 claim 的完整替换；Host 核对范围并复验改动及其关联项。
旧审核原文仅作为带标签的挑战保留，不是校正目标值。
已经验证的无关项不重发，原付费结果不覆盖。

若同一错误连续返回相同结果，进入补证/重新提取命题的恢复分支，
而不是原请求再抽一次。整个审核/修复仍遵守最多三轮收敛规则；
明确改动后获准的一次补验单独登记，不因重启丢失预算或自动增加。
这不是新的费用上限。

事实修正可能改变获胜路线，必须回到**当前版本** Teach，让模型决定是否改 Plan/军表。
不能把局部修文的“军表保持不变”变成整个 B 流程永远不能改军表。
已有 v51 当前 Plan 反馈与 Builder 入口复用，不再开发一套旁路。

### D. 一条统一恢复状态机

| 错误类型 | 自动动作 | 不能做的事 |
| --- | --- | --- |
| 已证明等价的形状/引用错误 | 本地映射，保留原文及映射记录 | 不能改值或跨回执随意找同名字段 |
| JSON/字段或命题提取错误 | 具体 issue 反馈，只重做失败项 | 不能重复整批成功项 |
| 规则事实矛盾 | 规则值和原句驱动模型定点修复，再核对关联项 | 不能由旧 LLM reason 代替规则 |
| 来源不足/作用域不匹配 | 补相关查询或标明条件；隔离无证审核 | 不能把 unknown 当不合法/不可能 |
| 未发送的网络失败/已知可重试拒绝 | 有界退避后恢复同一步 | 不能修改策略或重建房间 |
| 已发送但结果未知 | 保留未知记录，查已存结果；仅按已有受控授权重发 | 不能保证服务商无重复计费，不能清账 |
| 认证/配置错误或未知代码异常 | 持久化停点、明确上报原因 | 不能假称模型可修复，也不允许运行时任意改代码 |

每步先记录意图，完成后保存结果；恢复从最后未完成项开始。
异常任何出口都保存 attempts、失败指纹、最新输出和用量，包括调用上限/网络异常。
尝试计数归属逻辑操作，不能从错误对象有无某个数组临时推导。
服务商无服务端结果存储时，checkpoint 只能保护本地已收到结果，不能实现支付请求的 exactly-once。
DeepSeek 官方说明 Responses API 不存 responses/conversations；这一边界必须如实保留。
[DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/)

## 4. 在现有 Slice 内的四个交付物

以下是同一个“写表与计划可自动完成”功能的四步实现，不新增四个 Ticket。

1. **统一事实包和证据选择接口**：在 `roster-final-plan-review-v1.mjs` /
   `roster-review-premises-v1.mjs` 及 runtime 修文入口共用同一事实投影。
   交付：两点总和/玩家身份/槽位/几何范围可被同一协议读取，旧 Plan 可适配。
2. **逐项完成及错误分类**：资格返回成功项、待补证项和失败项，自动修复能继续，
   准入仍拒绝未解决 High。交付：单项审核失效不再吞掉整批进展。
3. **定点修复与 durable 接续**：Workspace、`reviewed-plan-auto-repair-v1.mjs`
   和标准 Generate 同入口；保存预算及所有异常详情；修复后回当前版本 Teach。
   交付：网络/解析/事实三种恢复不混用、不重复已付费成功步骤。
4. **用 B 当前停点真实验收**：保留当前军表、旧候选及付费记录开始，由系统修正真实
   错误、补审关联命题并让模型重接受，必要时允许经 Builder 改军表/路线。
   交付：正式产品链路输出合法 2000 分军表 + 当前版本 Plan + 无 Critical/High 准入记录。

验证只复现实际已发现问题，先 RED、改后一次对应 GREEN；旧绿/无关门禁不重跑。
第四步必须是真实 Flash 输出，不用能按测试预设给出正确答案的替身冒充生产。
相同错误三轮不收敛时出具体停点，不继续扩充“审核模型审核审核模型”的层数。
实际实现后再评估局部请求的 input、延时与幻觉表现；本报告不虚构节省百分比。

## 5. 本次期间发生的独立对局停止

A/C 原房 v56 已恢复推进，但本次只读监控确认它们又于 09:50–09:51 UTC 停止。
`common-v56-acr2-independent-monitor-progress.private.json` 仍显示 running，是过时快照；
应以 `all-stop-common-v56-acr2.private.json`、退出进程和实际 journal 为准。

- A：已签收 r129，R3 Movement；player2 `provider_http_rejected` High。
  具体 HTTP 状态/拒绝体尚未诊断，不推断成规则错误，也不直接重发。
  累计当前房估算 ¥109.027578，加保留 offset 后 ¥342.168784。
- C：journal 已签收 r144，R2 Combat；截图/action driver 仅记到143。
  联停过程中页面关闭，导致 `locator.click` 失败；不是已证实的新模型/规则缺陷。
  恢复必须补 r144 观察记录，不能把动作重新执行。
  当前房估算 ¥119.746211，加保留 offset 后 ¥366.513224。
- A 的 R2 权威记分记录为 Terran 0 / Zerg 2（marker4 + marker5 各1）。
  “未占点是策略选择还是距离/路线错误”的完整逐动作排查尚未完成，不据分数猜原因。
  C 未完成 R2 记分。两组 R2 查询/路线/计划修订审计仍待交付。
- D 按用户 B 优先要求保持停点；本次没有新 D 请求。

本次只做研究及记录，不在此期间装依赖、删除数据、提交、更新官方数据或重启对局。
Ticket 23 33/36，Ticket 27 5/6；主线剩余 Slice 248 / 272 / 249 / 250，
完整有效实验仍 0/12。地图20张既定范围不变，后18张经典图扩展仍后排。
