# Ticket 26 · Slice 265 — SillyTavern 一手资料对等矩阵与冻结实施计划

负责人:K3 前端/内容(project-d-ui-lead)· 工作树 `.worktrees/ticket-26-slice-264-companion-experience-ui`
基线:`codex/starcraft-integration-20260921` @ `1cced3b`(其上已有 Slice 264 全部提交与本 Slice 265 简报 `e53ae73`)
日期:2026-09-21
简报:`docs/ticket-26-slice-265-k3-sillytavern-parity-and-companion-packs-brief-v1-2026-09-21.md`

本文档是本 Slice 的**第一个提交**(仅研究 + 对等矩阵 + 冻结计划,不改任何代码)。
实施必须严格按第 3 节的编号顺序;后端缺口保持为显式类型化缺口,绝不在 UI 中伪装成已完成。

## 1. 研究方法与一手来源

只读公网研究,仅用于 SillyTavern 一手资料审计与 canon 来源发现;不刷新任何官方源数据快照。
访问日期全部为 **2026-09-21**。当前上游版本:**SillyTavern 1.19.0**(`release` 分支 `package.json`,
release 发布时间 2026-09-14,即一周前的当前版本)。

一手来源(官方文档站 docs.sillytavern.app 与官方仓库 github.com/SillyTavern/SillyTavern):

| 主题 | 一手来源(URL,访问于 2026-09-21) |
| --- | --- |
| 角色卡字段与 token 预算 | https://docs.sillytavern.app/usage/characters/characterdesign |
| 角色管理/导入导出/世界书链接 | https://docs.sillytavern.app/usage/characters/ |
| 用户人设 Personas(含锁定、人设世界书) | https://docs.sillytavern.app/usage/personas |
| World Info / Lorebook(关键字触发、regex、作用域、插入策略) | https://docs.sillytavern.app/usage/worldinfo |
| Prompt 组装总览 | https://docs.sillytavern.app/usage/prompts/ |
| Prompt Manager(Chat Completion 提示词装配) | https://docs.sillytavern.app/usage/prompts/prompt-manager |
| Context Template(Text Completion) | https://docs.sillytavern.app/usage/prompts/context-template |
| Data Bank / RAG / Vector Storage(Vectra、embedding 提供方) | https://docs.sillytavern.app/usage/characters/data-bank |
| Summarize 扩展(自动摘要、回滚、注入位置) | https://docs.sillytavern.app/extensions/summarize |
| 群聊(回复顺序策略、mute、Force Talk、Auto-mode、卡片 swap/join) | https://docs.sillytavern.app/usage/characters/groupchats |
| Swipe / 编辑+重roll / 消息操作 | https://docs.sillytavern.app/usage/chatting/ |
| 聊天文件管理(jsonl 导出、分支、检查点) | https://docs.sillytavern.app/usage/characters/chatfilemanagement |
| Author's Note(深度/频率注入) | https://docs.sillytavern.app/usage/characters/authors-note |
| Connection Profiles(连接配置保存/切换) | https://docs.sillytavern.app/usage/api_connections/connection-profiles |
| 扩展系统(内置 + 可安装) | https://docs.sillytavern.app/extensions/ |
| Character Expressions(情绪分类立绘、VN 模式) | https://docs.sillytavern.app/extensions/expression-images |
| Quick Replies(捆绑扩展,仓库内 `public/scripts/extensions/quick-reply`) | https://github.com/SillyTavern/SillyTavern (release 分支目录清单) |
| 版本事实 | https://raw.githubusercontent.com/SillyTavern/SillyTavern/release/package.json 与 GitHub Releases API |

抓取的原始页面存于 `build/ticket-26-slice-265-research/sillytavern-docs/`(git 忽略,仅证据)。
社区资料(rentry、wikia 等)一律不作为权威依据;文档站明确引用处仅记录为社区指南存在。

## 2. 对等矩阵(中文)

状态定义:**支持** = 当前 Project D 合同真实存在且 UI 可呈现;**部分** = 合同存在但范围收窄或有
意的安全裁剪;**缺失** = 客户端无任何合同,只能如实呈现不可用并列为 Codex 缺口。
「证据」均指本仓库内可核实的路径。Slice 264 既有缺口编号沿用(见
`docs/ticket-26-slice-264-companion-experience-ui-v1-2026-09-21.md` §7)。

