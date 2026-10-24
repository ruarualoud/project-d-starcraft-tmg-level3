# T27 / S272：v819 假设来源身份修复

属于新 P0–P6 主线的 P2 输入／P5 自动恢复，不另开 Ticket，不恢复旧实验。

## 实际问题与根因

同一产品 Run `slice272-product-generation-v645-lqMWaS` 在 e7303、e7312、e7321 三次结论纠错失败后停止；43480已退出，无running/pending。正式军表仍r4、2000矿/170气，未发布最终Plan。

- 第三次请求：`91d7870b627f7d5e7a0efc0d14e77f1750d795e3fb810a052d25f6b8f8a90cba`。
- 第三次原回复：`c084a2747a83092d03bb7fc0aaac984e32a73654736ffd24bd070fd953938a32`。
- 请求明确指定 `hypothesisDesignSource0.evidenceNumber=1211`，还把父声明正文放到该来源的 `/experimentOrigin/hypothesisTest` 并标为read。
- 实际1211原件 `566a0d5aa2fcab737f05fe216db3e0c78f675ed59c31a1176bbefaf1a57e7da8` 的该字段为null，是修复后的前置场景；1213原件 `1b880b96e5f6bf7ee87a724dc21566875ec0399155cf55cf0217a7ef9b7debdd` 才保存相同假设。
- 资产索引原来只按同订单取 `sources[0]`，没有核实际原件。模型遵从错误来源提示，又被原件校验拒绝。这是工程输入/校验不一致，不能归因为模型忽略反馈。

本轮不扩展整份结论修复协议，不手改原答案，不重算已有三配置火力。

## 修改范围

1. `roster-workflow-experiment-assets-v1.mjs`：复用校验同一origin函数，只有实际包含相同假设的来源才进入设计引用；全部订单结果保留在relatedSourceEvidenceNumbers，原观察与覆盖保持。
2. `roster-workflow-hypothesis-context-v1.mjs`：准确来源路径；加sourceIdentityVersion。无载体时保留声明/未决责任，不生成虚假inline read。
3. `roster-workflow-read-role-v1.mjs`：仅识别旧输入自己指定的假来源导致的已耗尽纠错，给一次命名恢复；新合同、无关错误、在途请求均不授予。
4. `roster-decision-product-journey-v1.mjs`：既有产品恢复入口记录具体原因。仍由模型选引用和结论，后续独立来源/覆盖审核不变。
5. `scripts/verify-slice272-hypothesis-source-v819.mjs`：仅复现本次真实bug，隔离读取原件，无Provider/Native/生产写。

## 定点验证

- 首次进程未启动：误用本机不存在的`/opt/homebrew/bin/node`；ENOENT，没有测试或模型执行。改为本机PATH的node。
- RED：`build/slice272-v819-gate-1792573163747.json`，实际原件null与输入声明不一致。
- 修后唯一GREEN：`build/slice272-v819-gate-1792573242650.json`，约4.6秒（命令墙钟，非模型时间）。
- 验证：正确来源1213；场景导航与比较覆盖保留；缺载体/不同假设不制造来源；旧合同只追加一次、新合同/无关错误/在途不追加；原回复、状态、调用/次数不改。0Provider、0Native、0生产写。旧已通过门禁未重跑。

## 真实接续与验收边界

60487从同Run载入v819，日志`build/slice272-v819-live-1792573316556.log`。不重建房间/军表，不清旧账或轮数，不传Provider额外重发开关。

此时真实模型更正、独立来源审核、最终战略采纳仍待。测试不证明策略改善；分武器火力不能相加当合并攻击，也不自动证明多买升级值得其成本。最终比较仍由模型与独立审核负责，Host不注入取舍。

### 实际接续 e7336

新请求 `2eaf7ff712d027687673a60de6ec3f648b1871654f1731fe739d6f153b1c0129` 已实际交付1213与sourceIdentityVersion1。Flash回复 `3568684f3c6a85a34fcf98b61269e99d457a355d9da1ccfa68e13616526bbf5d` 自行改为1213，原语义检查通过，保存proposal `2ce9495f786758eb7b34ec6c9f1c0dc04729f664b659d6b84a2cc76f16920e82`，纠错退出，产品进入逐项独立来源审核；没有重新执行Native测量。

本次真实调用205339 units（输入204124、输出1215；cache hit36608/miss167516），Provider耗时10.454秒，不是全链路墙钟。旧调用与费用另保留；不把cache变化算策略收益。

模型当前判断为“在所声明场景下保留三升级得到支持”，并保留分攻击/非合并火力、未测反击、最终作者另作取舍等限制。这仍是待独立审核的模型提案，不是我们已证明策略更优。独立审核与正式Plan准出尚未完成。

T27 5/6；T23 33/36；余S272/S248/S249/S250共4片；最终Plan0/6、对局0/12。

Harness记录：harnessLoopUsed=true；targetGames=starcraft；promptPackRoutes=roster_workflow_experiment_planner；harnessToolsCalled=原来源读取/现有HTTP产品续行；uiTraceEvidence=本轮无新UI验收；agentDecisionEvidence=上述三次真实请求/回复，实际修后待；memoryTraceEvidence=条件实验与实际对局记忆仍隔离；trainingTraceCandidates=无；rollbackOrDemotionRules=任何错误源身份/丢原声明或观测即不准出；userVisibleChecks=尚无最终Plan验收。
