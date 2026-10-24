# P2–P5：部署几何查询、局部写入与分类恢复 v662–665

2026-10-20，T27／S272。新 P0–P6 的施工与局部验收记录，不是最终生成报告。正式 Plan 仍0／6、对局0／12。

## 真实发现，不是从旧调查另开修补

当前 editable 工作流 `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1`、fixed 工作流 `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34` 都来自同产品HTTP生成入口，旧 Run／房间不恢复。

1. fixed r9反复称 Entry Edge 只有图片。读取同工作流冻结 Native 状态证明：`officialDeploymentGeometryBinding` 已有双方边段、坐标系、颜色、6寸影响区矩形。原地图摘要确实没把这部分数据交给查询方。
2. fixed r5有9条单位用途；r6用3条卡牌用途数组替换，9条单位用途全部丢失；r7恢复9条单位用途又把3张卡丢失。并非卡牌数据缺失，而是局部修改只能整段替换，模型没有使用安全的记录级操作。
3. editable 新格式停点三次重复相同 malformed JSON；已有反馈错误泛称“返回了Schema”，没有精确解析位置。不是容量截断的已证结论，本次样本各3670输出units。
4. fixed 追加一次后仍停在无引用的 conditional。实际原文只是在保留“未来对手编制不确定”的条件，不是未经测量的火力／规则主张；校验器把未来前提也强制要求事实来源，这一拦截本身不合理。

## v662：从同源 Native 绑定按需读取部署几何

- 新增 `map_deployment`，通过既有工作单编译器、实验室执行器、产品实验室 facade 到同一个 `createPregameMapEvidencePortV1`。不是脚本旁路，也不重新识图或写死上下边坐标。
- 返回完整冻结部署绑定及 mapBinding，保留 player／colour、坐标系、entryEdgesByPlayer、zoneRectangle 和原始来源。空 terrain accessPoints 不再被当作缺 Entry Edge。
- 精确单位部署／路线／底盘是否合法仍由 Native 查询和 Apply 决定；该只读几何不授行动／到达／策略批准。
- `verify-slice272-materialized-deployment-query-v662.mjs`：实际冻结源 RED64382 → 一次GREEN66003。同编译器／执行器逐字段返回原绑定，重复事实投影仍保留几何；Provider／Native动作／生产写0，原件不变。真实模型消费另看后续trace。

## v663：显式记录级修改，不把旧数组偷偷改为合并

新作者合同1.7.0提供 `mutation.plan.componentPurposeEdits={upsert:[完整记录],remove:[显式身份]}`，配合 `componentPurposes:null`。身份为 componentKind＋recordKey＋instanceId。

- 只有模型明确选择此操作时，Host更新指定记录、按指定身份删除，其余逐值保留。Host不补用途、选单位或写战略。
- 旧 `componentPurposes:[…]` 仍表示整个集合替换；同时选择两种模式拒绝并说明。新字段在旧输入中缺失时，仅按nullable no-op投影为null，不改旧回复或旧数组含义；旧精确重试仍保留其原Schema。
- 变更记录及受影响复审仍归 componentPurposes，不把临时操作字段写入正式Plan。
- 实验合同2.2.0是部署查询操作的增量；旧格式仍可读。不放宽全局Schema注册器。
- `verify-slice272-purpose-record-edits-v663.mjs`：实际旧数组覆盖问题RED68456。首次GREEN因注册器仅支持二分nullable而拒绝数组/对象联合类型；改为独立nullable操作字段，最终一次GREEN70896。真实r5数据上保留9单位用途、添加3卡＝12，军表／预算不变，旧数组替换仍3；作者Schema接受。Provider／Native／生产写0，模型真实选择新操作仍待。

## v664：真实可操作反馈，以及有界新请求

- 语法失败反馈附真实 JSON.parse 消息、UTF-16位置、附近最多240字符和完整原失败文本；不再错误声称它必定是Schema定义。
- 来源审核明确可读来源则先read，真的缺来源则needs_evidence＋具体necessary_fact交事实角色；不能编引用，也不能把条件措辞当已证测量。
- feedbackVersion=2。正常产品只为仍使用旧反馈的这两类停点，经原 `resumeRoleCorrection` 给一次追加无效结果额度；原失败／读取／费用保留。已收到v2反馈的请求不能再次取得同修复额度，同work＋版本持久去重。新模型纠错请求会计费，不冒称原回复零调用重验。
- `verify-slice272-local-feedback-recovery-v664.mjs` 实际请求 RED72689 → 一次GREEN73876：捕获两类真实新输入、范围明确、不改原回复，Provider／Native／生产写0。

### 已实际生效和未解决

两路正常产品74127／74128都实际排入了类型化受控恢复。editable 新回复自行修正语法并真正提交 r4→r5，仍8单位／1610矿；保留390短差与必要未知，不是满分或最终产物。其用途为11条，使用旧数组而非新record edits，不能据此声称模型已采用新接口。

