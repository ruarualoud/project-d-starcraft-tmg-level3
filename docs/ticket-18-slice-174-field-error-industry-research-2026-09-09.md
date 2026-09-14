# T18 / S174：字段错误的业界解法与当前链路审计

日期：2026-09-09。状态：调研与只读复现完成；下面的改造建议尚未实施，未发起新模型调用。按用户要求自行研究，不启用子 agent。

此处保留11:55调研时的状态；后续模块实施及12:45生产/回放接线、明确未完成项见[字段模块实施记录](ticket-18-slice-174-field-codec-implementation-2026-09-09.md)。不要把本报告的历史红测或组件结果直接当成当前正式生产是否已过的证明。

## 结论

问题不是“还差几个字段特例”。需要把结构约束、内容判断、数据装配和错误修复分开。推荐组合是：**同源合同编译 + 实测可用的受约束输出 + Host 装配/有审计的提取 + 验证器驱动的局部纠错**。没有一种解析器或“再想一遍”的提示能同时保证格式、规则真实性和策略有效性。

9 月 6 日的[可靠性手册](ticket-18-slice-174-structured-generation-reliability-guide-v1-2026-09-06.md)已经提出这些主要原则。这次发现的是落地缺口，不应再次把同一原则包装成全新架构，然后继续逐字段扩充恢复分支。

## 一、真实失败：不是全部都叫模型幻觉

唯一生产父轮次仍是 `faction-v1-5fdab77171f213a6e7c9`。读取其原始失败记录，重建完整请求上下文，再走实际 V6 校验器和 Host materializer；未修改原付费结果。

| 实际样本 | 确定发现 | 诊断边界 |
| --- | --- | --- |
| `2a9e1746…`，candidate `921b1075…` | 漏掉必填 `coverage`；两个已有 verdict 完整。133,564 输入 + 1,006 输出 token，估算 ¥0.409746 | 本次确有遗漏审核内容，不能简单补空数组冒充完成 |
| `20d631c3…`，candidate `a27fcf2a…` | 纠错补出两个 coverage，两个原 verdict 的内容 hash 不变；仅多出 `coverage[0].recommendationSlots_note: null`。134,894 输入 + 1,224 输出 token，估算 ¥0.415698 | 此额外空备注本身不是规则事实幻觉；当前合同仍拒绝 |

两个上下文分别精确重建为 `32f623d0d1006c1d432bce6e80a6bf67437cca79093e6a390e6649df7c73fdc5`、`ca610388517c9b83ee59693dfa43708283414b2df06c7b6794e5221cd2187664`，输入为 442,212 / 445,881 字节。两次均为已有 HTTP 200、完整解析出的对象，不是网络不明发送、余额耗尽或输出 token 截断。

两个单变量反事实，仅在内存中执行：

- 给第一份回答添加 `coverage: []`，Schema 通过，但真实 Host 返回 `FACTION_STRUCTURED_REVIEW_COVERAGE_SLOT_INVALID`：本批实际有 Roach、Zergling 两项覆盖义务。证明“格式正确”不等于“审核完成”。
- 从第二份回答移出那个空备注，Schema 与实际 Host 映射通过，所有原 verdict 不变。证明当前失败可定位为表示层；这不是正式恢复凭据，更不是来源审核/策略验收通过。

可重复命令（在产品目录执行）：

```sh
node scripts/diagnose-ticket-18-field-contract-research-v1.mjs
node scripts/diagnose-ticket-18-field-contract-research-v1.mjs --require-consumable
```

第一条报告真实症状与反事实；第二条应当红测退出，错误为 `ACTUAL_FIELD_CONTRACT_FAILURE_REPRODUCED`，说明旧付费样本在当前正式消费路径仍未被接纳。该脚本不访问凭据，不调用 DSH/Provider，不写生产账本。

## 二、初始 prompt 和接口究竟有什么问题

### 已证实

