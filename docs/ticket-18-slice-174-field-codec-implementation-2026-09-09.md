# T18 / S174：统一字段模块与真实付费样本恢复

日期：2026-09-09。14:56最新：已实际续跑至83c82d，字段生产有实际成功，但又发现字段补写与来源补全之间的交接缺口。下面按真实结果更新；旧阶段记录保留，不作最新状态。

15:09补充：共享入口混合路由修改后，来源交接联合门已重新实际执行，25项/1真实DSH通过 `50bb17f3dd48f83755348c1d23b1ced537e798a13987c259af2e9906c77ccd4f`，1注入Provider、0实际API、0新增字段调用。正式主入口、显式recipe/迁移和独立冷消费者已接线；仍需关联门全部刷新及唯一83c父链正式预检，不把新工程门当成第三章审核完成。

## 14:56 实际生产发现的阶段交接缺口

正式 run `faction-v1-83c82df7434ebe9494d3` 已终态，未来必须从它继续，不能退回5fd。旧2a9e/20d631付费结果已零Provider恢复；新adversarial.0.2漏sourceSlots也通过首次局部补写，随后继续了Zerg第三章审核与局部editor。本轮实际新增1,244,628 tokens、估算¥3.788082；累计180,213,517 tokens、¥172.034075。五包仍只有总规则1/5离线验收，0/5对战验收。

新阻断不是 JSON 类型：supportive.1.4原审核漏两组sourceSlots，补写50fd27与eba144两轮返回相同且有效的数组，包含slot365 `source:tactical_cards:supply_depot`。模型用Terran卡说明Zerg不能购买；来源目录有该编号，但该次Zerg上下文没有对应正文。Host正确拒收，字段层却只给模型`SOURCE_SLOT_INVALID`错误码、错误地继续字段重写，最终NO_PROGRESS停止。

修复必须区分**值错误、来源正文缺失、真实内容异议**，不能统一重试：

- 只读checkpoint验证重新核对实际原失败、局部值请求、能力凭据、费用、完整上下文和DSH。第一轮值即可作为未验收的阶段输入，第二轮与旧费用不抹除。
- 新field-value-source handoff明确接入既有source-expansion阶段，展开冻结资料里准确的一条SupplyDepot正文；不是刷新数据，不授予Zerg购买权，不删引用凑通过。
- 新来源阶段仍须完整审核本批目标；它的paid结果、来源映射和独立冷消费者与此前字段凭据共同被检查。不得伪造“原审核成功”的Provider receipt。
- 新值任务遇到上下文缺口先停止字段请求并交接，不重置原三轮额度；未知source slot、重复来源扩展或真实非空异议不能因此放行。

当前新增验证：实际完整请求/outer lease/candidate重建13项`5002d9ed…`，handoff `adfb1e1c…`；正式field lane→新来源阶段→真实DSH→完整cold stack→SQLite重启通过25项`6acb2aff…`，仅1次注入Provider/1真实DSH、0实际API、0新增字段请求。篡改“semanticAcceptance=true”反例抓到新消费分支缺少明确拒绝，已补上并红绿验证。此后Terran混合接线又改了共享入口，所以这份旧hash要在共享入口稳定后实际重验，不能直接声明全门ready。

`ctx2skillLoopUsed=true`，`harnessLoopUsed=true`；game为starcraft-tmg、角色rule_skill_builder，routes为rule_skill_builder_prompt/harness_optimizer_prompt。工程测试不产生可晋升Skill、对战、记忆或训练trace：`skillsGenerated=[]`、`promotions=[]`、`trainingTruth=false`。修复与正式五包生产连续推进，中间不等待新的继续命令。

## 13:34 局部值生产接线（仍在 T18 / S174）

新增 `faction-field-value-runtime-v1` 与 `faction-field-value-integration-v1`。正式原生审核遇到初始 schema 错误，先尝试保真提取既有付费结果；确实缺判断时使用同源合同生成的 `fieldN` 输出任务，不再默认发送完整 `.schema-repair.1`。完整章节、来源图、原审核均留在输入中，模型只承担缺失/错误值；不默认补空数组或把异议改成通过。

每个原始付费请求绑定一个持久任务族，最多三次新值请求。换run/model/capability不重置次数。纠错上下文增加上次小输出和实际validator/Host错误；连续相同错误停止，无界重采样不被授权。已付款结果从实际owner读回，SQLite重启后不重复发送；不明发送与真实402保持停止，非空未知异议要求裁定，只有null扩展可本地保真移到sidecar。

