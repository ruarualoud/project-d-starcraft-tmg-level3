# 六位副官资料库存与内容缺口审计

状态：已完成当前测试树的资料库存、实际组包路径与工作量审计。审计日期：2026-11-27；范围仅 codex/wave3-player-test 的现有六位副官。没有调用模型、读取真实 Key、操作房间或改写角色数据，也未运行测试套件；本轮只读取内容模块、调用纯组包／路由函数和编写本报告。

六位都有基本角色资料，但实际聊天知识远少于文件库存：每位仅三条世界书，六位正文合计约 3.2 千英文字符；34 条简介事实、28 个关系标签及来源 URL 字典均未完整进入当前组包。优先补共用接线、时代过滤和故事路由，再补角色事件。让现有资料能用并修复明显体验问题，估计 2–3 人日；六位达到下述“基础故事可用”，估计共 10–16 人日，不代表全原作覆盖，也不是日历完成日期。

## 判断口径

这里的“基础故事可用”指：面对人物经历、某次事件、与某人的关系、所选时代能知道什么等常见问题，能按源材料给出具体事实，并明确区分原典、作者解释与即兴演绎。它不是全小说／漫画／任务对白的穷尽收录。不能用未定义分母的“完整率”估计。

本部分以仓库内容模块为一手证据，读取六个 companion-pack 以及 Kerrigan 旧包与世界书目录；数量统计只说明字段确实存在，不意味着已全部接进聊天，也不意味着每条引用已核验为事实。来源 URL 和历史 HTTP 200 不等于逐句原典证明。

## 库存总表

“事实”括号内为标注为原典摘要／创作者说明的条数，另有每位一条产品定位；关系为简短标签数，时代为元数据记录数，世界书为可用于产品注册的条目数。

| 副官 | 简介 facts | 时代 | 关系标签 | 世界书 | 世界书正文字符 | 来源声明 | 主要证据 |
|---|---:|---:|---:|---:|---:|---:|---|
| 凯瑞甘 | 5（4） | 8 | 5 | 3 | 683 | 5 | [简介](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-companion-pack-v1.mjs:119)、[世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-companion-pack-v1.mjs:189) |
| 雷诺 | 6（5） | 7 | 5 | 3 | 510 | 4 | [简介](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/raynor-companion-pack-v1.mjs:93)、[世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/raynor-companion-pack-v1.mjs:152) |
| 阿塔尼斯 | 6（5） | 5 | 5 | 3 | 493 | 4 | [简介](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/artanis-companion-pack-v1.mjs:82)、[世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/artanis-companion-pack-v1.mjs:139) |
| 诺娃 | 6（5） | 3 | 4 | 3 | 504 | 4 | [简介](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:85)、[世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:139) |
| 扎加拉 | 5（4） | 4 | 4 | 3 | 465 | 4 | [简介](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zagara-companion-pack-v1.mjs:86)、[世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zagara-companion-pack-v1.mjs:140) |
| 泽拉图 | 6（5） | 4 | 5 | 3 | 500 | 4 | [简介](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zeratul-companion-pack-v1.mjs:86)、[世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zeratul-companion-pack-v1.mjs:142) |
| 合计 | 34（28） | 31 | 28 | 18 | 3155 | 25（去重 8） | — |

每位三条世界书中均有一条 TMG 阵营／规则权威说明，因此 18 条并非 18 篇剧情：其余每位也只有两条百余英文字符的历史、地点或教义概要。现有 28 个关系标签并无对应的 28 篇事件叙述；六包的所有关系都写在独立 relationships 数组，无法据“文件里有标签”推定模型读取到了关系事实。

## 各角色具体差距

