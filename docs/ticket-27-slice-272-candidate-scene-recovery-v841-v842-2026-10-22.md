# T27 / S272 P3/P5：候选军表与对照场景的恢复合同

## 实际链路

1. e8844 原实验场景已恢复：Goliath 位于(8,6)、Raptor 位于(14,6)，两支单位静态几何通过。正式军表没有改动。
2. e8852 有 Ares 的查询成功：`dc02be3fd44e7e9b1ddce603f407417ded1c303ddc45e4880bb333ddbfba8826`。四种武器各自有攻击估计，0攻击估计失败；它们不是可直接相加的一次总攻击伤害。
3. e8851 无 Ares 查询把原场景的完整stateRef与候选contextRef混用，执行前返回 `ROSTER_WORKFLOW_STATE_REF_CONFLICT`，没有发生Native测量。原件 `e8da1cdc5628f73b154c542d2833299cc301bcc5d1eb4b387fdb783489a52bd9`。
4. 自动修复角色的目录虽有 `project_scene`，实际允许集合却只有 inspect/spatial/threat_exchange，无法调用必要的跨军表投影。e8865 模型改为直接查候选军表初始状态，修好了身份格式，却丢掉了对照场景。公开理由与原文保留：回复 `e16f1a432885d5c4447eb409e55a65ad6bb2f1853a682ba8d3af22b06aa9c6c6`，结果 `329ec92ea3cfb4342c36008fb55bb086cf75074388e66d8a8c11b397a884afcb`。
5. e8867 已排队但未执行；47927在此安全退出，0在途。不是成功的无Ares对照，不允许把初始空场景结果当成零伤害。

## 来源修复

- **角色能力**：共享graph合同识别已选候选/参照场景冲突，允许现有 `project_scene` 作必要准备。仍只由原 probability/threat_exchange 实测完成父问题；投影不是测量，更不是Plan批准。
- **实验范围**：这个恢复通道只保留参战模型精确位置，要求 `changedUnits:[]`、`unlistedUnits:"off_table"`，不授权重新排队形、改表、移动或扩展整场实验。
- **执行义务**：调度器把原参照场景与目标候选的类型化义务交给真实工具执行器，包括旧版已排队但未执行的子查询，不依赖模型重述要求。
- **实际门**：查询必须引用已完成的精确投影回执；候选身份、原参照场景、返回状态、未重排事实均一致才继续原Native校验。候选setup、错误来源、其他场景或改排不能替代。
- **自动恢复**：不合格查询在Native前返回可纠正的 `ROSTER_WORKFLOW_COMPARISON_SCENE_REQUIRED`，完整保留原场景义务；下一纠错角色仍能投影，不退回只有inspect的死循环。原模型回答/工作单/费用不改，不手工补结果。

这是同一P3/P5控制链的两处相连缺口：工具存在不代表角色有权用；身份合法不代表比较条件被保留。没有放宽实际规则或独立策略审核。

## 定点验证与边界

| 验证 | 实际失败 | 修后证据 |
|---|---|---|
| v841 编译/权限 | 用e8851实际来源构造必要投影单，原编译器报 operation_not_delegated | 一次GREEN：原两来源绑定、后继查询、冷恢复不变；新表/新场景/Native动作/完成后的扩展拒绝；不得重排 |
| v842 调度→执行→下一修复 | 对e8867实际未执行子查询作隔离dispatch，原assignment丢掉参照场景义务 | 修后实际调度送达义务、真实执行器在Native前拒绝setup替代、下一修复合同包含投影；正确投影证明可过、错源/错场景/改排不通过 |

v842第一次修后运行的测试替身方法写成 `estimateFireZoneExchange`，真实接口是 `queryThreatExchange`，因此未进入目标守卫且resultRef为空。对照源码修正替身及合成回执的真实形状后，只补跑该失败门一次并通过；没有重复通过门。合成投影回执只检验守卫，不是假装Native实际结果。

脚本：`scripts/verify-slice272-candidate-scene-repair-v841.mjs`、`scripts/verify-slice272-projection-obligation-v842.mjs`。均0Provider、0Native、0生产写；原始生产记录只读。

## 当前续行

