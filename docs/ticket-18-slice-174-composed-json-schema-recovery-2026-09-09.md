# T18 / S174：JSON 结构恢复与字段纠错串联

最新正式更新（2026-09-09 11:35 CST）：58/58门与正式预检均通过，run `faction-v1-5fdab77171f213a6e7c9` 已实际恢复原ce87。新纠错a7513401…133692tokens/¥0.408582成功，旧请求0重发；角色artifact29e679bd…保存了完整parsedWire恢复记录。随后另一adversarial.0.0批次2a9e1746漏coverage，其付费修复20d631c3又增加recommendationSlots_note而停止；不是原ce87仍未修好。正式23449与预检99423均终态，无活动进程，不原样重启。新正确parent是5fd，累计178968889known API tokens/¥168.245993、0intent/actual402，下一¥200；五包1/5/runtime0/5不变。详情及下一Terran/模型退场接线优先级见[ticket-18-slice-174-terran-replacement-model-retirement-2026-09-09.md](ticket-18-slice-174-terran-replacement-model-retirement-2026-09-09.md)。下面10:51及更早段落为历史检查点。

当前状态（2026-09-09 10:51 CST）：**正式runtime、独立冷consumer、main/dry、显式recipe与迁移已接线；421项组件、64项运行验证及8次真实DSH、37项接线检查通过。正在刷新受影响的旧门，尚未恢复live。** Provider输出是明确注入的测试数据，0新Provider；不能称为新的Skill验收结果。

### 本轮新增发现及贯通证据

同一ce87响应还有第三层问题：批次实际只有targetSlot0，模型把它拆成两条targetSlot0审核，分别覆盖正文与备选策略。两条均为supported，并不是两个不同目标。直接只删额外Note后，真实Host会报`FACTION_STRUCTURED_REVIEW_TARGET_SLOT_INVALID`；贯通测试已在付费续产前发现它。

新准备层只允许合并同一已提供目标、同一verdict的片段；所有理由逐段保留，focus和sourceSlots保留完整并集，完整原始两条仍进入新模型上下文。不同判断、未知目标、漏目标或合并会丢失额外字段时拒收，不拿重复目标恢复抹掉反对意见。合并是有来源记录的表示规范化，不是模型重新判断。原密文/失败/账本不变；随后的模型只获准修规范化候选中的精确schema非法路径。

当前证据：

- 组件421项：`8e3028c09b44bccc975a93c4d1d6f6520d58cdeeaeb94a781040fd3248046924`，包含实际原文、四种语法嵌套解释、合同容器层级唯一化、同目标片段完整保留与冲突拒收。
- 运行64项/8真实DSH：`f103b13f251ed4f631011551ba3d64b5ed42fbe93a125f60dd63e4ede8e8fae1`。覆盖实际ce87祖先恢复、单次schema纠错、返回付费响应后模拟中断、SQLite重启0重发、修改引用拒收、再次schema失败不重发、模拟402停工、未启用binding拒收、过期原文拒收及完整独立冷consumer。测试故障注入不进入生产账本。
- 接线/迁移37项：`6f6bf43afc885c421695d9ccdfd2f9df6e94d3ab9516c04501eef3e3e57f4331`。实际有缓存/无缓存dry factory、未接新内层时禁止V1降级后盲发、readiness/源码/来源/模型/预算负向检查。正式main预检尚未执行。
- V1仍优先按原binding认证旧46a等产物；只有显式V2绑定且内层确认已接好时，才将V1语法/schema不可恢复错误交给新有界链路。当前或明确祖先的原始失败每次重新认证；补正文后的schema阶段也使用共用机制，phase scope分别保存。
- 独立consumer从真实原owner/raw重建V2准备，再验证实际纠错候选、模型/请求回执、DSH与exact-path scope；自己的嵌入proof不能作为唯一权威。

下面的411项与“尚需接线”清单为初始诊断阶段记录，以本节为准。当前58门中相关旧证明尚需刷新，不能用新路径通过替代剩余关联回归。基础队列10626/PID95330与消费者队列89299/PID95861正在执行；详见TASKS最新游标。