新值合同使用真实Adapter的能力探针，同模型、endpoint、合同准确绑定。两族同时需要同合同只共享一次探针；新进程从真实已付费探针行复用，而不是伪造capability。接线时发现main Adapter默认探针上限256与renewal固定512不一致，已在该正式Adapter显式配置512。这不是声称DeepSeek strict工具已实测，当前生产依然是 Responses json_schema加本地严格校验。

已完成验证：

- `verify-ticket-18-field-value-runtime-v1.mjs`：9场景141项，报告 `eef07415668fc70e8de543107814f9d622b39197251cc04342c5591199b53ba2`。包含类型纠正、Host拒收空coverage再补写、null扩展、记录后中断、跨run复用、无进展、上限、异议、不明发送和402。新Provider/DSH均明确注入。
- `verify-ticket-18-field-value-wiring-v1.mjs --dsh`：106项、3次真实pinned DSH，报告 `f761b40089613043c536846a342726c311cc4e5cb772892b530d063b8aa330cb`，fixture `field-value-wiring-yysshJ`。真实原2a9e失败仅复制到隔离fixture；新probe/错误值/正确值均注入Adapter，合计3次注入Provider回复，0实际API。验证正式原生审核接线、dry、原verdict不变、直接workflow校验、完整cold stack、实际paid capability和篡改拒收。没有修改生产库中的20d631已付费repair；正式仍优先提取它，不重买coverage。
- 旧field-recovery接线45项重新通过 `b3bb41e4fb15dc70e334657d88cf3fb3e408caa23a90b0e8b5858a59c173daae`，引用旧真实DSH产物、没有新增Provider。

明确剩余边界：来源扩展后的审核和parsed-wire阶段仍使用已有各自版本的有界纠错，并未全部替换成fieldN；未知非空扩展也不能仅凭格式修复当成已解决。Terran原不明请求的单次授权替代、模型退场自动切换仍待正式接线。五包离线1/5/实际对战0/5，T6/7、Z2/8，T18 2/8/项目16/22不变，工程证明不晋升为Skill。

当前连续执行顺序：受影响联合回归→沿唯一parent5fd完整preflight/live→真实生成/语义纠错→独立评估，途中继续完成其余故障路径；不会以本节模块通过作为停点或再次等用户批准。无官方数据刷新、子agent、安装或提交。本轮0实际新增API，累计基线178968889known tokens/¥168.245993，下一通知¥200。

技能流程继续遵守下方ctx2skill/harness审计边界：新增judge检查为field-values故障注入与正式工厂/冷消费者，`skillsGenerated=[]`、`promotions=[]`、`trainingTruth=false`；3次真实DSH只证明离线编排，未产生对战/记忆/训练trace。

## 12:45 接线更新（T18 / S174，仍未收片）

新增 `faction-field-recovery-scope-v1` 和 `faction-field-recovery-lane-v1`，将统一 codec 的零 Provider 恢复接入 `run-ticket-18-faction-strategy-production-v1.mjs` 的 dry/live 工厂。新 recipe 显式携带绑定、原始失败来源集合和就绪报告 hash，续跑迁移不改变冻结输入、来源、模型旧身份、DSH 或预算。没有用具体字段名或这两笔 attempt ID 写特例。

同一个只读证据入口用于工厂和通用独立回放：按真实祖先链读取实际 failed attempt、rejected candidate、issue 和已付费能力凭据，再由既有验证器精确重建原请求。回放不仅检查恢复产物的自带 hash，而是重读原始两笔记录、重算提取、scope 和 Host 映射；缺原记录、跨祖先/错 owner、sidecar 篡改和假晋升均拒收。允许的旧修复还必须匹配从原失败精确重建的修复 context，不按相同角色名盲选另一局部上下文。

正式工作流接入时发现并修复了两个先前模块测试未覆盖的接口问题：

- 原恢复角色漏带 `reviewSlotNamespaceBindingHash`。此前外层验证调用使用测试构造的 artifact，不能证明真实产物穿透。新增直接验证真实 DSH 角色 artifact 的回归，先复现 `FACTION_REVIEW_VALIDATION_BINDING_INVALID`，再修 producer/consumer。内容判断和原付费记录没有改写。
- 续跑缓存只在 `acquire` 时惰性导入；直接 `artifact` 查询会漏掉尚未写入本轮的历史完成角色。新 lane 先用同一个续跑接口查缓存，旧协议交回原验证器，新协议才读取字段恢复证据。该路由反例为明确注入测试，不当作真实模型判断。Dry 的未命中探针先释放自己的 lease，避免把自建探针错判为未终止祖先；真实祖先的未完成任务仍阻断。

