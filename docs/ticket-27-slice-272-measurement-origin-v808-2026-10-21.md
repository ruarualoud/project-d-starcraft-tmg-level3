# T27 / S272：实验引用不得改写原测量身份（v808）

## 当前结果

P1/P2/P3/P4共享来源接缝已修，实际r4/v2素材一次RED→一次GREEN；真实恢复已启动，尚待新预审／作者纠正。T27 5/6、T23 33/36，余4片，最终Plan0/6、对局0/12。正式r4合法2000矿/170气不变，不把门通过或报告作为最终产物。

## 按实际顺序发生了什么

1. v805–807真实预审指出当前Goliath已有Ares/Haywire/Scatter，旧Ares-only基线不对。
2. 模型自动形成设计v2，保存`7eb2b18e432c141fecda5726788ab0fe9e09440a1d1e6d99d91b84df327b92f0`。它改为当前三升级配置对比两种“移除单项升级”反事实；这是实际修改，不是人工编辑。
3. 但其`measurements`和`mechanismSteps`仍把旧604称作已经测好的三升级基线。原604的`experimentOrigin.comparisonBinding.armDescription`明确属于旧Ares、保留Hellfire的设计，实际estimate武器也不是新配置的完整证明。
4. 真实预审请求`82aa7a78da877f611ac68a195b7224416db40545cea211e704eb487e5490af4c`，回复`9d3e7ef145f8b9c5c251a1212f91aa613c77603ea2e23c41c122ae21e551f628`读取了604/687/708，却只在army_baseline中引用1099/1100/1152，认可了当前军表与新设计，漏查引用测量的原身份。
5. 执行角色真实`60b2a4318fe2ae929595da8a0ec930bd719fc5b93a718a01c9430c64d46c959f`继续称604为current all-three baseline，说明缺口影响实际方法，不只是报告措辞。

诊断三假设：来源绑定缺失（确认）；原件无身份（排除，原件含原实验/分臂/参与者/请求）；读取把原件改写（未发现，原件保留，错在新角色的使用）。

## 修复内容

- 新共享模块`roster-comparison-observation-sources-v1.mjs`：只解析本设计实际引用的已保存概率／交换回执；提供原实验分臂、原绑定、参与者、实际请求、实际estimate武器和精确读取地址。旧声明与Native配置证明区别明示。不是模型再总结，不重新查询，不根据hash决定战略。
- `roster-workflow-evidence-lineage-v1.mjs`：设计/预审/方法/决策的共用输入接缝交付这份记录，不由某个实验脚本私下注入。
- `roster-workflow-read-role-v1.mjs`：预审若宣称supported/conditional，army_baseline须在已有dataQuestions中逐来源说明适用性并引用原件。仅引用当前军表不足。requires_revision/needs_evidence保持正常出口，不迫使给肯定答案，不新增输出schema。
- `roster-comparison-purpose-v1.mjs`和Run构造器：新增明确合同版本，旧无来源身份审核仅对同一不可变设计复审一次；既有审核次数、失败、费用和原件保留，新合同不再获旧版恢复。
- 不自动否定所有历史资料：`sameCommittedArmy=false`只表示不能自动充当当前配置测量；模型须说明等价性或只作历史参考。真正的新基线应申请局部观测，不能假称已有，也不要求完整模拟对局。

## 唯一本次门

`node scripts/verify-slice272-measurement-origin-v808.mjs <原workflow目录>`。

RED：实际共享输入没有明确原测量身份。GREEN：604原Ares/Hellfire身份、原bindings逐值保留；只核军表的旧通过结论被拒；每来源明确引用和适用性说明可过此接口门；否定/缺证据出口可用；同purpose重审不清轮次。0真实Provider、Native、生产写。旧v805–807门未重跑。

这只是来源交付／审核责任门，不保证模型每条语义判断正确。还必须看真实来源纠正、有效测量、战略采用和最终审核，不能拿它冒充策略提升。

## 唯一实际进程

67048优雅退出0于r4/e6491，无running/pending；没有丢弃在途付费请求。PID76347从同原`build/slice272-product-generation-v645-lqMWaS`载v808继续，日志`build/slice272-v808-measurement-origin-live-20261021.log`。未重建房间、未恢复旧A–F。

## Harness记录

## 真实复审结果：原身份已被正确消费

e6509保存`c3fb72eaeba72aa458732331ea7eadb4c5a546d0affefdb27e533797483508b2`。实际两请求/回复：

