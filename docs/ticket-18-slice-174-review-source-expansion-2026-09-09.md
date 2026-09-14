# T18 / S174：来源正文缺失与审核范围恢复

2026-09-09。本次处理初始 Skill 生产，不是用户要求延期评审的复盘、增量保鲜或多模态方案。

## 实际生产结果

正式 run `faction-v1-e35baf291d46af687809` 已终止，会话58824/PID13329已exit1，不应原样重启。
报告 `7303aa586244142c4d6213a24e76c465f716d95a3b42cacd5ee5be9ca8fe8133`。

- 原46a JSON失败已在真实DSH路径恢复：只删除两个多余括号，0新增Provider，原判断不变。
- 两个旧章节和第三章7条建议被复用，不是重新付费生成。
- 第三章 `supportive.0.4` 首次新响应67644ac漏掉两个 `sourceSlots` 字段；同上下文纠错6b514c补齐字段，其他解析值保持一致。
- 6b514c通过schema后，真实Host映射抛 `FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID`，第三章仍未完成。
- 新增2次API调用、272334 tokens、¥0.836208估算；全局1246 attempts、178296751已知API tokens、¥166.191245估算及预留、0intent/实际402。下一提醒¥200。
- Terran旧发送不明继续隔离；顶层report的Terran错误不能掩盖本次独立的Zerg来源错误。

## 约一秒的真实复现

`node scripts/diagnose-ticket-18-native-source-slot-v1.mjs --require-materializable`

此命令重建实际完整第三章、批次、基础和schema纠错上下文，再调用真实Host映射。约0.8秒复现同一错误，后续含单变量探针约1.7秒；没有DSH或Provider。

- 原上下文：`1da9e1e80e9cf1470173f4ec5aa8e4268d7019d35a2c8cfa72c980d0b3df95ff`。
- schema纠错上下文：`6205ce08fda9388b599cf2ee90dbd6d507b3cb750d7ed7f736b94e6b74b9f32b`。
- 实际修复candidate：`2ca0558764bd0d5f60d309080e1d0bf05479023573e779598d3b860aa9be70a3`。
- 实际Provider输出：`fc4261403ddd47e41140de4638bed379200ed945a84cc93d7fb3c9ec4548042c`。
- 两个原attempt内容hash：`41b4429b5e2f9febe6106b36e537a107efe3e7f70fc4ed214e42436497b29b30`，检查前后不变。
- 最终诊断报告：`f021d12e39d732b7d3ed09939e93f56c808ecd8dc5a07aebfb8eaace2f26108b`。

唯一被拒来源为slot365，即 `source:tactical_cards:supply_depot`。编号与名称一致，不是编号混用。它存在于冻结输入中，原始数据明确 `faction=Terran`，但原审核只收到其目录元数据，正文标记为 `not_in_current_faction_scope`，未进入依赖图。模型用它反驳“虫族购买Supply Depot”的建议；这不是把它推荐给虫族的审核意见。

仅在诊断副本删除365后，原Host映射可过；空来源数组会被schema拒绝；换为schema范围内但目录不存在的511会被Host拒绝。这定位了故障条件，**不授权删除引用作为生产修复**。schema纠错只补了两个来源数组，未改原判断和理由。

## 2026-09-09 正式执行更新

run `faction-v1-961f12e8417c1f17beb9` 已真实完成来源扩展审核：原e35的676/6b两次付费响应复用且0重发；新9f844c付费响应在完整原上下文补入Supply Depot正文后完成。新审核仍判第4建议unsupported（虫族不可购买Terran Supply Depot、控点表述过度绝对），第5建议supported；不能把“审核流程成功”说成草稿全部正确。

随后下一批supportive.0.6出现独立JSON+schema叠加错误，正式53995于08:55 CST exit1。该run报告`15ca6af7dec81866da711bfc6b51b108e69bf44c0d664960a0f1e41e69776e21`，新增2calls/267758tokens/¥0.820722，累计178564509已知tokens/¥167.011967。下一parent必须961；下文e35接线计划是历史记录，不应回退执行。新故障与恢复边界见[串联恢复报告](ticket-18-slice-174-composed-json-schema-recovery-2026-09-09.md)。

## 新模块与边界

`faction-review-source-expansion-v1.mjs` 提供一个纯准备/验证Interface：从完整基础上下文、真实结构化触发输出和冻结输入中，找出明确 `sourceSlots` 引用但正文未提供的资料，并建立新的审核上下文。

- 不猜名称、不模糊映射、不删引用、不改原判断；拒绝不存在的slot、缺字段、缺失/重复目标和已扩展上下文的重复扩展。
- 只补精确引用的同一冻结输入正文；完整旧规则、草稿、目标和已提供来源保持原样。无网络刷新。
- 原模型输出保留为未验收证据，不能倒称原模型已读过补充正文。
- 阅读范围不等于编表许可。读取敌方卡牌可用于反驳非法选择，并不使该卡牌成为本族可选内容。
- 新角色为原审核角色加 `.source-context-expansion.1`，要求重新审核整个原批次；不能继承原schema-only修复的“只改来源数组”指令。
- 仍使用既有512 KiB上下文上限，超限明确停止，不截掉原始上下文。
- 模块无Provider、DSH、Keychain或账本写入端口；准备记录明确 `paidOriginAuthenticated=false`、`originalReviewAccepted=false`、`runtimeAccepted=false`。