fixed 的新回复仍为 conditional／空引用，公开理由准确指出它审核的是纯未来对手条件。这里继续要求“改成有来源”是在修错误方向，应修校验器，而不是再买相同纠错。

## v665：纯未来条件不是已发生的事实

- 仅对 verdict=conditional、conditions非空、dataQuestions非空且全部明确future_condition的审查，不再硬要“已发生”的来源编号。
- supported主张、必要事实、混合事实／未来问题或无前提的判断不走此例外。它只表示保留条件，不是证明未来会发生，也不批准Plan；当前敌方已知信息、实际规则／部署／支付／火力主张仍须独立审核。
- 正常产品原回复重验增加 `typed_future_premise_review`。复用原付费 `07a832f5…`、保留所有问题与费用，不重买一个未来结果。
- `verify-slice272-pure-future-review-v665.mjs`：真实误拦RED76276 → 一次GREEN76844，原角色保留conditional与future_condition；supported／necessary_fact／无前提三个变体均不获此恢复。Provider／Native／生产写0，旧通过门未重跑。

## 本次边界与下一步

所有本次门都是对应实际失败的定点验证，不是全量或最终策略证明。没有手改军表／Plan使其通过，没有安装、刷新源、删除或提交。

下一实际验收：同两工作流载v665，确认原付费未来条件通过重验、新部署几何被实际读取、局部用途修改不再覆盖、editable满2000并联动Plan；随后完成必要事实与独立审核。六能力中的策略比较仍未证明，不把查询成功、Plan版本或文本长度当收益。正式发布／对战桥及中文完整prompt逐步报告仍是P6交付，不以ready_for_release代正式验收。

整体：T27 5／6，T23 33／36，剩余 S272／S248／S249／S250 共4片；正式0／6、游戏0／12。

## v665真实采用：局部写入和部署查询不再只是门禁

两原74127／74128都保存退出并确认精确进程不存在后，79751／79752载同版继续。

- fixed的原 `07a832f5…` 已经由正常产品以 `typed_future_premise_review` 复用，没有重买未来事实。
- fixed真正提交 r9→r10：作者结果 `02391d2f…` 明确使用 `componentPurposeEdits`，upsert三张卡、remove为空、componentPurposes=null；9条单位用途保持、总数12。不是Host自动合并旧数组。卡用途目前主要论证槽位，尚不能当成完整卡牌策略或战略收益。
- 模型随后通过 `product:complete:r9:…:followup:r10:order0:deployment-geometry` 调用 `map_deployment`，真实结果 `737c6fa6…` 为certified_deployment_geometry：player1红／top (0,36)→(54,36)，影响区y=30…36；player2蓝／bottom (0,0)→(54,0)，影响区y=0…6，均深6寸。全部来自同绑定，不是推算。单位底盘、路线和实际进场仍未据此自动批准。
- editable已r5／1610矿8单位／11用途，正在执行新的预算第3页；不是回放同一页，也未声称已满2000。

部署查询是普通事实探针，hypothesisTest=null。实际调用和据证补字段仍不替代六能力中的策略比较。

## v666：Plan-only不应重建Native上下文

真实产品每次只改Plan，也会调用 `createDraftContext` 重建整个相同军表的Native实验室，带来不必要构建成本，并替换保存私有分支的实验室对象。

- 仅当实际军表改变才重建同源authority，仍在联合提交之前完成；此路径原有逻辑不变。
- 仅改Plan时，army／rules／map／source不变，只更新Plan绑定，保留实验室和工具对象。Plan文本不改变游戏事实；不是跳过新的军表／规则／地图验证。
- 为真实Run接缝加入可注入store（生产默认仍文件Adapter），避免测试复制完整工作区。
- `verify-slice272-plan-only-native-context-v666.mjs` 使用实际fixed r8→r9修改，在真实Run提交后立即注入停止：RED82849看到1次重建 → 一次GREEN83676看到0次，Plan结果与原真实提交逐字段相同，army／rules／map／source完全相同；Provider／Native／生产写0。夹具的分支Map对象保留不等于已执行真实Native后继，实际延时和分支复用仍须后续trace证明。

两路79751／79752均已请求在当前操作后保存；79752已终态，因此fixed由85447载v666同原工作流继续。editable79751仍完成先前授权的预算查询，不再新开该组writer；其查询算法/输入未因v666改变，保存退出后再载同版。不是同时写同一工作流，也不重放预算页或模型请求。

已观察到Plan-only重复计算以外的一个性能待办：discovery:r4:budget与discovery:r5:budget具有完全相同army／rules／map／source和args={}，仍各算一遍。当前仅记录，不把后续不同offset的真实预算新页误当重复；尚未改此项。
