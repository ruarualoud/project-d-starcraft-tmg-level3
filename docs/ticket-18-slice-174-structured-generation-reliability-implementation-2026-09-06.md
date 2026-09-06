# Ticket 18 / Slice 174：结构化生成可靠性实施记录（2026-09-06）

状态：R0-R5 已完成；R6 的零付费集成预检已通过，正式 faction 生产待续跑。本文记录机制和证据，不把工程门禁、模型审查或离线候选声明为 Rules 真值、正式发布 Skill 或训练真值。

## 实施结果

1. 输出合同成为一等公民。`outputContractRef` 从角色调用、Provider capability、Responses JSON Schema、候选、DSH command 到运行回执保持同一哈希链；宿主持有 index、parentHash、patch route、接受和发布状态。
2. Provider 能力先探测后使用。DeepSeek 使用 `/responses` 与 `text.format.type=json_schema`；实际 capability receipt 绑定 Provider profile、endpoint dialect、模型和输出合同。无匹配 receipt 时在凭据读取和 egress 前失败。
3. 结构化运行时只接收 typed candidate。Adapter 先做传输合同和 JSON Schema 校验，DSH 只映射已验证候选为固定命令，不再解析任意模型 JSON，也不允许模型创作控制字段。
4. 上下文改为依赖闭包胶囊。实际 local-editor 胶囊 73,947 bytes，包含 15 个根、24 个来源节点、11 条边，并绑定 371 条冻结来源的索引；一次只暴露一个密封 issue，但保留原 issue set hash 和 ordinal。
5. 失败被分类而不是统一重试。402、403、429、5xx、schema、capability、context、ambiguous delivery 分流；新调用关闭 prompt-only wire syntax retry。无幂等键时，可能已发送的请求不自动重试。
6. 凭据仍只存在隔离 worker。结构化 transport 固定直连 allowlist endpoint、DNS 全局地址检查与单地址 pin、TLS、无 redirect/proxy、请求和响应大小限制、credential echo 拒绝；402/403 不再折叠为 ambiguous send。
7. 续跑保留历史产物。37 个密封 legacy prompt role 继续使用原合同，不重做；R5 的失败点修复按 role + capsule + contract 的精确哈希导入；只有其后的新 local editors 进入结构化运行时。

## 证据

- R1-R4 零 Provider 门禁：5 + 12 + 5 + 6 + 6 = 34 项通过。
- R5 live canary：`structured-canary-8402a3b34415b4c8b4b808c7f101e46f`，2 次实际调用、23,557 tokens、估算 ¥0.044520。
  - capability probe：492 input / 192 output；实际模型 `deepseek-v4-flash`。
  - objectives local editor：22,196 input / 677 output；相对旧 271,803 input 减少 91.8338%。
  - 无格式重试、无 tool call；结构有效，但语义接受仍为 false，必须经过整节新审。
- R6 runtime 门禁：4 项通过、0 Provider；包括精确 R5 导入、未导入 editor 只过一次结构化 seam、非 editor 不猜合同、封存 legacy editor 先复用。
- 完整 CLI 预检：recipe `d9636a4e06768300481f542a89cf31f9c9bbc1c77107cc90395f722e700e3a16`；156 个角色复用、37 个旧 prompt role 冻结、R5 import hash `5f59201d6b0caabd1280b68412d2ea80ea83de90c10523cb073c5826b891e1e8`；首个新角色精确为 `faction.terran_armed_forces.objectives.1.editor.0.2`；Provider 调用 0。

R5 后累计已知用量为 97,402,161 tokens，估算或历史预留合计 ¥61.732618，非账单；未触发 ¥100 通知线。正式续跑的新增用量必须继续独立记账。

## 仍未完成

- R6 必须由正式续跑证明：R5 修复进入整节 source/Rules guard 和新审，随后新 local editor 实际走结构化通道。
- 当前结构化迁移只覆盖 local editor；reasoner、generator、reviewer 仍使用封存旧合同或既有 typed validation，不能声称所有角色已迁移。
- capability receipt 当前是内容哈希证明；长期 Ed25519 签名与短期 HMAC seal 仍应在正式 promotion authority 接线时完成。
- 总规则候选仍只是离线依赖合格；两个 faction、双向 matchup 和全部 formal/runtime acceptance 尚未完成。

## 下一步

从 `faction-v1-9a88d1a1008f0bb079ba` 按上述 recipe 正式续跑。任何 schema/context/capability 错误先修合同或接线；任何语义/来源错误进入 typed repair；402 立即停止全部工作；ambiguous delivery 不自动重发。完整 faction 候选产生后，再运行独立消费者、来源核验、规则应用与对局策略评估。
