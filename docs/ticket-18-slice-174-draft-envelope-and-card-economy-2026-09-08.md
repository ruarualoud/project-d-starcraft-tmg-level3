# T18 / Slice 174：本轮真实产出、草稿接收与卡牌经济修正

## 最新实际结果：Z1修正后整章通过，T7正文齐但审查遇坏JSON

唯一live36012仍运行（run`faction-v1-3241bb0aff2eda69e7c9`）。
Zerg首章13修正已实际应用；新审后仅澄清“至少1 Elite槽”措辞，再经六批新审，
revision2 openIssues=0，result `738cb30dc20f19d53e274b814429a13e15a1b3365f04faf211640047925ef523`。
本地已知卡牌经济断言重查0项，audit `526cfbbd8a93f722d2af63d1ceab03ff4f59191a6b2f65e292b057193fd3929d`。
这不等于独立种族策略验收。Z2正文6/6齐（末2条旧付费输出零调用恢复），正在来源审查。

Terran T7正文8/8齐（末2条同样零调用恢复），但首审完整3627-token响应不是合法JSON；
原文未留存，不能事后恢复。T lane已settled，Z lane独立继续。
两次Zerg17-focus结构失败已实际0Provider恢复，不能与T坏JSON混为一类。
截至本checkpoint新增16attempt/2,001,398tokens/估算预留¥4.362303；
全项目累计173,257,472tokens/¥150.220788，无402，下一提醒¥200。

新诊断及官方API核查见[审查wire与能力核验](ticket-18-slice-174-review-wire-and-provider-capability-2026-09-08.md)。
等当前lane终态后修复共享syntax分类与加密raw隔离；未修改运行依赖或重复启动。

## 当前：正式预检通过、唯一 live 已启动；打包入口合同已补齐

受影响尾门已全部通过：bounded144/5DSH、容量29、ID25、metadata14、补答16、
Teach33、focus25及实际native引用消费者10。正式入口39门/166文件、独立消费者14门/38文件
代码指纹全部一致，无新增Provider调用。预检24296已exit0，recipe
`3241bb0aff2eda69e7c90ab2e03ad66e51d13d27b71de5babe890fae4a51c030`，339角色可复用；
继承生产链485calls/100,733,420tokens/¥79.552223，预算未重置。
从b624启动唯一live36012/PID71670，实际run为`faction-v1-3241bb0aff2eda69e7c9`。
Zerg首章13字段修正已正式落盘，application
`b190cb89cb1d878e528acc4064ec68edf14e322b33f7762e8913f0561d5ebf7a`；新整章审查尚未完成。
Terran前6章已重建，最后一章进入保存正文恢复；这不是重新付费生成历史内容。
此checkpoint查询该run尚0attempt；后续实际请求、产物与费用以账本为准。

等待期间检查了独立成品打包入口。实际Terran11引用正文经过`finalizeFactionSkillV1`
仍在旧8引用验证失败（红测27650）；不是语义审查失败，也不涉及运行中的生产代码。
仅修改独立finalizer、CLI和专项验证：从重建验证过的生产recipe读取显式draft envelope，
与候选绑定哈希一致后才用于整章验证，并把绑定保留在成品里。旧候选不得静默升级，
未知来源、缺正文、129引用、缺绑定及绑定漂移仍拒绝。
最终52项专项通过（26158 exit0），报告`finalization-readiness.json`，
`1e9ff43df7c727089c6c26308890d28d9951f0d7532bc9e1699cd0b84a0b8c54`。
其中两份正文来自实际付费失败，但验收回执为注入工程fixture；**正式种族验收仍为0**。
本修正没有触及主生产代码/其验证门的依赖，不要求中断或重跑当前live。

五件套离线1/5、runtime0/5，T18为2/8 slices、项目16/22 tickets。
实际规则修正与新审查、两族独立评估、正反对抗、空间Harness、真实反思升级回归回滚仍待完成。

## 最新接线：编辑器恢复及跨续跑保留已通过，等待受影响尾门

