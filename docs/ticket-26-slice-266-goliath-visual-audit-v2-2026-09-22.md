# Ticket 26 / Slice 266 — Goliath 官方一致性视觉审计 v2

## 结论

本轮生成并准入一套新的 Goliath 驾驶员四态通讯关键帧：`idle / selected / attack / damaged`。新版本以 Blizzard 官方 StarCraft II Goliath 肖像确认驾驶员的人体与装备结构，同时保留 StarCraft 1 通讯头像的近景、暗舱、绿色监视器和 2D 绘制氛围。

四张图是**状态切换关键帧，不是连续动画**。它们没有中间帧、时间轴或循环连续性证明，不应在产品中标注为已经完成的动画。

## 为什么 v1 不再适合作为官方一致性版本

上一轮无法成功读取 Blizzard 官方 SC2 肖像，因而依据仓库内经典 SC1 通讯头像生成了全罩面具驾驶员。2026-09-22 本轮成功读取官方页面所链接的 Goliath 大图后，确认 SC2 官方驾驶员是露面的人类男性：剃光头、短 moustache/goatee、橙色圆角护目镜、横跨头顶和太阳穴的接口板、圆形耳部接口、深蓝颈封和驾驶座约束结构；不存在覆盖鼻口的呼吸面罩。

因此：

- `*-v1.png` 可保留为原创的 SC1 面罩致敬变体，但**拒绝**接入“SC2 官方一致性”默认通道。
- 旧 `public-fallback/goliath-neutral.webp` 与 `goliath-active.webp` 是蓝眼机器人/机甲面孔，**拒绝**继续作为公开默认身份。
- `development-internal/goliath-animated.webp` 能说明 SC1 经典通讯构图，但属于既有内部参考，**不能**作为可公开分发的新资产。
- 本轮 `*-v2.png` 四态与 `contact-sheet-96-v2.png` **准入**后续公开默认接线。

## 官方证据与使用边界

- Blizzard 官方页面：[Game Guide: Multiplayer Portraits](https://news.blizzard.com/en-us/article/6693946/game-guide-multiplayer-portraits)，Terran Portraits 中列出并链接 Goliath。
- Blizzard 官方媒体链接：`https://us.media.blizzard.com/sc2/media/screenshots/guide/portraits/portrait_goliath-large.jpg`。
- 官方图片仅在生成时作为驾驶员人体与装备事实参考，未复制到仓库、未嵌入 contact sheet、未作为交付物重新分发。临时取得文件的 SHA-256 为 `f202dddf0c07f975ea3f0199cf11ca1b30751cf7e465d10b0aa330fc3735dac8`。
- 仓库既有经典通讯头像只用于 SC1 近景暗舱、绿色扫描氛围和 96px 可读性参考；输出没有逐像素复刻。

## 连续性与状态差异审计

所有四态保持同一名成年黑人男性驾驶员、同一脸型和肤色、剃光头、短 moustache/goatee、圆角琥珀护目镜、头顶接口板、圆形耳机、颈封、蓝灰肩部约束、胸前安全带、座舱背景和冷绿/琥珀光源。没有伤口、疤痕、血迹、裂镜、武器或装备凭空增减。

| 状态 | 可见动作 | 96px 结论 |
| --- | --- | --- |
| `idle-v2` | 正面、肩线水平、眼睛前视 | 人脸、橙色护目镜、头顶接口板和肩带均清楚；方形和圆形裁切均安全。 |
| `selected-v2` | 头部向画面右侧转动并略抬下巴，视线侧移 | 近远镜片和耳机透视变化明显，不依赖变色表达状态。 |
| `attack-v2` | 头部前压低伏、双肩上撑、胸带受力 | 与 idle 的头肩轮廓差异可见；没有新增武器或火光。 |
| `damaged-v2` | 头部向画面左侧后收斜倾，左右肩线反向变化 | 冲击反应明显，同时没有伤痕或装备损坏。 |

[96px 方形/圆形接触表](../assets/characters/goliath-pilot/contact-sheet-96-v2.png) 为 384×192：上排为真实 96×96 方形头像，下排为相同尺寸圆形裁切；列顺序为 idle、selected、attack、damaged。

## 交付与准入

| 文件 | 尺寸 | SHA-256 | 决定 |
| --- | --- | --- | --- |
| `assets/characters/goliath-pilot/idle-v2.png` | 1254×1254 | `2e24067dfe14c35c061fede14964fc885717f2b37e81b5f29c16992e83ada7b2` | 准入，默认 neutral 候选。 |
| `assets/characters/goliath-pilot/selected-v2.png` | 1254×1254 | `946d1de796518ccce43a382a16c7e083f5d20c77ff22ff752b5b77b763cefc61` | 准入，selected 候选。 |
| `assets/characters/goliath-pilot/attack-v2.png` | 1254×1254 | `3667ba5656e986376e79eada56cd3e56eb7213d1ba17a232624b94a9685e9c63` | 准入，真实 attack 事件候选。 |
| `assets/characters/goliath-pilot/damaged-v2.png` | 1254×1254 | `183bf28aba4b2ab7480ce7550dcc300051b2018b43b94be16648c58249f332b5` | 准入，真实 damaged 事件候选。 |
| `assets/characters/goliath-pilot/contact-sheet-96-v2.png` | 384×192 | `e9325b1e13353e907fe5e3bd48f14b4995b022020751cba0d7a61f83f4b5663d` | 准入，仅用于审计。 |
| `assets/characters/goliath-pilot/keyframe-prompts-v2.json` | 文本 | 见文件 | 准入，记录生成约束与状态语义。 |

本隔离任务没有修改业务代码或媒体 resolver，也没有提交 Git。应用不会因文件存在而自动切换；主任务需将 neutral/selected 接到 v2，并只在真实 attack/damaged 事件发生时切换对应状态。

## 制作与验证

- 生成工具：内置 imagegen；4 次成功调用，未使用 CLI/API fallback，未安装依赖，无价格遥测。
- 96px 审核图通过仓库已有 Playwright/Chromium 离线渲染生成；第一次渲染因 `file://` 被浏览器阻挡出现坏图占位，改为仅在进程内嵌入本地 PNG 后重新生成并人工复核。最终接触表不包含坏图。
- [完整 prompt 记录](../assets/characters/goliath-pilot/keyframe-prompts-v2.json) 已落盘。