| 副官 | 现有世界书具体内容 | 可见内容缺口 | 难度判断 |
|---|---|---|---|
| 凯瑞甘 | 泽鲁斯后原生女王；刀锋女王简史；TMG 凯瑞甘虫群说明 | 雷诺初遇与感情变化、蒙斯克背叛的具体链条、主宰控制／摆脱控制、与扎加拉的互动均未形成独立可检索事件；跨 8 时代，需要防止把某一时期动机套到全部时期。 | 中高；旧资料可复用，重点是改成具体事件和分时期关系。 |
| 雷诺 | 游骑兵教义；科普卢人类势力；TMG 人类说明 | 5 条原典简介仍是跨战役概括；与凯瑞甘、蒙斯克、塔萨达、阿塔尼斯、泽拉图的关系只有标签，没有关键场景、关系转折或史实证据片段。7 时代的个人经历与指挥官角色需要区分。 | 中高；与凯瑞甘、星灵角色可共享主源和事件骨架。 |
| 阿塔尼斯 | 达拉姆统一；艾尔陷落与光复；TMG 星灵说明 | 执行官到大主教的具体事件、塔萨达遗产与泽拉图相关事件、统一不同派系的关系变化缺少叙述。现有两条概要难回答“发生了什么、为什么如此选择”。 | 中；主要工作是战役事件与关系演变。 |
| 诺娃 | 泛化幽灵教义；保卫者危机；TMG 人类说明 | 默认是自由之翼 New Folsom 阶段，世界书却没有该事件条目；关系中的托什、雷诺、瓦伦里安缺少场景。保卫者危机属于更晚时代，却仅用正文一句话称“era-locked”，数据没有可执行门槛。 | 高；角色专属一手来源定位、任务分支与剧透边界工作较多。 |
| 扎加拉 | 虫群消耗教义；查尔；TMG 异虫说明 | 凯瑞甘对其思维的训练、查尔上的角色变化、阿巴瑟关系、战后继任均停留在少数简介／标签，未形成事件条目。不可把共同虫群教义当扎加拉个人经历。 | 中高；篇幅可以较少，但更需要角色专属主源核实。 |
| 泽拉图 | 奈拉齐姆概述；萨尔纳加预言概述；TMG 星灵说明 | 杀死 Zasz、拉莎加尔之死、与塔萨达合作、向雷诺传递预言、最终解救阿塔尼斯等已在简介出现，却没有独立事件和按时代的关系记忆；预言表述容易变成无事实的神谕腔。 | 中高；需要明确因果、责任与未知，不能用作者心理猜测填空。 |

此表的缺口来自 pack 内字段内容对照；没有在本轮补写上述剧情，也未把这些主题逐句核验为新的 canonical 事实。

## 中文、别名与故事人设

六位都有中文显示名、总简介、时代标题、世界书标题、三句中文风格示例和中文 author note；但 18 条世界书 content 全为英文，34 条 facts 均无逐条 summaryZh，28 个关系均无 relationZh，identity.aliases 中的中文别名均为 0。这不等于模型不能用中文回答，而是没有经过审校的中文事实条目和多语言检索入口。[凯瑞甘字段](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-companion-pack-v1.mjs:119)、[诺娃字段](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:85)

六套 voiceTone 的确不同，且明确标为 project_d_role_configuration，不能当原作对白。author note 都以战术目标排序为核心，frequency 均为 1；例如凯瑞甘“威胁→行动→代价”，诺娃“目标→路线→撤离”，扎加拉“损失与补充率”，泽拉图“看不见的威胁→守望→代价”。没有独立的“讲故事先具体事实、闲聊允许自然回应”的内容模板，存在六位都把叙事请求回答成战术格言的风险。[凯瑞甘语气](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-companion-pack-v1.mjs:136)、[author note](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-companion-pack-v1.mjs:213)、[诺娃 author note](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:149)、[扎加拉 author note](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zagara-companion-pack-v1.mjs:150)、[泽拉图 author note](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zeratul-companion-pack-v1.mjs:152)

## 来源与时代保护的共同问题

六包合计 25 份来源声明，按 sourceId 去重只有 8 项：StarCraft 手册、2020 全史总览、SC2 首页、TMG 规则、凯瑞甘 Hero Week、创作者 Q&A、扎加拉合作指挥官介绍、泽拉图合作指挥官介绍。多角色复用来源是合理的，但“SC2 首页”和“全史总览”的页面级引用不足以证明角色专属事件的所有细节。旧手册来源还记录了 2026-09-21 在当时网络不可访问；其他不少 accessNote 明确是沿用前一次记录而非本包重新取证。[凯瑞甘来源](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-companion-pack-v1.mjs:33)、[雷诺来源](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/raynor-companion-pack-v1.mjs:25)、[诺娃来源](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:19)

需要按事实补“官方页面／任务／手册具体段落或时间码 + 摘要 + 语言 + 来源等级 + 可知时代”，不能只继续增加 URL。教义类内容（如人命／阵线优先、孵化压力）也应复核是原典明确事实还是 Project D 战术解释，必要时改为解释类标签。

