# T18 / S174：Terran 有界续跑与测试模型退场

## 15:09 更新：混合正式工厂与独立冷读取已接线，等待关联回归后真实生产

新增混合 assembly/runtime/environment/role/integration：按每个片段的实际 owner/model/capability 验证旧 target.0、新授权 target.1 与新 coverage.0；新 recipe 明确登记单次替代和混合消费合同。正式 main、续跑收集器与独立冷读取栈共用该路径，原未知调用、隔离记录与费用预留不改写。

实际联合测试发现：未完成的原 V5 审核不在历史已完成角色名单中，外层会误用 V6 重建其请求。已新增独立 `mixedReviewLegacyRoleIds` 路由字段，精确绑定已认证的那一个原审核；不修改冻结旧名单。正式、字段恢复、冷读取三处一致。

`node scripts/verify-ticket-18-mixed-review-wiring-v1.mjs --dsh`：25项、2真实DSH、2注入Provider、0实际API；hash `53cee73408b661ab36186270b27dc1b72bf127260b9baecc8524f7186c217bff`。覆盖旧片段不重发、替代结果保存后中断、SQLite重开、单次授权复用、剩余新片段、原V5外层及完整独立冷读取。主入口尚未完成新版本正式preflight，因此不能说Terran实际恢复生产或整章已通过。

当前唯一真实生产parent为 `faction-v1-83c82df7434ebe9494d3`；下面13:50及5fd记录为历史。模型退场的实际Worker观察与正式入口自动fallback仍未闭合，不能把混合接线等同退场接线。五包离线1/5、对战0/5；实际累计180,213,517 tokens、估算¥172.034075。

2026-09-09 13:50 CST 最新：新增实际fragment执行器/独立paid consumer已通过27项与3真实DSH，0实际Provider。还未解除正式Terran隔离或接入混合模型整章组合，模型退场也尚未接正式主入口。当前另有字段生产相关回归队列，沿唯一parent5fd正式续跑待这些检查结束；不得修改其活动依赖。

## 13:50 新执行器：已到实际 Adapter/DSH 边界，尚未进入正式混合组合

新增 `faction-ambiguous-replacement-runtime-v1.mjs` 和 `verify-ticket-18-replacement-runtime-v1.mjs`。从实际5fd祖先链重新认证原Terran不明发送任务，以实际已付费beta target能力凭据准备新请求；完整原437771B片段输入不变，独立continuationRef使请求与原未知调用不同。原请求/¥0.80预留/不明结果状态不改。

验证命令 `node scripts/verify-ticket-18-replacement-runtime-v1.mjs --dsh`。新Provider回复明确注入真实Adapter，单次发送；模拟支付结果/候选已保存、片段尚未提交时中断，然后同run和新run恢复。3次真实pinned DSH只对应1次注入Provider，后两次不重复发送；跨run产物保留实际paid owner。独立消费者重读原授权准备、实际control choice、真实paid capability、actual attempt/candidate/runtime receipt和DSH，而非删除新continuationRef去冒充旧请求。27项通过 `e0a60eff856c737f816dd42f84076c21c64b0c12677e83dc7b28c7f3191595da`。此前默认注入DSH27项 `aeb1d5596782711d8b912f6896b3f475d55b012da8f29ac3b347b6d7996055b9` 不当成真实DSH证明。

本轮新模块未进入生产code closure，因此没有修改正在执行字段/旧路径回归的依赖。后续一次接线要覆盖：

1. 按job绑定实际执行身份的混合组合：`target.0`消费真实27轮已有opening-fence片段，按原旧模型和真实能力证明验证；`target.1`用新单次替代执行器；`coverage.0`用新模型正常请求。不得用整组统一beta凭据重验证旧片段，不能重买已完成target.0。
2. 独立冷消费者按每个片段的实际owner/model/capability验证并重装配整份review；新protocol/recipe/续跑迁移明确登记。老未知quarantine保持原样，只有对应授权新任务才可解除lane阻断，不全局清隔离。
3. 正式main/dry工厂和整章review回调同用混合组合，真实主入口通过后才说Terran重新并行。当前静态诊断仍应报告未接线。
4. 模型退场另接真实Worker不可用观察、本地截止和显式继任请求；模型切换不能刷新上述单次任务额度。新替代执行器目前不提供付费失败后的退场重发授权。

