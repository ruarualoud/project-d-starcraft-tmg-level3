# T27 / S272 — v216 正文超时可观察性

## 结论与边界

本轮没有新增Provider请求，没有继续A/B或启动对局。上轮属于实质进展：A恢复路线已修，并由实际重发证实context/body与原请求一致，但该请求最终返回503；B返回HTTP200响应头后读取正文超时。

重新读取v212/v215终态后确认：两项均已停止，不是正在等待的模型任务。A Plan9/165已结算calls/29,776,463units；B Plan19/256已结算calls/36,328,314units；未知费用原件仍保留。

240秒来自冻结的roster-teach V2配置，传入实际Structured Transport后启动总计时器；另有同值socket空闲计时器。配置没有漏传。总计时器不随正文数据到达而续期。这是当前配置行为，不足以证明时限应直接增加。

历史进度只记响应头与完整结束，故B原记录不能区分：

1. 完全没有收到正文；
2. 只有空白字节；
3. 已有非空白内容但未收完。

也没有区分总截止与socket空闲。不能事后把HTTP200当成模型完成，更不能把超时一律判为DNS或模型幻觉。A503仍是独立上游错误，本修复没有解决它。

## 实现

仅新增脱敏数值进度：`receivedBytes`、`nonWhitespaceBytes`、`chunkCount`、首字节/末字节/末非空白字节时间；超时注明`total_deadline`或`socket_inactivity`。

- 不记录正文、密钥、任意错误文本或内部推理。
- 非空白字节不等于有效JSON或模型回答；完整JSON解析与原结果接收逻辑保留。
- 历史进度合同没有这些字段仍有效；新字段若存在则验证其计数/时间一致性，禁止夹带正文。
- 未改变240秒配置、模型、prompt、采样、请求正文、策略材料、调查或自动重试额度。
- 当前已启动的旧宿主不会自动热加载；未来经授权恢复时应加载新代码。本轮没有替换宿主或重新发送。

## 具体bug验证

`scripts/verify-slice272-response-body-progress-v216.mjs`使用真实传输实现、模拟socket与虚拟计时器，无实际网络/API。

- RED一次：输入已到达50字节，错误回执仍无receivedBytes，复现`undefined !== 50`。
- 修后GREEN一次：部分正文被总时限截断；无正文空闲；仅空白字节；完整JSON成功；旧合同读取；正文/密钥不泄露。全部通过。
- 0Provider/0真实网络/0Native/0自动重试；没有重跑v151或任何旧绿门。
- 证据：基线build目录的`common-v216-response-body-progress-red.private.json`及`...-green.private.json`。

验证证明新故障记录可区分这些情况，不证明历史B属于某一种，也不证明新一次真实调用会成功。

## 后续选择（已询问，未答复/未执行）

A/B各追加一次受控恢复，仅本次离线请求将等待上限改为10分钟，收集上述诊断；保留全部旧未知费用、不改模型/prompt/军表/调查额度，不开局、不自动继续重试。
这是候选实验，不是已批准或已配置的行为。若用户不同意则保留停点；即使同意也先核对同一请求与现有消费记录，不借新编号重置上次授权。

## Diff 与进度

- `packages/secure-provider-runtime/provider-egress-contract-v1.mjs`：可选脱敏正文进度及超时原因合同。
- `packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs`：采集计数/时间及计时器来源。
- `scripts/verify-slice272-response-body-progress-v216.mjs`：只复现本次真实诊断缺口。
- 本报告、CURRENT_WORK、根TASKS/PROJECT_MEMORY。无安装、删除、代理、提交或官方数据更新。

T27 5/6，T23 33/36；主线剩272/248/249/250共4片，完整对局0/12。全目标未完成，不能以本次诊断能力代替Teach/Plan或完整对局验收。

## Harness

- harnessLoopUsed: true
- targetGames: starcraft-tmg
- promptPackRoutes: harness_optimizer_prompt（没有新增模型路由调用）
- harnessToolsCalled: 本地Structured Transport模拟、共用回执验证；原失败只读
- uiTraceEvidence: 无UI变更/截图，不宣称网页验收
- agentDecisionEvidence: 无新模型回答；原A503/B超时证据保留
- memoryTraceEvidence: 无修改策略记忆；工程诊断结论记入PROJECT_MEMORY
- trainingTraceCandidates: 无；trainingTruth=false
- rollbackOrDemotionRules: 进度数据不证明策略或查询成功；历史缺失数据保持未知
- userVisibleChecks: 明确本机总时限、历史诊断盲点、修复范围和未完成事项
