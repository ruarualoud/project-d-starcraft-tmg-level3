# P1／P2／P5 v655–656：来源单一真值与外壳空字段容错

2026-10-20，T27／S272。继续新P0–P6，不是最终产品准出报告。

## v654已实际生效：Teach真的读到Plan

两条正常产品工作流的subject-v1 Teach都已完成实际正文读取与提案，不只是排队：

- editable `product:teach:r2:subject-v1`读19个当前Plan块，推翻了自己的Raynor/Medic用途误报，保留有来源能力；指出960/2000缺口的语义、未查逐side/base路线、对手反制笼统等问题。
- fixed `product:teach:r3:subject-v1`读25个当前Plan块，明确指出“preset_immutable→无增援”把设计期权限误作游戏规则，提出按Reserves／Supply Pool部署的修订。

这是新的Teach输入接线及真实质疑的证据。仍不等于这些质疑全部正确、方案已更优或最终审核已完成。例如条件性VP目标不必证明未来整局已经发生，相关必要性仍由总体角色和独立审核按原义务判断。

## v655：我引入的重复来源维护约束不合理

### 真实问题

editable `product:after-teach:r2:subject-v1`三轮停在 `question_sources_required_in_parent`。原付费回复 `769f0e57…`已在逐问题引用中明确选择84，但上层来源数组未重复列出。84实际上已通过menu显式输入交付，status=read，并非缺失／未读来源。

让模型同步维护两个相同集合制造了内部不稳定性。正确做法是从其显式选择确定性推导，不再花三轮要求补同一个数字。

### 修改

- `projectRosterQuestionSourceUnionV1`机械汇总父来源和逐问题来源，原始选择及问题／理由不变。
- 投影写 `outputProjection`，规则 `explicit_question_source_union_v1`；不选择新来源、不解释答案、不修改军表／Plan。
- 独立审查收到完整来源并集；实读、范围及内容检查保留。不存在或未读来源不会因为汇总而获批。
- 产品的原付费回复重验入口增加此明确结构投影类型，最多一次；同Schema也可因已修复的确定性投影恢复，不扩成任意语义失败重试。

`verify-slice272-explicit-citation-union-v655.mjs`：实际原停点RED26395→一次GREEN27613，原付费回复在同角色重验，来源84被机械汇总，军表／Plan mutation与问题不变；0Provider／Native／生产写。日志 `build/slice272-explicit-citation-union-v655-{red,green}.log`。v655通过门未再运行。

## v656：额外空外壳字段不该阻止已完成的Plan修订

### 真实问题

fixed `product:after-teach:r3:subject-v1`付费回复 `35789594…`已经自行写出：

> 所有单位起始于Reserves，按规则38的Supply Pool逐轮部署……preset_immutable仅限制设计期改表，不决定游戏内增援/补充规则。

真实两条保留理由也已正确放在 `mutation.retainedSectionReasons`。但外层decision多了一个 `retainedSectionReasons:[]`，三轮都因此Schema拒绝，未提交。不是模型还没修正增援，也不能靠人工改Plan凑通过。

### 有边界的通用投影

- 按当前Schema提取控制外壳，额外的null／空数组／空对象保存在非执行注释投影中。记录原路径、原值及 `inert_unmapped_envelope_field_v1`，原付费回复不改。
- 只覆盖根控制外壳及decisions/checks/proposals/findings记录外壳。不递归清理mutation、Plan、workOrders、工具参数或问题语义。
- 非空额外内容不自动丢弃；未知执行参数不由此通道放行。已声明字段的类型／必填与真实规则仍检查。
- 共用角色执行器和产品原回复恢复预判使用同一投影；正常语义／来源检查后才可能进入真实提交。
- metadata沿用历史字段名schemaRevalidations，item.repairKind明确区分 `schema_contract_upgrade`、`explicit_question_citation_union`、`inert_envelope_projection`，不把结构投影说成换了Schema或策略已通过。

`verify-slice272-inert-envelope-projection-v656.mjs`：实际付费回复RED29291→一次GREEN29994，额外空数组留投影，内部2条保留理由、Plan修改和问题均不变；同例的非空额外内容和未知mutation参数均不获自动恢复。0Provider／Native／生产写。日志 `build/slice272-inert-envelope-projection-v656-{red,green}.log`。未重跑v654/655或任何其他已过门。

## 实际续产位置与未完成项

23347／23348已确认终态，两组均保存具体三轮失败，未删旧记录。当前仍同两原工作流：

| 方式 | 原目录 | 当前PID | 日志 |
|---|---|---:|---|
| 从头写表＋Plan | `build/slice272-product-generation-v645-M86Cg9` | 30311 | `build/slice272-product-generation-v656-editable.log` |
| 固定表写Plan | `build/slice272-product-generation-v645-I7zekC` | 30312 | `build/slice272-product-generation-v656-fixed.log` |

正常HTTP `/run`将尝试复用上述原付费回复，不请求另一条替代生成；核心重验及实际提交仍需看真实结果。旧费用、未知费、错误、纠错次数历史与所有来源保留，不重建军表／Plan或旧真实房间。

正式Plan仍0/6、对局0/12，T27 5/6、T23 33/36，相关余4Slice。当前已有真实Teach发现并公开修订理由；完整战略对照、满2000从头军表、最终独立验收、中文全过程报告及后续实验都未被这些局部证明替代。