66677从原e8867/lqMWaS加载v839–842，守护66678，日志 `build/slice272-v842-projection-obligation-resume-1792613621140.log`。先观察旧错误子查询被正常交回、模型选择投影、原生投影与无Ares测量实际完成；未完成前不得宣称自动恢复/策略比较通过。目录扫描优化同时加载，不改模型策略输入。

实际续行e8868–8871：旧排队子查询由新调度器收到完整原场景义务，e8869在Native之前返回 `ROSTER_WORKFLOW_COMPARISON_SCENE_REQUIRED`（executed=false/nativeSuccess=false），结果 `466bf697468341c61d0000035e7a97e3ec759941d2c9af5f92f5a0adeb8e5adc`；原参照7ac261…与候选dbc53a…保留。产品自动排入下一input-repair，状态ready，0新增Provider/Native。已证明实际拒绝与交回接线，不等于模型已完成投影。

当前正式r4/2000矿170气；最终Plan0/6、对局0/12；T27 5/6、T23 33/36，剩余4Slice。下一是原双组测量→来源/问题覆盖→战略取舍→受影响复审；不恢复旧A–F或重置费用。

Harness loop used：StarCraft；角色为原实验方法/局部纠错；真实工具入口为project_scene与原火力查询；本次无新UI验收、无记忆/训练晋级。若守卫拒绝真实同场景投影，应记录其实际来源再定点修复，不能改模型答案或把未测当零。

## 实际恢复完成，以及 v843 的共享配置修复

### e8874–8895：模型选择、投影、测量、父问题接续

1. 实际请求包含 `selected_candidate_scene_projection` 和原参照/目标候选义务。模型公开决定先做 `project_scene`，再由其 `/stateRef` 绑定到 `threat_exchange`；`changedUnits:[]`、未列单位留场外。没有手改模型工作单。
2. e8883 原生投影成功：`34daf7808aa2cd231078da878bf0a03c106781557bfd073929779fef827a9d5c`。两支参测单位全部模型位置与参照逐值相同（1个Goliath、6个Raptor）；地形保留、`adaptedUnits:[]`。两份摆放元数据的 layoutSource 不同是正常的，不能把元数据不同误报成坐标不同。
3. e8887 无Ares查询实际成功：`894cc927d2aa5a64e2bc0e878c8f03d36cf516751a445027da55ca56147e0f91`，四个攻击估计、0失败。输入绑定实际引用上述投影回执及其返回状态，不是候选setup。
4. e8888/8891 产品沿两层恢复关系接回原失败查询。没有重跑有Ares成功结果，没有改正式军表或Plan。

以下是原生回执中的分项估计，不是一次齐射之和，也不是整体军表优越性证明：

| 武器 | 有Ares：伤害 / 伤亡 | 无Ares：伤害 / 伤亡 |
|---|---:|---:|
| Autocannon | 3.9167 / 1.6389 | 2.6389 / 1.0556 |
| Underbelly Machine Gun | 3.9167 / 1.7778 | 3.3889 / 1.4722 |
| Scatter Missiles | 1.7500 / 0.6111 | 1.7500 / 0.6111 |
| Haywire Missiles | 1.3889 / 0.3889 | 1.3889 / 0.3889 |

每项36个确定性分层样本，属于advisory estimate。概率项带Wilson区间，不代表伤害均值也有同一置信区间。可选反应未计入基线；反击仍未测，不能填零。静态场景不是合法进场历史，原方法中“处于掩体”的文字也不能替代原生地形判定。不同军表生成不同状态身份是正常的，是否同场景应看投影及模型位置证据；复用相同查询不是自动失效或必须重测的理由。

### e8900–8913：发现并修复真实错误 unknown

事实汇总收到候选原件，却同时收到配置矩阵的 `configurationStatus:unknown`。它据此保留配装和同场景疑问，第一次补读后第二次确认，尚未经过独立来源/覆盖审核。实际汇总 `6ac23d4645794583e3e188d63ec8bf4143aabe337b319819fb13a90de70c3943` 保留原文，不当作正确战略结论。

根因：`roster-measurement-configuration-v1.mjs` 只查测量节点的后代。模型给投影的是完整显式stateRef，候选是同批已分配来源，不在参数绑定后代中，因此真实存在的配装被漏掉。