编辑器同类缺口已实现并验证：`faction-editor-draft-envelope-v2.mjs`只接受完整输出的
sourceRefs超量/重复或原空unproven，保留全部互异已知引用与所有正文；原Provider合同、
原始失败、完整capsule/invocation及费用不修改。独立消费者重新构建原编辑请求，
错误正文、来源/上下文/回执漂移仍拒收，恢复本身不授予语义通过。

原生编辑器与正式main dry/live、recipe、显式b624迁移、独立回放均已接；
`faction-editor-envelope-failure-imports-v2.mjs`在SQLite父/子run间保留失败证明，
原始attempt不复制、费用不重置。预检遇到保存输出导入时只报告断点，不启动DSH/Provider。
旧本地编辑器5项仍通过。

- 编辑器最终专项83项、2真实DSH、9次注入Provider、0真实Provider：
  `editor-draft-envelope-readiness-v2.json`，`2784a0ec2ee689ce214300f42d13a0cf26f466975d2905ca0b382e0bb5c48391`。
  使用两份真实已付费正文作故障输入；不是实际付费editor失败。覆盖原子patch、
  缓存、跨后代续跑、篡改拒绝、预检不出网及发送前policy drift拒绝。
- 原正文组件92项/4DSH/0Provider重新通过，`ac49e9220ec78cdfebb8daee6723111dc9b340bf69faa9a3ad3d9583dc0a499e`。
- 新联合准备门313项（接线/迁移64项，另含上述组件和既有来源检查），6真实DSH/0Provider：
  `draft-policy-readiness-v2.json`，`910884018b0c2fd190c3424b47c180e1417c6e4125d8a834cee10195ad469a1b`。
  迁移证明`14e1a4f55c2ca7c100dcf9b79c451f70197e5e10688f9331173133d11652412a`。

当前正式preflight/live仍未执行，余下受影响旧协议门在跑，活动句柄以TASKS顶部为准。
上轮“编辑器缺口未接线”的结论被本节更新；没有增加正式种族Skill完成数。

## 前一轮检查结论：复现编辑器合同缺口

全部受影响回归已结束。主入口选定39个检查报告/163个文件指纹对齐，
独立消费者14个准备门也对齐；它们不能证明未覆盖的编辑器接收边界正确。
最终旧bounded门144项/5真实DSH/0Provider，`62b5350aab917101b353f864b32d2e6e4cfc348c4099d1b840e4c553d1bdabdc`。
52239、3722、63610、28059、96211和93953均已终态，不再轮询。

端到端复核发现：`faction-advice-editor-output-contract-v1`仍限制引用最多8条、unproven至少1条。
新draft envelope已贯通批正文/整章/原子补丁的Host验证，但没有贯通编辑器的Provider输出恢复。
用实际已付费的Terran建议7（11引用）和Zerg建议5（空unproven）复现：
两份原文各仅因上述一个条件被旧编辑器schema拒绝，同时可通过当前Host整章验证。
诊断`editor-envelope-boundary-diagnosis-v2.json`：
`0ca61645e182a93469f981e03ab85a0fb5dd636390ae752372427e5e71ecf881`。
这是2份真实正文的合同兼容性反例，**不是已经发生的付费编辑器失败**，没有重抽或新增API调用。

下一步先补编辑器的显式Host envelope、原始失败/费用/上下文证明、实际DSH恢复、
独立消费者重建和续跑绑定；旧Provider合同/已成功角色不静默修改，空unproven不代表无不确定性。
补齐后再从b624正式CLI预检/live。当前仍没有正式修正的种族成品，五件套1/5/runtime0/5。
本轮属于实质进展（接线、实际故障测试、来源复核及新的端到端反例），不构成人工/外部阻塞。

## 真实生产状态

`faction-v1-b624e21a2da88377b410` 已终态，原会话36354退出1，两条lane均settled。
不得继续轮询或原样重启它。后续续跑以b624为父，继承费用、预算、原文和失败谱系。
生产报告：`build/ticket-18-faction-production-v1/faction-v1-b624e21a2da88377b410/report.json`，
hash `59e5b989f348b260f63cd6dbe59de5cbb901038c805b7a4960d795b0ca19a568`。

