# T27/S272：实验配置、经验来源与恢复交接合同 v906

2026-10-23。T27 5/6，T23 33/36，剩余 S272/S248/S249/S250 四片。正式 Plan 0/6、对局 0/12；以下局部修复不能替代 P6 实际完整生成验收。

## 发现的具体问题

B 的真实场景原件 `178c8ab7db47177ec35f583d88f229ed042819e7e0704af0458cb88979958a81` 声明比较 large Marauder＋Kinetic Foam＋Laser Targeting Systems，但可执行参数只改位置、contextRef 为 null，实际使用根军表的 small＋Kinetic Foam。Native 按输入执行正确；模型的文字意图没有成为机器选择，旧合同未提前发现。这不是“丢失了已传入的大编制字段”，也不能靠把描述改成 small 就声称完成原实验。

## 已交付

1. `participantConfigurations`：沿用 Native 单位选择字段，声明预期本方参与配置。测量前与所选 candidate/context 精确比较；缺失、大小/升级不同、参与者遗漏、局部修复偷换原比较臂均返回结构化差异，尚未调用 Native。不解析英文 large，不替模型购买或改表。对方配置仍来自冻结实验上下文。
2. 共同合同贯穿实验 scope、comparison binding、candidate-context 读取、工具执行、旧结果复用、两个模型读取器和条件观察归档。匹配只证明选中配置一致，不证明几何、部署数量、合法性、战斗效果或策略价值。
3. B 已 retain 且无新调查时，产品调度针对这次具体旧合同给予原负责人一次重新决策。原未解问题、原回复、原审核和旧费用保留；入队和 held-goal 负责人切换在同一个 checkpoint。已有 ready/in-flight 或已通知过则不重复授予。不是脚本伪造回复，也不直接重跑测量。
4. Provider 与 Native 结构适配：新字段最初直接引用 Native 的可选字段/anyOf，真实产品导入因此退出，这是本轮新增接线遗漏。现从同一 Native 字段生成 Provider 支持的闭合/nullable 形状；null 只还原成可选字段缺省，不生成默认配置、不放宽实际匹配。

## 定点证据（每项先 RED，再一次 GREEN）

| 缺口 | 实际验证 | 证据文件（build/） |
|---|---|---|
| 文本大编制、机器小编制 | B 原请求＋真实执行器；缺配置/错大小/错升级/改变继承配置挡在 Native 前，正确配置原样执行 | `slice272-participant-configuration-v906-{red,green}.json` |
| 已保留方案无人重新决定 | B 保存状态＋真实 workflow 核心入队/冷恢复；一次、同问题、原件保留、持有者原子更新 | `slice272-configuration-owner-v906-{red,green}.json` |
| 新字段被读取器漏掉 | 源回执视图和 source-facts 两条路径逐字段一致，原件不改 | `slice272-configuration-views-v906-{red,green}.json` |
| 新 schema 不能加载产品 | 实际角色＋产品 journey 导入；nullable 对应原 Native 选择，错/缺编制仍拒绝 | `slice272-configuration-provider-v906-{red,green}.json` |

均 0 Provider、0 Native、0 生产写。第一项 Native 为显式 stub，不冒称实际规则测量；第三项为真实回执上注入明确合成元数据。v905 和其它已通过门未重跑。

## 逐边合同清单

| 边界 | 生产者 → 消费者 | 已检查的不变量 / 尚未证明 |
|---|---|---|
| 实验意图 → 配置 | experimentScope → comparison binding | 原问题和预期配置保留；局部 repair 不能改比较臂 |
| 配置 → 执行 | candidate-context → laboratory | 相同所选 candidate；先核对再查缓存/Native；不靠标题猜配置 |
| 结果 → 读取 | tool receipt → receipt view / source facts | 新检查字段无损；明确它不是 Native 伤害事实 |
| 结果 → 经验 | origin/source result → conditional observation | 声明与实际分开、原件可读、unreviewed，不能自动晋升 |
| 暂停 → 恢复 | retained owner → product journey/core | 同问题一次通知、原子更新 owner，旧问题/回复/费用不变 |
| 模型输出 → Native 选择 | Provider nullable → Native omitted optional | 仅表达形式转换，不能引入军表默认值 |
| 观察 → 有效假设 | 原生结果＋独立来源/适用性审核 → 条件结论 | **仍待：不能用已归档98条观察代替有效经验准出** |
| 有效假设 → 对局检索 | 条件结论＋版本/场景匹配 → advisory Skill | **仍待跨运行消费与离线评估，不修改规则或真战史** |