v843改为在**本角色已分配/已读的来源闭包**中，以Native候选context和sourceState两项身份精确关联。仍要求成功候选回执；不扫描无关全局候选、不按名字猜、不修改原文。多份同身份但不同配装仍报告冲突，缺单位仍报告缺失，不把“找到配装”当作几何/战略批准。

定点脚本 `scripts/verify-slice272-assigned-candidate-configuration-v843.mjs`：

- RED PID81853：真实e8900输入得到unknown，复现成功。
- 修后唯一GREEN PID82185：原配装/原来源实际交付，现有因素比较生成；另注入错误context、错误source、失败候选、缺参战单位、未分配全局候选、同身份冲突及同内容别名。均符合预期，0Provider/Native/生产写。旧通过门未重跑。
- 这是P1/P2/P3的输入交接修复，不是新的实验/策略特判；原有精确绑定路径保留。

### 调用、断点与下一步

本段三次Flash共184,211 units，Provider时间21,494ms：投影决策58,169 / 7,805ms；汇总首轮44,268 / 7,324ms；补读后确认81,774 / 6,365ms。所有旧账继续保留。这不是流程总耗时；整态复制的本机热点仍未解决，不声称性能准出。

完整脱敏prompt/实际回复在同一journey目录（`build/slice272-product-generation-v645-lqMWaS/workspace/decision-product-journeys/decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c/`）：

- 投影决策：请求 `157b8c69-94be-46bd-86f9-a3aa5df2e899.json`；回复 `f83382f4-7eb6-4fec-a7df-646d9738895d.json`。
- 汇总首轮：请求 `47c96b03-3b77-4c49-b762-532117ef117a.json`；回复 `d5c9a73b-2fc9-42f2-bdf9-b290780835b3.json`。
- 补读确认：请求 `6eaedfde-701e-4b56-aa19-9a91925e9c1c.json`；回复 `e2b0de51-ba14-4165-88bc-5da2f5f6f659.json`。

66677完成当前批次后正常退出，e8913/0在途；82780从同lqMWaS加载v843，守护82781，日志 `build/slice272-v843-assigned-config-resume-1792614747183.log`。下一是既有 `method:d27292cc6165af44` 消费新配置投影与已有测量，不重测成功原生工具。实际模型消费修复仍待观察，不能预报完成；正式Plan仍0/6、余4Slice。

v843真实请求已验证送达：`4d291389-456a-415f-aa1e-a15e49f51729.json` 中1372和1383两条配置均为resolved，无Ares行精确指向1355候选原件，1372↔1383比较只含真实配装差异。实际回复 `df685891-38f5-4471-862f-ffe4dedb3c1a.json` 选择读取两份攻击回执、候选原件及操作合同；尚无新工具工作单。新增Flash94,582units/4,689ms，0新Native。旧审核文字仍影响其最初措辞，不能仅因字段送达就宣称它已完成正确比较；下一检查补读后的公开判断及是否不必要重测，保留旧汇总原文。

### e8957–9008：补读后真实收口，独立核对进行中

`method:d27292cc6165af44`已结束，结果为 `1756ce7ba1575f3c439df12f224a55f57f82186e6fa5389f1a7f1088482e2b53`；`workOrders:[]`，0新增Native。模型不再用“配装unknown”否定现有对照，而是区分旧导弹配装比较与新的有/无Ares比较，报告四条实际数值，保留单攻击估计、未测反击/可选反应、非整场/非最优等边界。正式r4没有改动。

顺序是：第一轮请求读源 → 第二轮给结论并新增旧导弹记录引用 → 产品补读这些真实引用 → 第三轮作者确认。不是宿主改写结论，也没有重新购买原生测量。三轮累计444,875units、Provider20,692ms（包含上文首轮94,582，不重复计费）；实际请求/回复保存在workflow artifacts：

