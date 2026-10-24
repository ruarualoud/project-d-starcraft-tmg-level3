# T27 / S272：第一环节真实单步报告 v319

用户只授权一次真实 Flash 请求，收到结果后停下讨论。已完成这一环节，**没有放行后续查询、没有第二次请求、没有恢复原 A–F 或启动对局**。

## 交付

- [中文可视化报告](reports/roster-plan-debug-v319/index.html)：逐步输入输出、公开理由、前后状态、完整可搜索 Prompt、错误／未执行项区分。
- [完整代码流程图](reports/roster-plan-debug-v319/workflow.html)：包括 B 军表与 Plan 共演、早期 Teach、进场、正式 Plan、来源审查、定量 Teach、修订及发布资格；A 固定表另作分支说明。完整图不代表全流程已经运行。
- [本轮证据索引](reports/roster-plan-debug-v319/evidence.json)、[模型回复](reports/roster-plan-debug-v319/model-reply-001.json)、[完整脱敏 Prompt](reports/roster-plan-debug-v319/prompt-001.json)。
- [桌面报告截图](reports/roster-plan-debug-v319/report-overview.png)、[第一步详情截图](reports/roster-plan-debug-v319/report-step1.png)。

## 实际发生

1. 使用冻结 Standard / 2000 分配置，Terran Armed Forces 对 Kerrigan's Swarm，地图 `standard-d6-1`，任务 Hold Position；调用实际产品模块创建独立调试写表会话。未创建对局，未修改原 A–F。
2. 空军表与空 Plan、Skill、任务地图、实际可用工具清单进入正常安全 Provider 路径。只加观测与断点，没有修改策略 prompt 或生产行为。
3. 一次 `deepseek-flash` 请求成功，HTTP 200；结构化回执通过，无自动重试。模型选择 `candidate_menu` 和 `map_summary`，这两项都在当前可用清单中。
4. 产品原生事件消费者保留付费回复与回执；当前 revision 仍为 0，军表／Plan 均 null，observations 仍空。空 Plan 内 unknown 是 query 动作的非激活占位，不是已提交方案的未解结论。
5. 断在 `after_model_reply_before_execution`：下一动作解码和工具执行尚未发生。因此不宣称工具执行正确、军表合法或策略已提高。

## 耗时、体积和费用

- Provider 回执 7.625 秒，不含产品初始化、人工检查和断点等待。
- 输入 206,989 tokens；输出 322；缓存命中 1,792、未命中 205,197。
- 仓库 2026-09-14 冻结价表估计 USD 0.030978126，不是今日价格核查或服务商最终账单。
- 地图 1,804 条编译细分记录，占本轮上下文字段 JSON 字符合计 92.4%；不是逐字段 token 测量。已记录优化讨论点，未删改输入。
- 已有地图证据但模型又请求摘要，下一步应比较实际返回是否重复、是否推动选表；本轮没有提前定性为 bug。

## 本次改动与验证

- 新增 `scripts/debug-slice272-walkthrough-v319.mjs`：实际产品单步观测、一次派发限额、原请求／公开回复记录、付费回复已落盘检查及操作前断点。
- 新增 `scripts/render-slice272-walkthrough-v319.mjs`：从本次证据生成报告；不调用模型、不执行规则、不释放断点。
- 新增流程图源、HTML、浏览器截图与报告证据；更新 CURRENT_WORK / 根 TASKS。无生产算法改动，无提交。
- Archify 最终结构检查 9/9；showcase 无错误／警告；四种桌面尺寸自动浏览器检查通过；1440×900 浅色图已实际查看，无遮挡或裁切。图形验收只代表报告质量。
- 报告首次浏览器检查：桌面、图像加载、完整 Prompt 与原文件一致、搜索正常、0 页面异常；手机 390px 出现长文本溢出至 618px。仅修报告 CSS 换行和网格最小宽度，再单独补验手机通过（390→390）；已通过项未重跑。
- [报告浏览器回执](reports/roster-plan-debug-v319/report-browser-check.json)保留首次失败与补验范围；业务请求无失败。本次未重跑此前 49 个定点案例。

## 恢复停点

证据目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/walkthrough-v319-jjQtTj`。

会话：`iterative-web-6299a521-4fb7-402c-beb7-285c71bc1d32`；观测进程 PID 28559（只作提示，以实际存活和 status 为准）。

**不得自动放行 `controls/after_model_reply_before_execution.json`。** 用户下一次讨论后再决定是否继续这两项查询；保持付费回复，不从头重发。

T27 5/6，T23 33/36；剩余 S272/S248/S249/S250 共 4 Slice；最终 Plan 0/6，完整实验 0/12。第一环节成功不是整条链验收通过。
