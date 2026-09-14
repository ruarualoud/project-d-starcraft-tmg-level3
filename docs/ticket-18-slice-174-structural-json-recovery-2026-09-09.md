# T18 / S174：受限 JSON 结构修复实现

2026-09-09。承接[实际故障诊断](ticket-18-slice-174-slot-wire-json-diagnosis-2026-09-09.md)。本次不生成新策略、不重抽模型、不刷新冻结数据。

## 已实现的边界

1. `structural-json-recovery-v1.mjs` 是独立版本的语法组件。只删除完整对象属性值之后不合法的 `]`，或完整数组元素之后不合法的 `}`；最多四处、64 KiB、64 层。禁止插入、替换、补写缺失内容、改字词/数字/键、删除属性。拒绝重复键，包括转义后相同的键。修复后必须完整消费输入，并通过标准 JSON 解析和原 schema；旧解析器及 V1–V6 合同不变。
2. `authenticated-structural-json-recovery-v1.mjs` 通过正式 V2 wire 消费边界重新核对原请求、上下文、owner、已结算回执、原 schema、原文 hash、密文与到期时间。生成独立修复证明，不把失败请求改成成功；原费用不重算。每次恢复或重启读取都重新认证密文，过期不绕过。
3. `faction-structural-json-environment-v1.mjs` 无 Provider 端口、只读原 SQLite。只读取当前请求的真实 wire failure，或明确选定的历史 origin；同一旧角色的上下文改变时拒绝，不自动转为新付费请求。明确 origin 的 run、attempt、issue 必须逐项匹配。
4. `faction-structural-json-runtime-v1.mjs` 将经过认证且重新完成 Host 映射的结果交给真实 DSH，保存独立恢复记录与审核角色。缓存角色仍需认证；独立角色 consumer 重做来源/目标映射及 DSH transcript 校验。`structuredCandidateRef=null` 明确表示这不是原 Provider 接受的 candidate。

修复范围是结构表示，不是事实正确、策略有效或实战有效。不能修的字符串损坏、缺字段、额外属性、错误引用等仍须按对应问题类别处理；当前接线只覆盖原生 V6 目标审核角色，不宣称所有生成角色或 schema-repair 子请求都能自动修复。

## 真实失败验证

原 run：`faction-v1-0a2eb5fe91b8ae51677a`；原 attempt：`structured-46a45df4d1115da71ccf8b23c5a3cb26727a227d32acef25`。

- 完整第三章 draft 从实际 `unit_roles.2.known-rule-correction` 重建，重新计算 section、目标与来源分配。原上下文精确匹配 `ea3ea9ad7cb16b8baf6deeae1ff3a047975c2f4d51ea65eea2f0f1d9fb78f142`，没有删减成小片段。
- 原文只删除 UTF-16 位置 1159、2492 的两个 `]`。解析值 `297967af986ddc06829cc8dea7f320a1afaa4efeff44b913f80dc02185cb1f73`。
- 认证证明 `20f986fe77a8245fb9bdb5de9aa0f28a2d14efd2d03f1e71c741dec39c2e13d4`；Host 映射回执 `1c809d3d4fe91d1c306adc9254a93963305037e77767631c2b7451e88209a781`。
- 语法组件 104 组检查通过，报告 `21523a50b274e34dc9ff09036c076fd27b89076602e416fb38431f31f8adc804`，包含实际密文、中文/转义字符串保留与拒收用例。扩展完整认证、角色 runtime/独立 consumer、实际能力回执完整性及模型匹配共51组通过，最终报告 `b48ab0dcef2e9428fe05d01a544b7c65ea51d3fabd18b5d37c5e299afb7b1c11`。该最终运行真实 DSH 一次、SQLite 重启不重跑、0 Provider；测试进程已终态。
- 测试自身曾错误假设该批次有 coverage 行；实际上为合法空数组。改为篡改实际存在的目标编号验证拒收。没有因此重发模型请求或改动生产数据。

脚本：`verify-ticket-18-structural-json-recovery-v1.mjs`、`verify-ticket-18-authenticated-structural-json-v1.mjs`。前者测试纯组件，后者重读实际账本和完整上下文、认证原文、运行真实 DSH，再检查正式审核角色与独立消费者。伪造的拒收场景明确是测试输入；原文、原请求、DSH 正常路径不是模型伪造输出。

