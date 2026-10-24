# P3：引用式候选选择与跨军表场景投影

这是新 P0–P6 的局部能力交付，不是最终 Plan 报告，也不是恢复旧调查。

## 解决什么

1. v563：模型选择“原生证据编号＋候选序号”，Host 从同一原件推导工作与选项身份，避免两个长 ID 配错。
2. v564：模型选择参照场景与目标军表，`project_scene` 复制共同参与者的完整底盘坐标。模型数变化必须显式选择处理政策，不能默默漏放对手或手抄十一队坐标。
3. 两个能力均接在现有产品实验执行器与同一 Native 规则器，不增加替代规则实现。

## 实际验证

只读素材：`build/slice272-candidate-model-v547-4qsGxP`。原实际159的 generation4 保持停止，原回复、工作、费用和计数不变。

- v563 实际159定点门：旧来源配对失败 → 显式 `428 / index0` 应用真实 Goliath 候选；空来源返回实际0个选项，Native错误细节不再丢失。通过后未复跑。
- v564 定点门：缺少投影操作的红灯 → 隔离夹具沿用旧 contextRef（修为用新创建操作返回值）→ 发现跨军表 runtimeHash 本来不同 → 按常驻授权一次补验后通过。
- runtimeHash 包含军表动作构成，不能用相等检查禁止比较不同军表。现在比较相同规则版本、任务合同、冻结 Builder 数据、地图及回合；两侧原身份仍各自保存。
- 同一原生场景11支单位：10支坐标完全保留（包括4支敌方）；Marauder 2→4模型按显式 `repack_at_reference_anchor` 在原锚点重排。未声明处理政策时一次返回真实差异，不自行补选择。
- 完整11支静态几何通过，原表真实火力查询得到16条攻击估计、0条失败；不再把先前“原表0条”伪称16条。
- 冷恢复重建同一精确状态，不重做模型调用；两个源突变均为0，原 workflow 文件未写入。

命令：`node scripts/verify-slice272-scene-projection-v564.mjs build/slice272-candidate-model-v547-4qsGxP build/slice272-scene-projection-v564-result.json`。该门已通过，不重跑。

实际原件：[投影及火力回执](../build/slice272-scene-projection-v564-result.json)。

## 已取得的局部数值，不是全局结论

| 条件：Marauder / Quad K12 | 原表4模型 | 备选2模型 |
|---|---:|---:|
| 对 Queen：贡献模型 | 4 | 2 |
| 对 Queen：期望伤害 | 9.2222 | 5.9495 |
| 对 Queen：期望伤亡 | 0.5278 | 0.0404 |
| 对 Corpser：期望伤害 | 7.1667 | 4.8283 |
| 对 Corpser：期望伤亡 | 1.5278 | 0.9444 |

必须保留的区别：新原表用36个确定性分层样本，旧备选用198个；不能把差值称为精确理论概率。变化的Marauder重新排布，非每个模型完全相同位置。对Kerrigan实际贡献为2对1，也不是全队都在射程内。不同目标/武器是备选，不可直接把16条相加当一次攻击。

备选1790分还减少Medic、增加Marine、改变升级且有210分未使用；本场景没有衡量所有这些变化。`sceneProjection` 明确列出未参加单位、重排单位和条件，不能由此宣布原表/备选全局更强、Medic支援已测、能合法到达或最终Plan可发布。

## 下一交付

用新产品的实验解释→独立来源审核处理这两份实际证据，获得有条件、可核对的取舍理由；再进入P4总体采纳及Plan联动、P5完整准出、P6实际生产和中文逐步报告。完整 Plan 0/6、对局0/12；T27 5/6，T23 33/36，剩4片。

## v565：真实解释与自动来源复核已经执行

独立新能力证明目录：`build/slice272-projection-owner-v565-inlKbk`。同产品 `openDecisionWorkflow`、现有安全 Flash Provider；无旧失败续跑、无回复手改、无正式对局。

| 步骤 | 角色与实际行为 | 实际输入/输出 |
|---|---|---|
| 1 | 实验负责人选择读配对原件，而不是重新计算火力 | [完整脱敏prompt](../build/slice272-projection-owner-v565-inlKbk/1.request.json) / [公开回复](../build/slice272-projection-owner-v565-inlKbk/1.reply.json) |
| 2 | 读到实际数值后形成局部代价与条件取舍结论 | [prompt](../build/slice272-projection-owner-v565-inlKbk/2.request.json) / [回复](../build/slice272-projection-owner-v565-inlKbk/2.reply.json) |
| 3 | 独立核对质疑概率字段依据，回交同一问题 | [prompt](../build/slice272-projection-owner-v565-inlKbk/3.request.json) / [回复](../build/slice272-projection-owner-v565-inlKbk/3.reply.json) |
| 4 | 负责人自动补读 outcomes / uncertainty，无Host手补 | [prompt](../build/slice272-projection-owner-v565-inlKbk/4.request.json) / [回复](../build/slice272-projection-owner-v565-inlKbk/4.reply.json) |
| 5 | 自动提交有精确概率字段、样本区间和边界的修订 | [prompt](../build/slice272-projection-owner-v565-inlKbk/5.request.json) / [回复](../build/slice272-projection-owner-v565-inlKbk/5.reply.json) |
| 6 | 独立核对者按需读取原件 | [prompt](../build/slice272-projection-owner-v565-inlKbk/6.request.json) / [回复](../build/slice272-projection-owner-v565-inlKbk/6.reply.json) |
| 7 | 来源一致性与本题覆盖均通过；无必要未解项 | [prompt](../build/slice272-projection-owner-v565-inlKbk/7.request.json) / [回复](../build/slice272-projection-owner-v565-inlKbk/7.reply.json) |

[产品结论](../build/slice272-projection-owner-v565-inlKbk/result.json)：`answered / acceptedForStrategy:true / sourceReviewRound:1`，仅适用于本题局部证据，不是完整Plan发布。

可用的公开取舍：若Marauder承担Queen/Corpser定点清除，缩小模型规模的局部代价有量化依据；若只承担次要骚扰，可权衡该代价。原表是否应保留第三Medic仍不能从此推断。实际下一P4必须自主决定保留/修改，并同步Plan。

### 不能包装成完美表现的事项

- 步骤3把“索引未内嵌概率子对象”当成缺证据，而概率原件实际存在。随后自动补读澄清，证明恢复闭环可用；这不是发现新战略问题，也不是应计为模型原创纠错收益的事实错误。
- 步骤5一句把投影方向写成4→2；实际Native投影是参照2→目标4，表格的4对2比较方向和数值正确。此措辞差异保留原文，列为Medium；不得把整段文字未经区分移入最终Plan。P4按原生投影与计量证据理解，不手改旧回复。
- 两套runtimeHash不同来自军表构成不同，不是规则版本不一致；对应版本合同和各自身份均保存。
- 7次请求共435,570 Token，冻结计价估USD0.055156680；两能力Run已知合计8,140,466 Token / USD0.954567336。项目已知累计107,002,036 Token，旧未知费用保留。以上估算不是服务商账单。

下一实际动作已启动v566：同一新Run把通过的事实解释交给总体决策角色，准备第一次军表/Plan原子提交；这不是旧159的恢复，不重置账目。仍无最终Plan、未启动对局。