剩余风险明确保留：上述中断测试点是付费候选/runtime receipt已经持久化之后，不覆盖所有可能的结算与候选写入之间硬崩溃。实际策略判断、整章资格、对战效果也未由本模块证明。本轮仍0新增API费用，五包离线1/5/对战0/5，T6/7、Z2/8。

## 用户确认与边界

- Terran 旧轮次产物继续保留，按原模型、原请求、原来源和原验收级别读取；不为统一模型而重生成。保留不等于自动补上来源/策略/实际对战验收。
- 新请求优先 `deepseek-v4.1-flash-expires-on-0910`；测试模型退出后允许退回 `deepseek-v4-flash`。这是新增的明确授权，旧 V1 的 `silentFallback=false` 仍冻结，新机制必须显式接线。
- 原不明发送不能被模型切换隐式重发。保留原费用预留与不确定状态；只有独立授权、完整上下文、单次额度和持久请求身份都绑定后才可新发。
- 不刷新冻结游戏规则/FAQ数据，不启用 Codex 子 agent，不扩大为用户记录的三个后续设计议题。这里核对的是 Provider 接口事实，不是游戏数据刷新。

## 官方资料核对

官方入门页当前列出 `deepseek-v4-flash`，其别名指向当前 Flash 更新；保留历史模型名并不意味着未来同名服务的权重永久冻结。因此每笔新请求仍需保留调用时的 Provider profile、实际返回模型、时间与响应身份。[DeepSeek 官方入门](https://api-docs.deepseek.com/)

官方 Responses 接口是无服务端对话存储的：客户端每次提供完整历史。因此不能声称可用旧 request ID 从该接口取回 Terran 丢失的响应；本方案是记录放弃未知结果并有界重做该任务，不是假装已完成 Provider 对账。[官方 Responses API](https://api-docs.deepseek.com/api/create-response/)

官方分别定义 401 鉴权、402 余额、429 限流及 500/503 服务错误；这些错误本身不证明模型退场。[官方错误码](https://api-docs.deepseek.com/quick_start/error_codes/)

官方模型列表接口提供可用模型信息，但本次没有核实到测试版的精确退场时间/时区或标准退场错误样本。列表未出现不能单独用于宣称这个测试别名已经下线。项目原有 `2026-09-09T16:00:00Z` 是本地保守截止时间，不是官方承诺。[官方模型列表](https://api-docs.deepseek.com/api/list-models/)

新的错误观察器目前只识别 JSON 的明确模型不可用代码与 HTTP 400/404/410 组合；不依赖正文自然语言猜测，也不把普通 HTML 404 当作模型不存在。上述代码组合目前以注入样本验证，没有冒充正式 Provider 已返回过该错误。

## 真实 Terran 复现

只读原库、完整重建实际片段上下文并通过既有隔离收集器/并行调度边界复现：

- 原 owner：`faction-v1-27ef94cd6f32462ec36a`。
- 原 attempt：`structured-7b7d33f4d14ac43082f54c8fcd251ad74afa7a754d69ece2`。
- 实际任务是 `card_packages.2.review-target-batch-v1.supportive.0.0` 中的 `target.1`。这组三个子任务为 `target.0`、`target.1`、`coverage.0`；不是重新生成整个 Terran。
- 原行 hash `4a8f7159f0dbe9701c248c7d0792639c12865b15b6b45866e2a53e3a8560ac05`，失败码 `STRUCTURED_PROVIDER_AMBIGUOUS_SEND`，可能已送达，没有已知 usage/响应，¥0.80 预留不变。
- 诊断 `730d947723914189fa3342c67b40449d464ffe52bfd8393e59cb07cb84802451`：现有隔离标记 `newProviderCallsPermitted=0` 仍挡住 Terran；Zerg 模拟边界可继续，globalStop=null。诊断没有运行完整 main，也没有模型/DSH调用。
- `node scripts/diagnose-ticket-18-terran-quarantine-v1.mjs --require-terran-dispatch` 仍正确红测 `TERRAN_AUTHORIZED_REPLACEMENT_NOT_WIRED`。不得仅让这个诊断变绿而跳过正式接线验收。

## 新增组件与已验证内容

1. `faction-model-lifecycle-v1.mjs`：显式新模型/稳定模型选择；截止时间或独立认证的不可用证据允许一次退场，选择后保持稳定。旧模型 profile 原身份保留，4096/8192 两个输出档位不变；视觉输入不能在退化时悄悄丢弃。54项检查，报告 `3463c397a12c6a2c733e33abbb96a70f833cd43f2aa0424fdd1fc787a4c5acd7`，0 Provider。
2. `faction-ambiguous-replacement-v1.mjs`：从真实祖先 journal/recipe、失败行、原回执、真实历史 capability 和完整437771B片段上下文重建请求，生成独立 continuationRef。即使退回同名旧模型，也不会复用原不明请求身份。一个原任务只有一个逻辑额度，不按模型重复发放；不发请求。41项检查，报告 `54eaefdab288179435954616e2a9aab6d091e10eacd736adb5f253a236aa037e`。
3. `faction-replacement-dispatch-guard-v1.mjs`：用既有 SQLite schema 的单独零费用 control run 记录选择和 CAS互斥；实际付费行仍由真实生产 store 预留。跨执行者、已有 intent、SQLite重启、重复 model/capability选择均不能再次买一个样本；缓存必须返回真实付费 owner，不能包装成新 run 自己的调用。40项检查，报告 `4d8249c4cde1d2b086f3682110207aff30120c8492a977c7fa04ddf9701d9563`。包括失败后不重发、生产store预算仍生效，以及402前禁止写入control run。这组请求、付款停止是隔离 fixture 注入，0 Provider/DSH。

新增并行反例先红后绿：若按全局intent计数拒绝恢复，会把另一族正常等待响应当成当前Terran故障。已改为只对当前恢复祖先链检查running/intent；独立活动lane不阻塞，真实祖先未终态仍阻塞，402仍全局阻塞。使用实际原行/原能力/原issue复制到隔离fixture复现，不修改生产库。完整主运行并行接线尚待验证。

## 同期正式 Zerg 续跑结果

58/58旧相关门与271源码快检通过；预检99423/PID26828退出0，正式23449/PID33606于11:32 CST退出1，均不再轮询。

新run `faction-v1-5fdab77171f213a6e7c9`，recipe `5fdab77171f213a6e7c93a0c0c77978a9f75d6f577124d7091146942b9a65945`，report `6eeedaf461c99ae3d4740963b81246c1f17dc4f2a744c4d8bbd7fb44c88ae493`。

- 原ce87表示恢复真实成功，原请求未重发。新纠错 `structured-a75134011bf0df7886d0144c0759f4cb7c1efb866a81dc28` accepted，133692tokens/¥0.408582；完整角色artifact `29e679bd9490d39ea19968c77a464ef9c4572503b1ce2b09e06147b77fecedf6`，parsedWire恢复记录 `a19b53e0e9c295dd8a9079565856ec2edc405bfe68f4a829e076de6d886edc9f`。
- 另一新审核 `unit_roles.2.review-target-batch-v1.adversarial.0.0` 的 `structured-2a9e1746184bbd7392e41f800c4325cd595a4cb79299809a` 漏 `$.coverage`。其已付费修复 `structured-20d631c3ce82ca5ef16385820507886c67d85d446ab8c9c1` 又多了 `$.coverage[0].recommendationSlots_note`；两笔HTTP200且usage已知，不是断网/不明发送/模型退场。
- 第一拒收candidate `921b10751072b130b0582d236caf9ed3f90dc38762f60e3bf8dd5a9881580c44`，修复拒收candidate `a27fcf2a0529eb9c9445107e5a2ed9cf08e750650147a0f28a71b8fe6fb1338a`，都保留。后者context `ca610388517c9b83ee59693dfa43708283414b2df06c7b6794e5221cd2187664`，issue `29f8f408d539cee9b06a6f3d5c35f340b0a8308db351b6b99691f7662c3280c2`。
- 外层DSH诊断路由还报告 `routing_evidence_invalid / ERR_INVALID_ARG_TYPE`，不能把它当成真实根因；实际账本已经定位上述schema失败。该诊断传递缺口也需修，但不要再以此掩盖Terran长期隔离或重发整个Zerg批次。
- 本轮实际3calls/404380tokens/¥1.234026；全局1251attempts/178968889known API tokens/¥168.245993估算与预留，0intent/0actual402，下一通知¥200。
- 五包仍离线1/5、实际对战0/5；T6/7、Z2/8。T18 2/8 slices、项目16/22 tickets。来源/规则/策略验收债不因结构恢复或模型切换而消失。

## 仍需接线，不得声称完成

- 在实际 fragment runtime 中混合消费旧模型已付费片段与新模型请求；旧片段不得按新模型凭据验证或重建。
- 单次额度 guard 接入 structured runtime、DSH、跨 run 原 owner candidate/receipt 消费；验证发送后、结算后、片段写入前中断不重复计费。
- Provider 模型退场观察须从真实 Worker 边界持久保存并与失败 attempt 的 payloadHash/状态核对。现在有观察/决策组件，没有正式传输接线。
- 明确区别：未发送前过本地截止可直接选择旧模型；一次新请求已取得明确模型退场拒绝，则需独立有界的退场后继请求记录。现有单次 guard 故意拒绝通过更换模型买第二样本，不能直接放宽它来模拟自动退化。未知发送、schema/策略失败仍不准走退场后继。
- 新模型实际不可用和原请求不明是两个不同故障，不合并归因。402 全局停止优先于任何退化/恢复，账本和下一¥200通知门槛保留。
- 显式 recipe/main/dry/continuation 与独立冷 consumer 接线，并通过真实主入口，再恢复 Terran 与 Zerg 双族并行。

## 本轮技能流程报告

```json
{
  "ctx2skillLoopUsed": true,
  "harnessLoopUsed": true,
  "targetGames": ["starcraft-tmg"],
  "roleRoutes": ["rule_skill_builder"],
  "promptPackRoutes": ["rule_skill_builder_prompt", "harness_optimizer_prompt"],
  "skillsRead": ["general-rules-and-strategy:accepted-offline-only", "Terran/Zerg:unqualified-production-candidates"],
  "skillsGenerated": [],
  "judgeTestsRun": ["actual-Terran-quarantine-boundary", "model-lifecycle-component", "actual-full-context-replacement-preparation", "isolated-SQLite-dispatch-guard"],
  "crossTimeReplayResult": "original attempts unchanged; not battle replay",
  "promotions": [],
  "blocks": ["Terran formal replacement not wired", "automatic model retirement not wired"],
  "remainingRuleGaps": ["independent faction source and strategy evaluation still pending"],
  "harnessToolsCalled": [],
  "uiTraceEvidence": null,
  "agentDecisionEvidence": null,
  "memoryTraceEvidence": null,
  "trainingTraceCandidates": [],
  "rollbackOrDemotionRules": "new bindings opt-in; invalid identity/usage/source proof fails closed; no promotions",
  "userVisibleChecks": ["old results retained", "no repeat send on unresolved intent", "new model name recorded separately"]
}
```