本轮确实推进的内容：

- Terran 第七章的目标4/5已从错误主题重写为Dropship与Factory，实际产物`f6bf9948ae6e8cc7bd6fcda043cb71fdb815707c25062449e24dd080ec5279bb`。
- Zerg 第二章原608字符计划已无损恢复；本轮又自动恢复743/704/780字符计划，均没有为超长计划重抽。四批计划已齐。
- Terran第七章6/8条已被工作流接收；最后2条完整重写已保存，但未被接收。Zerg第二章4/6条已接收；最后2条完整重写已保存，但未被接收。
- 尚无新的种族成品通过来源流程。来源流程进度仍Terran6/7、Zerg1/8；Zerg首章另有已确认独立语义问题，不能把来源模型通过当验收。

正式离线五件套1/5、runtime0/5；Ticket18完成2/8 slices，项目16/22 tickets。
174仍未完成，175正反对抗、176空间Harness、177回放反思、178版本升级回归回滚、179汇总验收仍待推进。

## 两个剩余格式阻断，不应删除证据或填造文字

Terran失败`structured-e02c9380e6d7854cee5d6bd61e63dc11d9ada2c582780394`：
HTTP200、完整2213输出tokens，唯一错误是目标7的`sourceRefs`有11条而上限8。
11条互不重复、均存在于冻结官方来源；旧去重恢复当然不能把11变成8。
完整产物`dfaa2194eabe01dd5337c910bdc1991c1f16d2d86dbcaa08e87bd1e13ffbb8d6`，
失败回执`5114603747afc1be035b053284ae3b64b5cd84604cd8a88146df6e919e33ec69`。

Zerg失败`structured-39255b466f2a163e09b220011291e0b2b9e5e26cf892ace6`：
HTTP200、完整2732输出tokens，唯一schema错误是目标5的`unproven=[]`而最少1条。
完整产物`403e87d56893d27c4cb25ffee84e7802a31d0c9d067e28e29c298507619d5c0a`，
失败回执`d30de31b38944cf3b9ef94c5cdfa00ce67df84e9dbb0b7ea2003d8cd6c144cc6`。
空数组只表示模型未列出不确定事项，绝不证明无不确定性。该正文仍须完整规则与策略审核；
例如Supply0争夺、Corpser/Kerrigan能力条件和时机不能因格式恢复而视为正确。

两份实际请求均已由只读完整工作流精确重建，含先前章节、上下文与invocation：

- Terran六章回放：`terran_armed_forces-draft-envelope-diagnosis.json`，`d20dda9939d64a2a40eb414ed2b8499a8734635d3e98873366b66eca148b7cf2`。
- Zerg一章回放：`zerg_swarm-draft-envelope-diagnosis.json`，`6deb75d9842a05572f85afe82d8d0b8f2e75e068fc90400164754c4a6a8322bb`。
- 汇总：`draft-envelope-diagnosis.json`，`1e204f4e692c7587b84aecafde38def71b413d9a535bac65bc9552ad4e2da92b`。

恢复正文的后续人工来源复核另确认三点（属于Zerg第二章，不能混入首章13处的已修提案）：

- 建议4 `alternatives.3`称Raptor模型数“6以下”才降至Supply0；冻结
  `source:army_units:raptor__zergling_`的`squadProfile`明确1–6模型Supply0、7–12模型Supply1。
  必须包含恰好6模型的边界。
- 建议4 `risk`称Supply0后“失去争夺资格”；冻结Core8.9.1
  `core.iuUyObNTQ2M8xK4IUqzC.items.9.subItems.0` p1/p2没有这一资格排除，
  并明确Supply0且无敌军争夺时仍可控制。零贡献、争夺资格与粘性控制是不同概念。
- 建议5 `procedure.2`把Corpser在Movement Phase获得Burrowed与触发Regeneration连在一起；
  冻结`source:army_units:corpser__roach_`的Regeneration为Assault Phase被动，
  条件是该单位成为Activated时已处于Burrowed，不能在Movement Phase埋地后立即套用HEAL2。

