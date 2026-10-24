# T27 / S272 / P2–P5：实际测量参与者与审核来源修复 v848

## 真实失败，不把模型判定当事实

v847续行中，方法作者收到两组原值和差值，仍错误声称有／无Ares的两枪数值相同。独立来源核对 claim3 又将这句话判为 supported：`e7cd3b668d4182a18eadadd63d3df868bc83fe2414992d4cf1eea2287609ed33`。父审核未完成，原 Plan 未发布。其他审核提出了场景哈希不同等理由；这些也只是待核对的模型解释，不能直接当规则事实。

错误审核的真实请求是 `4ecacde0749d2c8ddf60886baa02a391ec05cb1bb83e8f25998c14f588e7236a`，回复 `349b7e0a69c41b5c89ff67afbf2f870d53f717d44619ae48e04879313d7d6066`。请求807895字符，却没有有Ares的Underbelly 1.7778原值和双组行差。这与方法作者的请求不同：不能把“作者已收到”推断成“审核也收到”。

## 根因与统一修正

1. **请求过滤器不等于实际测量对象。** 共享配置模块要求 request.subjectUnitIds 非空；该字段本来可选，真实请求省略它后，成功的有Ares测量被整个跳过，连带丢失配置对照、场景关系和逐武器差值。现从 Native attackEstimates／probability estimate 的实际攻击者和目标取参与者，单独保留 requestedFilters。空／坏原生行不推断为零，不根据模型标签或请求补猜。
2. **实验句柄不等于原生世界内容。** 此次新候选与原参考具有完全相同的原生 sourceStateHash/stateHash，但 contextRef不同，旧关联拒绝连接。现在在已分配来源闭包内按精确原生状态连接，仍核对Rules/Builder、参与者和投影自身目标／父态／context一致性；不同状态不混同。仅证明几何保持，不授因果／策略批准。
3. **输入缺陷可能导致错误通过。** 旧恢复只检查失败项，会继续复用误放行结果。现在旧版本仅触发检查，必须有实际请求漏掉“该判定引用的两组测量关系”的证据才重审；支持判定也不例外。缓存排除这些有明确输入缺陷的旧判定，旧原文／费用不改，不受影响的通过结果仍可复用。

这些是所有方法、作者、Teach、审核共用的来源入口改动，不在某个角色的prompt里硬塞策略答案。

## 本次验证

- 实际RED：PID78734，证明已成功的1429测量从共享输入消失。
- 首次修后PID79831：参与者恢复，但精确句柄关联仍漏对照，失败停在差值断言；据此核出上述第二根因，不宣称通过。
- 定点修正后唯一完整GREEN：PID80819，退出0。
- 真实输入恢复两组、精确Underbelly伤亡1.7777777777777777／1.4722222222222223与差0.30555555555555536；同几何关系可追溯，causalBenefitProven仍false。
- 7种内存注入：误导请求过滤器、缺攻击者、缺目标、空原生行、不同真实目标、错误原生source、错误原生state。错误身份不能得到比较证明。
- 产品正常重审构造／入队／冷恢复幂等通过；此次6项受影响核对重审，旧判定与operationState逐值保留，军表／Plan不变。
- 0 Provider / 0 Native Rules / 0 生产写入；v847及其他已通过门禁未重跑。此门不证明真实模型最终能纠正或Plan已准出。

日志：`build/slice272-v848-red-1792621757932.log`、`build/slice272-v848-green-1792621846137.log`、`build/slice272-v848-native-identity-1792621929095.log`。

## 修改文件

- `packages/roster-strategist/roster-measurement-configuration-v1.mjs`：实际Native参与者与请求过滤器分离。
- `packages/roster-strategist/roster-measurement-scenes-v1.mjs`：原生世界身份关联、失效参与者排除、交付版本2。
- `packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs`：按实际漏传检查受影响通过／失败判定。
- `packages/roster-strategist/roster-workflow-source-claims-v1.mjs`：有输入失效证据的旧判定不再复用，记录持久保留。
- `scripts/verify-slice272-native-measurement-participants-v848.mjs`：具体失败和异常／恢复验证。

## 运行恢复与下一交付

65149已安全退出于e9426，0在途。81385从同Run `build/slice272-product-generation-v645-lqMWaS`继续，守护81386，日志 `build/slice272-v848-native-participants-resume-1792621974454.log`。由正常同步生成定点重审，不手工改任何付费回复、工作流JSON、费用或原生结果。

下一：核实真实审核拿到完整原值／差值，按实际来源判断；如需修订，由作者在现有职责链纠正，再回战略取舍。不要重复构造同一实验，不因审核通过就宣布策略提升。

T27 5/6、T23 33/36；剩余S272/S248/S249/S250四片。正式r4仍2000矿／170气，最终Plan0/6，对局0/12。尚未完成全产品稳定性验收。

## 真实采用：e9427–9506（同81385）

正常同步于e9427保留并替换未执行的旧父审核，e9428仅入队本结论6项重审；没有新建Run或重放Native。首个真实请求 `28a9238a7de49da9fbe85670ae8abd7c630178447b5343ce5fd10f4853ad0821` 已实际含：

- 两组测量1410/1429均有Native参与者、resolved配置。
- 同几何来源关系，以及逐武器伤亡原值／差值：Autocannon 1.6388889对1.0555556（差0.5833333）；Underbelly 1.7777778对1.4722222（差0.3055556）；两种导弹差0。
- 只证明描述性差值，不将场景投影自动升级为因果／战略批准。

6项真实判定已完成：1/2/5 supported，0/3/4 requires_revision。claim3从旧错误supported变为正确requires_revision；其最终结果 `e845757d827d139691e040067a7e460abd937146ac381faad45209d098795d9b` 明确指出两枪数值不同、原件已回答、不需要新增测量，只需作者改正文字。这是实际语义改进证据，不仅是字段存在测试。0/4仍质疑因果措辞；不据此再次更换代码或伪造证明，等待既有父审核／作者处理。e9506父审核正在执行，尚未策略取舍或Plan发布。

claim3相同原断言／同Native来源的自然前后对比：旧2次调用114667units、Provider6895ms，误放行；新3次101385units、Provider12888ms，正确拒绝。Tokens约少11.6%，但多一次原件读取确认，Provider累计耗时增加约86.9%；不能宣称整体提速或策略无损。新15次审核调用合计640989units/74090ms，截至e9506，含claim3的三次，不重复相加；旧账保留。

新claim3请求／回复：

1. `316b6c01cc17ef031d04220deb82a20aace0c2e538c0830c94f97d56a7160c24` → `9e6e8d24d23e283723e13fd2e93704f53b147f23f40e2f3d068e56f5044613c8`
2. `6ba2e268b7eb46bf34ff7e52bef4938b6cda467eac1883edb8d4042f2de71b43` → `c4cae863f535fcf08a51f7f998a5b3d01806275e656a4e2985f28222697e2535`
3. `a5c5899b9576f7a1e7f6a668a5ff5243baa20237c0cdd29be573a942c5c4e05f` → `2ce93213feb0149fae9c45b0093df343659711ef8c3950433cfa9147bb190c31`

Medium：投影同时提供1429→1429的同测量零差值，来源编号清楚，本轮未观察到它导致误读；属于可删减冗余，未因此中止当前策略链。没有增加单测／重跑已通过门禁。