这不是全项目所有工具均正确的声明。已存工作图的身份/状态检查与本次语义检查互补，不能互相替代。

## 实际续行

修改前 A58212/B41583 均 exit0，A5640/B5262，0 running/pending。第一次 A83153/B83160 因 schema 导入错误 exit1，事件未前进、未发送模型请求。修正并通过产品导入门后，同原目录 A85751/B85758 续行；REPL `activeRuns1294`：

- A：`build/slice272-product-generation-v645-hsxEYu`，日志 `build/slice272-v906-provider-adapted-fixed-1792697078167.log`。
- B：`build/slice272-product-generation-v645-8aBuEV`，日志 `build/slice272-v906-provider-adapted-editable-1792697078169.log`。

实际模型是否能改正实验并推进策略尚待观察。A r3/B r5、原军表/费用/规则保持；不新建房间、不刷新官方数据、不重发已成功请求、不提交、不删除、不创建代理。

### 实际消费补记

- A 的真实模型先补齐新增字段，再按原错误修正 stateRef 的空间请求层级。随后收到配置缺失反馈后，自行明确 Goliath small＋两项升级、Marauder large＋三项升级；事件5680的原生空间结果 `4fde5f1853906e760ab75f057e4fb805a62e8ac50ddf4915545ddfe67d6ec5a2` 已 completed，预期/实际配置 matched。没有人工改回复。对应条件观察 `6a6a17444a5fc358ddaf6bd942a7260ae87b648bac7392ad7e9684f3d0039bbd` 已保存同一检查，仍 unreviewed/advisorySkillEligible:false。后续进入队形选择，不代表生存比较或全链成功。
- B 在事件5263真实执行一次 configuration_contract_returned_to_author，最终答复 `84678ea6322031ab97247b16125435beff766517ad3bff1683e6a9948764e585` 仍 retain、nextInvestigation:null，4个未解项仍保留。模型承认新方法可用但认为进一步实验不值得，不能把此作者选择当实验成立。B5304正常退出、NO_READY_WORK、未发布；不盲重启相同决策。下一须分析原问题/必要事实与战略负责人交接，而非清空未知。
- 实际摘要：`build/slice272-v906-live-configuration-observation.json`、`build/slice272-v906-live-configuration-archive-observation.json`。A最新观察5693仍继续；B已停止。正式数量不变。
- 观察用持久 Node REPL 因累计持有多份旧工作图达4GiB而退出；这不是产品任务异常。重开后确认 A85751 仍在运行、B早已正常退出，没有重复启动。后续只读有界摘要，不持久保存全图；旧REPL activeRuns1294句柄已失效，新REPL `runs`只保留路径/PID。

## 改动文件摘要

生产：新增 participant-configuration / configuration-reconsideration；调整 experiment-scope、comparison-observation、candidate-context、laboratory、conditional-experience、receipt-view、source-facts、workflow核心、workspace-run、product-journey。验证：四个针对上述具体失败的 debug 脚本。文档：本报告、CURRENT_WORK、根 TASKS/PROJECT_MEMORY。保留全部其它历史改动，不提交。

## 经验的最终保存口径

有效经验须保存：明确场景条件、双方具体配置、实际状态/位置来源、被比较选项、预设判断指标、实测值与不确定性、支持/反驳/证据不足结论、适用边界、反例/失效条件、审核与版本依赖。当前已实现的是可查询的条件观察层；未完成的结论审核与对局 Skill 检索继续列入 P1/P3/P6，而不把未知结论填成成功。
