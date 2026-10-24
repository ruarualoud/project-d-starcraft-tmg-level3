# P2／P4／P5：事实保留与未完成事项回交 v657–659

日期：2026-10-20。T27／S272，新 P0–P6。施工及局部证据，不是最终生成报告。

## 已实际提交，不再沿用旧状态

- editable 同工作流 `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1` 已从 r2 到 r3，仍5单位、960／2000矿。逐问题来源并集修复后，原付费回复被正常产品复用，不重买回复。
- fixed 同工作流 `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34` 已从 r3 到 r4，再到 r5；2000矿军表不变。模型实际纠正了“preset_immutable意味着无增援”，并把5个地图坐标写进部署概念。r4提交结果 `eab433324992d6c211a73bfb4838a52693aa5a883f62accbc8ebcb60771605aa`。
- 这些是事实驱动 Plan 变化，尚不是战略优势验收。正式 Plan 仍0／6，对局0／12。

## v657：共享官方卡牌来源发布

模型重复找不到任务／部署卡原文。共享 `rosterSelectionSupportRulesV1` 原本只发布战术卡及规则章节，遗漏了冻结数据中的 `faction_cards`。

只追加20项 `official_current_product_candidate`，保留原52项的顺序、内容和身份；不把 community_display_only 升为规则，不刷新数据。当前任务与部署卡原文可检索。`verify-slice272-official-card-source-publication-v657.mjs` 实际 RED36232 → 一次 GREEN36866，原件未改、网络／Provider／Native／生产写均0。真实角色是否完整消费仍看产品记录。

## v658：分块不能把坐标压成数量

真实 editable Teach r3 的请求 `6a4b8771…` 曾读来源189地图原件，但后续 `previously_delivered_source_facts` 只保留 missionMarkers 数量5，没有坐标；模型因而再次称坐标未核实。这是输入压缩的负面作用，不是新战略未知。

- 共用确定性投影保留每个不超过8192字节的完整顶层结构，写入 `receiptStructures`；不是地图字段白名单。较大结构仍有原件／精确 Pointer，阈值只影响展示，不拒绝执行或丢原件。
- Native 小结构使用附加子合同 `structureProjectionVersion:1`，不改变原 v4 总合同并触发无关来源复审。
- 已保存旧索引通过注册原件补 `registered_native_measurement_supplements`；纯查询不冒充 Native 动作或完整历史。旧付费输入／索引不重写。
- `verify-slice272-repeat-spatial-facts-v658.mjs` 实际 RED41100 → 一次 GREEN45155：真实角色输入含5个精确坐标／战场／底盘目录，1804项地形不整包重复注入；旧索引消费者正确，旧请求／原件逐字节未变。Provider／Native／生产写0。真实模型效果待观察，不声称整体策略无损。

## v659：检查器发现缺项后必须有修改责任角色

两路 v657 都自动结束为 `ROSTER_DECISION_NO_READY_WORK`，无活动工作，却留有确定性缺项：

| 方式 | 实际停点 | 缺项 |
|---|---|---|
| 从头写表 | r3 | 960／2000，差1040矿 |
| 固定表 Plan | r5 | 3张卡用途缺失、激活顺序 unknown |

根因：产品只安排初始生成、当前版本 Teach／后续决策和最终审核。已有 Teach／决策完成、但机械缺项未完成时，没有下一责任角色。校验器知道缺什么，但不会替模型选单位或写 Plan。

修复正常产品 `nextStage`：在没有活动事实工作时，按当前 revision＋完整缺项签名派一次 `product:complete:…:requirements-v1` 总体决策。完整传入实际缺项、Builder事实、当前草案和选择目录；固定表禁止改表，editable允许联动修改。角色可明确查缺失事实，但不能把未完成用户要求仅归为“工程后续”而获得发布。

同一不变边界幂等，不无限购买相同请求；查询／修改仍走原 Run，必要未知与最终审核不放松，不强迫某个单位或某种战术。

`verify-slice272-product-completion-owner-v659.mjs` 首次夹具提前 close，只得到 paused，不算有效 RED；改为等待实际 advance 边界后 RED46712 → 源码修复 → 一次 GREEN47087。两种真实停点各收到一次准确修改任务；重复启动不重复派单；生产状态字节未变。产品端口为替身、Provider／Native／生产写0，不能据此宣布模型已完成。

## 实际续产及下一验收

原37542／37543已明确终止。当前同原两工作流由47267（editable）／47268（fixed）继续，日志 `build/slice272-product-generation-v659-{editable,fixed}.log`。已精确确认存活，真实请求已携带 completionObligations；未重发 Provider 恢复标志，不重建真实房间。

下一看实际军表／Plan提交、必要事实闭合、独立受影响复审及最终发布。之后仍须补六项能力中的战略对照，完成中文全过程报告，再启约定战局。T27为5／6；T23为33／36；相关余 S272／S248／S249／S250 共4片。所有旧费用／未知费用保留；本文件不代最终交付。

## v659实际推进与 v660 付费语法恢复

固定表真正完成 r5→r6：3张卡用途与激活顺序由模型提交，2000矿军表不变，随后再到r7并继续Teach。不是Host手补字段。仍需审核其中具体能力与策略论证，版本增加不当优势证明。

