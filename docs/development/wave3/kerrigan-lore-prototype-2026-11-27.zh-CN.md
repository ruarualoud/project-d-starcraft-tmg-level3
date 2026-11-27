# 凯瑞甘主线资料样板与按需故事检索

本轮范围：Wave3 玩家分支、2.99.12、5483。用户要求先补凯瑞甘后自己试聊。只补该角色；原有六个人物包的版本、完整性 hash 与历史绑定不变。

## 内容与知识边界

独立资料库 starcraft-tmg.kerrigan-lore v1.0.0 共 26 条（18 经历、8 分时期关系），覆盖 8 个粗粒度时代。默认是《虫群之心》知识上界（不含《虚空之遗》），可检索 24 条；后续联盟与升华终章两条被过滤。这不是逐任务进度，也不是全小说、漫画或完整任务台词。

核对来源及逐条引文定位见 [一手资料报告](kerrigan-lore-primary-sources-2026-11-27.zh-CN.md)。10 个暴雪页面实际打开核对，其中两页仅用于界定不应赋予角色的幕后知识。资料正文为转述；编剧解释单独标记 creator_commentary，不写成角色亲历或读心。未知主题不伪造事实。

## 实际消费链路

产品 Host 注入独立版本化资料库 → 产品模块 → 已有会话服务 → 严格按 eraId 过滤 knownFromRank 与 spoilerRank → 按当前问题、双语名称及事件匹配最多 5 条 → 真实记忆组包 → Provider。初遇问题最多 3 条。普通问候不加载传记。资料的引用定位保留作离线审计，不把含后文的来源定位文字注入早期角色上下文。关系的 validThroughRank 表示当时状态，后期仍能回顾。

当前会话重组即可使用独立资料，不修改旧封存人物包。默认凯瑞甘不再总是注入旧三条概述，也不再强制套用战术口号 author note；其他五位保留原接线。故事、相遇、人物关系使用两到三段短中文与约 1K 输出单位上限；普通聊天保留原短回复预算。单位是服务预算，不能当作实际计费 token。

每条新回复持久保存资料库 id/version/hash、实际进入上下文的条目 id、来源网址与回复模式，随原回合 hash 链保存，冷恢复可读取。界面显示本时代可检索条数；有选中来源的新回复下方显示可点击暴雪来源，明确回复措辞是角色演绎。旧回复不追加伪造来源、不改写旧文。

资料不授予规则、对手私有信息或房间变更权限。普通聊天仍不读取战局，明确问到才按现有路由读取。

## 初版离线验证（真实试问前）

- 新回归先在原实现失败：真实产品/会话/记忆组装没有收到安提加初遇事实；接线后通过。
- node scripts/verify-wave3-kerrigan-lore.mjs：真实产品服务、内存持久端口和离线 Provider；房间是明确标注的只读权威投影夹具。验证初遇（含用户原句）、主宰、塔桑尼斯、泽鲁斯及人物关系、8 时代筛选、来源/完整性拒绝、旧会话与未回复消息冷恢复、不自动续聊、普通发送及重生成分支接受后的来源回执持久化、其他五位不变。首个故事内部封包 7928 字节；真实模型调用 0、网络尝试 0、游戏变更 0。证据 build/playtest-web/kerrigan-lore/regression.public.json。
- node scripts/verify-wave3-openai-companion.mjs 通过；超限请求仍在额度领取/网络前拒绝，模型与 Key 隔离、累计限额和无自动重试保持。
- node scripts/verify-wave3-companion-context.mjs 通过：Native 工厂独立 QA 房、26 条历史、闲聊→坦克→闲聊、工作台只读 1 次、闲聊 0 次，棋盘 revision/hash 不变。证据 build/playtest-web/context-regression/8d33a879-bf0b-4ad5-817c-85da63990303。
- TypeScript 与变更前组件基线同为 43 项既有诊断，新增 0；不宣称全量类型检查通过。已用现有 Tailwind/Expo 离线导出 Web，未安装依赖。

以上初版离线检查证明资料与请求链路，不证明真实 GPT 的故事质量、幻觉率或策略效果；当时未调用真实模型。后来获单次授权的真实试问及失败反馈见后文。

## 发布与回退

更新沿用 build/playtest-web/host 与同一房间，5483 服务重启会清空仅在内存的 Key。未清理房间、聊天、dispatch 或 usage 日志，原累计上限暂仍为 6；这 6 次已由此前助手三次验证与用户三次手动聊天使用完。用户随后选择不增加三次手动试聊、只更新资料。再后用户明确要求助手试问一次，因此本轮仅新增一次，累计上限设为 7，仍为 GPT-5.4 mini；不改变 profile hash，不删除旧日志。用户已在原页面启用内存 Key，这次唯一的真实试问已完成：dispatch 6→7、物理尝试 1 次、无重试；模型 gpt-5.4-mini-2026-03-17，输入 2895／输出 191 单位，内部封包 10807 字节。原记录追加到 14 条，棋盘 r0。事实检索／来源显示通过；“公开资料只说明我们曾相爱”的资料摘要口吻使角色扮演验收失败。