31 个时代记录主要是 title、timeline、knowledge cutoff 与 rank；18 条世界书激活一律 always:true，facts/relationships 没有机器可执行的最低时代／剧透字段。特别是诺娃保卫者危机条目正文声称高于默认剧透上限，仍声明 always:true；这是静态内容已确认的风险。主线程已核对产品转换会复制 always 而不建立 era/spoiler 门槛，故该条目会进入候选；本审计没有用付费实答验证模型是否实际剧透。[诺娃默认时代](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:116)、[边界声明](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:129)、[条目](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:139)

因此不能直接把全部 biography 和 relationships 无条件改成 always 世界书。凯瑞甘后期升华、泽拉图最终牺牲、扎加拉战后继任等资料也必须先标注可知时间，再接入。

五位非凯瑞甘副官的 TMG 条目仍写“official TMG faction tag pending confirmation”；这是角色说明文本尚未与当前版本资料对齐，不等于 Native 实际军表／规则未实现。[雷诺世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/raynor-companion-pack-v1.mjs:152)、[阿塔尼斯世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/artanis-companion-pack-v1.mjs:139)、[诺娃世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/nova-companion-pack-v1.mjs:139)、[扎加拉世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zagara-companion-pack-v1.mjs:140)、[泽拉图世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/zeratul-companion-pack-v1.mjs:142)

## 凯瑞甘旧资料能复用多少

旧 KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 有 9 本世界书：8 个时代加 1 本 TMG 语境，共 16 条 facts、12 条关系边，所有 entries 数组仍为 0。16 条 facts 的分类为 9 条 official_primary_summary、3 条 official_creator_commentary_summary、2 条 Project D interpretation、1 条 platform_framing、1 条 official_game_rules。目录名字中的 COMPLETE 表示此目录收集了所列时代，不能据此声称收齐官方剧情。[目录](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-worldbook-catalog-v1.mjs:248)

旧包保存了比呈现包更结构化的 relationshipEdges、controlState、时代 rank 与 unresolvedContradictions，例如幽灵时期、主宰控制期、独立刀锋女王、净化后、原生女王、联军、升华阶段的分别说明。呈现包保留 8 个时代标签，却把可注册世界书压为 3 条概要；并非从零没有资料，但也没有“雷诺初遇”那样的具体事件叙述。[幽灵时期](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-worldbook-catalog-v1.mjs:82)、[主宰时期](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-worldbook-catalog-v1.mjs:108)、[净化时期](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-worldbook-catalog-v1.mjs:179)、[呈现包世界书](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-companion-pack-v1.mjs:189)

旧 primal 包另有 tutor／opponent／commentator／companion 四套 RoleSkillPack，但这是 speechActs、voiceRules、forbiddenClaims 与 promptFragments 的角色语言合同，不是战棋规则知识或完整剧情库；其实际接入由主线程审计。[旧包](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/characters/kerrigan-primal-v1.mjs)

## 基础故事可用的内容补充范围估算

以下是建议目标，不是现成验收任务或已批准开发量。每条目标为一个可独立检索的事件或一个按时代变化的人物关系状态，具备具体事实、人物／地点中文别名、官方来源定位、可知时代／剧透级别、原典与作者解释标记、中文审校摘要。单条可先控制在约 100–250 中文字，事件过长再拆。共享事件复用同一主源与事件 ID，按角色视角呈现，不能把双角色引用统计成两个从零研究的历史事件。

| 副官 | 新增／改造事件条目 | 新增／改造关系态条目 | 合计 | 内容整理粗估 |
|---|---:|---:|---:|---:|
| 凯瑞甘 | 14–20 | 6–8 | 20–28 | 1–1.5 人日 |
| 雷诺 | 12–18 | 6–8 | 18–26 | 1–1.5 人日 |
| 阿塔尼斯 | 10–14 | 5–7 | 15–21 | 0.75–1.25 人日 |
| 诺娃 | 10–14 | 5–7 | 15–21 | 1–1.5 人日 |
| 扎加拉 | 8–12 | 4–6 | 12–18 | 0.75–1.25 人日 |
| 泽拉图 | 10–14 | 5–7 | 15–21 | 1–1.5 人日 |
| 合计 | 64–92 | 31–43 | 95–135 | 5.5–8.5 人日 |

再加共用主源定位、去重、跨人物／跨时代矛盾核对约 1.5–2.5 人日，内容部分总计约 7–11 人日（按每人日 8 小时）。这不是日历工期；不含检索／时代门槛接线、故事模式 prompt 改造、自动回归、六角色真实对话验收，也不含声音／视觉扩充。若官方旧页面不可取证，需要改用官方游戏任务、手册或已保存许可材料，研究成本会增加；若已有主源快照可直接复用，可接近下限。

