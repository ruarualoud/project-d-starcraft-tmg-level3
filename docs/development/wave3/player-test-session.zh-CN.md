# Wave3 玩家测试会话

本分支为 `codex/wave3-player-test`。玩家测试使用 Wave3 2.99.12 和端口 5483。两席各自提交军表，房主可在准备大厅分享邀请。本机测试第二席可用隐身窗口打开邀请。一次只指导玩家完成当前操作。

房间和席位保存在本工作树的 `build/playtest-web/host`。重启前先检查该目录中的 service.json 和端口，保留已有房间。静态页面在 `build/playtest-web/web`。如已有导出且服务退出，在本工作树执行：

```sh
node scripts/serve-starcraft-product-v1.mjs --offline --wave3-match-candidate=2.99.12 --web-root=build/playtest-web/web --data-directory=build/playtest-web/host --port=5483
```

玩家报告的问题从本分支复现，提交对应修复和脱敏结论，推送本分支。Wave4 使用另一独立工作树与端口 5484。两条线继承双席独立写表提交逻辑。房间凭据、邀请、浏览器资料和本地素材留在本机。
