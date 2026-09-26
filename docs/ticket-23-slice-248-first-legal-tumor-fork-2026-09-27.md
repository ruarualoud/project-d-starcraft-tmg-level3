# Ticket 23 / Slice 248 — 首次合法肿瘤断点与续局

原 `20260925021950038` 在 r53–r57 同坐标重复肿瘤的缺陷修复后，不能只假设 r53 为最后合法前缀。用修复后的 Rules 从 r1 顺序回放，r1–r17 通过，**r18 即因 `UNIT_LIFECYCLE_TUMOR_OVERLAP` 被拒**。原公开动作 r17 与 r18 均表示 Queen 在 `(18,4.551)` 英寸生成实体 Creep Tumor；r26 又是同址，晚期 r53–r57 在 `(18,4.126)` 同址。故最早需要重新决策的是 r18，r18–r57 的原局“已 Apply/Replay”仅作为旧规则器缺陷样本，不进入合法战局/训练结论。r53 fork 在 r18 准确失败，没有模型费用，不能继续尝试绕过。

唯一新的合法分叉 `build/ticket-23-slice-248-standard-2000-aa-live-v1/20260926182512804` 记录 `fork-provenance.json`：来源 runId、`throughStateRevision=17`、17 条逐动作回执、`invalidSuffixCopied=false`、回放零 Provider 调用；两席连续记忆从各自最后合法动作播种，均标为需重新评估，不冒称原局后缀连续。原房和两个未完成的 r53 fork 目录保留作故障证据。

新房 r18 真实 Flash 决策为 Queen `finish_activation`，非重复肿瘤；权威 Apply/Replay 和逐动作截图写入 `actions.ndjson`/`screenshots`。其公开原因是另一项 Domineering Presence 的落点工具给出 `RULES_QUERY_NO_LEGAL_ASSET_PLACEMENT_OPTION`。r18 计 14 次 Flash、1,353,296 输入 units、14,990 输出 units、内部估费约 ¥1.695915；这是性能/工具查询审查项，不是策略质量已通过。r19 Terran Marine 2 合法部署后继续同房；完整对局与复盘仍未完成。新分叉不是原 r53 局的续号，也不可拿与那个错误后缀直接做计划 A/B。

53 步分叉首次被 runner 固定 600 秒启动限时截断，当时只回放约 15 步；现服务每 5 步输出无凭据进度，runner 只在实际回放进展时刷新 600 秒“无进展”计时，而非把慢的合法回放当挂死。第二次试图到 r53 因真实 r18 规则拒绝停止。当前 r17 分叉已完成回放，无需再次启动；此机制变更只做直接脚本语法门一次，真实回放/启动是端到端验证。
