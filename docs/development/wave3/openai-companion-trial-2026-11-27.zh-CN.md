# 本场 OpenAI 副官三次试用

用户授权：复用用户已有组织 key，模型 GPT-5.4 mini，先三次短对话。实现及服务仅限本测试树与 5483。用户已在自己席位的密码框完成输入，服务仅在运行内存持有凭据；助手不读取密码值，不把真实 API key 写入文件或报告。

## 接线与边界

旧产品入口固定连接 DeepSeek，不能直接在旧入口使用 OpenAI key。本轮新增服务端冻结 OpenAI 配置，端点只允许 `https://api.openai.com/v1/chat/completions`；继续使用已有隔离 worker、TLS／DNS 验证、JSON 回复合同、无自动重试。OpenAI 模型使用 `max_completion_tokens` 和默认采样，发送体不包含 DeepSeek 的 thinking 参数。

主服务保留 `--offline`，通过明确的 `--companion-provider=openai --companion-model=gpt-5.4-mini` 仅启用副官工厂。模型、地址及三次上限从服务端返回，战桌顶部的标签和输入框明确显示 OpenAI。tracking ID 在本地服务拒绝为实际 key；OpenAI 凭据也不能附到旧人机模式的 DeepSeek 对手路径。

凭据按房间／席位放在现有运行内存中，关闭服务需重新输入。每席此配置最多三次尝试，拒绝第四次；不含凭据的 dispatch 日志按冻结 profile 计算已用次数，所以换钥匙或重启不重置。成功回复保留模型与 token 使用回执。费用为公开价格估算，不是组织账单，也不能据此认定赠金余额或具体抵扣来源。

## 验证

- `node scripts/verify-wave3-openai-companion.mjs` 通过：固定 OpenAI 地址、拒绝机器凭据默认回退、JSON 合同、兼容参数、三次后停止（包括换钥匙和重启）、非法 JSON／凭据回显拒绝且不重试、每席临时钥匙、费用非账单。仅注入 HTTPS fixture，真实 Provider 调用 0。
- Web 静态导出通过。修改的 Provider 面板类型诊断为 0；全量仍有既有 43 项错误。
- 既有 `verify-ticket-16-provider-egress-allowlist-v1.mjs` 为 39/40，失败点为旧测试要求非法 JSON 抛异常，而当前传输层返回供调用方拒绝的类型化结果。以内存覆盖读取 Git HEAD 原始传输模块重跑，报告 hash 与 39/40 失败点完全相同；本轮没有新增此失败。新 OpenAI 测试已验证调用方拒绝非法回复和凭据回显。
- 浏览器已在原房间恢复到状态修订 r0，显示「本房 AI · OpenAI」、GPT-5.4 mini、本席此次实验最多三次请求及空白密码框。用虚构的 `key_` 编号验证：服务器拒绝并显示「tracking ID 不能用于调用」，密码框在等待响应前清空，没有模型调用。截图仅在本机 `build/playtest-web/openai-key-entry-ready.png`。
- 用户确认安全输入后，仅核对「已设置你的 Key」标签，未读取密码值。当前窗口服务端投影为 `player1`；以真实投影为准，不沿用先前“玩家二窗口”的推断。在「战桌 → 战术通讯 → 同伴群聊」恢复单一 Sarah Kerrigan 会话，避免一次消息触发多个角色请求。

## 三次真实请求结果

三次均返回 HTTP 200；请求模型 `gpt-5.4-mini`，服务端报告模型均为 `gpt-5.4-mini-2026-03-17`。每次一次物理尝试，合计三次，无自动重试。没有发送第四次，也不通过换钥匙、重开会话或重启来重置上限。

| 次数 | 输入 token | 输出 token | 实际界面结果 |
|---|---:|---:|---|
| 1 | 243184 | 102 | 确认接通，说明可见的公开战局，对不掌握的合法行动细节标注未知 |
| 2 | 243374 | 40 | 确认记住本次对话测试口令，不操作棋盘 |
| 3 | 243511 | 47 | 正确复述口令，说明看不到对手未公开计划，也不能替玩家移动棋子 |

合计 730069 输入、189 输出 token。按公开输入 $0.75／百万和输出 $4.50／百万、不计缓存优惠估算为 **$0.54840225**。当前回执没有缓存输入明细，不能据此计算缓存折扣；这不是实际账单，组织余额及赠金抵扣来源仍未核实。

本机脱敏回执为 `build/playtest-web/host/rooms/<当前房间>/companion-provider/player1/{dispatch,usage}.jsonl`；只汇总模型、状态、用量、尝试数，不读取或记录凭据。浏览器截图 `build/playtest-web/openai-three-trials-success.png` 显示真实会话，棋盘修订仍为 r0。聊天记录的“回合 6”是六条对话转写，不是游戏回合推进。

发现的限制：短消息仍每次携带约 24.3 万输入 token，公开战局上下文需要在后续试用前裁剪。这里只记录真实耗用，尚未定位或修复上下文膨胀；不将三次连通成功宣称为成本优化或策略效果验收。

## 官方依据

[API 身份验证](https://developers.openai.com/api/reference/overview)：请求使用实际 bearer 凭据，项目／组织决定使用归属。tracking ID 不能代替密钥。

[GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)：支持 Chat Completions 和结构化输出；公开价格为每百万输入 $0.75、缓存输入 $0.075、输出 $4.50。这里的短对话用途与请求上限是本轮工程选择。

[官方价格表](https://developers.openai.com/api/docs/pricing)：费率估算只使用公开价；GPT-6.2 Sol 的未启用备选使用保守的 list rates，不推断本账号优惠资格。

`harnessLoopUsed: true`；路由为 companion 只读对话；没有棋子决策、Rules Apply、策略记忆晋升或训练候选。三次真实请求与对话连续性已验收；未验收策略效果，未扩展其他模型实验授权。
