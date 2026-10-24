# T27 / S272：独立事实调查 v199

## 当前结论

事实调查的上下文隔离和显式续查入口已实现，具体历史输入回归已通过；**真实模型效果尚未验证，A/B Teach 仍未通过，四组对局仍停止。** 不把离线门通过当作未解问题已经解决。

A 仍是固定军表写 Plan：2000 矿、115 瓦斯是既有军表的成本，不是新采购任务。A Plan9、B Plan19 均未修改。B 才允许从头选表及修改军表。两组的技能支付、地图、时序等事实要求相同；不将 B 的采购最优性要求强加给 A。

T27 5/6；T23 33/36；主线剩余 248、272、249、250 四个 Slice；完整对局验收 0/12。原长任务的地图、军表/计划和完整对局范围不变。

## 为什么修改

v198 已经终态，不是断网或容量拒绝：

- A 创建的是含凯瑞甘的场景，没有 Worm 生成回执；后续文字却称它为 Worm 场景。
- B 收到完整工具目录仍不查询支付，把源场景没有动作误当成工具全局不存在。
- 旧调查输入反复带入之前的战略汇总及“工具不可用”结论。实际 B 输入已复现这种重复；**它是否是模型错误的决定性原因，仍需真实试验，不能仅凭输入回归下因果结论。**

v198 的源修复后追加次数已用完，不再改变目录版本来获取重试次数。本次改的是角色与证据输入边界，不再重复原提示词付费循环。

## 改动清单

| 文件 | 本次交付 |
| --- | --- |
| `packages/roster-strategist/roster-teach-fact-probe-v1.mjs`（新增） | 独立事实角色；原始事实、当前问题、当前工具目录与历史模型结论分开；显式一次性试验状态入口 |
| `packages/roster-strategist/roster-teach-framework-v1.mjs` | 调查调用使用事实角色投影并记录 promptPack；原付费中断回复仍保留其精确旧上下文；当前结构化纠错反馈不丢失 |
| `packages/roster-strategist/roster-teach-capability-guide-v1.mjs` | 查询窗口识别事实调查续查；目录保持 v2，不用升版重置次数 |
| `packages/roster-strategist/roster-teach-query-recovery-v1.mjs` | 后续自动纠错继承同一未解问题范围，不重新打开无关旧失败 |
| `packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs` | 现有 Teach 接口支持显式 `startFactProbeForQuestionIds`；必须是同 Plan 的已完成调查 |
| `scripts/run-slice272-current-plan-teach-v149.mjs` | 现有启动器增加 `--fact-probe`；一次提交，沿用原工作台、模型调度、费用账本和观察方式 |
| `scripts/verify-slice272-fact-probe-isolation-v199.mjs`（新增） | 仅复现 B 实际历史结论被再次作为当前输入的问题，以及隔离后证据可取回的合同 |

事实角色不改军表、Plan、规则或正式房间。它可选择条件场景并查询原生执行结果；阶段、行动方、单位、支付、位置等仍由模型依据规则选择，Host 不手填答案。

旧完整 Plan、Teach 框架、历史输入和原始回执全部留存，能通过已有 `retained_evidence` 查询。当前输入保留全部其他冻结规则/Skill/地图/任务材料、当前工具上下文和所选问题的原始查询回执，不用关键词截断规则。旧模型结论不再直接当作当前工具事实。

## 已完成的定点验证

证据目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。

