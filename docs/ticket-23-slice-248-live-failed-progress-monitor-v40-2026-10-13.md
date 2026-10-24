# T23 / S248：失败 Web 驱动仍存活的批次监控修复 v40

## 实际缺口，不是换实验条件

ABC仍只改变Terran：A固定2000军表＋开局Plan，B从空表AI2000军表＋Teach/reviewPlan，C与A相同军表且无开局Plan。三完整Zerg军表/配置均相同且没有独立开局Plan。对手单步Planner不是Zerg写表。v39历史worker-timeout分类修复已实际让B越过恢复入口，真实动作推进；没有重开房间或军表/Plan/费用重置。

A在2026-10-12T20:55:33Z因连续DNS失败、3个完成的drive均无权威动作而记录 `SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS`。Web driver失败清理挂起，所以PID仍在。监控只在driver退出时读取持久失败进度；host job本身是paused、仅Medium DNS finding，因此轮询job也未认出driver High。根因是监控入口漏读失败状态，不是A模型策略或军表问题。未绕过3轮无进度保护，也没有把未知usage按零记账。

## 封口与具体修复

发现后精确验证A Host PID/出生时间/脚本/原房路径，发SIGTERM触发现有三组封口；等待全部Host/current-request结束，随后仅关闭B/C两个挂起Web driver。全部停止21:30:45Z，最后Native A10/B9/C16，R1 Movement；已有骰子、请求、查询、回执、记忆、账保留。

唯一执行改动是操作监控 `common-v40-independent-monitor.private.mjs`：每个tick、job轮询之前读取本轮fresh `progress.status=failed`，调用已有统一 `readStarcraftTmgOwnedLiveDriverOutcomeV1` 与 `classifyStarcraftTmgOwnedLiveDriverOutcomeV1`，立即按现有封口政策停止所有组。新/旧时间由launchAt判定，旧失败不会误拦新运行；不删除finding或变更agent/Rules逻辑。56产品源码完全沿用v39，monitor SHA单独进入v40 source manifest。

## 具体 bug 的唯一红绿

没有已有测试能执行这个监控调用边界，因此仅为此已发生bug新增 `scripts/verify-ticket-23-slice-248-live-failed-progress-monitor-v1.mjs`。使用真实A失败进度/同轮launchAt/三组PID配置，在隔离VM运行实际完整监控脚本；只替换文件、ps、fetch和signal边界，不用浅层presence断言。

```text
NODE_OPTIONS=--experimental-vm-modules node scripts/verify-ticket-23-slice-248-live-failed-progress-monitor-v1.mjs <capture> <actual-monitor-script> <gate>
```

真实RED56708：“失败记录已写但driver活着时批次未停”；修后唯一GREEN57251。证明fresh失败在job轮询前被发现、三Host先封口再停driver、旧失败不停止新运行。0Provider/Room写/真实进程信号/网络请求。材料 `query-contract-audit-v30/live-failed-progress-monitor-v40/`；v38/v39及其他已通过验证未重跑，未跑全量。VM模块warning不改变结果。

## 当前恢复

零付费网络检查21:33:36Z：DNS返回地址，未授权/models返回401，说明端点可达，不证明下一次付费调用必成功。sourceVersion `s248-v40-live-failed-progress-supervision-20261013`；原房A10/B9/C16恢复，Hosts58650/58651/58652与startup58654于21:34:47Z启动。实际Web/monitor准入与新Apply后续补记，不能用启动替代通过。

权威操作文件：`common-v40-startup-config.private.json`、`common-v40-source-manifest.private.json`、`common-v40-live-process-handles.private.json`、`common-v40-independent-monitor-progress.private.json`、`all-stop-common-v40.private.json`。没有新表/Plan/epoch/旧记忆导入，保持Flash/Skills/地图/执行链路相同。

实际Web drivers59393/59394/59395与monitor59396于21:35:30Z完成原房准入；21:36:14Z三组drive-0001均running/no新High，仍A10/B9/C16、R1 Movement。进程身份及原房路径已绑定，未把尚未完成的新请求计为权威动作。

## 费用和剩余

### 后续实际运行／封口

v40恢复后真实A14/B11/C21；新动作含A Marine2进场、B Marauder额外移动、C Kerrigan进场，回放匹配且保存截图。B r11 Planner三份付费答均因同一声明拒绝，High于21:40:57Z记录；此次修正监控于21:41:05Z自动识别fresh driver失败并封口三组，不再等PID退出，实际线上监控路径已触发。全部Host先结束、挂起Web驱动随后定点关闭，封口21:47:07Z。

真实拒绝句仅针对Marine不在当前火力带，却被Marauder→Omega Worm的火力反驳；模型另外明确承认Marauder威胁。这是当前图攻击者作用域漏滤的误报，不是要模型忘记威胁。具体v41修复及唯一红绿见 [攻击者范围修复](ticket-23-slice-248-current-attacker-scope-v41-2026-10-13.md)。本轮阶段耗时只从已有真实运行日志采集，`common-v40-live-stage-evidence.private.json`，没有额外模型调用/性能验证；少量动作约49–109秒，初次Replay长尾39.6秒，不能称完整回合性能达标或40%晋升证明。嵌套query时间不重复加到agent_decision。

封口时当前原房已报告units：A5,623,940；B6,578,567；C10,697,669；累计已知估算（含早期生产/实验偏移）：A¥240.309055/B¥303.920327/C¥260.033961，各仍另有1个可能出网但未知usage请求，不按零计。无硬上限、不清账，下一通知A300/B400/C300。

T23/S248 33/36，T27/S272 5/6，余 S248/S272/S249/S250，完整0/12；20图全目标未关闭。S272锁表前候选/场景比较仍待补；180动作保护需触顶前同房扩容；挂起driver的退出清理是独立债务，当前未修。harnessLoopUsed=true，targetGames=starcraft-tmg，selfplay_agent_prompt，trainingTruth=false；不刷新数据/创建子代理K3/删除/提交。
