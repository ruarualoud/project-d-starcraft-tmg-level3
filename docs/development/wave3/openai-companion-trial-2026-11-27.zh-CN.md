# 本场 OpenAI 副官试用准备

用户授权：复用用户已有组织 key，模型 GPT-5.4 mini，先三次短对话。实现及服务仅限本测试树与 5483。本轮不创建、读取或持久化任何真实 API key；等待用户在自己席位的密码框输入。

## 接线与边界

旧产品入口固定连接 DeepSeek，不能直接在旧入口使用 OpenAI key。本轮新增服务端冻结 OpenAI 配置，端点只允许 `https://api.openai.com/v1/chat/completions`；继续使用已有隔离 worker、TLS／DNS 验证、JSON 回复合同、无自动重试。OpenAI 模型使用 `max_completion_tokens` 和默认采样，发送体不包含 DeepSeek 的 thinking 参数。

主服务保留 `--offline`，通过明确的 `--companion-provider=openai --companion-model=gpt-5.4-mini` 仅启用副官工厂。模型、地址及三次上限从服务端返回，战桌顶部的标签和输入框明确显示 OpenAI。tracking ID 在本地服务拒绝为实际 key；OpenAI 凭据也不能附到旧人机模式的 DeepSeek 对手路径。

凭据按房间／席位放在现有运行内存中，关闭服务需重新输入。每席此配置最多三次尝试，拒绝第四次；不含凭据的 dispatch 日志按冻结 profile 计算已用次数，所以换钥匙或重启不重置。成功回复保留模型与 token 使用回执。费用为公开价格估算，不是组织账单，也不能据此认定赠金余额或具体抵扣来源。

## 验证

- `node scripts/verify-wave3-openai-companion.mjs` 通过：固定 OpenAI 地址、拒绝机器凭据默认回退、JSON 合同、兼容参数、三次后停止（包括换钥匙和重启）、非法 JSON／凭据回显拒绝且不重试、每席临时钥匙、费用非账单。仅注入 HTTPS fixture，真实 Provider 调用 0。
- Web 静态导出通过。修改的 Provider 面板类型诊断为 0；全量仍有既有 43 项错误。
- 既有 `verify-ticket-16-provider-egress-allowlist-v1.mjs` 为 39/40，失败点为旧测试要求非法 JSON 抛异常，而当前传输层返回供调用方拒绝的类型化结果。以内存覆盖读取 Git HEAD 原始传输模块重跑，报告 hash 与 39/40 失败点完全相同；本轮没有新增此失败。新 OpenAI 测试已验证调用方拒绝非法回复和凭据回显。
- 浏览器已在原房间恢复到状态修订 r0，显示「本房 AI · OpenAI」、GPT-5.4 mini、本席此次实验最多三次请求及空白密码框。用虚构的 `key_` 编号验证：服务器拒绝并显示「tracking ID 不能用于调用」，密码框在等待响应前清空，没有模型调用。截图仅在本机 `build/playtest-web/openai-key-entry-ready.png`。
- 真实请求等待用户在其玩家二窗口填写实际项目 key。当前真实模型 dispatch 日志为 0，不声称已调用 GPT 或已验证用户余额。不要在用户填钥匙时抓取密码值或截图。

## 官方依据

[API 身份验证](https://developers.openai.com/api/reference/overview)：请求使用实际 bearer 凭据，项目／组织决定使用归属。tracking ID 不能代替密钥。

[GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)：支持 Chat Completions 和结构化输出；公开价格为每百万输入 $0.75、缓存输入 $0.075、输出 $4.50。这里的短对话用途与请求上限是本轮工程选择。

[官方价格表](https://developers.openai.com/api/docs/pricing)：费率估算只使用公开价；GPT-6.2 Sol 的未启用备选使用保守的 list rates，不推断本账号优惠资格。

`harnessLoopUsed: true`；路由为 companion 只读对话；没有棋子决策、Rules Apply、策略记忆晋升或训练候选。实际 prompt／回复及耗用验收等待用户本地输入后最多三次调用。
