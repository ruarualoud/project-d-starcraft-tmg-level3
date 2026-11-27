# Wave3 标准角色卡与实际扮演接线（2026-11-28）

## 结果与验收边界

用户要求参考酒馆模式、采用完整标准资料。本轮将真实产品副官入口切换为完整 Character Card V2/V3 数据读取和分层提示词组装；不再经由删减的私有角色摘要进入模型。六位副官共有 31 份按时代独立的 CCv3 卡：凯瑞甘 8、扎加拉 4、雷诺 7、诺娃 3、阿塔尼斯 5、泽拉图 4。

完整标准资料指交换数据及对应提示词字段的保真，不表示六位角色的所有小说、战役对白都已补齐，也不表示移植了整个 SillyTavern 应用与插件生态。凯瑞甘保留本轮 26 条主线经历与关系记忆，默认时代可用 24 条；其他五位的现有资料完整迁移，未冒称背景资料已经补全。原始 presentation pack 全量保存在 extensions.projectD.originalPresentationPack，生成校验逐份 deepEqual，未知字段不被重建或裁剪。

此前唯一获批的故事实问因“公开资料只说明我们曾相爱”等考据口吻，扮演验收失败。此次标准迁移新增真实模型调用 **0**，累计试用保持 7/7；离线证明实际字段接线、保真和约束，不构成新版本真人扮演效果通过。

## 标准与实际消费