`verify-ticket-18-review-source-expansion-v1.mjs` 使用实际产物验证正文进入编译后的模型输入、全部原节点保持不变、反对意见保留，以及另一条冻结的非本族资料可走同一逻辑。当前验证为60项，0Provider/DSH；实际新上下文452430 bytes，报告 `c7d55c1341fca25750dc2e29a3068dda0ff7128d6bec94de290d22b747ccd460`，运行已exit0。测试曾错误按未转义JSON子串寻找嵌套正文，已改为解析实际compiledInput并验证完整依赖节点；这不是生产故障。

## 接下来必须完成的接线

以下为初始接线验收清单。2026-09-09 08:00 CST更新：runtime、consumer、显式recipe/main/迁移及按真实祖先账本读取已实现；78项注入测试通过，真实DSH与关联回归正在运行，**尚未恢复正式生产或获得新的付费审核结果**。不可拿组件通过或旧52门作为新流程已上线的证明。

1. 在真实审核Host失败处分类：未知编号仍拒收；确知冻结来源但正文缺失才进入显式扩展。保留原attempt、schema修复和原source-scope失败证据。
2. 用同一共用结构化/DSH执行逻辑执行新审核，沿用格式纠错、预算、发送状态和402停止策略；新子请求也必须有正常纠错能力，不能另造一个只接受完美输出的旁路。每次原审核最多一次有界正文扩展，不泛化为整章重抽。
3. 独立consumer从真实付费owner及完整原请求重建基础/纠错/扩展上下文，核对新能力回执、请求、输出和DSH。扩展准备记录不能自证付费来源；SQLite断点恢复不得重复扣费。
4. recipe、main/dry、迁移和最终Host接收必须选择同一显式新binding；旧合同与历史上下文保持原义。只重验真正受影响的模块和接线。
5. 新预检通过后，从**e35baf29**继续，不回退0a2e丢掉本轮2次付费结果。新鲜审核必须保留/处理关于Supply Depot的实质反对意见，再进入局部草稿修复和整章重新审核；不直接把当前草稿视为正确。

第二章已有的冲锋失败后行动、6模型Supply边界和Supply0控点错误仍见独立来源抽查，不能因本次来源扩展而消失。其余章节也未完成独立审计。

### 本轮执行与恢复验证

2026-09-09 08:11 CST最终新增路径证明：运行层78项、16次真实DSH全部通过，报告`5c25b9471a66d880fef64748a7e69ac0c2b9efa16e4bc6627d083f950b22c50a`；源码前后快照相同。生产接线/祖先读取/迁移负向检查142项通过，报告`cd3c6b6698c5cd1231989bf9d2e613328690c1bb430c67495211fd8602d1f1f7`。二者0Provider，不计作新Skill或正式新审核。旧slot57项/4DSH、其接线44项、结构JSON冷回放36项、7门快速回归及执行策略252项也已通过。当前继续两个不重叠队列刷新剩余关联证明，尚未通过完整55门快检及新正式preflight/live。

- 正常完整审核和扩展后的审核共用同一有界schema修复操作。前后两次格式纠错分别记账、分别保留scope，补正文后的新判断不冒充“只改两个数组”。
- 原审核、原响应及原反对意见留在trigger；新上下文只加入明确缺失的冻结正文。Host与独立consumer重建同一扩展，不存在的slot仍失败，最多一次正文扩展。
- SQLite中断测试发现并修复：重新执行已付费schema失败时仅返回失败码，丢掉了可恢复issue；已存在candidate的读取仅依赖当前内存。现在按精确invocation、原context及hash读取持久证据。
- 跨run还必须读真实祖先attempt。仅继承角色步骤不能防止再次reserve同一旧请求。新`faction-review-source-expansion-scope-v1.mjs`只从完整验证过的lineage读取；runtime先验证原失败/成功证据，再导入不变artifact，不复制attempt或清零账本。真实e35的676/6b已在隔离测试中复用，只有新审核使用注入响应，0新Provider。
- `verify-ticket-18-source-expansion-runtime-v1.mjs`最新注入测试78项通过`2a54fcffa4325377ffd2ba00dc86f78bf8ee76eeacc4865a05510cc3c1b01e20`；包括断点前后两阶段schema纠错、未知slot拒收、第二次正文缺失拒收、未启用binding拒收、原owner响应复用、独立冷consumer及proof篡改拒收。加入测试前后源码快照一致性检查，防止测试期间改源码却给新hash背书。
- 历史schema失败safe receipt没有保留reported-model或wire-body hash，验证器不虚构这两种证据。它验证原账本请求、capability、issue、parsed candidate和随后精确repair上下文；成功修复响应另做完整实际模型与wire请求验证。失败本身不改为成功。
- 测试夹具中的轻微注释变化是明确注入的测试输出，不是新模型策略结果。真实第一章/第二章的策略性和局部规则债仍需后续独立审查。
- 主入口已要求新source-expansion-readiness及相关源码hash一致。55门中受改动影响的旧证明需真正重跑；未通过前不启动live。仍从e35继续而非丢弃2次付费的旧parent。

技能记录：ctx2skillLoopUsed=true，harnessLoopUsed=true，targetGames=[starcraft-tmg]，roleRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]。diagnose/diagnosing-bugs用于真实反馈环和单变量探针；codebase-design用于把证据阅读扩展集中到一个Module，不在调用方添加卡名例外。promotions=0，runtime/training资格不变；未启用Codex子agent、安装依赖或提交git。
