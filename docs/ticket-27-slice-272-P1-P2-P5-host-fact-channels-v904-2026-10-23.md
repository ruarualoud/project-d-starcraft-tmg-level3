# T27/S272 · P1/P2/P5：接口说明、配置事实和原生结果分型

## 实际停点

v903同版续行后，B事件5222触发`ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED`。三次错误都是将来源885的`/projections/measurementConfigurations/measurements/6/...`填入`nativeFacts`。来源885实际上是`roster_host_projection_context_v1`：只保存schema/version/assessmentScope/instruction，根本没有measurements数组。模型读到其他已交付的完整配置，却选择了这份元数据的来源号。

源代码原因：`publishRosterHostProjectionContextV1`给整个measurementConfigurations附了裸`sourceContext.pointer`，却没有声明“只覆盖四个说明字段”；原生事实校验器正确拒绝，但反馈只有`native_fact_requires_current_executed_receipt`，没有说明该源实际存了什么、正确数据在哪、何种引用能证明什么。不是Native伤害计算错误，不能放宽到接受Host元数据为Native。

B按三轮规则停止；A同时优雅停下。A32633/B32640均exit0，事件5475/5222，0在途后才修改。

## 改动

1. **Host投影来源v2**只声明真实存在的字段地址、`interface_wording_only`与`nativeFactEligible:false`。单独给出原有`measurementConfigurationN`的保存配置读取句柄，完整角色输入仍保留。
2. **共享事实导航/校验**识别Host说明来源，错误携带来源类别、请求路径是否存在、可用说明地址、配置读取方式；仍不接受其Native事实声明。配置证明选了什么，计算事实证明算出了什么，不能混用。
3. **旧/新纠错一致**：旧保存错误从当前共同导航重派生反馈；模型须自行修正来源或如实保留未知，不手改原回复。
4. **有界恢复**：仅已耗尽、无pending、全部对应旧v1 Host源引用错误的局部角色允许一次作者纠正；新v2源不再续同一授权。原费用/失败保留，不重新执行成功工具，不授事实、来源或Plan批准。

## 唯一对应验证

`scripts/debug-slice272-host-fact-citation-v904.mjs`：实际B已保存请求/回复/来源，RED→一次GREEN；0Provider/Native/生产写。

- 三个错误引用继续拒绝且有分型导航。
- 当前发布器只承诺真实字段，原配置句柄给到，完整输入逐值未丢。
- 明示**合成纠正输入**：去掉错误Native元数据引用但保留普通配置引用后，原8项Native事实逐值通过；不是模型已完成纠正或整题通过。
- 旧合同一次恢复可识别，已新合同/在途请求拒绝续授权；原回复不变。

证据：`build/slice272-host-fact-citation-v904-red.json`、`...-green.json`。v903两项已过门不重跑。本次4生产文件：host-projection-context、native-fact-claims、workflow-read-role、product-journey；1个具体失败探针。

## 尚待

实际生产模型纠正/独立审核；配置与实验声明不一致仍不得冒充合格实验。条件经验有效结论索引及对局advisory检索尚未完成；v903逐边合同清单继续有效。T27 5/6、T23 33/36、余4片，正式Plan0/6、对局0/12。未提交/删除/新代理，不把本项局部证明算整链准出。
