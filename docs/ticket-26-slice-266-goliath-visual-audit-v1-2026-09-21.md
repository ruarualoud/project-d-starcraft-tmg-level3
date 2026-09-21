# Ticket 26 / Slice 266 — Goliath 通讯/棋子头像视觉审计

任务文件名沿用 2026-09-21；制作跨日完成于 2026-09-22（Asia/Shanghai）。

## 结果与边界

新增 Goliath 驾驶员原创衍生四态 `idle / selected / attack / damaged`，各 1254×1254 PNG。角色设计修正为经典 Goliath 驾驶员的高冠橄榄色头盔、双圆目镜、呼吸面罩、驾驶舱双侧屏幕与胸前安全带，取代现有 generated fallback 的机器人面孔。四态经原图及真实 96px 方形/圆形裁切检查，装备身份稳定且动作有可见差异。

**这是四张动作关键帧，不是连续动画成品。** 未生成中间帧、未验证循环连续性。此隔离任务只新增素材和本审计，未修改任何代码、媒体解析器、TASKS/CURRENT_WORK、旧素材，也未提交 Git。因此当前应用不会仅因这些新文件存在而自动切换：主任务仍需统一接线并完成实际 UI 检查。

交付目录绝对路径：
`/Users/rualoud/Downloads/codex_project/project-d/starcraft-tmg-level3/assets/characters/goliath-pilot/`

## 找到的不一致及现有引用

现有公开 fallback 为：
- `assets/client/battlefield/unit-comms/public-fallback/goliath-neutral.webp`
- `assets/client/battlefield/unit-comms/public-fallback/goliath-active.webp`

两图来自 `content/client/battlefield-media-provenance-v1.mjs` 记录的早期八单位通用 4×2 生成图集。目视表现为巨大机甲外壳中的小型蓝眼机器人/金属颅骨，缺少经典驾驶员高冠、圆目镜和氧气面罩识别。这是本轮修正的视觉缺陷，不是官方 Goliath 身份基准。

另有 `assets/client/battlefield/unit-comms/development-internal/goliath-animated.webp`，现有 provenance 记录其历史源为经典游戏头像经社区镜像导入。本轮只读查看这个既有文件，未联网取社区来源，也未复制它作交付素材。其高冠、圆目镜和呼吸面罩用于识别对照，而非逐像素复刻。

引用点：
- `apps/starcraft-tmg-expo/lib/level3/battlefield-media-assets-v1.ts:28` 的 Goliath fallback 映射仍指向旧两张 WebP。
- `packages/client-domain/battlefield-media-catalog-v1.mjs:101` 起，`public` 走 generated fallback；`public_user_authorized / development_internal` 且有媒体 origin 时可走 `goliath-animated.webp`。
- `apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx:311` 的棋子使用同一 resolver 的 selected ? activePortrait : neutralPortrait。
- 同文件 `:1108` 的通讯面板使用同一 resolver 的 activePortrait。

因此后续必须从同一 resolver/媒体目录统一替换 identity；只接通新静态 fallback 而保留另一个 channel 的旧动画，仍可能造成跨环境风格差异。本轮不改该路由，也不把新的四帧状态强塞进现有 neutral/active 二态合同。棋子中心 `xMidYMid slice` 和通讯 `contentFit=cover / center` 是本轮圆形/方形裁切检查的依据。

## 官方出处与证据等级

