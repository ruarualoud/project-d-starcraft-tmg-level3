# Ticket 18 / Slice 174：结构化生成可靠性实施记录（2026-09-06）

状态：R0-R5 已完成；R6 已完成零付费集成预检并持续从已修复的最新谱系继续 faction 生产。本文记录机制和证据，不把工程门禁、模型审查或离线候选声明为 Rules 真值、正式发布 Skill 或训练真值。

## 实施结果

1. 输出合同成为一等公民。`outputContractRef` 从角色调用、Provider capability、Responses JSON Schema、候选、DSH command 到运行回执保持同一哈希链；宿主持有 index、parentHash、patch route、接受和发布状态。
2. Provider 能力先探测后使用。DeepSeek 使用 `/responses` 与 `text.format.type=json_schema`；实际 capability receipt 绑定 Provider profile、endpoint dialect、模型和输出合同。无匹配 receipt 时在凭据读取和 egress 前失败。
3. 结构化运行时只接收 typed candidate。Adapter 先做传输合同和 JSON Schema 校验，DSH 只映射已验证候选为固定命令，不再解析任意模型 JSON，也不允许模型创作控制字段。
4. 上下文改为依赖闭包胶囊。实际 local-editor 胶囊 73,947 bytes，包含 15 个根、24 个来源节点、11 条边，并绑定 371 条冻结来源的索引；一次只暴露一个密封 issue，但保留原 issue set hash 和 ordinal。
5. 失败被分类而不是统一重试。402、403、429、5xx、schema、capability、context、ambiguous delivery 分流；新调用关闭 prompt-only wire syntax retry。无幂等键时，可能已发送的请求不自动重试。
6. 凭据仍只存在隔离 worker。结构化 transport 固定直连 allowlist endpoint、DNS 全局地址检查与单地址 pin、TLS、无 redirect/proxy、请求和响应大小限制、credential echo 拒绝；402/403 不再折叠为 ambiguous send。
7. 续跑保留历史产物。37 个密封 legacy prompt role 继续使用原合同，不重做；R5 的失败点修复按 role + capsule + contract 的精确哈希导入；只有其后的新 local editors 进入结构化运行时。legacy 集合从续跑产物的实际协议元数据派生，已结构化的产物永不会因 role ID 相似而重回旧 prompt 路由。
8. 审阅引用的布局差异有专用恢复边界。只有当超长引用在仅归一项目符和空白后能完整、顺序精确绑定到本次密封官方来源时，才把其 240 字前缀用作传输元数据；原引用/新引用哈希、长度、段落与布局证明全部记录。不改原 Provider 输出、不改判断、不新增来源证据；无法精确绑定时仍封闭失败。
9. 目标化 reviewer 也进入 Responses JSON Schema。模型只能输出最多两个 target slot、focus、判断、理由和 source slot；targetId、完整标题、sourceRef 和 coverage source 都由 host 从密封目录映射。胶囊为 408,572 bytes，包含完整 Core/FAQ、当前阵营全部产品来源、完整当前章节和总规则 Skill 哈希/资格；不再同时重复携带 236KB 派生 Skill 正文。结构解码后仍必须通过原 target quote、来源、coverage 和语义验证。
10. 对可解析但违反本地 schema 的 reviewer 候选增加一次定点修复。Adapter 只把 parsed domain value 和精确 validation paths 交给 durable runtime；安全回执仍不保存原始传输体。修复调用必须返回完整对象，但只能改变失败路径，其他解析后值逐项哈希相同；仍需再次通过同一 schema、host materialization 和原语义门。最多一次，不截断、不猜测、不循环重生。
11. 对 HTTP200 但 wire JSON 非法的响应先执行唯一可证明的无损归一化，再进入同一 JSON Schema 门。允许集合仅为缺失最外层对象闭合、单一 JSON fence、二者组合、已证明的冗余数组/对象闭合和唯一可恢复的单个未转义引号；回执绑定原文/归一化文本/恢复证据哈希，不保存原始敏感传输体，也不继承任何语义接受。无法唯一恢复仍隔离，禁止 prompt-only 盲重试。
12. 累计费用通知使用“当前全局实际或预留 + 当前生产链剩余额度”，不得把已经包含继承费用的整条链上限再次相加。投影同时绑定历史保留、全局账本、继承费用、本 run 费用和链上限；继承费用只计一次。达到真实下一档 ¥100 前仍必须通知，但错误重复计数不得阻断 Provider。

## 证据

- R1-R4 零 Provider 门禁：5 + 12 + 5 + 6 + 6 = 34 项通过。
- R5 live canary：`structured-canary-8402a3b34415b4c8b4b808c7f101e46f`，2 次实际调用、23,557 tokens、估算 ¥0.044520。
  - capability probe：492 input / 192 output；实际模型 `deepseek-v4-flash`。
  - objectives local editor：22,196 input / 677 output；相对旧 271,803 input 减少 91.8338%。
  - 无格式重试、无 tool call；结构有效，但语义接受仍为 false，必须经过整节新审。
