# T18 / S174：新 V6 审查的 JSON 语法故障

2026-09-09 05:38 CST。正式 run `faction-v1-0a2eb5fe91b8ae51677a` 已终态，主会话67832/PID493 exit1，不能再轮询或原样重启。当前无活动生产或验证进程；长目标未完成。

## 本轮实际产出与费用

- 原766986编号故障经过真实DSH无新增Provider恢复，新V6正式审查及同上下文格式纠错实际运行成功。
- Zerg生产审核由1/8推进到2/8；第三章`unit_roles.2`的7条策略已完整生成，首批supportive审核通过，下一批停止。章节生产审核不是独立来源/规则/实战验收。
- Terran原未知发送保持隔离，本轮0新Terran调用，原已完成历史产物不抛弃。
- 本轮17次调用，3,387,172已知tokens，保守估算¥10.304442；最终报告hash为`cef72fccec57602f21293dae45b6699ccfade62c67cfb0afc26233da032a62d4`。
- 全局已重新核对：1,244 attempts、178,024,417已知tokens、¥165.355037估算与预留，0 intent/实际402，下一费用提醒¥200。未重置1000calls/¥120/360Mtokens的种族链预算。
- 五件套离线1/5、runtime0/5，T18为2/8、项目16/22。第二章额外人工语义问题见[来源抽查](ticket-18-slice-174-zerg-live-source-audit-2026-09-09.md)，仍是初始候选验收前必修，不是后续Skill升级。

## 原始故障

实际attempt为`structured-46a45df4d1115da71ccf8b23c5a3cb26727a227d32acef25`，HTTP200、完整输出、已结算，134,984tokens/¥0.412068。原响应错误为`STRUCTURED_PROVIDER_SCHEMA_INVALID`，schemaIssues仅`$.provider_json_not_parseable`（实际结构为path=`$`、code=`provider_json_not_parseable`）。

- 原wire issue：`e2423173421a0b674ebeeba129688731b363134111396e58ab3eb77807e17cca`。
- 原回执：`eeba06e19efc4a1e62daba54ceee5d9e7308e8900951894ce8acf60ad829c55b`。
- 原文hash：`b085eb5843d8dfcb9b6ddc616b5caf1afe9405dac488bd56c424b171c3af828a`。
- 原context hash：`ea3ea9ad7cb16b8baf6deeae1ff3a047975c2f4d51ea65eea2f0f1d9fb78f142`。
- 原V6合同hash：`ec6818cbae2999e4cd99f6d0d4ad5e5894d7a9f2014c828eb93a355a926bc38a`。
- 密文record hash：`c7034d9618081bba22d7753fc89e9c66d5bdb920a87a34ee9924c7fd6926a53d`，到期`2026-09-09T21:25:55.217Z`。

wire issue实际为`rawPayloadPersisted=true`、`authenticated_payload_repair_required`，不是原文丢失。外层failureRouting却展示`quarantine_no_raw_recovery`，必须修正状态传播/路由解释，不能用外层文字推定密文不存在。当前运行层会捕获、认证并隔离完整不可解析响应；它尚未自动消费该原文做本类结构修复。

## 确定性复现与最小化

脚本[diagnose-ticket-18-slot-wire-json-v1.mjs](../scripts/diagnose-ticket-18-slot-wire-json-v1.mjs)调用正式适配器使用的`normalizeProviderJsonDocumentV1 → JSON.parse`接缝，以现有Keychain独立密钥认证读取原密文。只输出摘要、hash、错误位置和已脱除所有键/值的结构投影，不打印或保存原文，不更新TTL，不修改attempt。

`node scripts/diagnose-ticket-18-slot-wire-json-v1.mjs --require-parseable`约0.4秒exit1，精确复现`ACTUAL_NATIVE_REVIEW_JSON_NOT_PARSEABLE`。最小样本`{"":0]}`在同一接缝复现同类object-property-terminator错误。旧V1解析器保留原行为，不为了让旧红测变绿而悄悄放宽。

三项预测：尾逗号、多余/缺失括号、字符串内部损坏。原文3750bytes，无fence/注释，首个错误不在字符串内部；尾逗号不存在。单次插入或替换括号不能解析。只删除**两处语法位置不合法的 `]`**（原UTF-16位置1159、2492）即可使整个文档通过JSON与原V6 schema校验：

- 修复文本hash：`699a46e088d73b5837a8cb7a96aee7ff533313fe61fde096112b2d1470786ba5`。
- 解析值hash：`297967af986ddc06829cc8dea7f320a1afaa4efeff44b913f80dc02185cb1f73`。
- 诊断报告hash：`5676cfaaae34253f3d1daea3df0a12beef79f443f00498593de9f6574b166acc`。

没有修改文字、数值、字段名、来源编号或模型判断。这里只证明一个限定语法修复可行，**尚未重建整个实际V6请求/Host映射、执行正式DSH恢复或独立consumer验收**；不能直接导入上述解析值，更不能伪造旧Provider成功回执。

本轮另外两个可解析review错误是额外`recommendationSlots_note`/`recommendationSlotsNote`属性，均由现有局部schema修复完成；proposer的一条617字符文本超过600限制，由现有原结果容量恢复处理。它们不是本次不可解析JSON的同一故障，不应增加全局重抽次数。

## 下一步（尚未实现）

1. 新增显式、版本化的受限结构修复组件与正确调用接缝测试。可处理对象/数组值后多余闭合符的有限语法类；字符串、数字、字面量和键必须保持原始token，重复键、缺字段、缺字符串、歧义、超出编辑上限等仍隔离。保留旧V1–V6合同和旧解析器字节，不把“所有畸形JSON都可修复”当目标。
2. 实际46a45d原文须经`consumeWireFailure`式的原owner/request/invocation/context/schema/model/回执/TTL认证，再生成**新的**修复证明；保留原失败、费用和负面判断。完整来源及当前整章不丢失。还要独立重建Host target/source映射，不能仅schema通过就接受。
3. 将该路径接入V6实际runtime、DSH、持久断点和独立consumer，以及显式新recipe迁移；同时对齐“原文已保存但尚待修复”的外层分类。不复制attempt或续期密文，不静默套用旧模型/旧合同恢复策略。
4. 只运行受影响门，然后从**0a2eb5fe**新批次续跑；不能回退到8262丢掉17次新结果。既有总规则、两个已审查Zerg章节与第三章草稿保留，第二章人工语义债仍需另外局部修复并通过独立Rules/策略验证。

没有新Provider调用的离线诊断不算Skill生产；本报告也不授权刷新游戏数据、扩展线上DSH、跳过原Terran未知请求隔离或实施用户要求延期的三组研究。

本轮涉及文件：新增诊断脚本及本报告、第二章来源抽查；更新slot namespace进展、根TASKS和PROJECT_MEMORY。没有修改生产依赖、提交git或安装依赖。

技能记录：ctx2skillLoopUsed/harnessLoopUsed=true，targetGames=[starcraft-tmg]，roleRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]；diagnose与diagnosing-bugs用于实际付费错误的快速红测和逐变量验证。无新增Skill发布/训练真值；本诊断0Provider/0DSH，原回执和内容保留，完整对战仍未验收。
