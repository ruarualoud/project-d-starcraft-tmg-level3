# T18 / Slice 174：完整计划容量与定点重写接口

## 最新生产终态

`faction-v1-9200d037cfa6a1c4a388` 已终态，两条 lane 均 rejected，pendingLanes=0。
旧会话 64461 已不存在，不能再次轮询或原样重启。新续跑必须以该 run 为父，继承全部历史和预算。

- 上一轮两个 Proposer 辅助数组失败已实际零 Provider 恢复，原三条不确定事项完整保留；不是仅通过工程测试。
- Terran 来源流程 6/7；第七章提纲和前四条正文已有，随后目标 4/5 写错主题。
- Zerg 来源流程 1/8：首章六条正文和两路六批审查完成；第二章 Reasoner/Judge 完成，首批计划失败。
- 正式离线五件套 1/5，runtime 0/5；两个种族尚未独立消费者验收。项目 16/22 tickets，T18 2/8 slices。

本轮实际生产 20 attempts：18 received、2 failed；4,255,273 tokens，估算/预留 ¥3.890757。
全局已知 API tokens 168,563,100，累计估算/预留 ¥140.980610，下一次通知 ¥200。
这不是供应商发票；缓存和重复输入计入 tokens。无新官方来源抓取、无 Codex 子 agent、无实际对战或训练晋升。

## 两个可复现失败

### Zerg：完整计划 608 字符被 600 字符限制拒收

实际失败 `structured-e7c4bc6f9aee9645f9fdc40d79592c3d69fabf2adbd9bb4b`。
HTTP 200，输入 240,662、输出 560、合计 241,222 tokens；非截断。
唯一 schema issue：`$.plans[0].text`，`actualLength=608`，`maxLength=600`。
付费失败回执 `38d032d0594cf3f0979802e825cbc946e86fc9fc428188b54cf3cba081359f9e`。

只读实际工作流回放已重建首章和第二章失败前的完整请求及 invocation：
`build/ticket-18-faction-production-v1/proposer-plan-length-diagnosis.json`，
hash `83cfb1ceb83b6fbf3d8889e8e829fd961eda6bc1f89943495ae477b88d941a9c`。
初版诊断漏接 review-transaction wrapper，被精确输入检查拒绝；补齐正式 wrapper 后通过，未放宽哈希检查。

V2 显式 Host envelope 保留 600 字符写作目标与旧 Provider V1 合同，允许完整计划至 1600 字符。
不是截掉八个字符、重新计费或把旧失败改成成功。仍然最多两条计划，精确目标、必需/已知来源、负判断、完整上下文不放宽。
原辅助数组 V1 的 128 条/240 字符能力继续保留；V1 默认仍拒绝 608 字符。
恢复绑定原始失败、完整输出、上下文、invocation、来源/目标和原费用，随后仍须生成正文、完整来源审查及独立评估。

### Terran：主题错误后的重写误入旧 JSON 路径

indices 4/5 本身正确，但正文写 Barracks (Proxy)、Engineering Bay/Armory，
而指定主题分别是 Dropship 和 Factory。这不是元数据小错，不能补引用或换编号放行。
旧 `.target-reconstruction.v1` 未被 native 路由识别，走了 prompt JSON；
HTTP 200、正常结束、1840 输出 tokens，但模型正文 JSON separator 错误。
付费失败回执 `84ccf73e015df23a696bb31a563991ca8cc7874f8a440f85da1a343eedfe9df7`。

诊断精确重建旧 native 草稿请求和旧 legacy 重写输入，hash
`e0544113564144c50038f8a2c31524a73c5271be9fb9fa33b6039cfda23e40f9`。
安全回执未保存错误 JSON 正文，不能宣称事后无损恢复。

新显式 target-reconstruction binding 将这类一至两条定点重写接入原生 items schema 和既有 8192 profile。
完整来源/整节提纲/成功前文/计划/新 Judge 保留；只不把已拒收错题正文当新写作上下文。
Host 核对原 issue、目标、focus、必需来源、前文哈希及 plan epoch；消费者还重新读取原错误产物，
复算失败原因和 issue，并再次验证新正文的目标/来源及非重复性。
成功的旧 legacy 重写（包括本 run 的 Zerg 首章重写）按原协议冻结，不改身份或收费。