## 最新生产结果

正式run `faction-v1-961f12e8417c1f17beb9`，parent `faction-v1-e35baf291d46af687809`，于2026-09-09 08:55 CST结束，exit1。53995/PID6903与20653预检均终态，不能再次轮询或原样重启。

- 来源正文扩展已真实成功：原e35的schema失败676与付费修复6b直接复用，未重新扣费；新增9f844c响应在完整原上下文补入冻结Supply Depot正文后重新审核。该审核仍明确反对虫族购买Terran卡牌及过度绝对化的控点表述，未把负面判断改成通过。该角色artifact为`503dc502c326866aaa233cfa092ceb21c77331843e1d8c95e46cc57ed349c931`。
- 随后另一角色`faction.zerg_swarm.unit_roles.2.review-target-batch-v1.supportive.0.6`出现独立格式失败。原attempt为`structured-ce87d54764cb17e20fe85662a936b6cfc3c56ca5aaaa0871`，wire issue为`40ca721e3d6c1aac5f65870eff361ebad78b32f7cab836c54d4c42484ba16433`。
- 本轮实际2次新调用、267758 tokens、估算¥0.820722。全局1248 attempts、178564509已知tokens、估算/预留¥167.011967、0 intent、0实际402；下一提醒¥200。失败调用的用量照常保留，不能因修复再次清零。
- Terran未知发送仍单独隔离；其顶层错误不能掩盖本轮Zerg实际进展与新失败。
- 下一正式parent必须是961，而不是e35或0a2e；需保留961的两次付费结果。

## 复现与根因

零Provider、只读原账本、Keychain密文认证的红测：

`node scripts/diagnose-ticket-18-current-structural-json-v1.mjs --require-recoverable`

约1秒复现`STRUCTURAL_JSON_SYNTAX_UNSUPPORTED`。JSON原生解析失败位置UTF-16 3029，连续闭合符局部形如`]}]}]`。原文4270 bytes，密文TTL为`2026-09-10T00:54:13.689Z`；没有正文截断或响应丢失的证据。输出hash `5aa800e6e155f0d2a07566b9b836f0e1c4a260514bc70465c38b81275ccd4b8e`。

两个问题叠加，不能把它们混作一次重生成：

1. 多余两个闭合符。只检验JSON语法有4种不同嵌套解释；仅在错误点附近找到一个候选，不足以证明唯一。
2. 按合同的命名容器层级限制后，只剩一个解析值（4条等价符号删除路径），hash `bf70fa0404dcee91324f76d059aa50bee2106d240169879c9a0f4593ee277255`。它仍有`$.coverage[0].recommendationSlotsNote`这一条`additional_property_forbidden`，必须交给下一层字段纠错，不能假装schema通过。

旧V1只允许删除即时不匹配的闭合符，并要求修完后schema立即通过；既不能处理这里的提前闭合，也不能把恢复出的不合格候选交给schema纠错。因此失败不等于模型没有返回完整策略审核，更不能重新发送原请求碰运气。

## 已实现的边界

新增`adapters/structural-json-recovery-v2.mjs`；冻结V1解析与旧产物保持原样。

- 严格词法扫描，最多删除4个“完整值之后”的多余闭合符，不插入符号、补字段、改数字、删除正文或引用。
- 枚举所有允许解释，有明确原文/深度/活动状态/转换次数上限。超过资源上限即拒收，不能截断搜索后谎称唯一。
- 合同只用于已声明的object/array位置和必需容器，不用verdict、枚举、范围、期望结论筛选结果。层级内仍有多个解析值即拒收。
- 未声明字段原样保留；标量类型错误、缺标量字段也仍保留为schema债。重复键、缺失结构、非法字符串、失真数字和非JSON正文拒收。
- 解析成功后另算完整schema校验；`schemaPassed=false`返回的是待修候选，绝不是原生成功或来源验收。

新增`authenticated-structural-json-recovery-v2.mjs`及原只读environment显式`parsedRecoveryBinding`入口。默认仍走旧V1；新入口重建完整原请求、实际付费owner、模型/能力凭据、原响应与密文/TTL。每次读取重新认证，旧失败及费用不变，不伪造native-success receipt。