| # | SillyTavern 能力(1.19.0) | Project D 现状合同 | 状态 | 证据 | 用户可见后果 | K3 工作 | Codex 后端缺口 | 验收证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 角色卡:名称/描述/人格/场景/首条消息/示例对话;PNG/JSON 导入导出 | CharacterPackage + 按时代的 persona worldbook(Kerrigan 8 时代);时代选择走服务端 CAS | 部分 | `content/characters/kerrigan-worldbook-catalog-v1.mjs`、`packages/character-agent/contracts-v1.mjs`、`packages/client-domain/character-presentation-projection-v2.mjs` | 同伴身份/时代可切换;外部卡片导入导出不存在 | SS-2 新增 Raynor/Artanis 呈现包 | `COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT`(沿用) | 目录页三角色身份区分截图 + DOM 断言 |
| 2 | 用户人设 Persona(显示名/头像/描述/锁定/人设世界书) | 席位身份 + 封存的人格(时代)选择;「用户人设」合同不存在 | 缺失 | `view.characterOfflineSnapshot`、`view.roomProjection.viewer` | 玩家本人人设无法定义 | 无(不在本 Slice 范围) | `USER_PERSONA_CONTRACT`(新增列档) | 缺口卡渲染断言 |
| 3 | World Info:关键字/regex 动态触发、全局/角色/人设/聊天四作用域、递归、插入策略 | 世界书按人格版本 `always` 激活;天花板分级选择器(剧透/知识 rank) | 部分 | `kerrigan-worldbook-catalog-v1.mjs`(`activation: { always: true }`)、投影 selector | 词条不可按关键字动态注入;作用域只有人格一档 | SS-2 世界书条目保持 always 激活并标注 | `WORLDBOOK_DYNAMIC_TRIGGER_CONTRACT`(新增列档) | 世界书视图截图 |
| 4 | Prompt/上下文组装(Prompt Manager、Context Template、token 预算、prompt itemization 查看) | 服务端 `prompt-assembly-v1.mjs`;客户端只见安全 trace(promptPack id、工具调用、哈希引用);`rawPromptExposed: false` 是刻意安全边界 | 部分(有意收窄) | `packages/character-agent/prompt-assembly-v1.mjs`、Slice 264 面板诊断区 | 用户不能查看/编辑最终 prompt;只能看到安全摘要 | 无(保持不暴露) | 无(设计决策,非缺陷) | 诊断区截图 |
| 5 | 向量/数据库记忆(Data Bank RAG、Vector Storage/Vectra、聊天向量化) | 无向量/RAG 投影;仅会话转写上限与安全 `memoryRefs` 哈希计数 | 缺失 | Slice 264 面板「关系与记忆」区 | 长期记忆不可见、不可管理 | 无(不伪造本地持久层) | `COMPANION_MEMORY_LAYERS_PROJECTION`(沿用) | 诚实不可用卡截图 |
| 6 | Summarize 自动摘要(可编辑、回滚、注入位置) | 无摘要投影 | 缺失 | 同上 | 长会话压缩不可见 | 无 | `COMPANION_SUMMARY_PROJECTION`(新增列档) | 缺口卡断言 |
| 7 | 群聊/多角色同会话(回复顺序:Manual/Natural/List/Pooled;mute;Force Talk;talkativeness;Auto-mode;swap/join 卡片) | 一座席一会话一发言者;多同伴仅以人格顺序切换存在 | 缺失 | `view.roleAgentSession`(单会话)、Slice 264 §3.2 | 同会话多同伴同时发言不可用 | SS-4 实现**诚实呈现原型**(说话者身份、回合顺序、@提及/选择、权限标签),缺口显式阻塞,不伪造持久化/Provider | `MULTI_COMPANION_SIMULTANEOUS_SESSION`(沿用) | 多同伴原型截图 + 阻塞标签断言 |
| 8 | Swipe/编辑+重roll/分支/检查点(chat 克隆、父子聊天) | 无 swipe/分支合同;转写只追加,上限 64 条 | 缺失 | `roleAgent.messages`(max 64) | 不能重roll或分支对话 | 无 | `COMPANION_SWIPE_BRANCH_CONTRACT`(新增列档) | 缺口卡断言 |
| 9 | Author's Note(任意深度/频率注入) | 无客户端合同 | 缺失 | — | 无 | 无 | `COMPANION_AUTHORS_NOTE_CONTRACT`(新增列档) | 缺口卡断言 |
| 10 | Quick Replies(STscript 按钮、快捷操作) | 已有意图(chat/reflect 等)+ 密封 Preview 确认流 | 部分 | `tactical-adjutant-panel.tsx` 意图选择器 | 有意图选择但无一键快捷短语 | SS-4 目录页/原型中以既有意图做提及/快捷选择呈现,不新增后端动作 | 无 | 提及/选择交互断言 |
| 11 | 导入/导出/恢复(角色卡、聊天 jsonl、检查点恢复) | 无合同 | 缺失 | Slice 264 §3.2 | 同伴卡/世界书/记忆不可迁移 | 无(不提供伪造入口) | `COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT`(沿用) | 诚实不可用卡截图 |
| 12 | 扩展系统(内置 + Git 安装第三方扩展) | 无扩展机制;不属于本 Slice 追求目标 | 缺失(平台级,非缺陷) | — | — | 无 | 不追求(列档为平台差距) | — |
| 13 | Connection Profiles(保存 API/模型/模板组合,一键切换) | BYOK:服务端许可 profile 目录、同意 + 一次性密钥交接、隔离 Worker、会话额度包络 | 部分 | `secureProvider` 投影、Slice 264 面板 BYOK 区 | 可安全自带密钥;不可保存多套切换模板 | 无(保持) | `SECURE_PROVIDER_PROFILES_LOADED_NOT_PROJECTED`(沿用,建议级) | BYOK 区截图(0 Provider 调用) |
| 14 | 长期角色连续性(聊天文件持久、可恢复、跨会话) | 会话级转写(64 上限);封存离线人格快照可离线恢复选择 | 部分 | `view.characterOfflineSnapshot`、Slice 264 面板 | 长程角色扮演恢复不完整 | 无 | `COMPANION_LONG_SESSION_RESUME_CONTRACT`(新增列档) | 封存快照 + 缺口卡截图 |
| 15 | Character Expressions 立绘(28/6 类情绪分类、sprites、VN 模式) | 动态对话头像合同:5 帧角色(neutral/blink/speaking/warning/reflect)× 6 相位(idle/listening/thinking/speaking/waiting_confirmation/error),减少动态回退,服务端许可帧路由 | 支持(Kerrigan);新包资产待生成 | `packages/character-agent/dynamic-dialogue-portrait-v1.mjs`、`character-presentation-mount-runtime.mjs` | Kerrigan 已有动态头像;Raynor/Artanis 需新资产 | SS-3 状态合同描述文件 + 精确图像生成简报给 Codex;SS-4 状态预览板 | `COMPANION_PACK_ASSET_GENERATION`(新增列档:位图生成归 Codex 图像工具) | 六状态 + 减少动态回退截图 |
| 16 | 隐藏信息/权限(非 ST 能力,Project D 独有要求) | 席位权限姿态卡;对手私有状态不投影;推测标注为推测;modelMayConfirm/Apply=false | 支持 | Slice 264 面板 `companion-permission-posture-v1` | 同伴永不泄露对手私有状态 | SS-4 在多同伴原型中延续权限标签 | 无 | 权限姿态截图 |