验证范围：实际 58 个历史 recipe 的生产回放打开检查；真实两笔付费失败复制到隔离 SQLite；正式 dry/live 工厂；真实产物直接通过 workflow 回调；重启复用；通过 `createFactionReplayRuntimeStackV1` 的通用冷消费者；篡改/402/旧缓存路由反例。隔离库中的复制不是修改原生产账本，也不是新 Skill。

新增验收命令：

```sh
node scripts/verify-ticket-18-field-recovery-wiring-v1.mjs --dsh
```

本轮先前完成：runtime 58 项 / 1 次真实 DSH，报告 `95322d6630e25f7715f30ea5af4601a9feda9b52298b068baecdfff5ea161fce`；原 field-value task 33 项不变；历史 structured replay 1 角色、continuation 40 项和旧 slot workflow 3 种模式均通过。接线证明最终状态以 `build/ticket-18-faction-production-v1/field-recovery-readiness-v1.json` 为准；它分别记录新增 DSH 数、引用的旧真实 DSH 数及 `mainProductionPreflightPassed=false`，不将单模块的成功写成整个入口已过。

12:48最终接线证明：45项 / 1次真实DSH，hash `827c8139a45514d08052e6e2667243c4bf5591d2aafb5a3202e041c4ce48e375`，fixture `field-recovery-wiring-8t3AYD`，实际角色 `b585f810d7040cb6daadce80c88deb78d1e2e878c5241c905bfd4b8afced8272`。10份代码hash复核和语法检查通过。此前43项旧接线验证也跑过1次真实DSH；加上runtime，本轮合计3次真实DSH、0 Provider。中间44项缓存验证0DSH；随后dry-own-lease反例在执行DSH前失败，修复后才得到最终45项。所有52836/62613/1207/56470/41886会话已终态，没有新正式run。

仍需做的事（不新增 ticket/slice）：

1. 正式新请求的缺失/错误值使用已实现的 `fieldN` 编译任务，接实际模型、持久任务族次数/成本及独立回放；还不能称旧的整对象 repair 已全替换。该 lane 不默认填值、不为补写自行取得重试授权。
2. 精确模型/endpoint 的受约束输出能力实测。静态 strict schema 降级描述不能冒充线上支持；Thinking 对规则纠错的路由也没有在本轮开启。
3. Terran 有界替代请求与模型退场自动切换接线，保留旧结果和所有原费用。
4. 上述入口代码稳定后跑受影响的联合门禁、完整生产预检，沿唯一 parent `faction-v1-5fdab77171f213a6e7c9` 续跑。不回退961、不原样重启、不手改旧证据 hash 来消除 drift。

这次新接线触及共享 continuation/consumer/main，原先部分代码 hash 证明自然过期；快检仍为 `ready=false`。这是开发后的待回归状态，不是又有新的模型失败。当前只跑相关回归，不在下一项共享入口仍要修改时反复刷新所有历史门禁。

最终快检59门/276源码：29份旧门需回归刷新，问题类型均为 `CODE_HASH_DRIFT`；新的field-recovery接线证明没有drift。不要把旧58/58就绪结果用于当前源码，也不要为消除hash差异跳过实际测试。

五包离线验收 1/5、对战验收 0/5，Terran 6/7、Zerg 2/8，T18 2/8 / 项目16/22均不变。累计复核1251 attempts、178,968,889已知 API tokens、估算及预留¥168.245993、0 intent/真实402；本轮没有新 Provider 调用。下一费用通知¥200。既有规则时机/来源/策略缺陷仍须另行纠正，不因字段接线晋升。

本轮技能审计：`ctx2skillLoopUsed=true`、`harnessLoopUsed=true`；targetGames为`starcraft-tmg`，角色`rule_skill_builder`，prompt路由为`rule_skill_builder_prompt`及`harness_optimizer_prompt`。读取的是未晋升的Zerg完整章节/原付费审核证据；`skillsGenerated=[]`、`promotions=[]`。judgeTests新增正式field recovery工厂/冷消费者和实际workflow artifact回归；crossTimeReplay为原付费证据/历史消费者与SQLite恢复，不是对战。harnessTools只执行离线pinned DSH finish；UI/对战决策/记忆trace为null、trainingTraceCandidates为空。阻断项仍是正式字段补写/strict能力实测/联合预检；规则时机及策略效果仍未证明。原合同/付费行不动、独立来源与原owner缺失即拒收是回滚边界。用户可验证项：原verdict未改、费用未增加、缺失判断未默认填充、当前源码不能借用旧就绪结论。

