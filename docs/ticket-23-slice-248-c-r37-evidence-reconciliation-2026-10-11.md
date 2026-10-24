# Ticket 23 / Slice 248 — C r37 只补证据，不续局

## 已交付

C 优雅停机时，最后一个在途动作已经接受，权威 revision/回执均为37；Web NDJSON 只有36条。实际差异先用只读断言复现一次，exit1：37 != 36。没有重放动作或回滚房间。

原 Web 驱动新增 `--reconcile-only`：必须附着已恢复的原房；Host 必须空闲；浏览器只允许GET/HEAD/OPTIONS并禁用Service Worker；复用现有按回执去重及截图记录流程，补录后直接退出，不进入drive循环。失败记录单独写 `reconciliation-failure.json`，不覆盖旧 `failure.json`。

一次实际 Web 验收 exit0：36→37条唯一回执，225→229张截图；只补了 `151a7801…4a5810`，第1回合Assault、player1 Marine1 Run，领头模型路线3.304寸。完整战桌图已目视查看；同一记录保留原公共计划、目的、预测、查询回执、九模型队形理由和原Apply/Replay结果。截图实际观察revision37，没有把当前画面伪称更早的历史画面。原隐藏思维链未采集，trainingTruth=false。

补录前后状态hash `d01eb3e1…f1c71da`、journal head、37个接受回执均相同，75次Provider/10,750,446units均未增加；浏览器写请求0，新模型调用0、新接受动作0。新启动的观察Host与补录驱动均已实际exit0，A/B/C正式对局继续停止。

## 文件与证据

- 修改：`scripts/run-ticket-23-slice-248-agent-agent-web-v1.mjs`，只加实验恢复模式，不改策略/规则/地图/生产端UI。
- 私有RED/GREEN、前后manifest及主机/驱动日志：共同baseline的 `C/r37-reconcile-{red,green}.private.json` 等；GREEN记录实际进程exitCode，不靠先前变量推测。
- 原房 `reconciliation.json`、37条 `actions.ndjson`、`progress.json` 为paused；旧paid回复、旧失败和费用保留。
- [完整战桌](../build/ticket-23-slice-248-standard-2000-aa-live-v1/performance-baseline-C-20261010-v1/screenshots/0228-r037-player1-run-complete-board-applied.png)

未重跑旧绿、地图、性能或完整构建。无代理/K3/提交/其它项目改动；生产共同版本仍v4。

## 后续

用户已授权A定点修正及相关验收，并要求自动纠错。实际代码显示自动纠错原先只在Agent-selected journey中，固定表A只调用独立revise/review；计划新High必须自动进入共用定点修订与增量审核，不能靠人工覆盖或假装整份重审通过。该修复尚未交付，不启动任何正式对局。

T23 **33/36**、T27 **5/6**，整体仍余S248/272/249/250四片；新12整局0/12、旧0/3不变。累计估费A97.160008/B157.089339/C137.766074，各200，补录增量0。原20图范围保持，官方9张选定配置9/9不代表全任务/全规模。

harnessLoopUsed=true；routes=harness_optimizer/fact_probe；tools=原房manifest、只读Web刷新与截图、回执镜像；decision/memory evidence=原r37记录，未生成新决策；training candidates=none。失败只记录观察问题，不自动开启新模型调用或推进游戏。