## 3. 冻结的编号实施计划(仅 K3 所有的 Web/App/内容呈现)

每个子切片一次 scoped 本地提交;不删除任何 testID/能力/合同;不改后端、Rules、Authority、
Provider、memory-store 实现、源数据快照、Ticket 25 Slice 265 文件;不调用付费 Provider;不推送。

1. **SS-1(本提交):研究 + 对等矩阵 + 冻结计划。** 仅本文档。
2. **SS-2:Raynor/Artanis 同伴内容包(纯呈现)。**
   `content/characters/raynor-companion-pack-v1.mjs`、`content/characters/artanis-companion-pack-v1.mjs`、
   `content/characters/companion-catalogue-v1.mjs`(三角色呈现目录索引)。
   每个包含:canon 传记事实(带 sourceRefs,官方一手来源)、声音/语气规则、关系边、时代划分、
   知识/剧透边界(knowledgeRank/spoilerRank)、世界书条目、战术身份(TMG 阵营对应);
   显式区分「canon 事实 / Project D 角色配置 / 待生成视觉资产」三类。
   沿用 `createWorldbook` 等既有内容合同但**不被后端运行时 import**(避免触碰已钉哈希);
   目录文件标注 `presentationOnly: true`。保留 Kerrigan 为参考包,不改动其任何文件。