## 上一阶段：模块具体推进（12:20记录）

落实[字段错误调研报告](ticket-18-slice-174-field-error-industry-research-2026-09-09.md)的合同编译、保真提取和局部补写部分。不是新增某个 `_note` 字段的例外；生产合同和所有历史付费结果保持原样。

| 模块 | 已实现 | 尚未证明 |
| --- | --- | --- |
| [field-codec-v1](../packages/structured-generation/field-codec-v1.mjs) | 小接口 `compile / inspect / complete / verify`；同一合同生成限制说明、Provider shape、本地 validator 和只含待补字段值的合同；未知 null 字段进入带路径/hash 的 sidecar；非空未知内容、Host 控制字段保留并要求裁定 | 尚未替换所有正式角色的 prompt；strict tool 输出的字段子集转换不等于 Provider 已实测支持 |
| [faction-field-recovery-v1](../packages/skill-production-v3/faction-field-recovery-v1.mjs) | 认证原失败与可选的已付费修复；保留原上下文、费用、旧失败状态；generic codec→Host mapping→DSH finish→专用独立消费者；SQLite 重启复用、读取原证据失败/402 时停止 | 未接 main/dry/recipe/完整生产回放，不是完整 Skill 产出 |
| [faction-field-repair-task-v1](../packages/skill-production-v3/faction-field-repair-task-v1.mjs) | 真正缺失内容编译为 `fieldN` 值任务；Host 固定路径，模型没有任意路径或整份对象重写权限；完整章节和原来源图保留；新 prompt 的限制来自同一个新合同 | 尚未做新的付费局部生成；已付费 coverage 仅用于验证任务装配，不称新模型成功 |

`compile('deepseek_strict_tool')` 暂将字符串长度、数组长度及未确认支持的 uniqueItems 约束列为本地验证责任，Provider shape 只含选定子集。结果明确标记 `providerCapabilityVerified=false`，不能靠这份静态结果发起正式 strict 生产。

## 真实样本结果

父轮次仍为 `faction-v1-5fdab77171f213a6e7c9`。

- 原调用 `structured-2a9e1746184bbd7392e41f800c4325cd595a4cb79299809a`：缺 `coverage`，codec 返回 `needs_values`，不补默认空数组。只产生一个 `/coverage` 的任务。
- 其已付费修复 `structured-20d631c3ce82ca5ef16385820507886c67d85d446ab8c9c1`：coverage 已完成，但多出 null 备注。codec 保存该字段到 sidecar，其余值不变，得到结构合格值 `2e2e2802bc88d9af48207d34862b4b1ebcafb09e699cbb26ae36e56271661440`。
- 真实原/修复请求上下文 hash 精确为 `32f623d0…` / `ca610388…`。两笔付费合计 270,688 tokens 均保留，原 attempt 不复制、不改状态、不重发。
- 原有两个 verdict 的值 hash 完全不变；只采用已付费生成的 coverage。旧 schema repair 的独立 scope 校验确认只改了原来允许的 `$.coverage`。
- 正式 workflow 使用的 `validateFactionProductionTargetReviewV1` 回调通过；专用冷消费者也独立重读原始证据、重建请求、重新执行 codec 与 Host 映射。
- 新局部任务输入为 446,264 字节（原输入 442,212 字节），因为补写新判断保留完整语义上下文。这不是输入压缩的成果；纯 null 扩展处理则完全不调用模型。

历史失败 receipt 没有保存 reported-model / raw wire body，认证结果明确保持这两项为 false。现有凭据和原请求 hash 可验证，不能补造更强的证据。

## 验证

```sh
node scripts/verify-ticket-18-field-codec-v1.mjs
node scripts/verify-ticket-18-field-recovery-runtime-v1.mjs --dsh
node scripts/verify-ticket-18-field-repair-task-v1.mjs
```

