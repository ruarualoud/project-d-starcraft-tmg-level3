# Wave3 玩家测试会话

本分支为 `codex/wave3-player-test`。玩家测试使用 Wave3 2.99.12 和端口 5483。两席各自提交军表，房主可在准备大厅分享邀请。本机测试第二席可用隐身窗口打开邀请。一次只指导玩家完成当前操作。

房间和席位保存在本工作树的 `build/playtest-web/host`。重启前先检查该目录中的 service.json 和端口，保留已有房间。静态页面在 `build/playtest-web/web`。如已有导出且服务退出，在本工作树执行：

```sh
node scripts/serve-starcraft-product-v1.mjs --offline --wave3-match-candidate=2.99.12 --web-root=build/playtest-web/web --data-directory=build/playtest-web/host --port=5483
```

玩家报告的问题从本分支复现，提交对应修复和脱敏结论，推送本分支。Wave4 使用另一独立工作树与端口 5484。两条线继承双席独立写表提交逻辑。房间凭据、邀请、浏览器资料和本地素材留在本机。

## 本场副官试用授权（2026-11-27）

用户随后明确授权只测试本场副官，复用其组织的现有项目 API key，选择 GPT-5.4 mini，先三次请求。原有暂停不扩展为其他模型实验、自动对战或其他端口授权。尚未通过聊天接收实际 key，也未核实组织赠金余额。tracking ID 不能鉴权，不记录其值。

当前启动命令在前述离线建房配置上增加：

```sh
--companion-provider=openai --companion-model=gpt-5.4-mini
```

副官只向 `api.openai.com/v1/chat/completions` 发请求，凭据按房间／席位仅存运行内存。用户在自己战桌顶部「本房 AI · OpenAI」密码框手动填入实际 key；不给其他席位复制凭据。每席此次配置最多三次请求，失败也消耗一次尝试，无自动重试；不读取机器 DeepSeek 凭据，也不把 OpenAI key 用于旧 DeepSeek 机器对手。请求日志只记录不含密钥的计数、模型和使用回执；三次上限不会因更换 key 或重启服务重置。新一轮额度须另行授权。

离线验证：`node scripts/verify-wave3-openai-companion.mjs`。用户已完成本地安全输入，当前窗口服务端实际投影为 player1；三次真实请求均返回 HTTP 200，报告模型为 `gpt-5.4-mini-2026-03-17`。公开局面答复、口令连续性与私有信息／操作边界均有真实界面回复，棋盘仍为 r0。本轮三次额度已用完，未发送第四次；续试需新的明确授权。耗用和待优化的大上下文见[三次试用记录](openai-companion-trial-2026-11-27.zh-CN.md)。