1. `6dac77745b75a9d5361a2af0f716f1950958019c780e88a74441aded38204f49` → `fbdd9be740455431d3498a52166b73ede8358d2fccaa318864a2d1e0adce932b`，36102units/5.986秒。
2. `aa136d36944268ce9dff799d2f8a43b4b5859a5c18f27d33ad15105b5929f8b1` → `59324700b48080da05ecede7719b29a503e4b727c1998c5b0cfdfdd6204fe4d3`，43060units/9.169秒。

合计79162units，Provider15.155秒，非墙钟／非总账。真实army_baseline返回requires_revision：明确604/687/708不是当前三升级军表的观测，原604只有Autocannon/Underbelly，687/708各属旧单项分臂；须把它们作为历史背景，取得当前配置的同条件基线。冻结任务支持、局部可执行性条件成立。不是Host改答案、不是直接源批准；设计作者后续修正／新观测／战略采用仍待。

随后真实设计v3保存`9b8900bb099d2bca0b8f177b7a6d19f0b4303d8e92730400581de9657c2f6976`：不再把604作为新配置基线，currentChoice、measurements、mechanismSteps、invalidIf均明确要求当前三升级配置的新观测，旧604/687/708仅作历史背景；两单项移除反事实与新基线同目标/范围/掩体条件。未手工改原答、未改正式军表，系统已进入v3预审（e6539）。这证明来源反馈确实改变了设计中的执行要求，不是只改摘要；实际三臂测量和最终策略比较仍待。

harnessLoopUsed=true；targetGames=StarCraft TMG冻结数据；promptPackRoutes=设计→预审→方法→作者；harnessToolsCalled=本次门0Native、实际仍同产品Run；uiTraceEvidence=本次非浏览器验收；agentDecisionEvidence=以上实际原答；memoryTraceEvidence=旧原件/当前配置分离；trainingTraceCandidates=未晋升；rollbackOrDemotionRules=缺适用性不得接受、不清历史重试；userVisibleChecks=最终Plan未完成。

## v809：补读不是纠错完成

真实v3预审第一次结论`7fb5a680798d3bac825ffe878753fb0476b95af17ed3a3317b22a41306ff751f`漏了历史近战1017/1049的用途分类。随后模型`3d51a9760c60d4eae06b26ed78cadcbf1bd557e54ebedd3abacc771b073be281`正确主动读取两原件；但下一请求`2a3ced92c001284110d288208deb44c6bd554ff0badd05c947c245e3369cc379`里原`comparison_observation_origin_not_assessed`错误完全消失，之后`76f4ccb6e0182c1a2712641c7f756826c4a4bdba0ec8b3016ddcb679335d8023`又漏同两来源。

源因是共享read-role执行器在校验一个合法read/catalogue回复后，立刻`operation.correction=null`并清零consecutiveCorrections，把“读取动作合法”当成“原结论已修好”。v809只改此共用边界：读取/搜索保留尚待修订的原答、错误、次数和受控恢复状态；真正修订结论通过后才清除。普通没有待纠错的读取仍按原流程执行。不修改已付费输出，不重新执行Native。

本次脚本`verify-slice272-repair-read-continuity-v809.mjs`以实际错误回复和实际read回复驱动共享执行器。RED明确得到null而非原纠错；GREEN证明原任务／次数保留、新下一请求含原错误、显式修订后才清除。0真实Provider/Native/生产写；v808及所有旧门未重跑。日志`build/slice272-v809-red-20261021.log`与`build/slice272-v809-green-20261021.log`。源码已修，尚未载入正式运行，不宣称真实修订已经验证。

## 最终停点与下一交付

PID76347实际自行退出0，最后e6581/r4、product status=blocked、running=false，失败`ROSTER_DECISION_RECONCILIATION_REQUIRED`，strategy_comparison达到三轮设计预审边界。没有请求中断或网络异常；没有重新启动。

最终army_baseline已supported，旧测量冒充新基线问题已实际解决。但bounded_executable_design又把“具体range band、精确站位、sample budget”列为requiredDecisions，同时正文承认设计已把这些交给Native方法角色。局部纠错前该项曾supported，修另一项时发生无关判断漂移。不能悄悄抹掉这个新要求，也不能用v809的门替代其职责论证。

下一P1/P2/P3交付（原范围，非新增Ticket）：

1. 核对设计作者／实验方法角色的参数选择权和工具真实要求，区分必须先选的战略边界与可延后确定的执行参数。
2. 针对本真实多检查项纠错记录，检查局部纠错是否应采用按check的显式修改操作，避免修引用时重写已通过无关检查；新发现的问题须独立保留，不自动删除或批准。
3. 仅对应失败模式验证后，按已有授权进行一次受控恢复；不能直接增加三轮额度、重放原测量或重建Run。

当前正式2000矿/170气r4、最终Plan0/6、余4不变；长期目标未完成，仍active。本报告不是最终中文执行交付品。
