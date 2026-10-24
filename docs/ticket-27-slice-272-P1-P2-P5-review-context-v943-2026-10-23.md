# P1/P2/P5：最终审核与作者使用同一份当前 Plan 上下文

## 结论与范围

T27/S272；T27 5/6，T23 33/36，余 S272/S248/S249/S250 四片。正式 Plan 0/6，新对局 0/12。A 未启动。

v941 获授权的一次作者修订与终审已经成功关闭局部 Goliath 比较：原阈值假理由已纠正，旧四次审核和费用保留，未重算实验。它不是全 Plan 通过。本报告处理随后六域审核暴露的**当前声明和历史关闭结论漏交付**问题；不重开已关闭比较、不把用途润色算战术改善。

工程修复已完成，具体 bug RED → 一次 GREEN 三项。原 B 同产品续行后实际 r17 → r18，作者修改八项组件用途，军表仍为合法 2000 矿/145 气。部署、路线、行动顺序未改，不能称策略提升；整体尚未收敛。

## 真实六域审核：不要混淆误报与真缺口

原件目录：`build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/artifacts/`。表中均为产品结果，原始回复链接保存在结果内。

| r17 审核域 | 实际结论 | 尚需处理／错误边界 | resultRef |
|---|---|---|---|
| 组件用途 | requires_revision | 重复单位和四张卡的理由泛化，应回作者，不应自动开展新实验 | `450e3dc62bf7812bff41ddfc5a2e5b037120ae3b475089a79b9246e68372c86b` |
| 计分时序 | supported | 已区分条件目标与实际未来得分，不重审这个已支持结论 | `f5003b40fb355b6c64f6942ee26d383b8d66cc32ced1cb4121deabd1b0753e82` |
| 地图／到达 | needs_evidence | 已有 bounded route 不等于实际进场／占点回执；不能自动扩为全军整局模拟 | `542cf75a7ab080c342df76df30052f35e3f841c3cd160f5334dc742147395eb0` |
| 火力／损失 | conditional | 单次攻击估计有来源，人口损失上限不等于移动、武器、占点影响均已证明 | `2c8ee00689debc875e8c3e3353ecde33beceeda9a1fbf4b5c89fcced09b68d70` |
| 对手／反制 | conditional | 自方应对缺具体单位、代价和时机，应交作者选择 | `dd0fbc3f74d7fec4d23c00c84230023a4bdadeeac66609c37250a3b407cd783a` |
| 计划延续 | requires_revision | 32 条继承问题中混有真缺口和漏交付导致的误报，不能全放行或全重做 | `decd86ba6553704b72f02c9550c74c84763b7679581f0df0d61d848e8e7505db` |

### 此次具体工程错误

延续审核承担所有章节的历史问题，但输入只含部分章节及旧摘要，因此错误声称 scoreRoute/lossResourceBudget 未声明；也没有收到已审核关闭的可选比较原件，继续把已放弃的额外测量当欠账。

- 当前 scoreRoute 已声明 r2/r3/r4/r5 累计目标 2/5/9/13，**目标不是观测结果**。
- 当前 lossResourceBudget 已声明前两轮 Supply 损失上限 2、后三轮 4，**存在声明不证明预算足够**。
- 当前摘要的 1980/2000、11 升级确实陈旧；Builder 为 2000/2000、12 升级。此项仍须作者修订，不因补上下文取消。
- v941 比较关闭有原作者请求、19 段审核依据及关闭事件，`planApproved=false`，`nativeQueryAutomaticallyResolved=false`。应识别其已决定范围，也保留未测、重开条件和其他必需证据。
- v942 的路径导航后来已被延续审核正确解释为“地址错误不证明能力缺失”；实际到达证据仍未完成。

## 同一产品链路的修复

新增 `packages/roster-strategist/roster-workflow-review-context-v1.mjs`，经既有 `roster-workflow-evidence-lineage-v1.mjs` 共享角色输入投影接入：

