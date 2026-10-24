# P3 v644：显式支援策略的原生期望查询

2026-10-20，T27／S272。只记录本项实际准出，不代替最终军表／Plan生产报告。

## 来源失败与修复

在v643同源合法Queen／Marine／Medic场景，通过产品实际`lab.queryProbability → scene query service → room-backed Rules adapter → probability batch`提交Life Support选择。具体bug门`verify-slice272-probability-reaction-policy-v644.mjs`首次执行PID62790：返回ok、期望伤亡1.611，但`damageReactionPolicy=null`，请求的策略被静默丢弃，断言失败。原始日志保留在`build/slice272-probability-reaction-policy-v644-red.log`。

修复共用工具，不建立写表专用战斗计算：

1. 模型可明确提交双方`damageReactionChoices`，每方选择pass或来源／定义／支付组合，来源取自原生反应机会目录。Host不替模型选最优反应。
2. 查询与真实Apply共用开窗、优先权、能力支付／效果、总伤害减免及伤亡域；正伤害才触发支付，无伤害样本不耗CP。
3. 采样种子不包含策略选择，输出`outcomeSampleHash`可证明两支用了相同原始骰子。相同伤害的局部支付／效果可复用，不跨场景／请求缓存；源状态不改。
4. 输出期望伤亡、Supply分布、期望资源支付、卡牌耗尽概率，以及原生效果案例。已有标记的减免与新增伤害分开保留总伤害池；不添加策略加减分。
5. 实验室、在线Rules adapter和原生工具说明共用接线；传了策略但结果没有匹配策略时，传输层拒绝，不再回退为基础分布。非法来源／支付是明确unknown，不是假零收益。
6. 当前选定策略只覆盖`damage_received`，明确标注其他可选反应阶段仍排除。没有扩称全部反应或全局最优。

## 修后一次GREEN

PID65272，同门修后只运行一次；进程已终止，日志末尾`status:passed`。未重跑v643及任何旧通过门。原日志：`build/slice272-probability-reaction-policy-v644-green.log`。

固定同场景、同武器、同参数、36组相同原始骰子：

| 查询结果 | 双方pass | 选择Life Support |
|---|---:|---:|
| 平均新增伤害 | 3.2222 | 1.0000 |
| 平均移除Marine模型 | 1.6111 | 0.2222 |
| 期望剩余Supply | 0.8056 | 1.0000 |
| 期望CP支付 | 0 | 0.8333 |

6/36样本无伤害，无支援支付；30/36触发1CP反应。另一次非法来源查询返回`unknown / ATTACK_PROBABILITY_DAMAGE_REACTION_CHOICE_NOT_IN_CURRENT_OPPORTUNITIES`。查询后卡牌和单位逐值不变；冻结输入不变。Provider0、真实房间写入0。

这是有明确控制条件的局部能力与收益反例。36个样本不是整场胜率，单支Medic在此场景的收益不能证明购买三支最优，也不能把CP收益与存活模型直接相减。总体角色仍需比较具体军表替代、覆盖／时序和机会成本，并通过受影响复审。

## 下一实际产品任务

新增薄客户端`run-slice272-product-generation-v645.mjs`，只调用Web/App同一HTTP路由`POST /roster-planning/v1/workflows → /{id}/run → GET`，不自己编排Teach，不注入上述Medic结论，不复制旧Plan。已启动两种新上下文：editable从空表生成；fixed只复制旧合法2000军表、从空Plan开始。它们使用同一P0–P6产品journey；旧r8仍只读、旧真实房间不动。

模型主动使用新查询、实验驱动取舍、两种流程最终准出及中文逐步完整报告，均待实际生产证据。最终Plan0/6、对局0/12；T27 5/6、T23 33/36、相关余4片。

## v645实际产品推进：两路均已提交首版，不是停留在模型回复

- editable：PID67533，目录`build/slice272-product-generation-v645-M86Cg9`，workflow `decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1`。真实`draft_committed`从r0空表／空Plan到r1：5支单位、960矿／120气，军表和Plan同时提交。960是初步草案，不是最终满分；必要的预算／任务／部署调查已经自动进入事实角色。提交回执artifact `e62604969870cbced4814cc1e20766c4f4e1706d5b6989a0bab7e589fb87f2a1`。
- fixed：PID67534，目录`build/slice272-product-generation-v645-I7zekC`，workflow `decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34`。真实r0→r1提交：军表hash保持`29d12ca7…`、2000矿／120气，Plan从null新建。未复制旧Plan。提交回执artifact `71dcd83ce97be645ed15f83f8d43d78d95071812bcda3f6b1f37d081d23d16ba`。已实际执行map_summary并进入来源审核；任务计分原件仍在查证，未把当前必要未知放成最终通过。
- 两路实际模型回执均为`deepseek-flash`。最近一次按各自trace观察，editable7条回复259,863Tokens，fixed20条回复1,274,171Tokens；这是当时截点，新请求仍在进行，费用尚未汇总，旧账未重置。
- 两个精确PID在观察时均存活。保持原任务运行，下一轮检查同一PID／trace，不因观察边界重新创建。尚未观察到新概率策略被模型主动消费，也未完成后续Teach／最终发布；最终数字不变。