这 95–135 条包含将现有 28 条原典类 facts、28 个关系标签和旧凯瑞甘资料改写为可检索、可引证记录的工作，不是另外声称缺少 95–135 个全新 canonical 事实。优先把凯瑞甘＋雷诺这一对做成可用样板，再复用到其余四位；不要先把全部原典灌入每次聊天。

## 文件库存到实际聊天的接入损失

主线程对六位目录条目分别调用了真实 `companionProductPackageInputFromCatalogueEntryV1`，未创建房间或请求模型。六位结果一致：`extensions` 仅有 `worldbookEntries / personaProfile / authorNote / eraDetails`；事实列表、关系列表和来源 URL 字典均未提升，三条世界书全部 `always:true`。

| 接入位置 | 当前行为与影响 | 需要补的工作 |
|---|---|---|
| 角色资料组包 | 保留三条世界书、口吻、作者注释和时代标题；没有逐条 biography facts、relationships 或 sourceId→URL 字典。仓库有资料不等于聊天能检索。 | 让事件／关系／来源作为可版本化知识进入候选集；按问题取少量相关条目，不恢复整包注入。 |
| 身份提示 | `systemPrompt` 优先使用 `personalitySummary`，即 tagline；已有总传记进入 description 后又被 tagline 遮住。 | 把身份、已知事实、角色口吻分开，避免用标语代替经历。 |
| 世界书激活 | 组包只传 activation.always，丢弃 modes；组装器将三条均加 always 触发，英文标题另做简单 contains 匹配。未按条目实现 era／spoiler 过滤。 | 增加可执行的最低时代、剧透门槛、中英文实体别名与关键词；诺娃默认 WoL 时代先排除后期保卫者条目。 |
| 来源与引证 | 世界书带 `blizzard.*` 等来源 ID，但未带其 URL 字典、具体段落／任务／时间码；当前模型端也无浏览工具。 | 接通来源解析，给检索事实附可核对的位置；原典事实、作者解读、即兴对白分开标记。 |
| 回复形式 | 共用 live adapter 一律要求“一到两句简短中文”；角色 author note 每回合又强推战术格言。 | 根据闲聊、故事、规则解释、战术建议选择回复方式；故事先回答事件，不能用训诫反问取代内容。 |
| 战术帮助意图 | 当前纯路由函数对“现在我要作战了，你能帮我吗，就和当初帮助 overmind 一样”返回空 sections；明确的“我的坦克射程是多少”才返回 units。 | 增加战术帮助意图与必要澄清；保持普通闲聊不带战局，同时让明确求助进入正确的只读查询。 |
| 版本与旧会话 | 已有会话绑定 package 版本／hash，提升记录持久化并按 hash 复核。 | 新知识发新包版本，验证旧会话继续可读，提供明确的升级／新会话路径；不能原地改封存字节导致恢复冲突。 |

对应一手代码：[组包字段](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/packages/product-composition/companion-product-module-v1.mjs:99)、[description/tagline](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/packages/product-composition/companion-product-module-v1.mjs:179)、[身份与口吻](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/packages/product-composition/companion-room-session-service-v1.mjs:211)、[条目触发](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/packages/product-composition/companion-room-session-service-v1.mjs:403)、[实际组装](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/packages/product-composition/companion-room-session-service-v1.mjs:724)、[强制短回复](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/packages/secure-provider-runtime/companion-worker-adapter-v1.mjs:18)、[中文／英文战局路由](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/packages/product-composition/companion-room-context-v1.mjs)、[模型工具关闭配置](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/content/provider/wave3-openai-companion-profile-v1.mjs:11)。

这不是要求把所有事实同时塞进 prompt。建议固定携带少量身份／时代／权限规则，背景事件按实体、关系和问题检索；故事查询不读取战局工作台，战术查询才读取同席当前版本事实。条目先通过时代与来源过滤，再参与相关性与预算选择。

## 战棋规则 Skill 是另一组未完成项

角色世界书与规则／策略 Skill 不是同一份资料。当前副官 group-chat 经记忆引擎装配角色世界书，当前用户明确问规则／单位等问题时另取 workbench 的对应公开片段；这不等于已消费完整新版策略 Skill，也不赋予 Preview／Confirm／Apply 权限。

