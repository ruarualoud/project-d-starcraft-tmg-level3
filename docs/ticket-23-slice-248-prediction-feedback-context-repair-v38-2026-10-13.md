# T23 / S248：预测来源反馈与旧上下文恢复 v38

## 实际问题与原因

原正式 B 房间 r6 的 Zerg 对手已经正确描述 Ventral Sacs 的实际效果，但唯一对手预测把 Marine 对凯瑞甘的射击标为 `current_round`，同时 basis 引用当前回合火力带为空。此处不是 B 或 Zerg 重新写表。

三种排查假设依次为：模型未来条件/本回合标注矛盾；当前位置与后续位置混用；回执状态/方向绑定错误。只读重建正式玩家投影，得到与原请求完全相同的 observationHash `de19efc373e023a39bffad65d72f3fac5bdb54c12a72fc2d615ca31aa4ff4b50`。相关关系回执属于同房同 r6、方向 Marine→凯瑞甘正确；双方 Movement 已激活，Marine Assault 未激活。C-14 12寸，当前静止和本回合移动射击带均为空。选中能力本身不移动凯瑞甘。当前几何不证明任意未来公开转移后的安全或攻击不可能；未来条件应保留为有前置条件的预测，不能伪装成已认证当前火力。

真实工程缺口：预测检查器发现矛盾后，仅将内部错误码传给纠错，遗漏完整预测对象、双方激活状态、射击分支及回执来源。既有较早的效果反馈修复没有覆盖这条验证器路径。

## 具体交付

唯一产品源：`packages/online-agent-session/live-flash-decision-port-v1.mjs`。

- 预测检查返回所有矛盾对应的字段路径、原预测对象、actor/target 激活事实、当前/选中队形后的射击投影及源回执身份；正式 Action 抛错实际传入这些 issues。
- 通用 Action 上下文修复接缝：只处理同权威、当前 Planner 所属的已付费失败 Action，且保存的旧反馈确实只有枚举码、新检查能提供来源事实。已有完整反馈仍失败的模型回复不获得此豁免。
- 同一 choice 只能修一次上下文；保留原 Planner、军表、Plan、查询、付费答、失败史和费用。新增纠错窗口最多一次语义失败即停，不靠改版本无限清零。
- 原错误预测仍拒绝；支持有显式前置条件的未来预测，不手改选中动作或策略，也不把假设当成 Rules 证明。
- Action normalization v62；Planner v38、native/JSON 提示策略 v49/v50 未改变，没有增加策略奖惩。

## 本次门禁（不重跑旧绿）

既有 `verify-ticket-23-slice-248-captured-correction-feedback-v1.mjs` 只新增具体 bug 模式：

```text
node scripts/verify-ticket-23-slice-248-captured-correction-feedback-v1.mjs --prediction-feedback-only --capture=<v38/capture.private.json> --report=<v38/gate.private.json>
```

真实捕获 RED PID54164，断言准确失败于“预测反馈缺原句与来源事实”；修后唯一 GREEN PID56295。覆盖真实错预测仍拒绝、未来条件未认证为当前火力、来源事实进入 JSON 纠错、同权威/一次窗口、旧付费答与反馈保留。0 Provider 调用、0 房间写。没有重跑 v36/v37 或其他已通过模式。材料位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/prediction-feedback-v38/`。

## 原房同版实际执行

2026-10-12T19:02:00.707Z 正式三组原房恢复，sourceVersion `s248-v38-source-bound-prediction-feedback-20261013`，56运行源中只上述产品源改变。Hosts A57805/B57804/C57806，Web drivers A58514/B58515/C58516，独立 monitor58517；精确启动时刻/进程身份已确认，恢复点 A10/B6/C11。未初始化房间、生成任何新军表/开局计划或清账。

B r6 实际 `actionCorrectionContextRepairs` 于19:02:19.171Z保存字段/来源反馈。两次 `provider_failed_not_sent/provider_dns_resolution_failed` 有明确未发送证据、usage=null；自动安全恢复后，新的 Action 于19:02:37.887Z发出、19:02:50.892Z返回，216,659 input + 2,349 output = 219,008 units。该 choice 已变 `completed`，原付费 Planner 未重生。实际模型纠错及最终 Apply/Replay、截图另行观察记录；不能仅凭此门禁或生成完成宣称完整对局通过。

### 后续实际结果：r7 已执行，不再是待 Apply

B 的修正 Action 实际 Apply 到 r7，receipt `ce80d8698c953b34d304389fb16f2d75ca258454592150ead3139996f59b5a77`，`replayMatchesCurrent=true`。模型保留动作，将预测时域改成带条件的 `bounded_public_transitions`，没有由 Host 替它改选策略。原已付费 Planner 复用，旧回复／失败史保留。

完整棋盘截图：`build/ticket-23-slice-248-standard-2000-aa-live-v1/query-v33-clean-B-20261013-v1/screenshots/0066-r007-player2-resolve_battlefield_asset_ability-complete-board-applied.png`；页面截图同目录 `0065-r007-player2-resolve_battlefield_asset_ability-applied.png`。图片已实际查看，非占位或重建历史 UI。

随后三组分别发生超时／传输失败，没有完整回复或已知 usage，三条可能出网费用仍未知，不按零计费。v38 全停于19:45:28Z，原房 A10/B7/C11；旧 SIGTERM 未退出的两个 Web 驱动只按 PID＋出生时间＋原房路径定点关闭。零付费网络检查只证实 DNS/HTTP 可达，不证明模型请求成功。

v38r1 于20:20:23Z尝试受控恢复，但 B 在任何新模型请求前被旧 `provider_worker_result_timeout` High 拦住；恢复分类包含 transport timeout，却遗漏 credential-worker deadline 的规范化类型。该轮没有消耗新的付费重试，全部封口停止20:23:23Z，Native仍 A10/B7/C11。具体来源修复／一次红绿和同房续跑见 [v39](ticket-23-slice-248-worker-timeout-resume-v39-2026-10-13.md)。

## 边界与剩余

当前 T23 33/36、T27 5/6，主线余 S248/S272/S249/S250，有效完整对局0/12；完整20图目标未关闭。ABC只改变 Terran：A固定表+Plan/B空表AI新表+Plan/C同A无Plan；三Zerg完整表配置相同，均无独立开局Plan。S272仍需补锁表前有界候选/场景比较时机。180累计动作保护触顶前须同房扩容，不能把保护停点计为终局。

harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=selfplay_agent_prompt；harnessToolsCalled=player projection/space.inspect_relationships/legal asset placement/normal hosted drive；保留公开预测与失败事实，不记录隐藏思维链。trainingTruth=false；真实预测/Rules High不解决则三组同版封口暂停。无数据刷新、子代理/K3、删除或提交。