本轮网络查询限 Blizzard/StarCraft 官方来源：
- [Blizzard — Game Guide: Multiplayer Portraits](https://news.blizzard.com/en-us/article/6693946/game-guide-multiplayer-portraits)：页面明确列有 Goliath 肖像，并直接链接到下述官方媒体 URL。
- [官方 Goliath 肖像直接链接](https://us.media.blizzard.com/sc2/media/screenshots/guide/portraits/portrait_goliath-large.jpg)：本轮网页工具和直接请求均无法取回，记录为 CDN timeout/fetch failure；**没有声称已看过此 SC2 图片**。
- [Blizzard Classic — Goliath](https://classic.battle.net/scc/terran/ugl.shtml)：官方说明是单人驾驶的 Goliath Combat Walker。
- [Blizzard Classic — Terran Units](https://classic.battle.net/scc/terran/unit.shtml)：官方单位目录称其为 Goliath Combat Walker Pilot。

本轮采用“经典通讯驾驶员识别 + SC2 写实通讯渲染”，不是已验证的 SC2 原头像像素复刻，也不是 Blizzard 原始图片的重新打包。官方文字与精确肖像 URL 可追溯；具体高冠/圆目镜/面罩视觉对照来自仓库既有经典头像。SC2 官方 CDN 图片本轮不可达属于来源证据限制，后续可补取并与本设计进一步核对。没有下载或复制新的受版权原图作为输出。

## 制作方法与提示

完整 [prompt 集](../assets/characters/goliath-pilot/keyframe-prompts-v1.json) 保存所有本轮输入文本。内置 imagegen 共 4 次成功调用，未使用 CLI/API fallback，未安装依赖，无价格遥测。

idle 为新渲染原创衍生：输入 1 为已有经典头像，限定只借用装备识别；输入 2 为旧生成 fallback，只借用暗色军用材质/灯光风格，明确禁止继承机器人颅骨。三个动作态仅输入新 idle-v1，锁定同一双圆目镜、眼部、面罩、双滤器/短管、头盔条带、安全带与座舱，分别要求侧转、前压和后缩斜倾。没有新增永久损伤；damaged 是受冲击反应而非破甲或伤口。

## 96px 检查

[方形/圆形四态接触表](../assets/characters/goliath-pilot/contact-sheet-96-v1.png) 为 384×192：每格真实 96×96，上排方形通讯、下排圆形棋子。四列 idle / selected / attack / damaged。

[前后对照](../assets/characters/goliath-pilot/before-after-96-v1.png) 为 576×96：旧 neutral、旧 active、新四态。旧两态主要眼光差异，新四态有实际头盔中心线、目镜高度、颈部及肩线变化。

使用现有 Playwright/Chromium，deviceScaleFactor=1，原图直接等比例缩小并作 CSS 圆形 clip；没有调色、锐化、光流插值或整体图片摇晃。检查结论：

| 状态 | 96px 识别证据 | 裁切结果 |
| --- | --- | --- |
| idle | 高冠棕色中线、两个圆形绿目镜和中央呼吸器形成稳定驾驶员符号 | 方形/圆形均保留双目镜及双侧呼吸过滤器 |
| selected | 头盔向右侧转，近远目镜透视、鼻部朝向及头冠中线偏转明确 | 近侧耳部略靠边，关键面罩仍完整 |
| attack | 头部下压、目镜明显下降、肩部上撑，顶冠所占比例增大 | 双目镜与呼吸器仍可辨，不依赖灯色 |
| damaged | 头冠斜线、左右目镜高低差和肩线反向变化 | 斜倾后依然保留双目镜/面罩，无伤口或裂镜 |

“准入”是本轮目视素材审查，不是用户无标签盲测或运行时截图验收。圆形裁切证明当前建议中心裁切可用；没有宣称 96px 下可读 cockpit 小文字或识别具体人类五官。

## 交付文件与 SHA-256

路径相对 `starcraft-tmg-level3/`。

| 文件 | 尺寸 | SHA-256 | 准入/用途 |
| --- | --- | --- | --- |
| `assets/characters/goliath-pilot/attack-v1.png` | 1254×1254 | `97de7b5314800c491f46189b66d7b982fc9b591b1e29776b10099d6622816a03` | 准入关键帧：头颈前压、肩线抬起；目镜明显下移，头冠透视增大，无新武器/火光。 |
| `assets/characters/goliath-pilot/before-after-96-v1.png` | 576×96 | `832f5a09441ff37e0883bca74a894ace33087b5e85b06c3652de128b1192ab94` | 96px 横向六格：旧 neutral、旧 active、新 idle、selected、attack、damaged；只含已有生成 fallback 与新原创衍生图。 |
| `assets/characters/goliath-pilot/contact-sheet-96-v1.png` | 384×192 | `2b00b37ee0ee4c4f0462eadc1aa8677fcad1fe91739d7b39881012126541414d` | 96px 两行四列：上方方形通讯图，下方圆形棋子裁切；顺序 idle/selected/attack/damaged。 |
| `assets/characters/goliath-pilot/damaged-v1.png` | 1254×1254 | `ee97693b839a6d059dbf85cf7e0a56af59d94584c9b0cccd72b691ba6e6a2286` | 准入关键帧：斜倾后收、肩线不对称；目镜/面罩结构连续，无伤痕/裂镜/烟火。 |
| `assets/characters/goliath-pilot/idle-v1.png` | 1254×1254 | `9b7ecbab6d6e528fe6714bcd7c096d4f5409baf3250303f86075652dd85b55a0` | 准入关键帧：正面中性，高冠/圆目镜/双滤器清晰，驾驶舱双屏和安全带明确。 |
| `assets/characters/goliath-pilot/selected-v1.png` | 1254×1254 | `6db130a1839e73783c4890908d23832ba427e23794a1bf3143a3bcf74b74e4f3` | 准入关键帧：实际向右转头；两圆目镜近远透视与呼吸器侧面可辨，座舱未随相机旋转。 |

旧素材保持只读，留存定位校验值：

| 文件 | 尺寸 | SHA-256 |
| --- | --- | --- |
| `assets/client/battlefield/unit-comms/public-fallback/goliath-neutral.webp` | 442×442 | `6312bee30a3523a2924e4e643bf434d73c147787cdc980a8af5f1f55881e2466` |
| `assets/client/battlefield/unit-comms/public-fallback/goliath-active.webp` | 442×442 | `3091f2f6de8329e2f0470e21a65ab8aac7c335133931504d3d2a0571cf914488` |
| `assets/client/battlefield/unit-comms/development-internal/goliath-animated.webp` | 224×240 | `13122a3957c74a92eae992348652f3b638692178c64343bc880eff06e13cfba7` |

## 后续接线/动画建议（本轮未执行）

优先让 neutral 映射新 idle，active 的基本选中映射新 selected；attack/damaged 需要宿主真实事件到显示状态的明确接线，不能用随机切图伪装已支持。显示更改不能影响规则、掷骰、回执或 training truth。

若要连续动作，每态另补 3–5 张实际局部形变帧：idle 呼吸轻升降；selected 目光先行→侧转→轻回正；attack 肩部预紧→低头前压→稳定→半幅回位；damaged 后收→斜倾→安全带约束下回正。固定 cockpit 背景与相机，逐帧保留滤器数量与连接、目镜圆形边框和眼部身份。之后再验证 96px 循环无装备跳变/首尾跳帧；单图淡入淡出不是完成动画。

本轮最终验证：四张 1254² 文件存在、SHA 各异、两张审计图尺寸正确、prompt 集与此文档落盘。未运行应用测试、未发布、未修改旧文件或代码、未 Git 提交。