1. **并非没有告诉模型要 coverage。** 原始 instructions 已要求它；输入还明确提供两个 coverageSourceSlots。不能把这次漏字段武断归因为“提示词漏写要求”。
2. **存在规则说明不同源。** V6 Schema 的 `sourceSlots.maxItems` 是 128，但普通 schema repair instructions 仍硬编码“最多八条来源”。路径见 [context factory](../packages/skill-production-v3/faction-review-context-capsule-v1.mjs) 的 `createFactionReviewSchemaRepairContextCapsuleV1`。它是确定的潜在冲突；本次原值分别只有 8/6 条来源，不能称它就是漏 coverage / 多 note 的直接原因。
3. **局部修复仍要求完整重抄。** `repairSchema` 给出了准确错误路径和一次上限，但使用原合同输出完整对象，复制整段规则与整份草稿。修复时输入约 13.5 万 token，实际缓存命中为 0；“已经局部指出错误”不等于“已经局部限制生成”。见 [review runtime](../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs)。
4. **不同错误共用一个 schema repair 语义。** 缺少整个 coverage 要补作新的判断；多一个空备注仅需要表示层处理。两者都走完整 reviewer 纠错，会让成本、上下文和验收权限混在一起。
5. **受约束输出不能只由 API 名称推断。** 当前 [adapter](../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs) 确实发送 `text.format.type=json_schema`，不是仅用普通文字要求 JSON；它没有发送 strict 工具调用。实际两份结果违反 required/additionalProperties，因此当前模型、endpoint 和合同组合尚不能被我们视为可靠硬约束。
6. **审核/纠错都固定关闭 thinking。** adapter 的 `reasoning.effort` 固定为 `none`。这不证明开启 thinking 就能修好格式；只说明未来“规则判断纠错”的模型能力路由没有与纯序列化任务区分。

### 不能从上述证据断言

- 不能确定 DeepSeek 服务内部是否使用 grammar、是否发生测试模型回归，或某一参数是否被该模型忽略；本轮没有做新的付费对照实验。
- 没有充分证据证明增加上下文、换更大模型、提高 token 上限就能解决这两份完整输出。
- 两个样本不是全量失败率统计。也不把外层 `routing_evidence_invalid / ERR_INVALID_ARG_TYPE` 误当作本次底层 schema 原因。

## 三、业界怎么处理

### 1. 生成时限制可输出结构，而不是事后修括号