当前测试树的 `T28-W3-14` 状态登记为 `in_progress`：实现与产品交接均 partial，`liveOutput: not_run`、`strategyEffect: not_measured`；基础 17 包的正式消费及优先扩展 8 方向仍单列未完成。`CURRENT_WORK` 记录的是 17 份目标 Skill／70 个准备输入，不是 17 份完成且被副官正确使用的产物。该项引用的两个 build 验收报告在本测试树均不存在，本轮没有跨工作树推定通过。[当前工作](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/CURRENT_WORK.md:34)、[实施登记](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/coordination/wave3/implementation-plan.json)、[17／25 包边界](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/docs/development/wave3/work-breakdown-2026-11-15.zh-CN.md:96)

原计划对 W3-14 估计 2–3 人日，但它依赖 W3-03、07–13 等入口，且策略效果需独立评价。此处引用的是原计划估计，不是本次重新确认的剩余工期，不能简单加在背景库工作量后当作“副官全部智能完成”。用户本房 GPT-5.4 mini 试聊授权不扩展为该生成／对战实验授权。

## 验收缺口与交付顺序

已有六角色 gate 确实检查了非空 persona／worldbook／author note／era、来源引用存在、语气差异、会话连续性和隔离等工程合同；这类证明不能替代“初遇在哪里、为什么发生、这个时代知道多少”的事实判分。其六角色 formal-content／prompt-differentiation 部分使用确定性 Provider，明确记为零真实模型调用。[既有验收说明](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs:57)、[六角色断言](/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave3-playtest/starcraft-tmg-level3/scripts/verify-ticket-26-slice-266f-companion-live-product-acceptance-v1.mjs:2172)

建议按以下顺序补齐，优先处理共同根因：

1. **先使已有资料可用（2–3 人日，后续总量的子集）**：事件／关系与来源的组包、条目级时代过滤、故事回答方式、常见中文意图；以凯瑞甘＋雷诺初遇作为少量明确案例，验证正确事实进入请求且后期事实被排除。处理新包版本及旧会话兼容。此阶段不宣称六位主线故事齐全。
2. **补六位主线故事**：按前表新增／改造 95–135 条可检索记录，共享同一事件主源，审校中文摘要、实体别名、时代与不确定性；诺娃、扎加拉需额外注意角色专属主源。
3. **补内容效果验收**：建议先建立六位各 12–15 个问题，合计 72–90 个用例，涵盖事件、关系转折、跨时代拒绝、未知事实、事实与即兴对白区分、故事与战局路由；先离线检查选材和来源，再在单独明确的模型额度内验证真实答复。当前剩余玩家试聊次数不用于这些验收。

| 工作包 | 净工作量估算 | 完成证据 |
|---|---:|---|
| 六位内容整理＋共同主源核对 | 7–11 人日 | 每条事件／关系可定位主源、中文摘要和时代范围，跨角色去重 |
| 共用组包、按需检索、时代过滤、故事提示、版本兼容 | 2–3 人日 | 真实请求含所问事实，排除无关／未来信息；旧会话可恢复 |
| 六角色内容回归与小规模实答验收 | 1–2 人日 | 72–90 用例的选材检查、事实／演绎／未知判分和有限实答记录 |
| **基础故事可用合计** | **10–16 人日** | 上述三组均有证据，保持普通聊天轻量 |

估算为单人每人日 8 小时、当前资料基础上的工程判断，置信度中等；内容范围和主源能否直接复用会影响区间。第一步的 2–3 人日已包含在后续总量中，不重复相加。可并行部分不意味着等量日历天数。此估算不含全小说／全对白收录、语音／头像扩展、完整规则／策略 Skill 生产、自动对战策略强度证明，也不包含模型费用或等待外部额度的时间。

## 本轮未执行与审计边界

未全面核验八个外部来源的当前可用性及每条事实；未抓取付费作品全文；未读真实房间日志或 Key；未生成付费模型回复；未修改代码或角色包；未执行测试；未对完整剧情覆盖或策略能力效果作完成声明。静态风险已列明，不能把它当作已修复或已经做过六角色真实问答。

`harnessLoopUsed: true`；`targetGames: [starcraft-tmg]`；本轮路由 `harness_optimizer_prompt`。读取的 harness 为角色目录、真实组包／意图函数和版本化实施登记；没有调用房间或 Provider。UI／agent 实答参考上一轮已保存的凯瑞甘回复，当前六角色实答未执行；没有记忆写入、训练候选或规则状态更改。后续改动若未能按时代／来源过滤、破坏旧会话恢复或造成事实误报，应停用新包并保留上一版，而不是以增加人设强度掩盖缺口。