真实 Chrome 页面验收：同一房间 player1、同一 conversation sc-companion-ecd28bc4-6c45-4d07-81ba-3860a381fb8b；仍为 12 条聊天、r0。显示资料 v1.0.0、24/26 条及《虫群之心》范围；点击只读的“读取世界书”显示独立资料库 24 条、旧封存包条目 0，并明确列表是候选、每条消息按需选取。当前 GPT-5.4 mini 累计已用 6/6、等待 Key；助手未发送或继续聊天。最终服务 PID 89293、5483，原 dispatch 仍为 6。交接截图：build/playtest-web/kerrigan-lore-ready.png（密码框为空）。回退只需撤回本轮独立资料注入/故事模式源代码并重新导出重启；不改写历史与旧回执。

审计：harnessLoopUsed: true；targetGames: [starcraft-tmg]；路由 companion_room_session_service → era_filter/lore_selector → companion_group_chat_live_v1。工具仅为席位 room projection、按需 workbench 和本地资料检索；无 Rules Apply、对手私有读取、训练真值晋升或长期记忆晋升。

## 变更文件

- content/characters/kerrigan-lore-knowledge-v1.mjs：26 条资料及来源、时代、未知范围。
- packages/companion-backend-module-v1/lore-knowledge-v1.mjs：资料校验封存、时代过滤、问题选择与故事指令。
- packages/product-composition/companion-product-module-v1.mjs 与 companion-room-session-service-v1.mjs：独立资料接入、旧会话消费、普通/重生成回复来源回执、只读世界书投影。
- packages/secure-provider-runtime/companion-worker-adapter-v1.mjs：凯瑞甘故事模式的长度和预算；普通回复保持原约束。
- scripts/support/starcraft-product-room-host-v1.mjs：运行房间注入凯瑞甘资料。
- apps/starcraft-tmg-expo/components/character/tactical-adjutant-panel.tsx：资料状态、来源标签和链接。
- scripts/verify-wave3-kerrigan-lore.mjs：离线实际组包与恢复回归。
- 本文、一手来源报告和 TASKS.md：来源、交付证据及边界记录。

## v1.1.0：角色扮演反馈修正（2026-11-28）

用户指出真实试问“公开资料只说明我们曾相爱”明显出戏。该反馈正确；不能把事实取对、来源显示成功等同于角色扮演通过。原回复和旧版来源回执不改写，真实样本保留在 build/playtest-web/kerrigan-lore/live-one-question.reply.txt，结构化结果与失败判定在 live-one-question.public.json。

根因是 v1.0.0 把考据 summaryZh（例如“现有主源没有提供”“编剧解释”）作为角色可叙述记忆直接注入，且服务端最后一层强制两到三段，诱导证据说明、篇幅填充和机械的未知结尾。

v1.1.0 为全部 26 条增加独立 roleMemoryZh，只渲染已核实事件与可知关系的第一人称表述；不增造场景、对白、日期或他人私密动机。这些措辞是 Project D 原创角色配置，不是官方台词。原考据摘要与来源定位继续保留。正常对话／故事走 character_memory，只有本次明确问官方设定、出处、来源时才走 reference_notes／lore_reference；查证模式可说明作者评论，普通角色正文不复述考据或来源。“别像资料摘要”“不要讲官方设定”等否定请求不会误切查证模式。来源链接仍由界面单独显示。

人物提示回到第一人称与当前时代；历史用于理解对话，不把旧助手的出戏措辞当口吻示范。故事按内容写一到三小段，未问到的细节空白不主动罗列，不要求“其他未知”的收尾。严格时代筛选、无编造、Rules 权威和当前席位可见边界保持。

实际产品／会话／记忆／Provider 封包的回归先在旧实现红灯，随后验证普通扮演不含考据说明、来源问句明确走查证、普通／重生成来源回执、冷恢复、8 时代及其他五位不变。node scripts/verify-wave3-kerrigan-lore.mjs 与 node scripts/verify-wave3-openai-companion.mjs 通过，修正阶段真实模型调用 0。新资料 hash aff2db174f2bd69f7f0cb377b8a980057303742a1d105b70a50085a57831eb29，离线首条故事封包 7971 字节。该回归只证明输入分层和组装，不证明真实模型已自然扮演。

与“酒馆”的关系：实际运行入口是项目自有 companion-product-module / companion-room-session-service / worldbook-memory-engine / companion-worker-adapter，接 OpenAI；不是接入 SillyTavern 原生运行时。已有角色卡、世界书、作者注释、分层记忆机制，不能据此宣称完整复刻酒馆扮演流程。本轮修正的是已发现的角色记忆与考据视角混淆，未声明整套扮演功能完整。

本轮累计仍为 7/7，不新增第二次试问。5483 已部署 v1.1.0（PID 96523），真实页面确认资料 v1.1.0、原会话仍为 14 条、棋盘 r0、累计 7/7。旧出戏回复保持原样，未追加第二次调用。服务重启清空仅在内存的 Key，本阶段无需重新填 Key。

用户随后要求改用完整标准化酒馆资料；v1.1.0 仅为临时缺陷修正，后续按 CCv2/CCv3、标准 character_book 与 Prompt Manager 语义重整，不把这套自定义记忆渲染当最终完整酒馆实现。
