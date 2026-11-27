# SillyTavern 标准角色扮演合同核对（2026-11-28）

结论：应使用完整 Character Card V2/V3 交换对象，并原样保留暂不执行的字段；不能用自定义人物摘要代替标准卡。标准卡、世界书运行器、提示词预设、聊天文件和插件是不同合同。完整保存不等于全部运行语义已实现，功能应分别给出支持、保留但不执行或明确拒绝的状态。

## 1. 一手来源与固定版本

本轮核对官方文档站、SillyTavern 官方仓库，以及官方实现引用的卡片规范维护仓库；未把第三方写卡教程或玩家插件当作标准。规格仓库由各自维护者发布，不冒称是 SillyTavern 团队自己制定。源码通过 GitHub 公共 API 取得固定 SHA 后读取；没有克隆仓库、安装依赖、运行模型或修改服务。

- CCv2：[spec_v2.md](https://github.com/malfoyslastname/character-card-spec-v2/blob/8083fb388615ccbce768e97cbbd49d2b3214632c/spec_v2.md)，SHA 8083fb388615ccbce768e97cbbd49d2b3214632c；继承字段见同版本 [spec_v1.md](https://github.com/malfoyslastname/character-card-spec-v2/blob/8083fb388615ccbce768e97cbbd49d2b3214632c/spec_v1.md)。
- CCv3：[SPEC_V3.md](https://github.com/kwaroran/character-card-spec-v3/blob/f3a86af019fbd99f788f7a1155f399655b34ab35/SPEC_V3.md)，SHA f3a86af019fbd99f788f7a1155f399655b34ab35。
- 应用快照：[SillyTavern 1.19.1，82b64a4](https://github.com/SillyTavern/SillyTavern/commit/82b64a45c34facbc98ff4b9f33c067d3ccab6a17)，commit时间 2026-11-19T22:08:08Z；[package.json](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/package.json#L110)。这是本轮读取的release快照，不声称后续不会更新。
- 官方文档：[角色设计](https://docs.sillytavern.app/usage/core-concepts/characterdesign/)、[World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)、[Prompts](https://docs.sillytavern.app/usage/prompts/)、[Prompt Manager](https://docs.sillytavern.app/usage/prompts/prompt-manager/)、[Macros](https://docs.sillytavern.app/usage/core-concepts/macros/)、[Advanced Formatting](https://docs.sillytavern.app/usage/core-concepts/advancedformatting/)、[Chat File Management](https://docs.sillytavern.app/usage/core-concepts/chatfilemanagement/)。文档是滚动页面，源码结论以固定SHA为准。

## 2. 角色卡必填、可选与扩展

“必填”表示JSON属性必须存在且类型正确，可以是空字符串/空数组；不是必须写入虚构事实。官方角色创建UI说仅name必需，属于UI创建容错，不能拿来删减交换格式。固定版 [TavernCardValidator.js](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/src/validator/TavernCardValidator.js#L104)列出完整V2字段；该实现的V3校验仅要求data是对象，不能拿“通过上游validator”作为完整V3有效性的证明。

| 层级 | V2 | V3变化 |
|---|---|---|
| envelope | spec=chara_card_v2；spec_version=2.0；data对象 | spec=chara_card_v3；spec_version=3.0 |
| data字符串，均必填 | name、description、personality、scenario、first_mes、mes_example、creator_notes、system_prompt、post_history_instructions、creator、character_version | 全部保留 |
| data数组，均必填 | alternate_greetings:string[]、tags:string[] | 另必填group_only_greetings:string[]，可空 |
| data对象，必填 | extensions:{} | 继续保留 |
| data可选对象 | character_book | 类型扩充为V3 Lorebook |
| V3可选 | 不属于V2核心 | assets、nickname、creator_notes_multilingual、source、creation_date、modification_date |

V3 assets项含type/uri/name/ext；日期为UTC Unix秒，0可表示未知。未提供assets时规范定义默认icon/ccdefault:/main/png。nickname影响角色名宏的建议替换行为，多语言notes使用ISO639-1键。source宜只追加应用自己的条目。未知未来字段宜保留；应用自定义数据应放extensions并使用命名空间，不在标准data层随意另造字段。[CCv3对象与资产规则](https://github.com/kwaroran/character-card-spec-v3/blob/f3a86af019fbd99f788f7a1155f399655b34ab35/SPEC_V3.md#json-objects-in-character-card-v3)

creator_notes、creator、character_version不进入提示词；tags通常也不用于提示词。这些字段必须保存和可查看，不能因为不送模型就丢弃。system_prompt和post_history_instructions是标准可执行字段，不能一律改成“只保留但隔离”。若应用因明确策略禁用，应显示为行为差异。[CCv2字段语义](https://github.com/malfoyslastname/character-card-spec-v2/blob/8083fb388615ccbce768e97cbbd49d2b3214632c/spec_v2.md#creator_notes)

## 3. character_book / World Info 完整核心字段

下表按规范类型接口整理；更细的ST运行开关另列。未规定默认值时写“应用决定”，不能把本项目选值冒充标准。V3的secondary_keys解释段有“逗号分隔字符串”的措辞，但接口仍是string[]；实现以数组存储并保持原始值，兼容异常输入时应报告，不能静默改写。[CCv2 CharacterBook](https://github.com/malfoyslastname/character-card-spec-v2/blob/8083fb388615ccbce768e97cbbd49d2b3214632c/spec_v2.md#new-fields)、[CCv3 Lorebook](https://github.com/kwaroran/character-card-spec-v3/blob/f3a86af019fbd99f788f7a1155f399655b34ab35/SPEC_V3.md#lorebook-fields)

| 位置/字段 | 类型与必填性 | 缺省/运行含义 |
|---|---|---|
| book.extensions | object，必填 | 新建可用{}；保留未知键 |
| book.entries | Entry[]，必填 | 可空；不是ST本地以uid为键的entries字典 |
| book.name / description | string，可选 | 编辑元数据，不注入正文 |
| book.scan_depth | number，可选 | 最近多少条消息；未给出统一数值 |
| book.token_budget | number，可选 | 知识条目预算；未给出统一数值 |
| book.recursive_scanning | boolean，可选 | false禁止由其他条目内容递归触发；缺省由应用决定 |
| entry.keys | string[]，必填 | 主触发键 |
| entry.content | string，必填 | 命中后插入的独立正文；空正文不插入 |
| entry.extensions | object，必填 | 默认{}；保留未知键 |
| entry.enabled | boolean，必填 | false不能激活；规范未定义省略的默认值 |
| entry.insertion_order | number，必填 | 小值较早；不等于预算priority |
| entry.case_sensitive | boolean，可选 | V3未给出时由应用决定 |
| entry.name / comment | string，可选 | 编辑元数据，不作为知识正文注入 |
| entry.priority | number，可选 | 预算不足时低值可优先丢弃 |
| entry.id | V2 number可选；V3 number|string可选 | 标识，不注入正文 |
| entry.selective | boolean，可选 | true要求主键和secondary_keys共同匹配 |
| entry.secondary_keys | string[]，可选 | selective=false时忽略 |
| entry.constant | boolean，可选 | 恒定候选仍受适用条件/预算约束；V3要求实现该语义 |
| entry.position | before_char或after_char，可选 | 相对角色定义的位置 |
| entry.use_regex | V3新增boolean必填 | true按keys正则匹配；无效正则不命中；V2无此核心字段 |

V3 regex启用时，规范建议忽略secondary_keys和constant；不得擅自仍按“主键+副键且恒定”处理。V3还定义@@装饰器，它们位于content中并影响激活、位置、角色、深度等；仅能保真存储却未执行时，应列明行为缺口，而非宣称全部V3运行兼容。[CCv3 Entry与Decorators](https://github.com/kwaroran/character-card-spec-v3/blob/f3a86af019fbd99f788f7a1155f399655b34ab35/SPEC_V3.md#entries-fields)

ST的独立World Info JSON与嵌入character_book不是同一形状。实际导入转换见 [world-info.js convertCharacterBook](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/scripts/world-info.js#L5617)：keys→key、secondary_keys→keysecondary、enabled→!disable、insertion_order→order，并保留originalData。该函数未直接消费book级scan_depth/token_budget/recursive_scanning，也未读entry.use_regex；不能据此认定应用完整实现了规范所有语义。

ST扩展放在entry.extensions，常见position/depth/role/probability/useProbability/selectiveLogic/group/sticky/cooldown/delay/scan_depth/vectorized等；不是V2核心新增字段。固定版实际概率范围为0–100，不能只信char-data.js里的旧0–1注释。位置枚举为before=0、after=1、ANTop=2、ANBottom=3、atDepth=4、EMTop=5、EMBottom=6、outlet=7。[运行枚举](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/scripts/world-info.js#L855)、[扩展映射](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/scripts/world-info.js#L2678)

关键词、恒定触发、递归、预算、群组概率和定时效果会共同决定最终知识。ST可以绑定全局、角色、persona、单次聊天知识源；只有角色的主要知识书随卡导出，额外挂载不自动随卡。Outlets只在适当的后期宏位置展开，不能假定角色描述或知识条目中任意位置都支持。[官方World Info](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)

## 4. 字段如何真正变成提示词

Chat Completion使用Prompt Manager；Text Completion使用Context/Story String及Instruct格式，不能把两者混成一个所有模型通用的标准模板。卡片格式不强制完整应用提示栈；要复现ST，必须记录本次预设、顺序、开关、预算和最终消息。[Prompts](https://docs.sillytavern.app/usage/prompts/)、[Advanced Formatting](https://docs.sillytavern.app/usage/core-concepts/advancedformatting/)

固定版默认顺序为main → worldInfoBefore → personaDescription → charDescription → charPersonality → scenario → enhanceDefinitions（默认关闭）→ nsfw（Auxiliary Prompt，默认内容为空）→ worldInfoAfter → dialogueExamples → chatHistory → jailbreak（Post-History Instructions，默认内容为空）。标识符沿用历史名称，不表示必须加入相应题材。用户预设可重排/关闭这些段落，还可插入指定深度和角色的提示。[PromptManager.js默认集合及顺序](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/scripts/PromptManager.js#L2001)

| 卡片字段 | 实际消费规则 |
|---|---|
| description/personality/scenario | 作为各自定义段；先解析核心宏，保留各段来源 |
| first_mes | 新聊天的初始assistant消息；只创建一次，随后属于普通历史，不能每轮在历史之外重复附加 |
| alternate_greetings | 首条消息可切换的候选；只选当前项，不能全部拼接 |
| group_only_greetings | V3群聊专用额外候选；不作为单聊每轮正文 |
| mes_example | 原始字符串；按<START>分块，按用户/角色前缀解析示例；不是已经发生的历史 |
| system_prompt | 非空时默认替换对应全局main；空则用全局回退；{{original}}插入对应原始main |
| post_history_instructions | 非空时默认替换对应全局PHI；空则回退；{{original}}插入原始PHI，不能错用main |
| character_book | 默认作为角色知识源参与激活，不应仅导入后搁置 |

字段覆盖由 [getCharacterCardFieldsLazy](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/script.js#L3402)及 [preparePromptsForChatCompletion](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/scripts/openai.js#L1367)执行；prefer_character_prompt和prefer_character_jailbreak在固定版默认true，但用户可改，Prompt Manager段落禁用或forbid_overrides也能阻止覆盖。它们是运行配置，不是卡片本体的必填字段。[power-user.js](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/scripts/power-user.js#L203)

核心V1替换对{{char}}/<BOT>、{{user}}/<USER>忽略大小写；用户名称需有默认值。V3 nickname建议覆盖char替换。{{original}}仅在对应覆盖语境有意义。ST更多宏支持变量、随机、时间、嵌套、插件注册，并随实验宏引擎而变；不属于CCv2/V3自动统一的全部跨应用能力。保留未知宏原文并显式报告不支持，优于假装已全部展开。[V1字段替换](https://github.com/malfoyslastname/character-card-spec-v2/blob/8083fb388615ccbce768e97cbbd49d2b3214632c/spec_v1.md#fields)、[ST宏文档](https://docs.sillytavern.app/usage/core-concepts/macros/)

示例对话以<START>分块；该标记本身不直接进入最终提示词，而是由对应预设分隔。实际 [parseMesExamples](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/script.js#L3501)及 [parseExampleIntoIndividual](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/scripts/openai.js#L729)表明Chat Completion中间结构使用带example_user/example_assistant名称的system示例消息；后端仍可再转换，不能把这个中间形状说成所有模型必须接受的通用协议。示例可受上下文预算逐块挤出，或由用户设置固定保留/关闭。[Character Design—Examples](https://docs.sillytavern.app/usage/core-concepts/characterdesign/#examples-of-dialogue)

## 5. JSON、PNG、CHARX与保真

JSON导出应是完整spec/spec_version/data对象。为了无编辑往返保真，保存原始序列化载荷；编辑时对原对象局部更新，保留未知JSON字段、extensions、可选字段和未执行功能的数据。原始字节保真、JSON语义保真、运行行为等价是三个不同验收，不能只测name/description相同。

CCv2 PNG使用tEXt/chara，值为UTF-8 JSON的base64；CCv3使用tEXt/ccv3，二者同时存在时优先ccv3。若兼容写两份，必须保持内容一致；V3降级为V2应明确说明丢失项。固定版 [character-card-parser.js](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/src/character-card-parser.js#L15)实际写两块、读ccv3优先，其函数头“只写chara”的旧注释与代码不符。不要把旧注释或仅改spec标签当成完成V3迁移。

CHARX是ZIP，根目录card.json；规范资产前缀拼作embeded://，路径区分大小写。资产类型存在不意味着应用必须执行所有媒体/程序；不支持时可忽略执行，但应保存或在不能保存时明确警告。当前ST [CharXParser](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/src/charx.js#L51)也兼容embedded://和__asset:，属于实现兼容范围。[CCv3 Embedding Methods](https://github.com/kwaroran/character-card-spec-v3/blob/f3a86af019fbd99f788f7a1155f399655b34ab35/SPEC_V3.md#embedding-methods)

ST导出并非整个用户环境备份：[characters.js /export](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/src/endpoints/characters.js#L1647)处理PNG/JSON，unsetPrivateFields会移除chat关联并重置fav；world-info重建转换也可能重写其本地字段。导出卡片不含所有外部知识书、预设、persona、插件和聊天。严格保真实现应保留原始对象，并分别报告有意排除的应用私有状态。

## 6. 聊天记录与示例消息不可混同

CCv2/V3没有定义一个覆盖所有应用聊天文件和插件状态的通用聊天规范。ST原生JSONL为一行一个JSON对象：首行header（chat_metadata及兼容user_name/character_name），之后逐条消息。常见name、is_user、is_system、send_date、mes、extra；swipe_id/swipes/swipe_info等保存候选。未知header/extra/消息键应完整保存。[saveChat](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/public/script.js#L7429)、[chats.js原生导出](https://github.com/SillyTavern/SillyTavern/blob/82b64a45c34facbc98ff4b9f33c067d3ccab6a17/src/endpoints/chats.js#L679)

官方JSONL导出可以原样重新导入，携带元数据，但排除图片和附件；纯文本导出会丢失元数据且不能用于等价重导入。不能用简化role/content数组冒充完整ST聊天归档；该数组只能是发给模型的运行投影。[Chat File Management](https://docs.sillytavern.app/usage/core-concepts/chatfilemanagement/)

## 7. 本树已有入口（有界读取）

仅检查根代理提供的5个已知路径，未遍历其他项目或读取密钥。下列只是已有入口，不是重新验收它们全部运行能力：

- packages/character-agent/character-card-v2-adapter-v1.mjs：exportStarcraftTmgCharacterCardV2 / importStarcraftTmgCharacterCardV2。
- packages/character-agent/character-card-v2-png-adapter-v2.mjs：JSON保留与PNG嵌入/提取函数；历史模块已有明确版本。
- content/characters/character-card-v2-png-standard-binding-v1.mjs：旧绑定明确chara/V2、exactlyOneCharaChunk、保留未知ancillary chunk等项目约束；这不是V3标准的全部承载合同。
- docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md：历史1.19.0对等矩阵，需与本轮1.19.1快照区分。
- docs/ticket-26-slice-266d-companion-tavern-completion-v1-2026-09-22.md：scoped Tavern-equivalent合同，不等于所有ST插件/模板均已标准化。

建议复用边界并新增标准支持层，保持旧封存包和hash可追溯；这是本轮实现建议，不是上游规范强制要求。未推荐新增依赖。

## 8. 可复现验收与支持声明

下方机器JSON同时提供字段表、完整V2与V3卡样例和聊天数组。将examples.cardV3单独序列化为JSON文件即可成为V3导入夹具；examples.cardV2同理。chatJsonl须将各对象逐行JSON.stringify并以换行连接，而不是写成JSON数组。示例内容均为自创协议夹具，不是凯瑞甘背景故事。

建议用离线断言复现，不能用真实模型对话替代合同校验：

1. 原样导入/导出两个完整卡：嵌套unknown_probe、book扩展、entry扩展、中文、空串/数组、false和0完整保留；无编辑模式原始字节一致。
2. V3删除group_only_greetings或entry.use_regex时报告缺项；V2不要把这些当必填。id字符串只接受为V3核心类型。V3降级显式产生差异清单。
3. 同时含chara/ccv3的PNG选ccv3；重新编辑后两块不可冲突；只支持V2的历史接口不要静默吞V3。
4. 空system_prompt/PHI分别回退到全局；有{{original}}分别替换到自己的原始段；先关闭Prefer开关再验证禁用行为可解释。
5. first_mes只进初始历史一次；选择alternate greeting只切换候选；示例独立分块，不写成真实历史；names宏按忽略大小写处理。
6. 默认只插入恒定风格条；用户说“灯塔”但未说“海岸”时selective条不命中；说“灯塔与海岸”才命中；enabled=false永不命中；递归false不跨条触发。
7. 测预算与priority、insertion_order区别、before/after位置和regex无效输入；完整记录最终激活/未激活原因。
8. 原生JSONL保留header、extra、swipes与未知字段；声明附件不随JSONL迁移。

以上是待实现验收建议，本研究没有运行本树测试、导入应用或触发模型请求。

支持矩阵至少逐项区分：标准核心（卡字段、核心宏、character_book）、V3扩展规范（assets、nickname、多语言notes、source、日期、decorators）、ST应用特有（depth_prompt、regex_scripts、WI深度/概率/组/定时效果、outlet、预设、persona）、外部插件。未执行字段仍保留；如果字段会显著改变运行且尚不支持，应在启用时列出并拒绝声称行为等价，或提供用户明确选择的兼容模式。未知脚本/宏不能因为出现在卡里就自动执行。不能宣称全SillyTavern、全插件或全模板兼容。

## 9. 机器可读字段表与完整夹具

```json
{
  "schemaVersion": "project_d_sillytavern_research_contract_v1",
  "reviewedAt": "2026-11-28",
  "upstream": {
    "application": "SillyTavern",
    "version": "1.19.1",
    "commit": "82b64a45c34facbc98ff4b9f33c067d3ccab6a17",
    "specifications": [
      {
        "id": "v2",
        "repo": "malfoyslastname/character-card-spec-v2",
        "path": "spec_v2.md",
        "sha": "8083fb388615ccbce768e97cbbd49d2b3214632c",
        "date": "2023-06-22T09:46:19Z",
        "url": "https://github.com/malfoyslastname/character-card-spec-v2/blob/8083fb388615ccbce768e97cbbd49d2b3214632c/spec_v2.md"
      },
      {
        "id": "v3",
        "repo": "kwaroran/character-card-spec-v3",
        "path": "SPEC_V3.md",
        "sha": "f3a86af019fbd99f788f7a1155f399655b34ab35",
        "date": "2024-07-20T14:36:12Z",
        "url": "https://github.com/kwaroran/character-card-spec-v3/blob/f3a86af019fbd99f788f7a1155f399655b34ab35/SPEC_V3.md"
      }
    ]
  },
  "distinction": {
    "card": "Portable Character Card V2/V3 data",
    "runtime": "Prompt ordering, activation, macros and provider conversion",
    "preservation": "Preserve unsupported data independently of whether it executes"
  },
  "cardV2": {
    "spec": "chara_card_v2",
    "spec_version": "2.0",
    "requiredDataStringFields": [
      "name",
      "description",
      "personality",
      "scenario",
      "first_mes",
      "mes_example",
      "creator_notes",
      "system_prompt",
      "post_history_instructions",
      "creator",
      "character_version"
    ],
    "requiredDataArrayFields": {
      "alternate_greetings": "string[]",
      "tags": "string[]"
    },
    "requiredDataObjectFields": {
      "extensions": "Record<string, JSONValue>"
    },
    "optionalDataFields": {
      "character_book": "CharacterBook"
    },
    "notPromptFields": [
      "creator_notes",
      "creator",
      "character_version"
    ],
    "normallyNotPromptFields": [
      "tags"
    ]
  },
  "cardV3": {
    "spec": "chara_card_v3",
    "spec_version": "3.0",
    "inherits": "cardV2",
    "additionalRequiredDataFields": {
      "group_only_greetings": "string[]"
    },
    "additionalOptionalDataFields": {
      "assets": "Array<{type:string,uri:string,name:string,ext:string}>",
      "nickname": "string",
      "creator_notes_multilingual": "Record<ISO639_1,string>",
      "source": "string[]",
      "creation_date": "number (Unix seconds UTC)",
      "modification_date": "number (Unix seconds UTC)"
    },
    "changedFields": {
      "character_book": "Lorebook (V3 entry use_regex required; entry id supports string|number)"
    },
    "absentAssetsRuntimeDefault": [
      {
        "type": "icon",
        "uri": "ccdefault:",
        "name": "main",
        "ext": "png"
      }
    ]
  },
  "characterBook": {
    "required": {
      "extensions": "Record<string, JSONValue>",
      "entries": "Entry[]"
    },
    "optional": {
      "name": "string",
      "description": "string",
      "scan_depth": "number",
      "token_budget": "number",
      "recursive_scanning": "boolean"
    },
    "defaults": {
      "extensions": {},
      "entries": [],
      "scan_depth": "not globally specified",
      "token_budget": "not globally specified",
      "recursive_scanning": "if absent application decides; false forbids recursive matching"
    }
  },
  "entryV2": {
    "required": {
      "keys": "string[]",
      "content": "string",
      "extensions": "Record<string, JSONValue>",
      "enabled": "boolean",
      "insertion_order": "number"
    },
    "optional": {
      "case_sensitive": "boolean",
      "name": "string",
      "priority": "number",
      "id": "number",
      "comment": "string",
      "selective": "boolean",
      "secondary_keys": "string[]",
      "constant": "boolean",
      "position": "before_char|after_char"
    },
    "runtimeMeaning": {
      "enabledFalse": "Never activate",
      "constantTrue": "Always considered for activation within applicable conditions/budget",
      "insertion_order": "Lower values occur earlier",
      "priority": "Lower priority may be discarded earlier at budget pressure",
      "selectiveTrue": "Requires primary and secondary-key match",
      "secondary_keys": "Ignored when selective is false",
      "name": "Metadata, not prompt content",
      "comment": "Metadata, not prompt content"
    }
  },
  "entryV3": {
    "inherits": "entryV2",
    "additionalRequired": {
      "use_regex": "boolean"
    },
    "changed": {
      "id": "number|string (optional)",
      "constant": "Field optional; behavior required to implement"
    },
    "defaults": {
      "use_regex": "Required; do not silently label a missing value as a standard default",
      "case_sensitive": "If absent application decides",
      "enabled": "Required; no universal implicit value",
      "insertion_order": "Required; no universal implicit value"
    },
    "regexRules": {
      "invalidPattern": "No match",
      "secondary_keys": "SHOULD be ignored when use_regex=true",
      "constant": "SHOULD be ignored when use_regex=true"
    },
    "decoratorSupportMustBeDeclared": true
  },
  "promptStack": {
    "standardFormatDoesNotDefineEveryPreset": true,
    "pinnedSillyTavernDefaultOrder": [
      [
        "main",
        true
      ],
      [
        "worldInfoBefore",
        true
      ],
      [
        "personaDescription",
        true
      ],
      [
        "charDescription",
        true
      ],
      [
        "charPersonality",
        true
      ],
      [
        "scenario",
        true
      ],
      [
        "enhanceDefinitions",
        false
      ],
      [
        "nsfw",
        true
      ],
      [
        "worldInfoAfter",
        true
      ],
      [
        "dialogueExamples",
        true
      ],
      [
        "chatHistory",
        true
      ],
      [
        "jailbreak",
        true
      ]
    ],
    "defaultApplicationSwitches": {
      "prefer_character_prompt": true,
      "prefer_character_jailbreak": true,
      "experimental_macro_engine": true
    },
    "substitution": {
      "coreCaseInsensitiveAliases": {
        "{{char}}": "character name; V3 nickname SHOULD override",
        "<BOT>": "character name; V3 nickname SHOULD override",
        "{{user}}": "persona/display name",
        "<USER>": "persona/display name"
      },
      "original": "For system_prompt and post_history_instructions, substitute corresponding global/preset prompt, not each other"
    },
    "first_mes": "Initial assistant history message once; choose alternate greeting/swipe without concatenating all greetings",
    "mes_example": "String with <START> blocks; preserve raw; parse speaker lines separately from real history",
    "metadataExclusion": [
      "creator_notes",
      "creator",
      "character_version",
      "book.name",
      "book.description",
      "entry.name",
      "entry.comment"
    ]
  },
  "carriage": {
    "json": "Entire specification envelope, UTF-8",
    "pngV2": {
      "type": "tEXt",
      "keyword": "chara",
      "value": "base64(UTF8(JSON))"
    },
    "pngV3": {
      "type": "tEXt",
      "keyword": "ccv3",
      "value": "base64(UTF8(JSON))",
      "preferredWhenBothExist": true
    },
    "charx": {
      "container": "ZIP",
      "cardPath": "card.json",
      "assetPrefix": "embeded://",
      "caseSensitivePaths": true
    },
    "preserve": {
      "unknownExtensions": true,
      "unsupportedOptionalFields": true,
      "rawPayloadForNoEditRoundTrip": true,
      "unsupportedAssets": "Preserve or explicitly warn if unable; do not silently discard"
    },
    "downgrade": "Explicit conversion with loss report; do not silently relabel V3 as V2"
  },
  "examples": {
    "cardV2": {
      "spec": "chara_card_v2",
      "spec_version": "2.0",
      "data": {
        "name": "协议核对员",
        "description": "{{char}}负责解释资料来源，并尊重{{user}}的选择。",
        "personality": "冷静、简洁；知道的说清楚，未知的承认未知。",
        "scenario": "{{user}}正在检查一份可携带的角色资料。",
        "first_mes": "*我把资料放在桌上。* {{user}}，先核对哪一页？",
        "mes_example": "<START>\n{{user}}: 你确定吗？\n{{char}}: 这一项有资料支持；另一项仍未核实。\n<START>\n{{user}}: 我先想想。\n{{char}}: 好，我等你决定。",
        "creator_notes": "协议演示卡；内容为自创示例，不是凯瑞甘正史资料。",
        "system_prompt": "{{original}}\n只写{{char}}自己的下一次回应。",
        "post_history_instructions": "{{original}}\n回应{{user}}当前问题。",
        "alternate_greetings": [
          "{{user}}，资料已经准备好了。"
        ],
        "tags": [
          "protocol-fixture"
        ],
        "creator": "Project D protocol research",
        "character_version": "1.0.0",
        "extensions": {
          "project_d": {
            "schema_version": "roleplay_fixture_v1",
            "provenance": "synthetic protocol example",
            "unknown_probe": {
              "nested": [
                0,
                false,
                "保留我"
              ]
            }
          }
        },
        "character_book": {
          "name": "协议演示知识书",
          "description": "自创测试资料。",
          "scan_depth": 2,
          "token_budget": 256,
          "recursive_scanning": false,
          "extensions": {
            "project_d": {
              "unknown_book_probe": "保留我"
            }
          },
          "entries": [
            {
              "id": 0,
              "name": "默认交谈风格",
              "comment": "编辑器备注",
              "keys": [],
              "secondary_keys": [],
              "content": "协议核对员习惯先给结论，再给证据。",
              "extensions": {
                "project_d": {
                  "unknown_entry_probe": 7
                }
              },
              "enabled": true,
              "insertion_order": 10,
              "constant": true,
              "selective": false,
              "case_sensitive": false,
              "position": "before_char",
              "priority": 10
            },
            {
              "id": 1,
              "name": "灯塔资料",
              "comment": "只在提到灯塔时触发",
              "keys": [
                "灯塔",
                "lighthouse"
              ],
              "secondary_keys": [
                "海岸",
                "coast"
              ],
              "content": "演示世界的灯塔位于海岸。",
              "extensions": {},
              "enabled": true,
              "insertion_order": 20,
              "constant": false,
              "selective": true,
              "case_sensitive": false,
              "position": "after_char",
              "priority": 20
            }
          ]
        }
      }
    },
    "cardV3": {
      "spec": "chara_card_v3",
      "spec_version": "3.0",
      "data": {
        "name": "协议核对员",
        "description": "{{char}}负责解释资料来源，并尊重{{user}}的选择。",
        "personality": "冷静、简洁；知道的说清楚，未知的承认未知。",
        "scenario": "{{user}}正在检查一份可携带的角色资料。",
        "first_mes": "*我把资料放在桌上。* {{user}}，先核对哪一页？",
        "mes_example": "<START>\n{{user}}: 你确定吗？\n{{char}}: 这一项有资料支持；另一项仍未核实。\n<START>\n{{user}}: 我先想想。\n{{char}}: 好，我等你决定。",
        "creator_notes": "协议演示卡；内容为自创示例，不是凯瑞甘正史资料。",
        "system_prompt": "{{original}}\n只写{{char}}自己的下一次回应。",
        "post_history_instructions": "{{original}}\n回应{{user}}当前问题。",
        "alternate_greetings": [
          "{{user}}，资料已经准备好了。"
        ],
        "group_only_greetings": [],
        "tags": [
          "protocol-fixture"
        ],
        "creator": "Project D protocol research",
        "character_version": "1.0.0",
        "extensions": {
          "project_d": {
            "schema_version": "roleplay_fixture_v1",
            "provenance": "synthetic protocol example",
            "unknown_probe": {
              "nested": [
                0,
                false,
                "保留我"
              ]
            }
          }
        },
        "character_book": {
          "name": "协议演示知识书",
          "description": "自创测试资料。",
          "scan_depth": 2,
          "token_budget": 256,
          "recursive_scanning": false,
          "extensions": {
            "project_d": {
              "unknown_book_probe": "保留我"
            }
          },
          "entries": [
            {
              "id": 0,
              "name": "默认交谈风格",
              "comment": "编辑器备注",
              "keys": [],
              "secondary_keys": [],
              "content": "协议核对员习惯先给结论，再给证据。",
              "extensions": {
                "project_d": {
                  "unknown_entry_probe": 7
                }
              },
              "enabled": true,
              "insertion_order": 10,
              "constant": true,
              "selective": false,
              "use_regex": false,
              "case_sensitive": false,
              "position": "before_char",
              "priority": 10
            },
            {
              "id": 1,
              "name": "灯塔资料",
              "comment": "只在提到灯塔时触发",
              "keys": [
                "灯塔",
                "lighthouse"
              ],
              "secondary_keys": [
                "海岸",
                "coast"
              ],
              "content": "演示世界的灯塔位于海岸。",
              "extensions": {},
              "enabled": true,
              "insertion_order": 20,
              "constant": false,
              "selective": true,
              "use_regex": false,
              "case_sensitive": false,
              "position": "after_char",
              "priority": 20
            }
          ]
        },
        "assets": [
          {
            "type": "icon",
            "uri": "ccdefault:",
            "name": "main",
            "ext": "png"
          }
        ],
        "nickname": "核对员",
        "creator_notes_multilingual": {
          "zh": "协议演示卡；不属于已核实的游戏正史。",
          "en": "Synthetic protocol fixture."
        },
        "source": [],
        "creation_date": 0,
        "modification_date": 0
      }
    },
    "chatJsonl": [
      {
        "chat_metadata": {
          "note": "演示元数据",
          "project_d": {
            "unknown_probe": "保留我"
          }
        },
        "user_name": "unused",
        "character_name": "unused"
      },
      {
        "name": "协议核对员",
        "is_user": false,
        "is_system": false,
        "send_date": "2026-11-28T00:00:00.000Z",
        "mes": "先核对哪一页？",
        "extra": {},
        "swipe_id": 0,
        "swipes": [
          "先核对哪一页？",
          "资料已准备好。"
        ]
      },
      {
        "name": "测试用户",
        "is_user": true,
        "is_system": false,
        "send_date": "2026-11-28T00:00:01.000Z",
        "mes": "先看灯塔与海岸。",
        "extra": {
          "project_d": {
            "unknown_message_probe": [
              1,
              2
            ]
          }
        }
      }
    ]
  }
}
```