1. `common-v199-fact-probe-isolation-red.private.json`：实际 B 旧输入重复带入“工具能力缺失”结论，具体复现失败。
2. 首次修复后验证因**测试夹具**错误超时：已有归档读取器对大对象返回子项索引，测试把索引与完整历史比较，断言生成巨大差异。已确认并停止仅该验证进程 63915，未停止房间或 Host。无完成报告，不计为通过。
3. 夹具改为完整归档 hash 对照、经真实读取器读精确叶节点，避免巨大差异输出。`common-v199-fact-probe-isolation-final.private.json` 唯一最终 GREEN：旧结论不再直接注入；7 份原始回执保留；历史可取回；输入不变；当前纠错反馈保留。0 Provider 调用、0 Native 查询、0 草稿写入。
4. 六个相关生产/入口文件各做一次语法检查，均通过，没有跑全量构建或重跑旧绿。
5. 对实际 B 状态的内存副本做一次入口预检：窗口从历史第 10 批后开始，最多到第 13 批；历史轮次、证据、结论、调用账本不变；重复开启同一试验被拒绝。0 Provider、0 草稿写入。该预检为工具输出，没有另存成文件。

离线投影示例为 364784 字符；这只是该测试输入的结果，**不是实际 Provider token 数或性能改善证明**。上述 GREEN 后还完成了只读角色权限边界和显式入口接线，并作了上述语法/入口预检；未再重跑已经通过的投影门。

## 真实试验边界与恢复

已询问用户是否允许 B 的 Orders 支付问题进行一次独立事实调查；截至本记录尚未收到选择。**没有启动 v200，也没有新增模型费。** A 不另开试验，四组对局不启动。

收到该项明确选择允许后，只运行一次现有入口：

```text
node scripts/run-slice272-current-plan-teach-v149.mjs <baseline-directory> B \
  <baseline-directory>/common-v198-B-teach-dependency-resume-progress.private.json \
  --fact-probe --run-version=200 \
  --query-ids=q-timing-synergy-enabling-order
```

`<baseline-directory>` 是本工作树下的 `build/ticket-23-three-arm-performance-baseline-20261010-v1`。新观察文件预期为 `common-v200-B-teach-fact-probe-progress.private.json`；启动前先确认是否已经存在真实运行，不能因观察中断重复提交。

最多 3 个工具往返批次，并非承诺最多 3 次 Provider 请求：原有结构化纠错与最终汇总可能另有调用，继续逐笔记录。保留旧账、失败和原 Plan，不自动标为已答或套入正式 Plan。若不收敛按既定规则停止，不再次升版本换重试次数。

验收需要实际条件场景中的正确阶段/行动方、原生 Orders 域、支付及后继状态证据；工具目录存在、几何读取成功或文字声称已执行都不能替代。模型的策略取舍仍在后续战略评审中处理，不由事实角色指定赢家。

v198 账本基线：A 165 calls / 29776463 units；B 251 calls / 34577698 units。v199 新增 0 calls / 0 units。旧 v198 合计新增费用估算 US$0.296303928，非账单；不将离线 Teach 耗时当成对局单动作性能。

## 剩余交付物

1. B 独立事实调查的真实查询/原生回执及明确结论；A 的资产生成问题继续独立保留。
2. 证据齐全后的 A/B 最终 Plan 与审核记录；A 不改表，B 保持原授权。
3. 受影响的计划生成、实战查询、计划修订消费链路一致性记录；不重复跑无关门禁。
4. 四组同代码恢复、完成对照对局并保留截图和分账；再进入复盘。

地图与正式房间验收仍按原计划推进；历史已通过的九张官方选定预设及两张优先经典图，不能冒充所有任务/规模及剩余十八张经典图验收。

## Harness 与审计

`harnessLoopUsed:true`；game=`starcraft-tmg`；prompt route=`roster_teach_fact_probe_v1`，原纠错/汇总继续使用现有链路；本轮实际调用工具为本地投影、保留证据读取及入口预检，无新 Native 动作或 UI 操作。公开查询目的、参数、回执是决策证据，不声称包含隐藏思维链。

历史失败供后续 WikiSkill/EvoTest 检查，`trainingTruth:false`；本轮未新增 accepted Skill。真实事实证据不足时保持未解，不强行修辞过门。无子代理、安装、删除、官方数据刷新、Git 提交或推送。