- codec：183 项，覆盖 V1–V6 审核合同、七种原生生产合同、editor 合同；多种不同名字/带 `/`、`.`、`~` 的空扩展，非空反对意见，Host 字段，非法 JSON 值、访问器/稀疏数组，缺字段、错值、父子问题合并、补丁越权和篡改均有检查。原生生产 probe 内容是已有注入夹具，不当作策略证据。
- runtime：最终55项，实际两笔付费证据、完整上下文、外层 workflow、真实 DSH、独立消费者、重开 SQLite、读取证据失败、402；附加校验来源交付标记与完整场景来源声明。最终证明 `069e79e2ff40b841dd88a7265032d81c60649bbded99d05d1a634b2f146cb9d6` 对应1次真实DSH；本轮此前51项也执行过1次，总计2次真实DSH，均0 Provider。
- task：33 项，完整章节/来源图/来源索引/省略声明/保护字段不变；输出只有 `field0`；越权重写 verdict 被拒；旧的“最多八条”指令不进入这个新任务。
- 报告在 `build/ticket-18-faction-production-v1/{field-codec-v1,field-recovery-runtime-v1,field-repair-task-v1}.json`，每份均有代码 hash。以最终文件为准。
- 所有本轮 Provider 调用为 0；真实 DSH 验证使用已付费结果，既不是新模型判断也不是对战 replay。

## 下一步（没有完成，不能跳过）

1. 在正式调度入口通过显式新 recipe 绑定 codec/局部任务；保留旧角色和旧合同的精确复用。不能只把模块测试结果改成 ready。
2. 实现/复用实际祖先链的证据读取器，接 `faction-structured-replay-v1` 和 `faction-production-replay-v1`；当前新模块的专用消费者不等于这两个入口已经接入。缓存读取仍须重新认证原 paid owner。
3. 将新审核以及后续 editor/生成角色需要的字段修复接到统一接口，防止下一次错误又落回旧的整对象重抄。局部任务的 `retryAuthorizationGranted=false` 必须由现有持久任务族预算授权，不得因新 task/schema 重置次数。
4. 在已授权模型上完成 Responses/strict tool 小型能力对照和真实长上下文验收；当前 strict 子集转换没有发起任何 API。保留用户指定 beta 优先、退场后回旧模型，不能因质量失败自动换旧模型。
5. 同期收口 Terran 已有替代请求与模型退场模块的正式接线，然后沿 5fd 续跑；不得回退961，或忽略两族均需完成的要求。

生产主入口：`scripts/run-ticket-18-faction-strategy-production-v1.mjs`。新恢复可在 native slot review 分支接入，但旧 `repairSchema` 的新内容生成仍需改走 field-value task，不能仅绕过本次 null 字段。Dry、recipe、capability、独立消费和正式 workflow 要采用同一绑定。

## 项目状态

- 本轮属于有效推进：实际实现通用模块，并用保存的真实失败和真实 DSH 验证，不靠新的模型抽样。
- T18/S174 尚未完成；T18 切片 2/8，整体 ticket 16/22。
- 五包离线验收 1/5、对战验收 0/5；Terran 阶段 6/7、Zerg 2/8 不变。旧来源/时机/策略债没有因字段恢复消失。
- 本轮新增 API tokens/费用均 0；上次及本轮诊断账本为 178,968,889 已知 tokens、估算及预留 ¥168.245993，下一通知 ¥200；实际402立即停全部开发。
- 无子 agent、官方游戏源更新、依赖安装、git 提交或旧 Skill 改写。

codebase-design 技能使字段逻辑收敛到一个四方法模块，而不是让各角色调用者各写一组字段名修复规则；离线 Skill/Harness 技能要求保留来源、费用、独立验证和不晋升边界。

```json
{
  "ctx2skillLoopUsed": true,
  "harnessLoopUsed": true,
  "targetGames": ["starcraft-tmg"],
  "roleRoutes": ["rule_skill_builder"],
  "promptPackRoutes": ["rule_skill_builder_prompt", "harness_optimizer_prompt"],
  "skillsRead": ["Zerg:unqualified-full-section-and-paid-review-results"],
  "skillsGenerated": [],
  "judgeTestsRun": ["field-codec", "paid-field-recovery-runtime", "full-context-local-field-task"],
  "crossTimeReplayResult": "original paid result authentication and SQLite restart; no battle replay",
  "promotions": [],
  "blocks": ["formal production integration and strict capability test pending"],
  "remainingRuleGaps": ["independent source/timing/strategy evaluation remains"],
  "harnessToolsCalled": ["pinned DSH offline finish with zero Provider calls"],
  "uiTraceEvidence": null,
  "agentDecisionEvidence": null,
  "memoryTraceEvidence": null,
  "trainingTraceCandidates": [],
  "rollbackOrDemotionRules": "no promotions; old attempts/contracts preserved; new binding required",
  "userVisibleChecks": ["original verdicts unchanged", "no rebilling", "missing content not default-filled"]
}
```