## 正式入口接线更新（2026-09-09 06:30 CST）

正式 main、dry 预检、新 recipe/显式祖先恢复列表、版本迁移、独立 `openFactionProductionReplayV1` 和冷启动 runtime stack 已接入。`structural-json-readiness-v1.json` 的36项端到端验证通过，当前hash `f373d3c4ef6654a25c091a996d637aac40595ec020ecabcc1ec2be08b80ee565`。验证使用实际原失败、原密文、完整请求、上轮真实DSH记录和隔离测试账本；没有新增Provider，也没有把测试recipe放入生产账本。

独立消费者在重建角色请求后重新认证原文，再检查Host映射与DSH记录；未认证的记录不能直接通过冷回放。实际生产历史的完整recipe链和账本亦成功只读打开。manifest-only中间版本必须有合法父链且没有任何步骤或attempt，不能冒充付费运行；当前运行仍必须有正确journal，真实未终态步骤仍拒收。

旧失败路由行为保持默认不变；正式新recipe明确接入 `observeFactionStructuredWireFailureV1`。真实46a的外层结果现在为 `authenticated_payload_repair_required`，捕获回执已过期则为 `quarantine_raw_expired`。这里证明曾保存原文，不宣称“现在已解密”；真正恢复仍重新检查密文与TTL，任何状态均不增加重发次数。

快速门禁检查器现在检查三份新证明。共享入口改动影响的旧门禁正在重验；结构恢复的端到端证明不代替这些旧路径回归，也不代替 main 的正式预检。当前尚未启动新的付费生产。

本次接线新增scope、lane、wire-observation模块及wiring验证脚本；修改main、continuation、三个独立replay/stack文件、失败路由的显式可选观察端口和启动检查器。原Provider记录、冻结数据及已有Skill文本未改。

## 未完成项与续跑顺序

2026-09-09 07:03 CST 更新：两条相关回归队列已全部终态通过，52门/258源码快检 `ready=true`、无漂移。正式 `--preflight` 亦通过，recipe 为 `e35baf291d46af68780980d62aa11079372b857a0246e878610d220f3fd3fb66`；复用68个角色结果，继承547次调用、108001074 tokens、¥99.046366链上费用。随后唯一启动同参 `--live --model-v41-beta`，父断点仍是 `0a2eb5fe`。正式执行结果尚待观察，不能据预检成功说第三章已审核完成。

1. 角色、正式recipe/迁移、main/dry/独立replay接线与36项验证已完成；旧recipe不改。
2. manifest-only祖先处理及外层捕获状态传播已经验证，仍需保留全部相关旧路径回归证据。
3. 相关门禁队列已全部通过。不要因为共享入口文件hash变化就声称出现新的模型故障，也不要手工改报告hash冒充重验。
4. 新 recipe 的正式预检已通过、live已启动；接下来观察实际恢复、付费调用及章节审核结果，不回退到8262丢掉17次新调用。仍使用明确 beta 模型，不自动切换。Terran未知发送继续隔离。
5. 第二章的冲锋失败后动作时机、6只Zergling的Supply与控点条件等[语义债](ticket-18-slice-174-zerg-live-source-audit-2026-09-09.md)，必须在初始候选正式验收前局部修复和独立验证。语法恢复不解决这些规则错误。

本轮修复没有新增 API 消耗。全局仍为178,024,417已知tokens、¥165.355037估算与预留，下一提醒¥200；实际402立即停所有开发。五包离线1/5、实战0/5；Terran生产审核6/7、Zerg2/8；T18为2/8切片、项目16/22ticket。工程测试不增加这些完成数。

用户新增的控制台/多局复盘与搜索、规则变化后的增量保鲜、空间数学MCP与多模态规划，继续仅[记录](post-foundation-skill-design-questions-2026-09-09.md)，基础五包产出后再评审。

技能使用：ctx2skill-rule-skill-loop、project-d-offline-skill-evolution、agentic-harness-evolution-loop用于保持来源、表示恢复、策略验收和训练真值分离；diagnose/diagnosing-bugs用于真实失败红测、最小化与回归。targetGames=[starcraft-tmg]，roleRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]。未使用Codex子agent、未安装依赖、未提交git。
