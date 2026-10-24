# Ticket 23 / Slice 248 — B r8 Charge 无候选诊断

状态：未修复；此分支仍为开发房间，不可作为正式对局或训练真值。冻结房间 `20260927061507239-Bjkc7d-Zj4Cax` 停在 revision 8、第 3 回合 Assault、player2。18 模型 Raptor 已对 Goliath 宣告 Charge，掷出 2，最大移动 8 寸；当前 LegalSpace 仅有 `resolve_charge` 参数域。B 分支累计 40 次付费调用，失败尝试之后没有新 Apply。

只读复现 `scripts/diagnose-ticket-23-slice-248-b-r8-formation-v1.mjs` 用保存的模型请求、冻结 Room 和当前 v5 Rules Runtime 重放；Runtime 哈希 `1f3754d3…bb81960`、域 ID `sc-domain-d0f99c…4a97a43` 均与付费现场一致。原请求扫描 57 个领头底盘锚点，248 次领头检查被挡，16 次随从布局最多只放下 16/17 个，产生 0 个完整候选。只保留接敌目标和中性密排目标也各为 0。当前 Rules 未提供可验证的失败型域；“有限搜索为 0”不能当 Charge 失败证明。此聚焦复现按预期红灯，Provider 调用和 Room mutation 均为 0。

为区分“终点覆盖不足”与“路径错误”，曾在本地仅当原搜索为 0 时补试半角度接触点、较宽满距离射线与紧密六角格旋转。实验产生 3–4 套完整 18 模型终点，但全部被原规则器以 `SELECTED_SPATIAL_PATH_MODEL_COLLISION:player2-kerrigan-raptor-model-5` 拒绝。候选领头终点为 `(30.340, 20.921)` 寸，起点 `(35.499, 14.807)` 寸，直线已约 8 寸；被穿越的己方模型中心约 `(33.051, 18.820)` 寸。对该终点绕行没有剩余移动距离，但这**不证明其他终点也无解**。因实验未通过原聚焦门，求解器实验改动已撤回；只保留诊断脚本与失败证据，不续跑付费房间。

下一交付物：搜索时把领头完整底盘路径与终点联合求解，每个完整编队仍交同一 Rules `instantiate`；若所有路径确实不可行，须由 Rules 给出覆盖当前连续几何域的充分失败证明。不能把采样上限、目标权重或模型自述当证书。完成前，B r8 High 保持阻塞，不清零已付费用、不修改原房间。对局截图见 [r8 完整棋盘](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d-Zj4Cax/screenshots/0049-r008-room-next-agent-decision-complete-board-before.png)。

Harness checkpoint: `harnessLoopUsed=true`; `targetGames=[starcraft-tmg]`; `promptPackRoutes=[selfplay_agent_prompt]`; `harnessToolsCalled=[space.inspect_relationships,space.solve_formation,Rules.enumerate,Rules.instantiate]`; `uiTraceEvidence=r8 screenshot and failed runner capture`; `agentDecisionEvidence=saved six-call Raptor Charge resolution planning, formation intent preserved`; `memoryTraceEvidence=existing same-seat B branch memory, no new memory write`; `trainingTraceCandidates=none`; `rollbackOrDemotionRules=experimental densification reverted after exact Rules collision; all unproved outcomes quarantined`; `userVisibleChecks=none beyond retained screenshot, full match pending`.

## 同现场追加诊断与三轮收敛边界

只读脚本再次解析冻结 r8：冲锋者 `player2-raptor`，此前实验中挡路的 `player2-kerrigan-raptor-model-5` 属于**另一支**同阵营 Unit，中心 `(33.051,18.820)` 寸；不能按“领头可穿本 Unit 模型”放行。Rules v5 连续整数终点证明返回 `integer_round_endpoint_path_domain_unresolved`（42 个单元检查后有 1 个未决单元），v4 水平截面证明明确 `unsupported_leader_or_distance`，因为该证书只涵盖单模型领头 Unit。两者均不证明本次冲锋失败。

聚焦探索的第二轮仅在原排布失败时允许随从链式连续摆放：生成 16 套完整 18 模型落点，原 Rules 对 16/16 均拒绝，首个具体原因为领头路径穿越目标 `goliath-1-model-1` 底盘。第三轮另采样靠近来路、在接敌范围内留 0.5/0.9 寸间隙的终点：扫描 83 个不同锚点，仍只有同一类 16 套完整落点，Rules 16/16 拒绝。与第一轮半角度／密排实验合计三轮没有收敛，因此**停止这条试错循环**；链式摆放与间隙采样生产改动均已撤回，B r8 房间未续跑、0 Provider、0 Room mutation。下一次必须先设计可覆盖完整路径和多模型连续摆放的联合求解／充分失败证书，并有可证伪的完整算法准出标准，不能再局部增加角度或改一个权重。