1. 给完整性审核／修复负责人交付当前 revision 的 scoreRoute、lossResourceBudget、deploymentConcept 原件及来源号。仅当前绑定匹配时标为当前声明。
2. 根据真实关闭事件、作者／审核任务和原件身份，交付原作者关闭请求、独立审核 checks、范围、未验证项和重开条件。改变 Plan 后明确标记适用性待判断，旧结论不能自动成为新 Plan 的证明。
3. 保留所有旧问题和否决；Host 不删问题、不填“已解决”、不宣告策略更优。模型须对照源章节解释哪些旧问题已经有声明、哪些仍需事实或作者决策。
4. 同一路径服务当前／排队角色，没有实验专用绕行，没有规则数据更新或新 Native 实验。

## 定点单步验证

脚本：`scripts/debug-slice272-review-context-v943.mjs`。

- `build/slice272-v943-review-context-red.json`：真实 r17 assignment 中当前 scoreRoute 未交付，失败复现。
- `build/slice272-v943-review-context-green.json`：一次运行三项通过：当前原声明＋已关闭范围交付且旧问题不删；实际角色请求完整携带；错关闭身份／变更 Plan 不冒充当前有效。
- 0 Provider、0 Native、0 生产状态写。未重跑已通过门或全量测试。

## 实际续行与变化

先确认 PID47899 保存并退出，B event8616/r17、0 在途，再以同目录同产品入口续行：PID72895，`build/slice272-v943-review-context-live-1792738449381.log`。未清账、未重建、未重复消费授权。

实际顺序：

1. 组件用途和对手反制被已有分工路由识别为作者问题，分别 **0 模型／0 Native** 回交战略负责人。这部分分工已生效。
2. 组件用途作者读取当前 2000 分配置／审计和八项原用途。
3. 实际结构化修改八项 `componentPurposeEdits`，接受为 r18。结果 `d7c1eb0e99dd4996d6cc4285f8a34808b7bc525b4204a70c926e29c2ae3a9cd6`；原回复 `527e6628a4c9241c4973843d054ff95c1833b0eabf9ee7980a67744dbf0b9cdd`。
4. 涉及第二 Marauder、第二 Marine、第二／第三 Medic、Barracks Proxy、Armory、Academy、Supply Depot。作者补上所选作用和放弃选项，未改军表。
5. 作者明确未修旧摘要，也未改路线／部署／反制。因此仅证明结构化作者修订可执行；不能称这些新理由已被独立审核支持，更不能称策略提升或全流程通过。
6. 当前仍在 r18 后继处理，后续应核实际审核消费和剩余事实／作者缺口，不盲重做已关闭实验。

## 费用与性能观察

r17 六域审核＋五个修复路由：21 次调用，输入 2,369,362、输出 16,241，共 2,385,603 units；Provider 耗时合计 204.916 秒，非端到端墙钟。另 v942 导航调用 145,999 units 已单独记录；旧账不清。r18 作者调用另由产品费用账记录，不把本节部分计数当总体账单，未获得服务商实付人民币金额。

只读 CPU 样本 `build/slice272-v943-active-review-cpu-sample.txt` 看到 JSON 序列化栈与约 2.2GiB 常驻，支持存在本地复制／序列化成本，不足以断言整个长尾的比例；本次未做无关性能重构。

## Harness 边界和准出

- game：StarCraft；通道：同产品 final_review / experiment_planner / strategy_decision；无 UI／对局操作。
- 原 prompt、回复、工具证据、费用及历史否决均保留；模型理由不是规则事实或训练真值。
- 修复只补证据上下文，不注入选兵／进攻偏好，不放宽必要事实检查。
- 如果错源／历史关闭被投影成当前批准，应撤销本次投影接入；不能用清历史、手改模型理由或跳审核解决。
- 未完成：整体 Plan 的真缺口与实际收敛、正式六组 Plan 和十二场对局。不得以本次局部验证替代。