依据 [CCv2](https://github.com/malfoyslastname/character-card-spec-v2/blob/8083fb388615ccbce768e97cbbd49d2b3214632c/spec_v2.md)、[CCv3](https://github.com/kwaroran/character-card-spec-v3/blob/f3a86af019fbd99f788f7a1155f399655b34ab35/SPEC_V3.md) 及 [SillyTavern Prompt Manager](https://docs.sillytavern.app/usage/prompts/prompt-manager/)；应用语义核对固定在 SillyTavern 1.19.1 / 82b64a45c34facbc98ff4b9f33c067d3ccab6a17。完整字段、源码定位和上游语义详见 [标准合同研究](sillytavern-standard-roleplay-contracts-2026-11-28.zh-CN.md)。

| 数据／行为 | 本轮产品状态 |
|---|---|
| CCv2 与 CCv3 全部必填字段、V3 可选字段、未知 JSON 字段 | 校验并完整保存；直接角色卡导出保留原始序列化文本 |
| description、personality、scenario、mes_example | 实际进入分层消息，不经过简介截断；对白示例解析成 user/assistant 示例消息 |
| system_prompt、post_history_instructions | 非空时覆盖对应全局段；original 宏继承对应原段 |
| char/user、旧版 BOT/USER、V3 nickname | 宏替换；额外受支持字段宏与 outlet；不支持的宏明确拒绝应用 |
| first_mes、alternate_greetings、group_only_greetings | 新会话种一次开场白，标注来自角色卡；空开场不编造；导入已有会话不补插 |
| creator_notes、creator_notes_multilingual | 人可查看，中文优先；绝不进入模型对白提示词 |
| character_book | 默认参与运行；keys、selective/secondary_keys、constant、use_regex、case_sensitive、scan_depth、recursive_scanning、priority、insertion_order、position、预算均接入 |
| 世代边界 | 应用扩展的 knownFromRank/spoilerRank 在触发前过滤；不允许导入卡自行放宽已封存角色时代 |
| ST 部分 World Info 扩展 | before/after char、示例、作者注顶底、depth/role、outlet、递归阻断／排除／延迟；activate/dont_activate 装饰符；概率采用确定性应用预设 |
| 其他 ST 应用功能 | vectorized、sticky、cooldown、delay、automationId、group、selectiveLogic、逐条 scan_depth 与额外字段匹配等启用时明确拒绝，不悄悄删数据 |
| JSON 与 PNG | 双向完整卡；PNG 保持图像及其他辅助块，V3 写 ccv3，读取同时存在时优先 ccv3；六位实际头像逐个往返通过 |
| 独立世界书 JSON | V3 导出 lorebook_v3/data 标准封装；导入兼容该封装及原始 CharacterBook 对象；完整 entries/extensions 保留 |
| CHARX／外部 assets | 不支持 CHARX 容器导入和外部资产自动抓取；资产字段与 URI 原样保存，当前头像显示仍使用已准入本地资产 |

内置世界书另含“你的故事／你的经历／你的过去／你的身世”等泛问触发词；31 份卡均验证泛问取得完整、符合时代的可用条目，不依赖用户先说角色名。

世界书按完整条目和优先级选择，预算单位是估算文本单位，绝不声称等于账单 token。历史窗口保留现有 16 条／16 KiB 的整条预算与遗漏提示，持久历史不被删改；开场白和普通历史一样可以离开窗口。角色卡字段自身不按旧简介长度截断。内部 Provider 96 KiB 守卫仍在额度领取与网络请求前拒绝超大封包。JSON 卡最大 4 MiB；PNG 有已有图像／块大小限制，超限明示拒绝。

普通闲聊不读取军表或棋盘；明确问战局才带对应当前席位可见上下文。平台权限与 Rules 保持独立，角色卡不能获取对手私有数据、改变棋盘或覆盖裁判。

## 用户入口与持久化

战桌右下“战术通讯” → “和副官聊天” → “标准角色卡／世界书”。可读取完整 JSON、选择 JSON／PNG、粘贴编辑完整 JSON、明确点击应用到本会话；导出准备与“保存文件”分开。原会话导入后历史保留且不调用模型。“新建干净会话”复制该会话的标准卡，保留旧会话并种入卡片开场白。Web 提供 JSON/PNG；原生当前提供 JSON 文本／系统分享，不显示未接通的 PNG 文件入口。

通过原有席位认证的 GET/PUT conversations/:id/standard-card 与 /standard-card/worldbook 读写。原始卡按 hash 归档，覆盖属于当前席位／会话，持久化恢复重新核对 hash；不改旧封存包 hash，不替换全局目录。HTTP 标准卡 PUT 路由单独 36 MiB body 上限，其他路由保持 2 MiB；客户端标准资料回复 48 MiB 上限。真实回环 HTTP 对超过旧 2 MiB 限制的 PNG 上传已通过。

代码：standard-roleplay-v1、standard-character-card-png-v1、session-runtime-v1、companion-room-session-service-v1、companion-product-module-v1、worker adapter、client-domain、Expo provider/通讯面板、room host 和 HTTP body 路由。生成源与 31 份卡位于 content/characters/standard-cards；可用 scripts/export-wave3-standard-character-cards.mjs 重建。

## 验证

- node scripts/verify-wave3-standard-roleplay.mjs：通过；实际 product/session/provider 接线、50,779 字节长字段封包、完整 JSON／六位 PNG、V2/V3、世界书、宏、双角色群聊、开场只种一次、冷恢复、席位隔离、全 31 份原包保留、真实本地 HTTP PNG；fixture Provider 4 次、外部 Provider 0 次、游戏变更 0 次。证据 build/playtest-web/standard-roleplay/report.public.json。
- node scripts/verify-wave3-companion-context.mjs：通过；真实 Native 房间闲聊→坦克→闲聊的标准分支为 4574/8967/4817 字节，只在坦克问题读取一次工作台，实际外部调用 0。证据 build/playtest-web/context-regression/60843012-14fb-4c9d-a995-a4e0c495ad03。
- node scripts/verify-wave3-kerrigan-lore.mjs 与 verify-wave3-openai-companion.mjs：兼容性离线检查通过，外部调用 0。
- 当前 UI 与 HEAD 对照类型诊断：43→43，新增 0；不声称全库 typecheck 无诊断。
- Web 已通过现有离线导出流程，无安装依赖；entry-9f30901bfdf9fddf33fa1c69704d0f38.js。
- 真人页面核对通过：原会话 sc-companion-ecd28bc4-6c45-4d07-81ba-3860a381fb8b 保持 14 条聊天，棋盘 r0，累计 7/7；显示 CCv3.0、24/26。页面完整读取角色卡 115,337 字节、26 条世界书、原始 pack 与泛问触发词；独立世界书 lorebook_v3/data 封装 26 条。没有发送／继续／重roll、应用测试卡、新建会话或保存到浏览器下载目录。证据 build/playtest-web/standard-roleplay/live-standard-card.public.json 与 live-standard-card.png。
- 5483 最终服务 PID 17605，原 host 目录、gpt-5.4-mini 与累计上限 7；原运行内存 Key 随更新清空，此轮不请求重填。dispatch.jsonl 保持 7 行，usage.jsonl 保持 9 行（含先前本地拒绝），未清理日志。

harnessLoopUsed: true。所有记录和导出 trainingTruth: false，未晋升学习资料或启动其他实验。5483 使用原 host 数据与累计上限 7，未改 Wave4／5484。