editable 修改角色读到实际Builder270后，提出新增Marauder large／Marine small／Medic small及两项升级、联动Plan的8单位候选，公开声称目标从960推进至1610，尚须真实Builder确认。三条付费回复连续漏 `decisions` 数组闭合，原停点为 `ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED`，不是军表选择没有推进。最后原回复 `abe38182…`、原请求保持不可变。

v660共享Provider语法归一化只在解析错误附近、字符串之外尝试插入一个容器闭合符；仅有一个不同的完整JSON解析结果才提供有记录的投影。不增加字段、改标量或替模型选军表；无唯一结果仍走原失败／纠错。这个具体原件仅插入一个 `]` 即符合当前Schema。

新角色可沿原付费记录的hash／context核对、复用该确定性语法投影；正常产品原回复重验新增类型 `completed_json_syntax_projection`，仍由同一Schema、实际读取、语义、Builder和后续审核负责。原失败／付费／未知费用不清零，不重买已返回内容。

`verify-slice272-paid-array-close-recovery-v660.mjs`：真实原件 RED51511；首GREEN恢复语法后触发正常来源补读，但夹具错误地禁止读取而失败。改夹具让它读取注册不可变原件、不伪造作者确认后，一次GREEN53013：8单位候选保留、原始字节不变、来源门仍阻止直接采纳，Provider／Native／生产写0。未重跑任何旧通过门。**尚未据此称Builder已提交或军表已满2000。**

47267已终止；47268收到精确TERM，只在保存当前操作后退出。新代码续产须等旧writer确实终止，沿同两目录／工作流，不再新建实例或重放Provider恢复。

### v660真实采用截点

47268已保存finished且精确进程不存在，两原writer全部终态后才启动54385／54386，同原workflow、同产品HTTP入口。已精确确认两PID存活1分50秒。

- editable：产品自动队列 `completed_json_syntax_projection` 复用原 `abe38182…`，没有重买那条格式失败；正常补读5／63后，真实作者返回 `9be73967…` 确认8单位 revise，结果 `f9f2b8cc…`。原已知失败／费用保留。该截点Builder尚未保存新军表，当前仍r3／960，不能写成1610已生效。
- fixed：真实已r8，军表hash保持不变。最新提交采纳Teach，修订条件计分日程、部署两分支条件及反冲锋的近战／远程武器区分；独立来源审核仍进行，未正式发布。
- 两组分别按真实reply traceId去重记账：editable截至 `2026-10-19T21:49:44.121Z` 140条／10,916,953Tokens／冻结价估USD1.322478468；fixed截至 `2026-10-19T21:55:45.864Z` 321条／28,259,550Tokens／估USD3.546557022。不是发票，不含旧未确定费用；新请求继续累计，未清零。

下一按同两精确PID观察Builder与独立审核，不能因一次观察中没有pending便重建或重发。正式0／6、游戏0／12、余4不变。

## v661：真实扩编提交，以及提交后历史引用边界

editable 已实际提交 r3→r4：**8单位、1610矿／120气**（已读取真实提交回执），军表与Plan同步，不再是模型声称或待提交。仍差390矿，不是最终产物。

随后生产停在 `ROSTER_WORKFLOW_BINDINGS_INVALID`。定点复现查明：来源关系目录从新军表的已采纳决策追溯到旧军表测量，试图用旧army/rules/source绑定发布一份此前未生成的compact facts。原件并未丢失，也不是新军表被Builder否定。

- 目录保留历史条目与精确原件编号；历史源没有既存compact view时，不为它新发一个错误绑定的当前view，明确标记 `historical_original_remains_exact_readable`。已有历史view和原件不改。
- 当前源仍发布正常同scope投影，来源权限不提升，不能把旧火力/路线测量当新军表事实。
- `prepareContext` 在冷恢复时先幂等完成当前已提交版本的派生关系目录，再排角色输入；不重放提交、Provider或Native。此入口补正由实际生产观察验证，不重跑已通过门。
- `verify-slice272-post-army-change-lineage-v661.mjs` 用真实r4和真实core/publisher，RED58671 → 一次GREEN59071：8项历史Native来源保留，无旧scope重发布，派生目录幂等；Provider／Native／生产写0。不是整个改表流程最终验收。

54385已终止；54386按操作边界保存finished且精确进程不存在。两路随后以同版代码、同原目录／workflow由59740（editable）／59741（fixed）继续，日志 `build/slice272-product-generation-v661-{editable,fixed}.log`；本文写入时刚启动，实际冷恢复目录与后续生成待观察。fixed仍按真实当前版本读取，不回旧r3/房间。

### v661实际冷恢复已观察

同59740／59741在51秒时均精确存活、journey running且failure=null。editable r4的当前 `evidence-lineage:v4` 已自动保存，实际进入新预算页、当前Plan Teach和原必要问题的r4后继；无需重放r3修改。fixed已r9／2000矿120气9单位，当前来源目录存在，继续Teach与r9事实分支。仍无正式发布或战略优势验收；不能因进程活着或Plan版本增加称整体通过。
