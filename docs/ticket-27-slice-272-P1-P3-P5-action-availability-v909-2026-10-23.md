# T27/S272 P1/P3/P5：动作资格诊断与完整交接合同 v909

## 本轮结论

本轮不是增加一套战术提示，而是补齐同源 Native 事实的传递。A 把“当前场景没有冲锋域”解释成“能力缺口”；恢复真实冻结场景后，原生判定为 `SELECTED_MELEE_CHARGE_REQUIRES_UNENGAGED`：Raptor 已接战，因此不能再次声明冲锋。原目录同时明确 Claws 属于 Combat。使用产品现有的显式保位 Combat 假设入口，Native 确实返回 Raptor fight 域。

这只证明上述场景的动作资格与条件近战入口，不证明完整“冲锋＋IMPACT＋近战”的存活概率已实现，也不替模型选择新场景或改写其 Plan。

## 来源、传递、状态的修复

1. `scene-query-service-v1.mjs` 的快照枚举原来用 `includeDisabled:false`，丢掉规则器已经算出的禁用原因。现在同次枚举保留它们；没有额外重算规则或新增自编判断。
2. 实战与快照共用的 `spatial-action-query-runtime-v1.mjs` 输出 `actionAvailability`，把原生 `disabledActions` 与可选动作、支持能力目录分开。完整原生原因保留；空诊断不宣称“不可能”；仍须 Native 实例化/执行验证。
3. Receipt view 与分块 read-context 都提供按单位、动作、阶段、禁用原因定位的原件路径。目录不是完整原件已读证明，也不是执行权限。
4. 新的来源合同只给当前持有任务且基于旧 inspect 声明能力阻塞的负责人一次通知；原付费答复、旧源文件、未知、费用不改。由模型明确选择同场景新诊断读取，不回放攻击或求解。
5. 单步注入发现恢复入队核心只逐个比较已列举的通知字段，新增字段和原问题可能漏检。改为与产品生成的完整 `inputs` 严格相等，不再维护易漏字段白名单；负责人更新与入队仍原子进行。

## 定点测试记录

没有重跑 v908 或无关已通过门，没有真实 Provider 调用或动作执行。

| 门 | 实际结果 | 证据 |
|---|---|---|
| 真实 A 场景 Native 原因 → 快照 → 同一实战投影 | 3 项已通过；合法菜单未增加非法冲锋，空诊断不制造结论 | `build/slice272-action-availability-v909-green.json` 的前三项 |
| 显式条件 Combat、原件视图、大对象分块导航、inspect 接线与只读性 | 只补剩余 3 项，通过；前三项未重跑 | `build/slice272-action-availability-v909-final.json` |
| 原能力阻塞的一次来源通知 | RED 后通过；不是全历史重启 | `build/slice272-action-availability-owner-v909-green.json` 的首项 |
| 完整交接输入、伪造通知/改问题拒绝、原子 owner、在途/旧源/退役禁止恢复 | 只补剩余 2 项，通过；首项未重跑 | `build/slice272-action-availability-owner-v909-final.json` |

夹具修正如实保留：第一份 RED 因无变化分支覆盖同 hash 的构造来源而递归；随后修成只选实际改变状态的构造记录，得到真实缺失诊断的 RED。第一份后修验证的 Combat 夹具仅手改 phase，漏了先手上下文；改用产品 `preservePositions` 场景入口，未重跑此前通过项。第二门首次后修验证则发现真实完整交接漏检，修的是生产核心，不是降低断言。

最终累计 6 项诊断链＋3 项交接链通过。均 0 Provider、0 Native action、0队形搜索、0生产状态写。不能据此称全系统无错或最终策略已验收。

## v908 实际运行补充

- A 原负责人真实返回能力阻塞，结果 `693519c6…`。普通 after-Teach 作者随后授权地图事实查询，map_summary/map_deployment 已返回，进入原来源审核；尚未正式 Plan 发布。
- B 真实选择 investigate，结果 `a0ce009f…`，要求大编制第二 Marauder 的正确配置。这证明后继授权生效，**不证明实验成功**。
- B 两次候选提交实际被 Native 拒绝：`ARMY_SLOT_CAPACITY_EXCEEDED:Core`。第一份大编制候选，第二份去掉 Goliath 后仍超 Core；此类合法性结果必须作为候选不可用证据/交回选择，不可当成格式错误无限重试，也不能用旧小编制测量替代大编制结论。当前后继来源审核/修订仍未完；没有宣称正确比较已完成。
- 安全停止复核：早期 Node `process.kill` 调用没有成功，catch 曾误报已退出；随后直接核验 PID/命令，使用 `/bin/kill -TERM` 送达产品安全停点。最终 A5973/r3、B5530/r5，0在途，原33569/33576退出。不是网络故障或原请求重发。

## 逐边合同审查与剩余交付

| 边界 | 本轮或已有明确证据 | 仍须完成 |
|---|---|---|
| 请求 → 角色 | v907 按实际送达请求检查，旧付费答复不追溯新增约束 | 继续按具体异常验证，不能称全角色已认证 |
| 角色 → 工作单 → Native | v906 对照实际候选配置；v909 区分能力/当前资格 | 候选合法性拒绝与输入格式纠错的职责分类；B 的原大配置问题不能由旧样本代答 |
| Native → 原件 → 阅读 | v905 条件观察归档；v909 原生禁用原因不再丢失、分块可定位 | 最终支持/推翻结论的聚合资格 |
| 原件 → 比较 → 审核 | v903 具名两侧、方向、阈值；数值与策略主张分开 | B 仍出现旧比较的自然语言方向误读，当前来源修订不得算通过 |
| 负责人 → 后继状态 | v908 retain 不终止必要工作；v909 完整输入校验、一次原子通知 | 真实后继须消费新诊断，不以通知入队代替结论 |
| 最终结论 → 可检索经验 → 对局 | 原始条件观察已存且可查询，不改为已证事实 | 最终假设结论、适用性/失效条件审核、对局 advisory Skill 检索尚待 |

条件经验准出仍须记录：冻结数据/规则版本；双方单位配置、模型数/Supply与升级；地图、阶段、位置、能力/资源条件；假设与比较阈值；实际查询参数和原回执；支持/推翻/未定结论；适用/失效范围及审核来源。未审观察可供调查发现，不能伪装成有效策略 Skill；反例与无效候选也要保存其条件，但不能冒充武器效能测量。

## 文件范围和进度

同原目录同版已启动 A61662/B61669。首次有界观察 `build/slice272-v909-live-observation.json`：A仍在恢复初始化，B已继续原来源修订；新诊断的真实模型消费尚未验收。当前条件观察 A104/B11，共115条，均不能据条数声称有效Skill或Teach收敛。

生产文件：共享 scene-query-service、spatial-action-query-runtime；pregame-scene-laboratory 的描述；receipt-view、read-context；新增 action-availability-reconsideration；既有 reconsideration 入口和 workflow 核心。两个脚本只为上述具体失败和异常注入。

没有提交、删除、安装、新代理、刷新官方数据或重建房间。T27 5/6、T23 33/36；剩余 S272/S248/S249/S250 四片。正式 Plan 0/6、对局 0/12，不能报收敛完成。

Harness：harnessLoopUsed=true；targetGames=StarCraft TMG；共享 Native + 现有产品工作流；公开理由与实际回执，不记录或要求隐性思维链。uiTraceEvidence=本轮无网页操作；trainingTruth=false；未做经验/Skill 晋升。新菜单改变的是事实可见性，不指定模型战术。
