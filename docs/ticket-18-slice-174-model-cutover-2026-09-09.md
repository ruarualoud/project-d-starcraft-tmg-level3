# T18 / S174：4.1 测试版正式入口切换

本记录续接[实际 API 核验](ticket-18-slice-174-deepseek-v41-beta-verification-2026-09-08.md)，不覆盖当时的历史结论。

当前结果（03:46 CST）：54253已终态exit1，19次实际调用、417,711tokens、估算¥1.284099。新模型16项格式探测及两次完整审查有实际回执，Zerg第二章停在编号命名空间映射，Terran旧未知发送仍隔离。新V6槽位合同与实际结果无损恢复组件49组检查通过，但尚未接正式runtime/continuation/consumer；不得再轮询或原样重启54253。累计174,637,245已知tokens/¥155.050595，五包1/5未变。后续准确检查点见[审查槽位修复](ticket-18-slice-174-review-slot-namespace-2026-09-09.md)，以下运行中记录均为历史。

最新正式结果（2026-09-09 03:00 CST）：预检89128已exit0、`ready=true`，recipe为`8262a9a7181f3ec25c06e8889507020363967f6a0d68efcd38de0c4aa1a35e71`。完整断点迁移与dry workflow确认357条历史步骤可复用，37个旧prompt角色、88个旧structured review角色保持原身份；第一未缓存角色是`faction.zerg_swarm.faction.zerg_swarm.army_resources.1.reasoner`，走`responses_json_schema`。新执行模型为`deepseek-v4.1-flash-expires-on-0910`，Terran原target.1未知发送继续隔离。现已唯一启动同参`--live`为54253，尚待实际Provider及Skill结果，不重复启动旧请求。下面的失败及检查中记录为历史。

当前状态（2026-09-09 02:53 CST）：下面的分类修复已完成全部受影响尾验：wire29/1DSH、editor83/2DSH、draft聚合313通过，后两报告hash为`2112003c138f7c5adf7de57304e6c5de9322996948a0f35045b4f68d799846e9`、`fd13e87cbe2f05635469b7d1c134d1afaace90640a71408ee78d777c2061e2a8`。42门/195文件以及四聚合和模型接线的额外源码快检均通过。正式预检已唯一重启为89128/PID63105，仍从27ef显式使用beta；尚无新付费调用或正式Skill晋级。下面29200失败和02:29记录为历史，不再轮询那些进程。

后续正式结果：上述预检已终止于 `FACTION_PROMPT_LINEAGE_STEP_DRIFT`，没有调用 Provider。已通过旧断点迁移；问题在提示词分类阶段：实际27ef的 `faction-review-decomposition.705c456f…target.0` 是已验证的恢复片段而非角色，resolver不为它生成prompt lineage，下游却先将它按角色校验。实际单记录复现仅0.776秒，原R6扩展回归同样先失败；不是旧内容损坏或模型幻觉。共用分类已修正，保留旧无lineage调用及真实角色的身份/输入/内容篡改拒收。扩展R6的5组检查已通过（包含实际片段与混合列表，历史legacy角色仍37）；只补受影响的wire与editor/draft汇总后再预检，不重付旧任务。原进程29200已终态，不能继续轮询它。耗时采样发起时进程已结束，因此没有获得CPU采样证据，不据此断言性能根因。

最新检查点（2026-09-09 02:29 CST）：两条相关尾验队列已全部正常结束；42 组启动门 / 195 源码文件无漂移，observed / planning / bounded / draft 四聚合及新模型 12 文件接线证明无漂移。已启动本文所列完整 `--preflight ... --model-v41-beta` 命令，等待正式结果；尚未 `--live`。新增结果包括审核分解40、片段恢复46、双坐标21、联合接线74、wire29、规划42+18、分批144、草稿92、编辑器83、草稿聚合313项检查，均为0 Provider，不是新 Skill 生产成功。生产依赖当前冻结，不为预检改动源码或重启同一请求。

账本口径复核：当前生产 DB 为1,208 attempts / 171,355,110已知tokens / ¥119.752753；入口还保留2864424tokens / ¥34.013743的早期历史费用，合计仍174,219,534tokens / ¥153.766496，不能漏掉历史offset而把累计数报低。

## 已实现和已验证

正式种族入口新增显式末尾参数 `--model-v41-beta`。历史 recipe 的 `modelHash` 和角色输入保留原身份；独立 `executionModelBinding` 只控制新付费请求，分别映射原 4096 / 8192 输出配置。不能把旧成果标成新模型生成，也不因换模型清零预算。

