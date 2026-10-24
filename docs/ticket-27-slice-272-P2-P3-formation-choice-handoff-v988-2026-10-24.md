# T27 / S272：求解后单动作选择交接（v988）

## 实际进展与停点

沿同B／PID3798推进，没有新房、旧动作重演或费用重置。r23军表与Plan未改，正式Plan0/6、新局0/12，T27 5/6、T23 33/36，余4片。

| 实际步骤 | 原件 | 观察与边界 |
| --- | --- | --- |
| 针对超距改方法 | 5649919c／abe19ed5 | 模型明确12630>4000，字段已正确；选择同父态/同域space.solve_formation，不再手算坐标 |
| Native求解 | f5fd70b0 | 完成，4个完整规则实例化候选，非unknown；未执行部署 |
| 汇总读取与结论 | 186e7e03、33db2ba0、768ae921 | 依次读queryReceipt与formationOptions；各次新增正文，不是已交付全文重复；最终不声称已部署、到达、计分或最优 |
| 选择角色再次编排父任务 | 9e3dd3b7 | 追加inspect-after-deploy，被CHOICE_SCOPE_EXCEEDED拒绝；声称advance/index2，但advance在原formationOptions为index3，index2是requested-left |
| 立即停止 | event12026 | 收到同类越界即SIGTERM；在途局部修复a81cfab7正常保存并移除inspect，随后停止，0在途。下一既有select-deploy-option尚未执行 |

PID3798此段9次真实模型调用884291 units，Provider54.556秒；非全流程墙钟。旧账保持累计。所有条件场景仍trainingTruth=false。

注意：未指定anchor的本次求解默认preferredAnchor=(27,18)，四个实际部署anchor均为(27,32.63)，不是目标(12,24)。可执行候选不能冒充原目标已到达；选择是否合适仍由模型负责，最终事实审核不得忽略此差异。

## 原因与修改

不是Native工具缺失。求解后repair-choice仍采用通用“输出workOrders”协议，模型能重写父任务流程；完整候选被退回分块目录，使该角色又读三轮，且容易混用Pareto列表与原候选数组编号。

P2/P3修改仅两处生产接口：

1. `roster-native-choice-sources-v1.mjs`按持久newFacts→summary→tool依赖取得原候选；沿共享所有权图支持后续纠错继承。严格核军表绑定、父stateRef、席位、domainId及Native完整候选标记，不按标题/最近时间猜测，不重求解。交付全部完整候选和原数组索引表，Host不代选。
2. `roster-native-choice-command-v1.mjs`复用既有单Native选择协议；只含formation来源时kind仅允许formation，保留完整候选正文。模型不能再添加inspect、手写参数或改变父态；需要不同anchor/目标/前置条件时返回方法负责人，不擅自扩权。最终仍走原选择解析器及Native合法性验证。

不改原回复/已排队提案，不静默删除非法步骤；历史失败只作证据。本次能力修复也不能自动让旧错误action格式获得执行许可，后续仍由原Native检验和正常纠错处理。

## 定点验证

`scripts/verify-slice272-formation-choice-handoff-v988.mjs <flow>`：RED14496复现通用工作单入口；修改后15111一次GREEN。实际产品角色请求采用单动作schema，完整原件送达，原数组index3精确绑定advance、index2是left；同一个原解析器复制完整canonicalParameters和父状态；错army拒绝，workflow/原件不变。

只追加继承门`--lineage-only`：RED15736证明下一input-repair会丢已求解来源；修共享所有权取源后15934一次GREEN，下一纠错复用原候选，换父状态拒绝，未重跑前一已通过门。

两门均0真实Provider、0Native执行、0生产写。不能将定点门称为正式Plan验收。

## 真实消费与新的停止原因

同B普通恢复PID16854：原旧提案由Native返回格式错误cd9b8b58，正常局部纠错用新单动作接口。真实回复70763ede一次明确选择原候选index3，而非Pareto位置2；90655units、Provider5458ms，无额外读取/手写坐标/附加inspect。e37be90c编译通过，b6393e46实际deploy成功、1transition、9模型、4in；父6d0595f4→30ff27f8。父任务inspect 21b5dced随后完成；汇总096aab05正确不声称已到达(12,24)、已得分或最优。

然而核对历史发现：r21/event10359的39ea9c3a已完成完全相同动作。同source adabe1f、army c7d27c、rules 2292f0、parent 6d0595f4、nativeActionInputHash 1d1e966d、canonicalParameters逐值相同、successor同30ff27f8。这次证明新选择接口可用，但没有增加实验事实，不能冒充策略推进。发现后立即安全停止；PID16854已退出、r23/event12086/0在途，48db9842仅保存读取结果00eade72，未再执行位移。

进一步确认completedNativeTransitions生产器只遍历当前goal的members，未交付旧调查同源有效动作，且一层层resolvedByWorkId别名被重复列入（9条实际仅3个转换）。v989须修这一来源筛选以及相同已完成Native动作的派发前停止；不能只继续新一轮查询。正式Plan仍0/6，新局0/12。