| 轮次 | requestRef | replyRef |
|---|---|---|
| 1 | `e32a67a359918862d2b0bfe9e51b8ae0cc37679b983efccda66eb9fe6f00cb94` | `d48fe12533e8b2d39fac69d1faab71506f80260e2f28c29f18374317debb556a` |
| 2 | `f97d9f404afc194308866d8816f83978314576e5bee2570a34ca1244eb08ce0a` | `66eff7ad60a1cfbc626d1b6836005832ae59c1818307bc0d39fcdd0f3ae1c671` |
| 3 | `cd9fa637381245517ca84dc4bea16c98b50d7c3547e349158b0bd65c6dd41804` | `9c7cf33b0ffd2b4ba409d0de2c2089801f6ae679e76589bb39783663c9094a81` |

这支持P2/P3/P5“修复后的真实输入→作者收口且不重测”的局部证据，不等于P4战略改善或P6正式准出。独立核对已按两条并行启动7条，e9008时七条完成首请求和补读、均等待作者确认，父覆盖仍waiting_dependency；没有工程failure，不把首轮supported当正式通过。下一继续同82780观察这七条及父覆盖，再交战略角色，原场景/账/成功测量保留。最终Plan0/6、剩余4Slice。

### e9042 / v844：原场景证明漏传给审核，定点修共享接口

七条正式来源核对已返回：1、2、4、5、6通过；0、3要求修改。两条失败的主要公开理由是有/无Ares的source/base/relationship-graph哈希不同，因而不是同场景对照。这里只记录其理由，不把理由当作事实。

实际第0条请求 `72f45b205c92eed13fa57fa0b417bbfd017926aec99d04dc3d3ace9de14ade57` 没有收到1377的Native场景投影；但其已分配来源闭包确有1377，精确保留Goliath与Raptor的1＋6个模型位置，无适配、地形保留。配置模块没有检查几何却固定输出`sameGeometryProven:false`，加剧了误读。不同军表本来会生成不同状态身份，不能要求删除升级后仍有同一个哈希。

本次属于P2来源交付和P5职责交接，不是替模型批准因果：

1. 新共享Module `roster-measurement-scenes-v1.mjs` 只在实际分配来源闭包中，把成功`project_scene`原件和两份测量的完整context/source/state精确对应，交付原证明、参与模型、地形、阶段及明确限制。
2. 配置矩阵改为“几何由单独证据评估”，不再硬编码未执行的几何否定。
3. 正常恢复调度核对**实际旧请求确实漏交证明**，仅重新交给两条失败审核；五条通过结果复用，所有旧回复、计费、测量和正式r4保持原样。
4. 几何相同不代表非几何输入完全相同，不代表因果/整场/最优成立。工具保留目标自己的能力、资源和状态；反应、反击、采样与组合攻击边界仍需模型按真实证据判断。

定点验证 `scripts/verify-slice272-measurement-scene-delivery-v844.mjs`：真实RED PID6603；修后PID8355确认场景交付及9种身份/失败/地形/参与者异常注入。该次管道未收齐最终事务标记，因此没有仅凭exit0计整个通过；增加完成标记后仅用`--recovery-only`补验未确认部分，PID9447最终通过，日志`build/slice272-v844-recovery-gate-1792616535003.log`。恢复事务确认2条重审＋5条复用、正常入队、冷恢复不重复、在途请求保护、军表/原答不变。0Provider、0Native、0生产写；已通过的场景注入及旧门没有重跑。

82780已按批次完成安全退出，e9042无在途。10100同一个lqMWaS加载新代码，守护10101；日志`build/slice272-v844-scene-delivery-resume-1792616589297.log`。实际模型是否据证正确判断、父覆盖及最终战略取舍仍待。最终Plan0/6、对局0/12、剩余4Slice，不能把本次接口通过计作最终产物。

### e9043–9092：真实交付成功，审核分歧交给正常纠错

e9043退役尚未执行的旧父覆盖；e9044仅新建claim0、claim3和其父覆盖，原五项通过复用。两条首请求中均有`measurementScenes`与原件`measurementScene1`，两模型实际主动读取1377。0新增Native，正式r4不动。

复审仍未全通过，不能把字段送达当成功：

