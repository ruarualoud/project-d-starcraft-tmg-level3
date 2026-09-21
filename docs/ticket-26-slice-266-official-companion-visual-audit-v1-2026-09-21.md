# Ticket 26 / Slice 266 — 官方副官动作关键帧视觉审计

日期：2026-09-21。范围仅 Artanis、Zeratul、Zagara 的通讯头像素材及本文件；不修改运行时代码、TASKS 或其他角色，不提交 Git。

## 本轮结论与交付边界

保留三个 `idle-v2.png` 身份基准。Artanis 五张既有 v3 在本轮真实 96×96 像素接触表中通过姿态辨识，无需重生。使用内置 imagegen（非 CLI）新生成 Zeratul 五态 v3、Zagara 五态 v3，共 10 张；18 张当前选择均为 1254×1254 PNG。

本轮准入只表示 **可用于后续连续动作制作的单张 keyframe**，不表示动画成品、逐帧连续性、前端已接线或用户盲测通过。96px 的语义依赖状态上下文，不能声称用户能无标签精确猜出六种情绪。Zeratul listening / damaged 的差别主要是头肩相对位置和面罩垂向，是当前最接近的一对；后续必须按下述相反的动作轨迹制作并复核。

没有用插值、淡入淡出、整体旋转或调色伪装关键帧差异，没有产出虚假动画预览。未新增人类口型、伤口、污渍、装备；Zagara 保留原生分节前肢与口器。

## 96px 证据

接触表由现有 Playwright/Chromium 对原 PNG 按固定 96×96 CSS 像素、deviceScaleFactor=1 等比例缩小截图，未调色、未形变，未安装依赖。顺序一律为 idle / speaking / listening / alert-combat / damaged-concerned / reflective。

- [Artanis 六态](../assets/characters/artanis-adjutant/contact-sheet-96-v3.png)
- [Zeratul 六态](../assets/characters/zeratul-adjutant/contact-sheet-96-v3.png)
- [Zagara 六态](../assets/characters/zagara-adjutant/contact-sheet-96-v3.png)
- [三角色 18 格总表](../assets/characters/artanis-adjutant/three-companions-contact-sheet-96-v3.png)：从上至下 Artanis / Zeratul / Zagara。

审计方法：先看原图的角色身份与解剖约束，再看原生 96px 表的头颈角度、头冠中心线、肩线、面罩/触须与胸甲相对位置。逐图结论见清单；不是仅凭 SHA 不同或眼光变化判定不同动作。

## 官方身份参考与来源限制

本轮实际目视核对：
- Artanis：`assets/characters/artanis-adjutant/official-sc2-portrait-reference-v2.jpg`，对应既有批准 idle-v2 的头盔、护颊、下颌护件、无嘴皮肤和神经束。
- Zeratul：`assets/characters/zeratul-adjutant/official-commander-reference.jpg`，作为本轮五次生成的第二张输入，锁定长颅、绿眼、紫色面罩和肩甲。
- Zagara：`tmp/official-reference/zagara-storymode-unit.jpg`，目视确认头冠、扇状头甲、肩部投影、触须与虫族前肢。生成编辑直接以已批准的 idle-v2 为目标，官方模型用于事后身份复核。