## 尚未证明的部分

本文件最初落盘时新代码已接正式入口、续跑检查及消费者，五个真实 DSH 会话/故障注入验证仍在运行。
后续验证12349已 exit0：127项、5个真实DSH会话、0个真实Provider，报告
`9d92418ffcea563ae963b8a0bbcb6f865d54536399a138dc35df8ad6cf2462f7`。
原三个付费失败的字节不变恢复、显式续跑迁移、下一批/汇总、现场错误/截断/402拒绝和新重写消费者回放通过。
最终扩展保留旧 verifier 依赖清单并绑定新增独立语义门，144项/5真实DSH/0Provider，
`61dcfda8411632d51b5089c79e6428d614a2976d4a4d4760d4ea08fb15f12169`。
新门不是另一次正式生产；旧协议87项/3DSH和受影响启动回归均已结束通过，37/37启动门及151文件已对齐。
当前只启动从9200的零费预检98064，尚未live，预算、费用和失败谱系不重置。
首轮测试的模拟 transport receipt 缺少 startedAt，被独立8192消费者正确拒绝；补齐模拟发送时间并重新封存测试回执后通过，未放宽生产核验。
没有新付费生产、没有种族成品完成，也没有声称全部生成分支都已经统一。
源审查后的单字段编辑/目录审查已有各自结构化接口；提纲 `.source-reconstruction.v1` 仍是另一个需要显式核查的输出合同，不能将本次 items 接线冒充它已被覆盖。

独立语义待办必须保留：Terran 第七章新 procedure 又出现“两者均为 Unique，不可同时购买”的错误；
既有 V2 风险字段的精确句检查不能覆盖这个新字段/措辞。另有跨阵营、升级武器适用范围，以及 Zerg 编军购买与局内资源建议需要独立来源核对。
现新增跨字段独立拒收门，真实草稿V2漏检→新门检出procedure.0，17项通过
`2965a7fc0b8ccbb7ddf7ca51b2760fcc265b3dedd107dcf57b9f79d27fe90476`。
只对两张指定卡、明确非引用/非否定的已知错误断言检查，不声称发现任意改写。
已生成保留其他全部字段的源支持局部修正提案
`18c7e573b48514213a71302ac33fffab0556ec7ed3e879730332842f5e9b8a83`；尚未应用到正式生产，完整草稿复审仍必需。
该拒收门已接入独立候选检查与消费者入口，未来即使两路模型都支持此句也不能晋升；消费者准备门由12增为13，非新增开发Slice。
模型整章审查 openIssues=0 不能消除这些待办，也不允许晋升。

接下来：完成实际样本/现场故障/旧协议回放与续跑迁移验证，处理上述语义检查范围，
仅刷新受影响门，零费预检后从 9200 单一续跑；随后两族独立评估、正反对抗、真实空间 Harness、复盘反思及版本化升级回归。

## Skill loop 记录

- `ctx2skillLoopUsed: true`；`targetGames: [starcraft-tmg]`；`roleRoutes: [rule_skill_builder, harness_optimizer]`。
- `skillsRead`：已验收总规则依赖、两族冻结来源、实际失败计划与草稿。
- `skillsGenerated: 0`；`judgeTestsRun`：本次是恢复/路由/来源目标/回执回归，不是新的模型语义审判。
- `crossTimeReplayResult`：Zerg 首章及第二章失败前完整请求实际回放通过；历史成功不继承新成品验收。
- `promotions: []`；`blocks`：种族未完整生产/独立评估；`remainingRuleGaps`：上述语义问题，来源不更新。
- `harnessLoopUsed: true`；`promptPackRoutes: [rule_skill_builder]`；`harnessToolsCalled`：离线原生生成、DSH 导入、只读证据回放。
- `uiTraceEvidence: none`；`agentDecisionEvidence: none`；`memoryTraceEvidence: none`；`trainingTraceCandidates: []`。
- `rollbackOrDemotionRules`：原文/费用/上下文/来源/目标/协议漂移即拒绝；旧失败保留，正式验收不继承。
- `userVisibleChecks`：不因八个字符重抽；错主题确实重写，不靠重新贴标签；工程通过与 Skill 可用分开统计。