新增`faction-structural-json-schema-bridge-v2.mjs`：准备独立`.structural-json-v2.schema-repair.1`角色，保留全部原规则/FAQ/正文/完整草稿/目标/依赖图，加上完整待修候选与明确非法路径。当前真实待修上下文433187 bytes，无截断。新提示不继承旧纠错提示中错误的“最多8个来源”常量，而要求只遵守当前精确错误约束。

纠错结果必须再次满足原V6 schema，并通过既有exact-path比较；本例仅允许删除额外Note字段，其他判断、理由、sourceSlots、recommendationSlots均不得变化。准备模块无Provider端口；scope证明明确`actualProviderExecutionProven=false`，仍需要实际DSH/Provider与独立consumer接线。

## 验证证据

`node scripts/verify-ticket-18-structural-json-schema-bridge-v2.mjs`

411项通过，报告`9e456b27c5559582f8786c1949a52fd3b2a5997fafbb3cde4fc18d0faadf6b28`。60组中英/转义/emoji/符号样本；歧义不靠枚举值挑结果；重复键、词法/结构/数值错误拒收；实际ce87完整请求及两次独立raw认证；完整上下文保持；schema校正仅限非法路径；来源/理由/地址改动拒收；错误owner/context/policy/binding拒收；账本与源码前后快照不变。

实际完整原context `d8e69a288814998263b4bfedb01ff7c2feabfc59754f3a30f2155944d82a6493`，认证proof `c4b1aa4a7dd8d2d8995ebddf8d3f44c9255a2b99d7eee10052501738d686b21d`。99个scalar token完整保留、0字段删除。纠错部分使用明确注入的输出，**0新Provider、0新DSH，不是正式模型纠错已完成**。

原V1组件104项再次通过，报告仍为`21523a50b274e34dc9ff09036c076fd27b89076602e416fb38431f31f8adc804`；旧实际46a输出hash与原证据不变。完整认证/独立consumer/SQLite重启51项及1真实DSH也已通过`663255cfc425e71484772b5d3befbb820c99ba6f65e62407a459103974ddb0a6`，0Provider。38879/PID61367已exit0，当前没有活动进程；不能拿这条旧V1 DSH证据冒充V2正式纠错接线。

## 尚需接线，不能跳过的部分

1. 新显式recipe binding下，在真实当前/祖先wire失败处分派V2候选，交给共用DSH/native structured schema纠错；保留V1历史路径及961已完成source-expansion角色。不能把新parsed候选假装成旧native rejected-candidate。
2. 独立consumer重读真实原owner/raw，重建同一V2准备上下文，再验证实际新模型响应、DSH和exact-path scope；新上下文需在Slot namespace验证器中以显式V2证据重建。不能只接受自己携带的proof。
3. SQLite重启、只允许一次新schema纠错、修复响应再失败/超限/402/未知发送、未启用binding、冷consumer及旧新路径混用测试。旧V1缓存仍按旧binding与原语义认证；不强迫重生成。
4. main/dry、recipe/迁移/源码门一致后沿961预检/live。只刷新真正依赖变化的证明，测试队列终态后才发送新的付费请求。

新V2组件不是完整生产恢复；当前五包离线1/5、runtime0/5，T6/7、Z2/8仅为生产审核计数；第三章7条已写出未审完。第二章人工发现的失败冲锋时机/Supply0控点债、第三章Supply Depot/无条件控制效率反对意见都仍需初始Skill局部修复与独立规则/策略验证。T18 2/8 slices、项目16/22 tickets均不变。

用户追加的控制台/多局复盘与假设搜索、规则变更增量保鲜、数学/空间MCP及多模态规划三组问题仍只记录，基础五包生产与来源/质量检查完成后再展开。

技能记录：ctx2skillLoopUsed=true，harnessLoopUsed=true，targetGames=[starcraft-tmg]，roleRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]。diagnose/diagnosing-bugs用于实际红测、单变量探针及枚举反例；promotions=0。无子agent、来源刷新、依赖安装或git提交。
