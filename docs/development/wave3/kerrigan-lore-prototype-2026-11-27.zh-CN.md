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

## 验证

- 新回归先在原实现失败：真实产品/会话/记忆组装没有收到安提加初遇事实；接线后通过。
- node scripts/verify-wave3-kerrigan-lore.mjs：真实产品服务、内存持久端口和离线 Provider；房间是明确标注的只读权威投影夹具。验证初遇（含用户原句）、主宰、塔桑尼斯、泽鲁斯及人物关系、8 时代筛选、来源/完整性拒绝、旧会话与未回复消息冷恢复、不自动续聊、普通发送及重生成分支接受后的来源回执持久化、其他五位不变。首个故事内部封包 7928 字节；真实模型调用 0、网络尝试 0、游戏变更 0。证据 build/playtest-web/kerrigan-lore/regression.public.json。
- node scripts/verify-wave3-openai-companion.mjs 通过；超限请求仍在额度领取/网络前拒绝，模型与 Key 隔离、累计限额和无自动重试保持。
- node scripts/verify-wave3-companion-context.mjs 通过：Native 工厂独立 QA 房、26 条历史、闲聊→坦克→闲聊、工作台只读 1 次、闲聊 0 次，棋盘 revision/hash 不变。证据 build/playtest-web/context-regression/8d33a879-bf0b-4ad5-817c-85da63990303。
- TypeScript 与变更前组件基线同为 43 项既有诊断，新增 0；不宣称全量类型检查通过。已用现有 Tailwind/Expo 离线导出 Web，未安装依赖。

以上证明资料与请求链路，不证明真实 GPT 的故事质量、幻觉率或策略效果；本轮不代用户调用模型。

## 发布与回退

更新沿用 build/playtest-web/host 与同一房间，5483 服务重启会清空仅在内存的 Key。未清理房间、聊天、dispatch 或 usage 日志，原累计上限暂仍为 6；这 6 次已由此前助手三次验证与用户三次手动聊天使用完。是否增加三次手动试聊另待用户回答，不静默绕过旧上限。

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