以上基于同一完整付费原文与冻结来源的直接核对，尚未正式局部修改。
下一整章来源审查须观察这三点的具体处理结果；若漏过，也不得直接交付为正确种族Skill。
Kerrigan能力频率措辞、机动多点覆盖、耐久性比较等仍需额外审核或局面验证，未因本三点被穷尽。

初次回放95378暴露了真实消费者遗漏：引用去重protocol仍按旧4096准备，漏传Proposer/8192/target-reconstruction绑定。
现已修正该分支，并核对完整invocation及原错误目标证据，不放宽哈希检查。
实际产物10项检查通过`86e7f43df114f939ddfbdc5e43f46104504f0e99988baa2722759b7bad5d016c`；
旧原生引用恢复15项、旧metadata接线14项/1真实DSH也通过。随后完整诊断28333退出0。

新`faction-draft-envelope-v2`保留Provider V1原合同，单独显式绑定Host接收规则：
已知且互异引用最多128；允许原空unproven；其他必填正文、目标、来源、大小与负判断不放宽。
原文、空数组、费用、原始失败不覆盖。该绑定贯通批正文、整章验证、原子局部补丁、单位/来源字段修复，
并已有native导入/现场失败分支、独立消费者和回放参数接线。

先红后绿的组件测试已证明：只改接收器仍会被旧Host `FACTION_SOURCE_REFERENCE_INVALID`拒绝；
补齐显式Host参数后，46项、2个真实DSH、0个Provider通过，
`be9c8b2abc72280ca2e02116d080b28dde26132ef5c5e1d2c1501576da3ca108`。
旧workflow77项/472注入调用通过。扩展native导入/缓存/独立消费者的最新验证以
`draft-envelope-recovery-component-v2.json`为准；**这仍不是正式入口全接线或真实生产续跑成功**。
扩展验证59955现已退出0：58项、2真实DSH、0Provider，最终组件报告
`d545f96c47a9b50bc0b7968aa1ecf3e8699245f15d0cf41d0a9c6432cf7e871b`。
包括原始错误target证据核对、消费者缺绑定拒绝、native导入一次后缓存复用。
以上为早期组件 checkpoint。后续现场失败与整章修正流程验证已完成，见下节；
不能把早期“尚未接线”当作当前状态。

## 后续接线与验证 checkpoint

- 现场故障扩展已完成：92项、4次真实DSH、0次真实Provider，组件报告
  `798436a85159d1d07ede2e2455ceaf14498488668ce9fb6332c264bfcc01fb3a`。
  两份实际付费结果原文恢复；另注入7类当前故障，包括未知来源、缺正文、129引用、
  截断和模拟402。只有符合精确条件的两条进入恢复，缓存续用不增加调用，原失败保留。
- 实际Zerg首章的全工作流修正验证29项通过：
  `4df4e3fabecb1f25da0713be388b838c88fc6c7f83c9ebdd81a937ac6a474e5f`。
  13处一次应用后，六条完整建议各进入supportive/adversarial新审查；
  正反测试合计12个注入新审查请求。新审unsupported阻止整章完成，不继承旧supported。
  这里使用真实旧稿、注入新审查，不是付费来源复审或正式种族验收。
- 正式main现已接两种绑定、保存失败导入、dry/live调用参数及recipe；
  continuation显式迁移限定首个父为b624，保持输入/输出容量/目标绑定和原费用，禁止降级。
  独立消费者追加Zerg卡牌经济准备门，拒收已知错误；准备门为14个。
- 联合准备门`draft-policy-readiness-v2.json`通过218项（其中接线/迁移52项），
  hash `98a17926abae2ae659df7c0b8707d9d3be57f8f6dc9d39f3381fba4c5a154163`。
  该数字包含上述92/29和来源17/28，不是218项新增测试或218份Skill。
  CLI参数检查是静态接线检查加动态组件/工作流证明；正式CLI预检与live尚待执行。

此checkpoint后只重跑受影响门，不跑项目全量、不刷新来源。当前会话以TASKS顶部为准。

