# T27 / S272 — 审核修复范围与 Teach 实际差异 v70–v71

当前 T27 5/6、T23 33/36，主线余248/272/249/250四片，完整局0/12。
本记录不能作为四组已启动或新 Teach 策略效果已通过的证明。

## 本次完成

- 原句前提绑定只核验被质疑的原句；同段其他检查保留在原始回复，不再因其格式否决该原句。真正的数字矛盾与缺少来源仍拒绝。
- reconciliation policy7可在同Plan、同来源目录下复用精确保存的v6付费回复，不重新购买。旧v5多轮导入保持。
- D原v4两条3VP误报：实际保存回复RED后，唯一GREEN通过；真实工作台repair-reviewed复用完成，freshCallsUsed=0、completedCycles=0、两条得到来源支持。没有手改Plan或审核原件。
- 发现跨段修复缺口：审核理由明确提到scoreRoute.routeText和H4假设，自动修复却只传deploymentConcept.threatTradeText。真实保存v5调用捕获RED；修复器从公开声明目录解析关联路径，并把同一结构化假设的支持文字纳入范围；唯一GREEN包含路线、假设与expectedCounterTexts.1，0Provider调用、不改军表/进场安排。该补丁尚未加载到真实D服务，也未宣称真实恢复成功。

## D真实后续与尚未解决的自动恢复问题

v4真实另有2+1+2与4VP投影不一致。单段修订生成v5；一轮有界自动修复生成v6，但旧胜利路线、H4假设仍含同一错误前提。这证明单字段修复不足。

D当前v6：9b181e0c48cfdb9da43d813039c63bd760789862699278e4b1fe39f586e90671。
最后一轮停止于ROSTER_WORKSPACE_SOURCE_REVIEW_NONCONVERGENT，没有绕过High。
当前另有审核自身合同冲突：事实绑定比较确认3等于来源3，判断标签却否定；FACT_ASSESSMENT_CONFLICT已指出应为source_supported，但现流程只重问格式错误，把这类判断合同错误交给Plan修文。这是下一步应修的路由缺口，不是让模型反复改正确3VP。
既有审核历史中的跨段依赖也需保留进待修范围，避免下一轮审核漏报就遗失。
本轮D新增7calls，输入386792、输出15388，总402180units；项目历史保守3/9每百万估算¥1.298868，非服务商账单。旧账/未知费用不清零。

## A/B新旧Teach：实现差异不等于策略提升

- 新框架同样覆盖胜利路线、对手场景、机会成本、能力需求、损失后能力、地形队形、时序协同、失效重规划；A固定军表，B可返回选表。
- 查询区分近似可达、真实底盘/路径合法性、控制权与攻击估计。空场、压墙或错误阶段不能成为有效概率/占点证据。原件保留、大内容索引检索、来源绑定改进。
- A生成12个问题，包含三点驻守与两点驻守+机动火力的取舍；几何场景仍未取得有效摆位，很多问题unresolved。原Planv4/原房r129未替换。
- B生成8个问题，取得3条真实条件攻击估计；Marauder→Hydralisk期望伤害5.528、伤亡1.028，Goliath→Raptor Autocannon约4.194。它们来自去地形条件场景/36样本，不能证明当前地图上的可执行性。
- B真实接受当前Planv12，军表仍2000/175、8单位；公开接受理由仍主要讨论旧ch-1…ch-4，没有体现新增定量结果参与选表。此前v11→v12修了Raynor把进场路线长度当目标射程的来源错误，不是新框架带来的已证明策略提升。
- A/B框架产物都仍标记applicationStatus=proposed_not_applied。不能将Teach完成、模型accept或3条攻击估计误写成“新策略已落实并验证”。

## 房间与进程停点

B通过真实产品launch-room准备成功：t27-88cfa1519cff6a135d3fec10a2e781fa，PID86187；no-auto-drive，未开始动作。新房绑定当前Bv12，旧失败准备记录保留。
A/C原r129/r147保留，未启动新动作。D尚未准入，四组没有同时启动。
离线Hosts82409(B/D)/82410(A)载入v70，未载入最后跨段范围v71；下次先确认无在途请求再重载。日志位于roster-deliberation-live-v43/*workspace-host-v70-premise-scope.*。

## 下一交付物

1. 修审核错误与Plan错误的自动路由，并完整保留跨段待修声明；D用现有版本继续，不盲抽、不清历史、不改数字造通过。
2. A/B新Teach反馈是否真正进入取舍的明确处理记录；不能将未知冒充验证，也不能为了策略偏好添加硬拦截。
3. 四组同版正式动作、原A/C房间保持、后台High联停与分账记录。

## Diff与工作约束

本段实现修改：roster-review-premises-v1.mjs、roster-final-plan-review-v1.mjs、reviewed-plan-auto-repair-v1.mjs；具体bug回归脚本verify-slice272-review-premise-scope-v70.mjs；本文及状态文档。只做本次具体RED/GREEN及真实产品恢复，没有重跑通过门或全量测试。无代理/K3、安装、删除、官方数据刷新或提交。
harnessLoopUsed=true；targetGames=starcraft-tmg；角色路径fact_probe/rule_skill_builder；公开声明/来源/工具回执保留用于复盘，隐藏思维链不采集；modelJudgmentIsNotRulesAuthority=true，trainingTruth=false，未晋级Skill。
