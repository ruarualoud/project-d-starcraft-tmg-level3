# T18 / S174：DeepSeek V4.1 Flash 限时测试版核验

核验时间：2026-09-08 23:56（Asia/Shanghai）。用户要求后续调用改用今天的新测试版。

## 结论与范围

真实官方接口调用成功。模型 ID 为 `deepseek-v4.1-flash-expires-on-0910`，
base URL 仍为 `https://api.deepseek.com`。
本次新增独立 V3 ProviderProfile 和计费 canary 入口；V1/V2 及其历史成果没有改名。
**尚未把正式种族生产 CLI 切换到 V3，也没有启动新的正式 Skill 批次。**
一次小规模结构化探针不代表完整上下文、所有角色合同、DSH 或策略质量通过验收。

## 一手证据

- [官方 API 快速开始](https://api-docs.deepseek.com/)及
  [官方更新日志](https://api-docs.deepseek.com/zh-cn/updates/)在核验时尚未列出 V4.1 测试版。
  没有把社区转发称为已直接读取的官方公告原文，也不据此承诺新模型性能。
- [官方模型列表接口合同](https://api-docs.deepseek.com/zh-cn/api/list-models/)对应的
  `GET https://api.deepseek.com/models` 实际于 `2026-09-08T15:50:36.392Z` 返回 HTTP 200，
  列出 `deepseek-v4-flash`、`deepseek-v4-pro`、`deepseek-v4-flash-vision-exp`，未列测试版。
  “列表未列出”不等于“实际请求不支持”。
- 对官方 `POST https://api.deepseek.com/responses` 的真实请求于
  `2026-09-08T15:56:19.101Z` 发起，HTTP 200；请求和响应 `model` 均为
  `deepseek-v4.1-flash-expires-on-0910`。这是此次可调用性判断的一手证据。
  请求使用现有 Keychain → 隔离 Provider Worker → HTTPS 出口 → Responses JSON Schema Adapter，
  没有代理、重定向、自动重试、旧模型回退或凭据落盘。

实测证据：

- run：`v41-beta-probe-63fe33f582819aa60079ee796b16aca6`
- [运行报告](../build/ticket-18-deepseek-v41-beta-v1/v41-beta-probe-63fe33f582819aa60079ee796b16aca6/report.json)
- report hash：`28c716725b28ffba7a3e0d85c3a6414db7a64be53571b02676166b9c8fd7cb28`
- capability receipt：`fbaa3a6f401052162b2d7f934d368d494fa82c55ca4ea717d76bbc513eb5edfd`
- 使用现有 faction review V4 JSON Schema 的纯合成探针，输出上限 256 tokens。
- 实际 1 次调用，输入 632、输出 57、合计 689 tokens；SQLite attempt 为 `received`。
- 估算 ¥0.002409：采用[官方当前 Flash 高峰人民币价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)
  的输入 ¥3/百万、输出 ¥9/百万，不减缓存、不取低谷折扣。
  这是保守预算估算，不是已核实的测试版独立价目表或真实扣款发票。

全局更新为 1,208 个历史 attempts、174,219,534 已知 API tokens、
¥153.766496 估算与预留；其中仍含旧 Terran 未知发送的 ¥0.80 预留。
0 未决 intent、0 实际 402；下一费用通知仍为 ¥200。

## 配置与验证

- [V3 配置](../content/skill-generation/offline-provider-profile-v3.mjs)：
  独立 profile ID/hash，保持 8192 输出操作上限；1M 上下文是继承的操作边界，
  **并非本次验证了测试版最大上下文**。
- [调用脚本](../scripts/run-ticket-18-deepseek-v41-beta-canary-v1.mjs)：
  `--preflight` 不调用 Provider，`--live` 单请求预算 ¥0.10/10,000 tokens；
  新模型凭据、绑定、请求、返回模型、账本和能力凭证均独立记录。
- [零费验证](../scripts/verify-ticket-18-deepseek-v41-beta-profile-v1.mjs)：
  已通过旧配置不变、新请求实际 wire model、出口白名单、无重试/回退、
  时间边界及非法时间拒收检查。注入 transport 不计真实模型成功。
- 模型 ID 带 `expires-on-0910`；尚无可核验的官方精确下线时刻/时区。
  本地保守设置 **2026-09-10 00:00 Asia/Shanghai** 停止新请求，届时明确报错，
  不默默换回旧模型。此时刻是本系统策略，不冒称官方截止时刻。

## 正式生成前剩余工作

1. 断点读取修复已通过实际 53 个祖先、53 份 manifest-only recipe、164 项断言，0 Provider。
   先前正式预检 `20117` 已在 `FACTION_REVIEW_FRAGMENT_ANCESTRY_DRIFT` 终止，不再运行。
   42 门快检当前仅发现 3 组相关证明需重验：review-decomposition、wire-address-recovery、execution-policy。
2. 将正式队列的新执行 profile/能力凭证与旧成果 provenance 分开接线；
   不能只改旧 profile 的字符串，让旧成果伪装成 V4.1 生成，或因换模型重付旧任务。
   特别检查 legacy chat、structured editor/review/native 及 8192 capacity 路径，
   历史 consumer 的 `deepseek-v4-flash` 硬编码属于旧成果验证，不能无条件全局替换。
3. 新模型对应角色合同需要独立能力检查，再进入正式预检/生成；
   本次小探针不自动继承旧模型的全部能力或策略验收。

当前五包离线 1/5、runtime 0/5；Ticket 18 为 2/8，S174 未收口，项目 16/22。
目标工具当前状态为 `paused`；本轮仅完成用户新指定的模型核验/配置实测，未改变长任务状态。
研究按 research 技能使用一手接口证据，由主 agent 独立完成；没有启用子 agent。
游戏官方数据没有刷新；没有提交、安装、房间操作或规则/训练晋级。

Harness 本轮范围：`harnessLoopUsed=true`，targetGames=`starcraft-tmg`，
promptPackRoutes=`harness_optimizer_prompt`；仅离线 Provider 能力探针，
无 UI trace、对战 decision、memory 或 training candidate。回退规则为明确停用测试 profile，
不改历史身份、不静默换模型；`trainingTruth=false`。