## 战术卡经济：修整条建议，不只换一个词

你指出的“战术卡在写军表时购买”正确。冻结Core9.1.4与卡牌说明明确购买发生于Army Building。
局内可以延后已编入单位的部署，不能根据回合补给再买Hydralisk Den。

复核实际Zerg首章，把最初7处问题连同同条建议的相关前提扩展到13处、三类：

1. 战前购买与局中补给/部署混淆，共3处（含alternatives中的重复错误）。
2. Rapid Burrowing/Brood Instinct是阵营卡自身能力；使用需耗尽该卡，不是各有可由任意卡代付的1BM费用。相关when、procedure、alternatives、risk、reviseIf一并修正。
3. BM用于当前一次支付，不能提前耗尽多卡储存资源以供之后多次能力使用；应保留Ready卡，分别在实际支付时耗尽。

真实来源反例、全字段检查和13处局部修正提案已通过28项：
`zerg-card-economy-readiness.json`，`1375158e394ff45bd5e4b83e89199e3a339157cc3c15e117628deb1fc092ec91`；
提案`c93c4a69dd6152e8eebd47561981f84e36e3d3f7ee94c57de48a2b703bd1b05e`。
其他字段、Queen实际BM能力及已修正的35瓦斯/Elite/Hero算术保留。
这是已观察断言的校准，不是任意措辞幻觉检测器，不能声称13处就是全部规则问题。

`faction-initial-source-correction-v2`统一容纳这13处与Terran新的Unique跨字段错误。
工作流已有显式启用后的原子应用与整章新审查分支，保留旧否定结论/审查记录，不重置revision预算。
独立候选入口也拒绝Zerg已知错误。此段记录的是接线时状态；最新正式应用进度见本文顶部。
即使13处已实际应用，仍须整章新审查与独立评估，不能直接计为已修正种族成品。

## 尚需完成的接线与验收

- 正式main参数、导入、recipe和迁移已接线并通过上述联合准备门；禁止直接重启旧b624。
- 完成受影响旧门的实际重跑与源码指纹核对，再执行正式CLI预检，不能只改报告hash。
- 从b624单一预检/续跑，实际修正TUnique/Z13并完成新整章审查，继续余下种族章节。
- 两族独立规则/可用性/策略评估后才能产正反对抗；接着做完整目标中的空间Harness、真实回放反思及升级回归回滚。

本轮改动集中在：`faction-zerg-card-economy-audit-v1.mjs`（来源反例/13处提案）、
`faction-initial-source-correction-v2.mjs`（统一初稿修正）、`faction-draft-envelope-v2.mjs`及其recovery模块（无损接收）；
workflow、unit/source-field-repair、native-production-runtime、review-transaction-runtime、
structured-replay、replay-runtime-stack、candidate-evidence负责传播与独立拒收；
新增对应只读诊断和针对性验证脚本；正式main和continuation新增显式绑定、导入与迁移，
独立消费者新增Zerg拒收准备门。以上未授予任何成品或对战资格。

## 费用与边界

本轮11 attempts：6 received、5 failed，其中3条失败已由现有机制零Provider恢复。
新增2,692,974 API tokens、估算¥4.877875；累计171,256,074 tokens、估算/预留¥145.858485。
包含缓存、重复输入与旧已知用量，不是Codex开发tokens或供应商发票。下一提醒¥200；无402/余额耗尽。
官方来源未刷新，无Codex子agent，无提交、运行时晋升或训练晋升。

`ctx2skillLoopUsed=true`；`targetGames=[starcraft-tmg]`；`roleRoutes=[rule_skill_builder,harness_optimizer]`。
本轮生成新计划/正文并保存真实失败；source与策略独立验收仍未完成，`promotions=[]`。
`harnessLoopUsed=true`；使用离线DSH导入和只读产物回放；没有UI/实际对战/房间记忆/训练证据。
回滚/拒收边界：来源、上下文、目标、账本或原始回执漂移即拒绝；工程通过不能替代语义和对战验收。