3. **SS-3:动态通讯头像状态合同 + 图像生成简报。**
   `content/characters/raynor-portrait-states-v1.mjs`、`content/characters/artanis-portrait-states-v1.mjs`:
   复用 Kerrigan 包的合同形状,定义至少 idle / speaking / listening / alert-combat /
   damaged-concerned / reflective 六状态,映射到既有帧角色(neutral/blink/speaking/warning/reflect)
   与相位合同,含确定性回退与减少动态行为。
   `docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md`:每个状态帧的精确图像
   生成简报(风格锚、保留/拒绝清单、尺寸、哈希占位为 `PENDING_CODEX_GENERATION`)与绑定表,
   供 Codex 图像工具执行;**不伪造任何生成回执**。
4. **SS-4:同伴目录与多同伴原型 UI(Web + App 响应式)。**
   新增 `apps/starcraft-tmg-expo/components/character/companion-catalogue-panel.tsx`,并在
   `tactical-adjutant-panel.tsx` 增加一个渐进披露分区挂载它(仅新增,不改既有分区):
   - 三角色目录(Kerrigan/Raynor/Artanis 身份区分:阵营徽记色、时代、战术身份);
   - 每包身份/世界书/时代/关系视图;
   - 六状态头像状态预览板(确定性回退、减少动态);
   - 多同伴同会话**呈现原型**:显式说话者身份、回合顺序、@提及/选择、权限标签;
     `MULTI_COMPANION_SIMULTANEOUS_SESSION` 缺口显式阻塞,不伪造持久化或 Provider 调用;
   - 对等/缺口呈现面(本矩阵的产品内摘要 + 全部缺口码)。
   键触可达、390px 触控无溢出/无遮挡;复用既有 tokens/样式习惯。
5. **SS-5:浏览器验证脚本 + 截图证据。**
   `scripts/verify-ticket-26-slice-265-companion-packs-browser-v1.mjs`(沿用 Slice 264 自包含
   harness 模式:当前工作树新鲜导出、后端哈希断言、演示房间、仅 loopback、0 Provider 调用)。
   桌面 1500×1050 与 390×844 触控,减少动态;claim-to-pixel 证据行覆盖简报 §「截图证据标准」
   的全部适用项;哈希化截图 + 机器报告至 `build/ticket-26-slice-265-companion-packs-browser-v1/`。
   该门只跑一次(最后一次相关代码变更之后)。
6. **SS-6:结项文档。**
   `docs/ticket-26-slice-265-k3-companion-packs-closure-v1-2026-09-21.md`:有序计划、提交哈希、
   变更文件、验证回执、截图索引、诚实后端缺口清单、未决 Critical/High 顾虑。

## 4. 验证策略

`selfVerificationByImplementer: true`。本 Slice 的聚焦门 = SS-5 浏览器脚本,只跑一次;
失败则仅修复被牵连的前端路径后至多再跑一次;三轮不收敛即停止并报告。
Slice 264 已通过的门不复跑(其覆盖代码在本 Slice 仅做新增式扩展,既有 testID 与合同保持不变)。
所有门必须 0 Provider 调用 / ¥0。

## 5. 不做什么(显式排除)

- 不改 `packages/`、`scripts/support/`、Rules/Authority/Provider/memory-store/源数据。
- 不刷新官方源数据;canon 来源发现仅限只读核对 URL 有效性。
- 不生成位图资产;只在 SS-3 写精确简报与绑定。
- 不伪造多同伴持久化、关系数值、记忆层或 Provider 调用。
- 不推送 Git;不派发其他 agent。