Claude 官方说明 Structured Outputs 使用编译后的 grammar 约束采样，同时支持 strict tool inputs；XGrammar 展示了在模型采样端限制合法 token 的实现。它们解决的是可表达结构，不是事实正确性；客户端装一个 parser 不能为远端黑盒 API 补上 token 级约束。[Claude 官方文档](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)，[XGrammar 官方实现与说明](https://github.com/mlc-ai/xgrammar/blob/main/docs/start/quick_start.md?plain=true)。

DeepSeek 官方把 Responses `json_schema` 描述为按 Schema 输出；另在工具调用文档规定 `/beta`、function `strict:true` 的严格模式。后者不支持 `minLength/maxLength/minItems/maxItems`，而当前合同大量使用这些约束，所以不能原封不动换 endpoint，也不能声称补一个 strict 字段就完成。需将提供商支持的形状约束和本地值/基数校验分开。[Responses 定义](https://api-docs.deepseek.com/api/create-response/)，[strict Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)。

建议：先验证同一个已授权 beta 模型在严格工具路径是否可用，再选择 adapter；不能因为格式失败便擅自换旧模型。用户授权的旧模型退化条件仍是新模型退场，不是输出质量不好。短探针通过只证明被测输入，仍要测真实长上下文与实际消费者。

### 2. 类型化输出/提取与程序装配

Pydantic AI 明确区分 Tool Output、Native Output 和 Prompted Output；最后一种依赖模型自己遵守提示，可靠性最弱。其模式区分值得采用，不意味着要在本项目安装 Python 框架或重写技术栈。[Pydantic AI 输出文档](https://pydantic.dev/docs/ai/core-concepts/output/)。

本项目的应用建议：

- **Host 已经知道的东西由 Host 写。** target/source 身份、实际待审核集合、完整性计数、全局索引、hash、验收状态都不让模型重复构造。V6 已做了一部分，不应抛弃重来。
- **模型只填写需要判断的值。** 是否支持、理由、例外、策略条件仍需生成；“引用存在”可由程序计算，“引用足以支持结论”不能由程序仅按字符串匹配冒充。
- 默认直接产出简化的类型化结果，不把“完整生成→再找另一模型完整提取”强加给所有成功调用。只有旧/异常输出进入提取适配器。
- 通用提取必须产出 `typed value + 未消费字段 sidecar + 转换记录`，不靠 `_note/_Note` 名称白名单逐个打补丁。空值且无控制含义的扩展可在新、显式版本政策下隔离保存；非空反对意见、未知身份/控制字段、歧义地址一律不得被忽略。旧失败记录仍保持失败。
- 对原文中根本没有的 coverage 判断，提取器必须返回缺失，不得补 `covered`、空字符串或空数组来追求过门禁。

以上 sidecar/字段责任分配是针对本项目的设计推论，不是某个库开箱即保证语义无损的承诺。

### 3. 验证器给纠错信号，模型只改指定内容

Instructor 的 reasking 把验证错误与原回答反馈给模型，并设置重试上限；Pydantic AI 提供 output validator / ModelRetry。它们比“重新生成一次”多的是明确反馈，但仍不能保证每次修复成功。[Instructor 文档](https://python.useinstructor.com/concepts/reask_validation/)，[Pydantic AI 验证器](https://pydantic.dev/docs/ai/core-concepts/output/#output-validators)。

对我们的改进应更进一步：Host 固定错误目标，模型只返回该目标的新值；Host 构造补丁并检查其他字段 hash 不变。可以借用 JSON Patch 的局部操作与 test 思路，但不能让模型任意提供路径或修改整个文档。[RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902)。

研究中 CRITIC 用外部工具反馈帮助修正答案；这支持“验证器定位→模型修复→再次独立验证”，而不是模型自评通过即算成功。该研究的结果不等于我们今天的模型/任务已经被验证。[CRITIC，ICLR 2024](https://arxiv.org/abs/2305.11738)。Google 官方也明确要求应用校验值，并处理符合 Schema 但语义错误的输出。[Gemini 官方文档](https://ai.google.dev/gemini-api/docs/structured-output#best-practices)。

## 四、推荐的统一链路

```text
同一份字段定义 → prompt / Provider schema / Host validator / mapper
                              ↓
                    模型仅生成需判断的内容
                              ↓
                    解析、结构与字段责任校验
                ┌─────────────┼─────────────┐
          表示层异常       缺失/错误判断        合格结构
          保真提取        证据定位+局部生成        │
                └─────────────┴─────────────┘
                              ↓
              Host 装配 → 独立来源/规则/策略验收
```

统一错误处理表，不按字段名字建恢复分支：

| 错误类 | 处理方式 | 不能做什么 |
| --- | --- | --- |
| 合同/prompt/adapter 不一致 | 调用前报告配置错误，由程序修配置 | 让模型重复付费猜新合同 |
| 无歧义表示层异常 | 通用提取、保留原文/sidecar、验证内容不变 | 静默删反对意见、猜身份或事实 |
| 原回答缺失判断 | 保留完整章节语义上下文与相关来源，模型仅补缺失结果 | 把新判断称为无损格式修复 |
| 类型/枚举值含糊 | 明确错误与允许值，局部生成；歧义进入 uncertain | 大小写/近似 ID 自动变成另一事实 |
| 规则事实错误 | 来源或 Rules 反例 → 局部更正 → 相关条件与整章复核 | 用模型多数票覆盖规则 |
| 策略效果不足 | 后续真实 case/对战反馈驱动升级 | 用 JSON 校验或来源一致冒充能赢 |

纯序列化修复仅需已有完整回答、合同和错误清单；内容补写/规则纠错保留整章与依赖来源，不靠随机 Top-K 截段。这满足“不丢上下文”，也不要求每次处理空备注都重读整本规则。

纠错采用有限任务族预算：总次数/费用不因错误从“漏字段”变成“多字段”、重启或换 adapter 而重置。衡量进展包括缺失义务是否补齐、已验证内容是否不变、是否引入新语义错误；不能只看错误条数。确定性提取不消耗新模型次数，语义补写明确记为新内容。无进展即停，并保留已完成部分，避免重新初始化整条流水线。

## 五、建议实施顺序与验收（尚未完成）

这四步是 S174 内的收口工作包，不新增四个正式 ticket，也不把调研记为四步已实现。

1. **统一合同编译。** 保留旧版本；新版本从一份字段定义产生提示、Provider schema、本地 validator、mapper 和错误类别。清除“8 对 128”等重复约束。覆盖生成、review、editor、coverage/fragment 各角色，不只修当前 Zerg。
2. **确定输出能力边界。** 比较现有 Responses 与同模型 strict tool；做 Schema 子集适配、错误/拒绝/截断/usage 映射。小样本包含故意诱导漏字段/加字段/错枚举，而不只测模型主动配合；再验证真实大小上下文。能力按模型/endpoint/合同子集缓存，不每个章节重新探测。beta 退场接原先有界 fallback，不因质量失败自动退化。
3. **落地通用提取与类型化局部补写。** 保存全部原始结果；明确分开空备注隔离与缺 coverage 语义补写。模型不重抄正确 verdict，Host 限定目标并装配。现有真实两样本先离线复用，不再次发送原请求；之后才有界补齐真正缺失内容。
4. **实际入口到消费者一次贯通。** 用历史失败集验证 producer→DSH→Host→独立冷 consumer→重启恢复；负面 verdict 不丢、语义未知不伪装完成、支付停止/不明发送不被重试绕过。随后沿 5fd 继续正式生成两族，再生产正反对抗；实际来源/策略审查通过才计入五包。

最低离线用例类别固定为：漏语义字段、额外空字段、额外非空反对意见、错类型、错枚举、错/漏/重复目标、引用未提供、数字/时机错误、纯语法异常、截断、重启付费去重、402/不明发送停止。最后两项继续沿用已有可靠账本，不重建一套。

报告指标是：首轮结构通过率、一次纠错闭合率、原正确内容变更数、负面意见丢失数、未审核却通过数、平均输入/输出 token 与成本、无必要重启次数。旧失败样本回放是机制验证；实际 canary 才能测新模型成功率，有限样本不能承诺永不失败。关键错误及误验收必须为零，正式长样本仍失败就停在有明确原因的单个任务，不继续全量初始化。

## 六、本轮状态与交接

- T18 / S174：本次调研完成，生产机制未修改；原先 Terran 替代请求与 beta 退场组件仍未正式接线。
- 五包：离线验收 1/5，对战验收 0/5；种族写作/模型审核阶段 Terran 6/7、Zerg 2/8，不等于完整 Skill 验收。
- T18 切片完成 2/8，整体 ticket 完成 16/22，未因调研增加完成数。
- 本轮新增 Provider 调用 0、DSH 调用 0、模型 API token 0、API 费用 0。
- 只读复核全局 1,251 attempts，178,968,889 已知 API tokens，估算及预留 ¥168.245993；0 intent / 0 实际 402。下一费用通知阈值 ¥200。这不是账户余额或最终账单。
- 新增本报告与只读诊断脚本；更新根 TASKS/PROJECT_MEMORY。无游戏官方源刷新、依赖安装、子 agent、提交或已生成 Skill 改写。

本轮 research/diagnose 技能使工作停在“复现、最小化、原始提示审计、主来源研究、方案记录”；没有把用户的调研请求扩张为生产改造。下列流程标记表示审计采用相应边界，不表示实际运行了新生产或对战。

```json
{
  "ctx2skillLoopUsed": true,
  "harnessLoopUsed": true,
  "targetGames": ["starcraft-tmg"],
  "roleRoutes": ["rule_skill_builder"],
  "promptPackRoutes": ["rule_skill_builder_prompt", "harness_optimizer_prompt"],
  "skillsRead": ["Zerg:unqualified-review-candidates-and-complete-current-section"],
  "skillsGenerated": [],
  "judgeTestsRun": ["actual-paid-schema-and-host-replay", "exact-original-and-repair-context-reconstruction", "single-variable-in-memory-counterfactuals"],
  "crossTimeReplayResult": "paid responses read-only; no battle replay",
  "promotions": [],
  "blocks": ["formal field-contract recovery pending", "Terran replacement and retirement wiring pending"],
  "remainingRuleGaps": ["known faction timing/source debts and independent strategy evaluation remain"],
  "harnessToolsCalled": [],
  "uiTraceEvidence": null,
  "agentDecisionEvidence": null,
  "memoryTraceEvidence": null,
  "trainingTraceCandidates": [],
  "rollbackOrDemotionRules": "No promotion or mutation; historical contracts/results preserved",
  "userVisibleChecks": ["no new model fees", "real failure reproduced", "research separated from implementation"]
}
```
