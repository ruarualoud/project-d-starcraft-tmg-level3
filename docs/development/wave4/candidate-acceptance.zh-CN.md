# T28-W4-01 候选清单与 Wave3 兼容验收

2026-11-27；分支 `codex/wave4-web-pvp`。当前范围仅为交接顺序第 1 项。

五份官方 Firestore 原件保存在 [冻结输入](../../../content/source-releases/wave4-20261127/source-index.json)，逐文件核对字节数和 SHA256。此次未重抓 Web shell、PDF 或 FAQ，数据快照显式记录 `firestore_data_only`，没有借用旧 shell 的版本或哈希。

[候选 ReleaseManifest](../../../content/source-releases/wave4-20261127/release-manifest.json) 为 `wave4-u98-c88-r50-catalogue-v1`，状态为 `candidate`，manifestHash 为 `63342e7ac823d0a234f00095b2c3491793e6c3860cfc85e16a8b2f480a346acf`。它尚未绑定 Wave4 战斗能力、媒体或正式房间工厂，不能用于正式对战。SourceRevision 已暂存，原导入指针没有提升。

[逐 ID 目录](../../../content/source-releases/wave4-20261127/catalogue-scope.json) 和 [逐字段差分](../../../content/source-releases/wave4-20261127/semantic-diff.json) 对账 15 个新单位、8 张新战术卡、2 张新势力卡与 13 张强化说明变更卡。45 个旧单位和 15 个规则章节字段一致；36 张旧卡仅 timestamp 变更。7 个新社区任务／部署与 12 项社区投票变化均留在 display-only 分区，官方产品读取器拒绝全部社区记录。

ReleaseResolver 同时注册 Wave3 与 Wave4：切换默认候选后，原房来源绑定和旧哈希不变；SQLite 重新打开仍按原绑定读取，精确历史查询及回滚通过，查询缓存键分开。为离线复核而提交的 Wave3 三份来源原件与旧文件逐字节相同；别名仅供本验收加载，不修改旧清单。

[验收回执](evidence/candidate-compatibility.public.json) 记录双规模正式 API 产品路径。500／2000 分各建一局独立的 Wave3 兼容房，两个 Cookie 席位分别提交具名军表；跨版军表返回 422 后可重交同版合法表；只交一席不会建房；房内势力、卡、单位、规模、升级逐项匹配。每局实际 preview → confirm（如需）→ apply 一次有限合法行动，再核对签名回放与 Host 冷打开后的状态、回放及两个席位。测试房只在本树 `build/wave4-web/host/`；没有访问 5483 或修改 Wave3 玩家房。这里是 API 兼容验收，Wave4 双浏览器验收仍待第 3、4 项。

复核命令（均在本树 Git 根目录执行）：

```sh
node scripts/compile-wave4-source-candidate.mjs
node scripts/verify-wave4-candidate-compatibility.mjs
```

第二个命令的正式房验收复用本树已备好的 Wave3 runtime／geometry 冻结缓存；第一项 Wave4 候选可由已提交原件重建。编译器拒绝覆盖不同内容的候选。额外反例覆盖原件篡改、未读分页、跨项目来源、错误 SourceRevision、房间强制换版及未齐战斗组件的准入。

首项结果见回执的 `status`；新增能力差分、媒体接入与 Wave4 500／2000 分双浏览器对战尚未验收。付费模型、K3、AI 对局、复盘及生产发布继续暂停。