- claim0结果 `5da3e2de421a329f6dfcf27c3d450895550c8c4296df7faaa7dc9925f7ba017e` 仍声称周边配装不止Ares不同。真实输入的矩阵混有604/687等历史测量及21个配对；但1372↔1383这一对的Goliath差异只有Ares。历史比较背景是可能的误读来源，不把这个因果猜测当作已经证明。
- claim3结果 `834981e8b49bc2fee06ee7d48969d0f60286a0d3a478a3164758e9fa3a11b609` 将Autocannon伤亡1.6389当成Underbelly伤亡，因而误称差值应为0.1667。原件Underbelly为1.7778与1.4722，差0.3056；保留错误审核原文，但不能把它写回成规则事实。
- 父覆盖结果 `a4103ee9dc8f80ed9c6fb4c53a6b0188fcdc82dbc82f7e6f5231fe57618bf2d8` 正确读取投影、两组配装及数值，给出supported。其正面判断不能替代两条来源核对。系统没有放行最终Plan，而在e9092自动建立同方法的`source-revision:review-v7:presentation-v2`，下一由作者基于原件澄清/修订，观察是否能自动收敛。不手改旧输出，不仅因复审分歧重新购买成功测量。

本轮七次Flash累计554,063units、Provider39,866ms。不是本机总耗时，不重复计上文旧轮：

| 子项/轮次 | 请求ref | 回复ref | units / ms |
|---|---|---|---:|
| 0/1 | `6ca16b26cfd2a08119afc78b3a525cd30ee45cd7a58d4063747d76248d1ba6e6` | `d41f8ad9806f361d01e02c8b184c6487e9562f66e0be868aab9eb538db0c1651` | 34570 / 3358 |
| 0/2 | `e776a333f05761ea99fb954dfade8abb820163ba583a282af0336a6aeb98fbef` | `2af3296d0b46728724c5ad868ce40beadb05dd50a21102cfda5a038a7e18103a` | 108357 / 7341 |
| 3/1 | `ab65e7a17bbe5e72dd366e943b28dfe1c60666f8d09626ffdb92849b8ab10458` | `3c3e032073e4bb68e7005713fb2ca9d004b24ad3a18a1e665cc72fd06459e839` | 34521 / 6639 |
| 3/2 | `d7f7932858982eb69474875d8984d5bf9d28db82f4ac690a82508f0cbb5b4878` | `f77abc519695b575aa92bd03b4c4deec5d07be82a66eb94ae82ac0ac037f029b` | 69466 / 3366 |
| 3/3 | `d9c206dcabeacf452744332bb12006a01d3e86157c268986830c8a13358a43a3` | `b3f7d425dbcc754df830a52a718ac8d7ad57f480cd0e7230d910ef88a4b0f304` | 154592 / 7541 |
| 覆盖/1 | `f729048cb2acdcc213645735a35215491d1eff2cbb37072b7eff608460cf5d02` | `70dc168406119a8c69c90066f9ad6045a3a5927a8c09500e470f7f40f199ca94` | 39401 / 3134 |
| 覆盖/2 | `84f6293642c121bd41d3f6c56f9827c71caa772cd03f81873ce919784689e708` | `9b679f8406e5265cb4fd72db1f6bd80944a2a7bb5c5d0274a3f171f10a97f747` | 113156 / 8487 |

当前结论：P2的实际证据交付修复成立，P5自动交回已实际发生；作者纠错收敛、P4策略取舍与P6最终发布尚未证明。10100继续同Run，最终Plan0/6、对局0/12、剩余4Slice。

### e9108–9158 / v845：作者服从错误审核算术，改为源绑定行运算

作者先读取现有原件，没有马上重测；第二轮也正确识别两组仅Ares配装差异。第三轮却在同一回复里同时列出Underbelly伤亡1.7778与1.4722，又明确“接受审核纠正”，把差值写成0.1667。这证明**只把原件交付给模型，不足以保证算术及反馈优先级正确**。原始与紧凑索引的武器/数值均正确，没有传输串行错；两组数组排序不同是合法的，不能用行号配对。

第三轮answered没有通过既有“必要事实必须增加材料或明确交回”的信息门；第四轮转而提交新的无Ares候选、同参照project_scene及threat_exchange工作单。e9158已排队，仍未收口。新候选/私有场景不是正式军表变化；这也不是已经证明的新信息。该门允许对错误审核用同原件提出strategy_required挑战，本次模型没有走对。不能将以上记录宣称为自纠错成功。