接线涉及正式入口、native 容量选择、legacy command bridge、实际账本来源解析、structured 独立消费与 continuation。七个真实发送入口均检查测试版的本地停止时间，无静默回退。新模型费用沿用已说明的保守估算口径，并非测试版独立官方账单。

- 新旧 native 真实 DSH 衔接：42 项断言、2 个真实隔离 DSH 会话；模型响应为注入，不是新 API 调用。完整实际 Zerg 请求上下文保留，旧成果逐字节复用，独立 consumer 拒绝错误模型、能力凭证和缺失来源。
  报告 `build/ticket-18-faction-production-v1/execution-model-dsh-component-v1.json`，hash `32a5c602b230658b2a3d5d34fa36d2cad09a8524247179aba9bda945d1a792c8`。
- legacy bridge / 新入口接线：22 项断言及真实父 recipe 迁移正反检查；12 个源码文件绑定。
  报告 `execution-model-readiness-v1.json`，hash `fb8c2de55b6fe1c2845accc36f3f039a3b5038eaf2d65bc5697893d7c62f19d3`。
- 分阶段执行策略与真实祖先 recipe 读取：252 项断言，复用已完成真实恢复耗时证据，0 Provider。
  报告 `execution-policy-readiness-v1.json`，hash `640ce925611a6a5bcc1ebacaac793db87a61a5bf9f2dd2a0b30b8e1f682113d2`。
- 快速旧接口检查：command envelope 32、continuation 40、budget 59、structured replay、parallel 均通过。仅按受影响源码重验其它门；不是重跑游戏规则全部门禁。

## 尚未证明

完整正式命令已预检通过、`--live`已运行并终止；新模型各角色格式探测已有实际回执，但完整来源审核和五件套可用性未通过。当前停止原因和修复状态以本文顶部及后续槽位修复文档为准。

后续入口的只读检查（03:05 CST）：`run-ticket-18-faction-consumer-evaluation-v1.mjs`仍直接导入V1旧profile并经`/chat/completions`发送；`run-ticket-18-directed-matchup-production-v1.mjs`仍使用旧`strategy-live-production-support-v1`配置。它们尚未获得新模型执行接线，不得直接启动新的付费调用。评估入口需要同时冻结新profile/准确费用估算、发送时窗和独立回执校验，并保持基线/Skill两组使用同一模型；对抗入口还需绑定实际新模型能力凭证与DSH执行策略。现有通用只读consumer重放按`recipe.modelHash`校验profile，不能据此声称已验证新模型的请求/返回模型名。此轮仅检查，未修改这些入口或当前运行依赖，也未提前研究用户新增的三个后续设计问题。

Terran 原未知发送继续隔离，原 ¥0.80 预留不撤销。新模型请求不构成对该不明结果自动重发的授权。旧分解审核的单模型 capability / fragment lease 仍需显式旧新混合迁移才能让该通道跨模型接续；当前隔离让它不会先产生新付费请求。下一非隔离通道为 Zerg，不据此宣称 Terran 已恢复。

后续从真实父 run `faction-v1-27ef94cd6f32462ec36a` 进入预检：

```sh
node scripts/run-ticket-18-faction-strategy-production-v1.mjs --preflight --overall-run guide-repair-bab46109030e9073f739 --continue-from faction-v1-27ef94cd6f32462ec36a --model-v41-beta
```

该预检已真正通过，已按同参启动 `--live`。不要重复启动54253或旧27ef请求，不要修改历史产物或跳过来源证明。

## 进度与账本

此检查点无新增 Provider 调用。累计 1,208 attempts、174,219,534 已知 API tokens、¥153.766496 估算与预留，下一通知 ¥200；0 未决 intent / 实际 402。

五件套离线 1/5、runtime 0/5；Terran 来源审核 6/7、Zerg 1/8；T18 2/8，项目 16/22。长目标实际 active；没有新增 Skill 晋级、刷新规则数据、安装、提交或 Codex 子 agent。

技能记录：ctx2skillLoopUsed=true，harnessLoopUsed=true，targetGames=[starcraft-tmg]，roleRoutes=[rule_skill_builder_prompt,harness_optimizer_prompt]。本轮只改离线执行与验证边界，skillsGenerated=0、promotions=0，无对战 UI/动作/memory/training trace；crossTimeReplayResult=上述旧成果重放检查通过，完整对战效果未验收，trainingTruth=false。