本轮重新确认可访问的 Blizzard 官方背景来源：
- Artanis：[Legacy of the Void: Campaign Preview](https://news.blizzard.com/en-gb/article/16668520/legacy-of-the-void-campaign-preview)。
- Zeratul：[Co-op Commander Preview: Zeratul](https://news.blizzard.com/en-gb/article/22640607/co-op-commander-preview-zeratul)。
- Zagara：[Co-op Missions: Additional Commanders Revealed](https://news.blizzard.com/en-gb/article/19905105/co-op-missions-additional-commanders-revealed)。

**来源缺口：local official-reference provenance incomplete。** 上轮保存的参考 JPEG 没有完整原始下载 URL / 官方 CDN 对应记录。本轮官方文章能确认人物/合作指挥官语境，但不能证明这些本地 JPEG 逐字节来自该文章。不可将文章 URL 冒称为本地图片的直接下载地址；参考图片哈希在下表冻结，后续可补精确来源，不阻止基于既有批准 identity baseline 的动作 keyframe 审阅。生成头像属于 AI 衍生视觉素材，不是 Blizzard 发布的原始素材，也不代表官方审核。

## 精确生成提示与保存路径

本轮严格使用内置 imagegen，每个语义状态单独生成，共 10 次成功调用，无 CLI/API 模型切换：
- [Zeratul 完整提示集](../assets/characters/zeratul-adjutant/keyframe-prompts-v3.json)
- [Zagara 完整提示集](../assets/characters/zagara-adjutant/keyframe-prompts-v3.json)

每次最终 prompt 为 JSON 中 `basePrompt + "\\nPrimary requested physical pose: " + states[i].prompt`。Zeratul 输入顺序为 idle-v2、official-commander-reference；Zagara 输入为 idle-v2。所有选定产物均已从内置生成目录复制到项目内，原始生成文件保留。Artanis v3 是上轮既有素材，本轮未重生，不伪造其历史 prompt。没有 imagegen 价格遥测，不推算费用。

## 后续连续微动作规格（尚未生成/接线）

每个状态固定 5 张独立形变帧 F0–F4；下表箭头每段恰对应一帧。F2 以本次选定 keyframe 为主要姿态，F0/F4 是该状态的收敛姿态。以同角色 idle-v2、该态 F2 和前一帧同时约束后续生成；固定相机、背景、裁切、材质、灯光与永久装备，每帧只改变表内局部关节/布料/触须。角度是后续制作的目标相对变化，不是对现有 PNG 的测量值。

| 角色/状态 | F0 → F1 → F2 → F3 → F4 的生成动作 |
| --- | --- |
| Artanis idle | 基准 → 胸肩上提约 1px@96 → 头颈随呼吸上移约 1px → 神经束延迟回落 → 基准；无口型 |
| Artanis speaking | 正视 → 颈伸/抬头 4° → 已有抬头 keyframe → 轻点头回落 3° → 回到发言前姿态；眼神保持交流 |
| Artanis listening | 正视 → 视线先向 keyframe 侧移 → 头盔随颈侧转到 keyframe → 轻倾 2°作回应 → 半幅回正 |
| Artanis alert-combat | 正视 → 肩甲前撑 → 已有压低头部 keyframe → 头部微前探 1px、目光锁定 → 保持警戒、肩回落半幅 |
| Artanis damaged-concerned | 正视 → 颈后缩 → 已有斜倾 keyframe → 重心回收、头部回正约 3° → 担忧凝视；无伤口 |
| Artanis reflective | 正视 → 视线先下移 → 已有低头侧视 keyframe → 轻微再低头 2°停顿 → 抬回一半 |
| Zeratul idle | 基准 → 胸廓轻提 → 面罩下端随胸部上移约 1px → 神经束与面罩延迟下落 → 基准 |
| Zeratul speaking | 基准 → 头颈上提 4° → 既有发言 keyframe → 面罩轻鼓/褶皱松回、不露嘴 → 颈部回落半幅 |
| Zeratul listening | 基准 → 视线侧移 → 既有斜倾 keyframe → 近侧肩抬约 1px、面罩向画面右下摆 → 半幅回正 |
| Zeratul alert-combat | 基准 → 双肩抬起 → 既有前压 keyframe → 颈部前探约 1px、面罩受压折叠 → 警戒姿态稳定 |
| Zeratul damaged-concerned | 基准 → 突然后收 → 既有侧倾 keyframe → 右肩上提、面罩向画面左下摆（与 listening 相反）→ 半幅复位 |
| Zeratul reflective | 基准 → 目光下移 → 既有左下俯首 keyframe → 肩放松、面罩下端向胸收近 → 轻抬 2°仍保持低视 |
| Zagara idle | 基准 → 上胸甲呼吸上提 → 颈部上移约 1px、触须延迟 → 胸甲回落、触须内摆 → 基准 |
| Zagara speaking | 基准 → 颈部伸长 → 既有抬冠 keyframe → 现有口器小幅张合、触须向外再摆约 1px → 头冠回落半幅；不新增口器 |
| Zagara listening | 基准 → 眼/颈先右转 → 既有右侧转头 keyframe → 头冠轻倾 2°、远侧触须延迟跟随 → 半幅回正 |
| Zagara alert-combat | 基准 → 肩甲上撑 → 既有前压 keyframe → 触须向前外弧增约 1px、颈停住 → 触须回弹、保留前压 |
| Zagara damaged-concerned | 基准 → 颈后缩 → 既有斜倾 keyframe → 触须进一步内收、肩线恢复半幅 → 担忧收颈停住；无伤口 |
| Zagara reflective | 基准 → 颈向左下弯 → 既有低头 keyframe → 触须向胸轻收、肩甲下沉 → 头颈抬回 2°仍低视 |

播放建议：idle 五帧总长 2400–3200ms；speaking 650–900ms；listening 1100–1500ms；alert 450–650ms 进入后 hold；damaged 600–850ms 单次反应再回 idle；reflective 1600–2200ms。speaking 与语音活跃窗口同步，Protoss 只使用头颈、眼神、胸肩和布料动作，不模拟人类音素口型。Zagara 只驱动已存在的口器连接，不变更数量/拓扑。

前端先按固定 frame index 播放真实五帧，状态切换从 F0 开始，静音/结束返回 idle；页面不可见时暂停，prefers-reduced-motion 固定 F2 或 idle。所有帧对齐同一眼线/颈根锚点后再验收，允许局部移动，不允许整个图片摇摆代替身体动作。禁止用 crossfade 或光流补帧掩盖不同状态实际上同图的问题；可在真实帧通过后单独评估补间。后续验收需同时看 96px 接触表和实际循环，核对无身份闪变、无甲片/触须增减、首尾无跳变；此门尚未完成。

## 逐图尺寸、SHA-256 与准入记录

路径相对 `starcraft-tmg-level3/`。旧版文件保留供追溯；“拒收”不等于删除。来源 JPEG 的历史 URL 缺口见上文。本轮 18 个当前 keyframe 的尺寸与哈希均已从实际文件读取。

| 路径 | 尺寸 | SHA-256 | 结论/原因 |
| --- | --- | --- | --- |
| `assets/characters/artanis-adjutant/alert-combat-v2.png` | 1254×1254 | `ebd8a2350273dece0126e4ac5db971f603583bc478b1855824f8b3257133139c` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/artanis-adjutant/alert-combat-v3.png` | 1254×1254 | `2ee959368494f9b09eae21ed988766d604448a484aad11a90f2fbf761489e101` | 准入 keyframe：头部下压、肩部前撑，眉下上视与额冠透视变化。 |
| `assets/characters/artanis-adjutant/contact-sheet-96-v3.png` | 576×96 | `dc7057cbfb686c7c296d713534f6bba82596459e53923355a218b35224a840ce` | 审计衍生图；非运行时头像 |
| `assets/characters/artanis-adjutant/damaged-concerned-v2.png` | 1254×1254 | `5b4873cd188a1537d228c29ad2077c0959058a598bb7df5c66f7630951fd9bcf` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/artanis-adjutant/damaged-concerned-v3.png` | 1254×1254 | `0c778fdb01222408c463ec75e213efb9e50006e09d59b9afe832b79a127f5ee6` | 准入 keyframe：侧倾收颈、肩线倾斜；担忧姿态而非新增永久损伤。 |
| `assets/characters/artanis-adjutant/idle-v1.png` | 1254×1254 | `79128570801db383b339a1745e98acc432d262c838cf43515473a564fdf0db81` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/artanis-adjutant/idle-v2.png` | 1254×1254 | `e4e93c4e7c7d38270554873598ac8599b8b38d3739b9524b003f44e040b56fde` | 准入基准：正面头盔、金色下颌护件、无嘴皮肤及双侧神经束。 |
| `assets/characters/artanis-adjutant/listening-v2.png` | 1254×1254 | `f582aca9c70f0b3e9f399afba25658308be4250ec06850012a00a3bb280642ab` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/artanis-adjutant/listening-v3.png` | 1254×1254 | `05d508c9c6b54e864f3cda1740ee4c1c54c94e4c045f02c0ea84cd43d049de24` | 准入 keyframe：头部侧转，头盔中心线与肩线错开，近远侧护颊形成透视差。 |
| `assets/characters/artanis-adjutant/official-campaign-reference.jpg` | 1000×627 | `29a5e9caccd72c8b2faded50c77058ccee3f5f3660e2125949ee7a6a7439e773` | 仅身份参考；下载 URL 对应关系未完整追溯 |
| `assets/characters/artanis-adjutant/official-cinematic-mirror-reference.jpg` | 1600×900 | `d0a3bcd064f630155e61f114f7faa6710ac230a1269ccf2137de9904816c74fc` | 仅身份参考；下载 URL 对应关系未完整追溯 |
| `assets/characters/artanis-adjutant/official-sc2-portrait-reference-v2.jpg` | 591×900 | `22197e07a93a2e67cb90dec44ce0a8ed0c7e8e212c9290690a188e405d228b98` | 仅身份参考；下载 URL 对应关系未完整追溯 |
| `assets/characters/artanis-adjutant/reflective-v2.png` | 1254×1254 | `0b1feaf510353b2e7745a196f23c8ce3ab47be77a4ac2f30adf6407d208fae3a` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/artanis-adjutant/reflective-v3.png` | 1254×1254 | `11564352a232c2f10e9520f3aa46eb81e598b6c398834b199da035d3f35bf5d4` | 准入 keyframe：低头侧视，眼线低于发言/倾听，金色下颌护件偏转。 |
| `assets/characters/artanis-adjutant/speaking-v1.png` | 1254×1254 | `804d0b6455df73d7d31aa82a72b7f396ff3b9e5eb9a7ecef6a83a72433dc61eb` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/artanis-adjutant/speaking-v2.png` | 1254×1254 | `3ee97ec9d4047888a48a8608eed50f0f0dae103cd12ffe00de7fb6fcd7b95d1f` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/artanis-adjutant/speaking-v3.png` | 1254×1254 | `98613331e8d5134a125a83fa7287caea9fd8efdeb086b18951a3658c0fdf61e9` | 准入 keyframe：抬头、颈部上伸、眼线提高；头盔/护颊结构连续，无人类口型。 |
| `assets/characters/zeratul-adjutant/alert-combat-v2.png` | 1254×1254 | `a5a4e0554a3574f13e9816bd719fc63b642cbb41db3aa61362d1cc9954258aa0` | 拒收（承接上轮审计）：眼光/调色主导，缺少可辨动作 |
| `assets/characters/zeratul-adjutant/alert-combat-v3.png` | 1254×1254 | `807eece5b0eb4ef37497e2872089cb9857f1e9df58b34b3c4e328d23e074c28e` | 准入 keyframe：头部明显前压，眼线下移、额顶占比加大、肩甲上撑。 |
| `assets/characters/zeratul-adjutant/contact-sheet-96-v3.png` | 576×96 | `a804b1c3bd2860495958d8bd0c87beec7b448cdac5c38a8e22b318296b561147` | 审计衍生图；非运行时头像 |
| `assets/characters/zeratul-adjutant/damaged-concerned-v2.png` | 1254×1254 | `6a1923e0cafe722fa021e6060691732f12af2dd7ce2d2e88c817cf6bffb62f94` | 拒收（承接上轮审计）：眼光/调色主导，缺少可辨动作 |
| `assets/characters/zeratul-adjutant/damaged-concerned-v3.png` | 1254×1254 | `f8fdf78c3ec51752f470bf44db2ef31d97d837c33217027c1bd18ea92acd9ed6` | 准入 keyframe：头部后收侧倾，面罩向画面左下拉开，右肩抬起；无新伤痕。 |
| `assets/characters/zeratul-adjutant/idle-v1.png` | 1254×1254 | `5cfc221a6f7cc8ee070649816616cdbb62f9204036f250162f00641954655e97` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/zeratul-adjutant/idle-v2.png` | 1254×1254 | `a0a07788bae197979542a5ac02da370a23d09ca5e8bd54d19d7bf56ac47f80ba` | 准入基准：长颅、绿眼、紫色面罩、金属肩甲与神经束。 |
| `assets/characters/zeratul-adjutant/listening-v2.png` | 1254×1254 | `273dc922bfb2597f4f0bbce93083932614e2797a79f7a1e03d86892e17458a0b` | 拒收（承接上轮审计）：眼光/调色主导，缺少可辨动作 |
| `assets/characters/zeratul-adjutant/listening-v3.png` | 1254×1254 | `461d86bc3bb602fcef1e3b1c3ed7a251732bb6685429ee1f579f1b0696895a3a` | 准入 keyframe：头部斜倾、肩部不对称，面罩向画面右下垂；实际侧向未严格实现 prompt 的右转角度。 |
| `assets/characters/zeratul-adjutant/official-commander-reference.jpg` | 1280×720 | `09950ab8a5477bae9590f15a10ef0e2a1e7f2010aa944b8ef405976296d68a12` | 仅身份参考；下载 URL 对应关系未完整追溯 |
| `assets/characters/zeratul-adjutant/reflective-v2.png` | 1254×1254 | `995de8995b94ebedfd722e8345c4bf9a6624e53e36859353803c5444b4f75b85` | 拒收（承接上轮审计）：眼光/调色主导，缺少可辨动作 |
| `assets/characters/zeratul-adjutant/reflective-v3.png` | 1254×1254 | `8f2c3f7754c2182d21d694364459629e5b35ef23f4917bf54dff692b3923738f` | 准入 keyframe：向左下俯首，额顶视面积扩大、肩线放松，与正面压迫的 alert 区分。 |
| `assets/characters/zeratul-adjutant/speaking-v2.png` | 1254×1254 | `aa57d39cbf00aeef8b30f65d2843132a3df1f05362371ec1a0beaaa2b2779419` | 拒收（承接上轮审计）：眼光/调色主导，缺少可辨动作 |
| `assets/characters/zeratul-adjutant/speaking-v3.png` | 1254×1254 | `9470436399bd495060c30cccd4f002470214713ceb980d2ff30bbe52d81a8738` | 准入 keyframe：头颈上提、肩线下降，面罩形成较长的纵向凸褶；无可见口型。 |
| `assets/characters/zagara-adjutant/alert-combat-v1.png` | 1254×1254 | `1e66087a4b7aeb3dde6d6df5828bc6b1d6ab102f13b1e475cb98d7be289da01b` | 拒收（承接上轮审计）：旧五态动作/身份一致性未达准入 |
| `assets/characters/zagara-adjutant/alert-combat-v3.png` | 1254×1254 | `c40a4f2a1a901acdd6368d3ac0cb5fd832ffc73fc8cdf6db65e6f4242072ad00` | 准入 keyframe：头颈前压、肩甲张开，中央冠刃前伸、两侧触须向前外弧。 |
| `assets/characters/zagara-adjutant/contact-sheet-96-v3.png` | 576×96 | `b45bdbb407c113ae5cf73991d2860c496488dd65da634547324d5a1ab4ce6f33` | 审计衍生图；非运行时头像 |
| `assets/characters/zagara-adjutant/damaged-concerned-v1.png` | 1254×1254 | `f0ec12c285aa6d666b720a0debaca033b344c1acf1276e2d9774e6e05554c55b` | 拒收（承接上轮审计）：旧五态动作/身份一致性未达准入 |
| `assets/characters/zagara-adjutant/damaged-concerned-v3.png` | 1254×1254 | `b239e87268f4cc00ae32f5eba31211e0367458f6287e4f6fe62cc49d146b8f88` | 准入 keyframe：整个头冠斜倾、颈部回缩、左右肩甲高低差，触须收拢。 |
| `assets/characters/zagara-adjutant/idle-v1.png` | 1254×1254 | `cea40a54b536522fbc82424c253b0083b9b7017b8167e4d6921854ab3b7fe79d` | 旧版保留、不晋升；本轮采用 idle-v2 / 五态 v3，未重复审计旧版 |
| `assets/characters/zagara-adjutant/idle-v2.png` | 1254×1254 | `909339fa55bde0d4a2ce256bbddfb519baf7eacd814a0deab5bb19f96aabc36e` | 准入基准：中央刃冠、双侧扇形头甲、肩甲投影、分节触须及虫族前肢。 |
| `assets/characters/zagara-adjutant/listening-v1.png` | 1254×1254 | `1ea9fa02a8f7de3592158dc2d7c9500bd68b35f90c3893b9ce2c146513d6935e` | 拒收（承接上轮审计）：旧五态动作/身份一致性未达准入 |
| `assets/characters/zagara-adjutant/listening-v3.png` | 1254×1254 | `e2b83b61a45fc148549efb902be5843e3868662408c73c4f118f06c156e624a1` | 准入 keyframe：明显向画面右侧转头，头冠/头甲整体透视旋转，触须顺势偏摆。 |
| `assets/characters/zagara-adjutant/reflective-v1.png` | 1254×1254 | `7d8e2c5a3d8f9a7d069968f8a8f732a0dafffaa566259fb2352898862855e541` | 拒收（承接上轮审计）：旧五态动作/身份一致性未达准入 |
| `assets/characters/zagara-adjutant/reflective-v3.png` | 1254×1254 | `2dbe9b192ba91168037804447e804e3dd051cb3cf27ada0d8e11a7e63479a3db` | 准入 keyframe：向画面左下低头，头冠透视与侧脸明显，肩部放松。 |
| `assets/characters/zagara-adjutant/speaking-v1.png` | 1254×1254 | `c2ea61cef2e7f786d3d1dc60da744aee73c36f4a965f6299ef72337ff84b273f` | 拒收（承接上轮审计）：旧五态动作/身份一致性未达准入 |
| `assets/characters/zagara-adjutant/speaking-v3.png` | 1254×1254 | `511b8531935efff11bc828cb154d9609fe248e66ddb7b7330319d90c6ed4e9f0` | 准入 keyframe：抬颈、头冠上提、触须外展；现有口器轻开，无新增嘴唇/人齿。 |
| `assets/characters/artanis-adjutant/three-companions-contact-sheet-96-v3.png` | 576×288 | `da0d0e41bf7bf6a482128822d83e202bf37451d527e3f1d7111e70842347c183` | 审计衍生图；非运行时头像 |
| `tmp/official-reference/zagara-storymode-unit.jpg` | 1100×1004 | `21d4b4c6c4e2667d3f91a873f0b8faab3563a9628201281f78144c8cfe289492` | 仅身份参考；下载 URL 对应关系未完整追溯 |
| `tmp/official-reference/zagara-ingame-unit.jpg` | 1017×1000 | `0007ba05676159139e9caf830b6a89d3fefbdf9e4cd87b02bb314d9f800baef9` | 仅身份参考；下载 URL 对应关系未完整追溯 |
| `tmp/official-reference/zagara-kerrigan-campaign.jpg` | 1200×675 | `1f1b7fa7074ac4fe3af2adaf6b5bedcf968205a24e475f2557dab795520598e8` | 仅身份参考；下载 URL 对应关系未完整追溯 |

## 本轮验证范围

原图身份目视 + 三张 96px 六态表 + 一张三角色总表；读取实际文件尺寸/SHA256。确认新生成的 10 张项目文件存在且内容哈希互异。未做运行时接线、应用测试、发布或 Git 操作；该隔离素材任务不修改 TASKS，由主 agent 汇总进度。动画序列生成与播放验证仍是明确后续工作。