v845修复P2/P5：

- 共享`measurementRowDifferences`按攻击者、目标、阵营、武器和实际选择参数唯一匹配，工程层计算reference-minus-target；每项保留两侧原件与精确行指针、样本量。缺行/重名不随便取第一行，缺值不填零。
- Underbelly正确匹配有Ares的`/receipt/exchange/attackEstimates/1`与无Ares的`.../0`，1.7777777778−1.4722222222＝0.3055555556。这只是原数值算术，不批准因果、显著性、组合攻击或最佳军表。
- 纠错角色所有阶段明确：审核的算术及answered_fact也是可错解释；遇到原件冲突保留旧反馈、据原件说明，不因为“审核说了”就接受。受既有同材料门限制时走strategy_required，不制造新测量或删义务。
- 没有手改任何付费回复、旧审核、费用或生产断点。没有自动将新数值写进Plan。

定点脚本`scripts/verify-slice272-measurement-row-arithmetic-v845.mjs`：实际RED27100→唯一GREEN27989；真实分武器差值、乱序、缺武器、重复身份、缺数值及旧反馈原文保留通过，0Provider/Native/生产写。日志`build/slice272-v845-green-1792617862179.log`；v844及此前通过门不重跑。

作者四次Flash574,852units、Provider27,151ms（另于上节七次）：

| 轮次 | 请求ref | 回复ref | units / ms |
|---|---|---|---:|
| 1 | `a23a7ab4a7f141ca8952086cce3e603351ab26b571fadcf69e93be314bb778c7` | `154c90f5272274475c7f6d57cbc5d9c77377bee9558eb27c8064bf07ed1c50a5` | 98166 / 4607 |
| 2 | `66402666ff783b7a45e8d950b40b0f214d857e5ed92639b6a91a89531344d25f` | `495b89c41c78eb9c14d9c26e95d69137fc1197c68f78b496508530d9979e6519` | 147038 / 5107 |
| 3 | `b6cd68875f6ca050245c0df26e4c44ced7673e1a90e9cd36c9475cb3822be8b4` | `c5f48eaf3b64f8546633d804a797c32bac552b3617f698536db33e2cb272e698` | 160362 / 6579 |
| 4 | `0ddc3a5e0eec2f23866fbd9268e4413e822f09a196b6c0c216db865bae513b16` | `0094fb7a4ee76fe34389522af058570dd7c0688e90891abd9173ad29eb12bb2a` | 169286 / 10858 |

10100收到安全停止后完成批次退出，e9158/0在途。28599同lqMWaS加载v845，守护28600，日志`build/slice272-v845-row-arithmetic-resume-1792617906226.log`。下一执行的是已保存工作单及其正常下游，不是新建流程；必须观察实际查询复用、差值消费及职责回交是否收敛，不能预报成功。原生查询复用只覆盖既有支持的查询类型，不假设候选/投影必定全部复用。正式仍r4/2000矿170气、Plan0/6、对局0/12、余4片。

本轮diff摘要：

- 新增`roster-measurement-scenes-v1.mjs`：同源场景证明交付、按语义匹配分武器算术。
- 修改`roster-measurement-configuration-v1.mjs`：接共享场景投影，移除未执行的几何否定。
- 修改`roster-source-review-repair-handoff-v1.mjs`、`roster-workflow-experiment-owner-v1.mjs`、`roster-decision-workflow-v1.mjs`：实际漏证据的定点重审和正常持久入队；保留通过项、旧记录和在途保护。
- 修改`roster-experiment-source-repair-v1.mjs`：审核算术不覆盖原生事实，各纠错阶段统一优先级。
- 新增两份实际故障复现脚本v844/v845；更新本报告、CURRENT_WORK、根TASKS和PROJECT_MEMORY。未提交Git、未运行全量或无关验证。

最后观察e9162：28599仍运行，已处理原排队候选（结果`ce6aecf7fa50a64b36f14314e905295b9b1ae0d840e9e72cfdf9829d01909324`），投影ready、火力/汇总等待依赖。尚未观察下游实际消费v845算术或本题最终收口；最终数字不变。