- R6 首次正式续跑：`faction-v1-d9636a4e06768300481f`。新结构化 editor 精确成功 1 次（22,191 input / 973 output，约 ¥0.044194），然后整节新审在两条 333/254 字、只有布局差异的官方原文引用处失败。本 run 共 6 新调用、1,430,954 tokens、约 ¥0.399657，失败码 `FACTION_SCHEMA_REPAIR_NO_PROGRESS`；没有 402 或未结算请求。
- 审阅引用真实样本门：7 项通过、0 Provider；原审阅与无效 schema repair 哈希相同 `51aace80…`，两条引用均精确绑定到本次官方来源，元数据长度 333/254→240/240，否定/肯定判断不变。
- R6 runtime 门禁：5 项通过、0 Provider；除精确 R5 导入、未导入 editor 只过一次结构化 seam、非 editor 不猜合同、封存 legacy editor 先复用外，新增结构化产物不重回 legacy 路由的回归。
- 完整工作流回放：64 项通过、0 Provider，报告哈希 `e3dd3f457876d4183045be25ce7503856236ca2b0e7f8075cc0a2934ddb58f20`。最新 CLI 预检 recipe `f0e6c2aa6d65daad62c6c6e1da7b2f9985a0a4210d17f784b441e57f2c446ec6`；162 个角色复用、37 个旧 prompt role 冻结、R5 import hash `5f59201d6b0caabd1280b68412d2ea80ea83de90c10523cb073c5826b891e1e8`；首个新角色已推进到 `objectives.1.review-target-batch-v1.supportive.1.6`，路由为 `legacy_typed_validation`；Provider 调用 0。
- 第二次 R6 正式续跑：`faction-v1-f0e6c2aa6d65daad62c6`。成功完成前一轮剩余新审、字段绑定和第二个真实结构化 editor（22,088 input / 973 output / 约 ¥0.043140）；首个修改后整节新审仍走旧 `json_object + prompt` reviewer，正常 stop 但在 offset 2024 返回 separator 型非法 JSON。本 run 新增 9 calls / 2,283,906 tokens / 约 ¥0.570221，无 402/在途/自动重试。
- reviewer 精确 schema 能力探针：`structured-review-probe-4a6eee856a4ddceab7e20b3ee2753974`，1 call / 702 tokens / 约 ¥0.001454，0 重试。其前一个 512-output 配置在出网前被 256 探针上限拒绝，0 token / ¥0，失败记录保留。
- reviewer 结构化本地门：初版 7 项通过、0 Provider；胶囊 408,572 bytes，target/source 身份均由 host 映射，重复/越界 slot 封闭失败。CLI 预检 recipe `bac6bf97cd50325f0d775e31f12dd708562ba76c23ace03bec4c8649f5312440`；复用 169 roles、冻结 37 个旧 prompt roles 和 88 个旧 reviewer roles，首一 miss 精确为 `objectives.1.review-target-batch-v1.supportive.2.0`，路由 `responses_json_schema`，0 Provider。
- 第一次真实结构 reviewer：`faction-v1-bac6bf97cd50325f0d77` 的 Provider 返回 HTTP 200 且 JSON 可解析，但本地门发现 `$.verdicts[0].reason`、`$.verdicts[1].reason` 超长及 `$.verdicts[0].sourceSlots` 超量，因此隔离失败而未进入 Skill。本轮 1 call / 123,444 tokens / 约 ¥0.441606，无重试、402 或在途请求。
- schema-instance 定点修复门：adapter 12 项、structured runtime 6 项、structured reviewer 9 项、local editor 5 项、continuation 38 项、budget 25 项全部通过，0 Provider。正例证明两次调用内只缩短被点名理由及 sourceSlots；反例证明任何未点名 verdict 改动封闭失败。最新零付费预检 recipe `a9ebe04ed3442c97cb2c24da5bc97b3577866afb5ca57805ae489b5c84581904`，复用 169 roles，仍精确从 supportive.2.0 进入 Responses JSON Schema。
- 第一次定点修复实跑：`faction-v1-a9ebe04ed3442c97cb2c` 共 2 calls / 247,921 tokens / 约 ¥0.886333。首候选只剩 `verdicts[1].reason` 403>400 与一个 coverage 非法附加字段；修复准确删除附加字段，但因旧 issue 只给 `string_too_long` 而未传 actual/max，仍原样保留 403 字 reason。两次均 HTTP200/可解析但本地 schema 隔离，无第三次调用、402 或在途请求。
- actual/max 与精确失败候选续跑门：validator issue 现在携带长度/数量上下界或类型/枚举约束；删除被点名非法字段也可通过“屏蔽后其余对象哈希一致”证明。前一 run 的首个 rejected candidate 由 continuation manifest 独立哈希授权，在新合同下重验相同 path/code 后才能作为修复输入，不继承接受结论。合同5、adapter12、runtime6、review10、continuation40、editor5、budget25 项均0Provider通过。最新 preflight recipe `38cff03b5a47b54b65738aa2ffa65e2e36b1cd205da6ca00a808462ab882e111`，169 roles复用、1 rejected candidate导入，首个未缓存角色精确为 `supportive.2.0.schema-repair.1`，首审重放调用0。
- actual/max 修复实跑 `faction-v1-38cff03b5a47b54b6573` 证明导入生效且只调用修复角色：1 call / 124,619 tokens / 约 ¥0.445411。但模型在明确 403/400 后仍逐字返回同一 403 字 reason；本地门再次隔离且没有第二次修复。三次实际 Provider 输出一致，故停止把不合理字符边界当模型服从问题。
- reviewer 合同 V2：V1 哈希 `ac4f185c…` 原样冻结并可展示；V2 哈希 `00acc1f9…` 仅把 verdict reason 的 maxLength 400→800，coverage reason 仍400，host fields/mapper/semantic validator不变。真实403字候选在V1失败、V2通过结构门，但不继承语义接受。V2 capability canary `structured-review-probe-b7791c9a70d07662279e289fdec8f03a` 通过，1 call / 702 tokens / 约 ¥0.001454。review11、continuation40、editor5、budget25及基础合同/adapter/runtime门均0Provider通过；preflight recipe `ad5d16565e2b118d830a4ef5186b2d4e2804fe2ef066dd03de63d79b152f4b76` 复用169 roles、V1候选跨合同导入0、首个miss为V2 supportive2.0。
- V2 首次正式审阅 `faction-v1-ad5d16565e2b118d830a` 没有 schema 候选：HTTP200 输出正好达到 2,048 tokens，并以 `max_output_tokens` incomplete 结束；1 call / 124,487 tokens / 约 ¥0.452613，0 自动重试。按 recovery ladder 单独授权一次同合同、同上下文、同任务的 4,096-token 容量续跑，仍关闭运行内自动重试；若再次截断则改 reviewer 分批。review12、continuation40、editor5、budget25 均0Provider通过；preflight recipe `58dc727c7ae7ce8cece50b62cde7a6396c576971fb7c5c21f50db0e25ce7036a` 复用169 roles，首个miss仍为V2 supportive2.0。
- 4,096-token 正式续跑 `faction-v1-58dc727c7ae7ce8cece5` 新增 7 calls / 876,363 tokens。四个 supportive 批次均完成：2.0 与 2.4 的首候选被本地 schema 拒绝后，各通过一次定点修复；2.2 与 2.6 一次通过。随后 `objectives.1` 的首个 adversarial 批次返回 HTTP200/正常结束，但正文不是合法 JSON；安全回执保留错误分类、输出哈希和用量，原始正文按策略不落盘，因此该历史输出不能事后恢复。本 run 没有自动重试、402 或在途请求。
- wire 无损恢复门：主生产 readiness 20/20、adapter 15/15、structured runtime 6/6、review 13/13、continuation 40/40、editor 5/5、budget 25/25，均 0 Provider。实际旧失败只能证明错误类型，不能伪称已恢复；恢复策略只对未来响应在内存中执行。最新 CLI preflight recipe `1d413de35d44f10ab32ad2c6b7cf529264ce54cf2afb428108e7495ba3ea51fb` 通过，复用 173 roles，继承 246 calls / 63,838,168 tokens / ¥20.501460 的生产链账本；首个未缓存角色精确为 `faction.terran_armed_forces.objectives.1.review-target-batch-v1.adversarial.2.0`，路由 `responses_json_schema`，Provider 调用 0。
- 首次按 `1d413de3…` 正式启动在出网前被 `CNY_100_NOTIFICATION_REQUIRED` 停止，0 Provider/0 token。诊断证明旧公式把当前全局 ¥67.185895 与整链 ¥35 上限直接相加，重复计算其中已继承的 ¥20.501460。修复后 budget 29/29、review 13/13、editor 5/5 均 0 Provider；真实剩余链额度 ¥14.498540，最坏累计 ¥81.684435。最终 preflight recipe `3d2d9aba32a329115cbc22a0e0a17eb664bcc212d3c4b1ff8559470014cf6575` 仍复用 173 roles、保持同一 first miss 和 0 Provider。

最新已知累计用量为 102,615,259 tokens，估算或历史预留合计 ¥67.185895，非账单；未触发 ¥100 通知线。后续正式续跑的新增用量必须继续独立记账。

## 仍未完成

- R6 已证明新 local editor 的实际结构化调用和整节新审进入；仍必须从修复后谱系完成两个 faction 全部 15 节和后续独立验收，才能完成 R6 正式生产收口。
- 当前结构化迁移覆盖 local editor 和所有新 target reviewer；reasoner、generator 仍使用封存旧合同或既有 typed validation，不能声称所有角色已迁移。
- capability receipt 当前是内容哈希证明；长期 Ed25519 签名与短期 HMAC seal 仍应在正式 promotion authority 接线时完成。
- 总规则候选仍只是离线依赖合格；两个 faction、双向 matchup 和全部 formal/runtime acceptance 尚未完成。

## 下一步

从 `faction-v1-58dc727c7ae7ce8cece5` 按上述无损 wire 归一化 recipe 正式续跑。任何 schema/context/capability 错误先修合同或接线；任何语义/来源错误进入 typed repair；402 立即停止全部工作；ambiguous delivery 不自动重发。完整 faction 候选产生后，再运行独立消费者、来源核验、规则应用与对局策略评估。
