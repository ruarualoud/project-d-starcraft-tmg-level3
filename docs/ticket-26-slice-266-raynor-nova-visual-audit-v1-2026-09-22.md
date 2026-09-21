# Ticket 26 / Slice 266 — Raynor / Nova 六态视觉审计

日期：2026-09-22。范围：`assets/characters/raynor-adjutant`、`assets/characters/nova-adjutant` 的既有 v1 与新增接触表；本审计。未改代码、TASKS、CURRENT_WORK、旧原图或 Git。

## 接线结论

两人均继续使用现有六态 v1：`idle-v1.png`、`speaking-v1.png`、`listening-v1.png`、`alert-combat-v1.png`、`damaged-concerned-v1.png`、`reflective-v1.png`。**本轮没有发现需要替换身份基准的 Critical/High 问题，因此没有生成 v2，也没有调用 imagegen。**

准入范围是“同角色的六种状态静帧/后续动作制作参考”。这些图片 **不构成可直接顺序轮播的连续动画**，也没有通过连续帧运动/首尾循环验收。若“可播放关键帧”指单个状态的代表姿态，可以使用；若指将六态当同一段动作的连续六帧播放，则不通过。此区别必须保留，不能把身份稳定等同于动画完工。

绝对目录：
- Raynor：`/Users/rualoud/Downloads/codex_project/project-d/starcraft-tmg-level3/assets/characters/raynor-adjutant/`
- Nova：`/Users/rualoud/Downloads/codex_project/project-d/starcraft-tmg-level3/assets/characters/nova-adjutant/`

## Raynor 伤口/疤痕复核

本轮查看实际 v1 原图、96px 接触表及 384px 六态细节表，重点比较额头、眉弓、左右脸颊、鼻部、嘴角、胡须边界和颈部。

**未复现跨态新增或消失的明确开放伤口、血迹或永久疤痕。** 现有 Raynor 有粗糙肤质、毛孔、成熟皱纹和胡须；alert/damaged 的红光、reflective 的冷光会改变这些纹理的对比度，但不能据此认定多出伤口。damaged-concerned-v1 表现为皱眉、低视和担忧，没有在脸上增加损伤，也没有更换护甲。此结论只针对本轮落盘的六张 v1，不否定用户可能在先前候选、旧截图或别的构建中看到过该问题。

Raynor 六态保持同一发际线、深棕发型、短胡须/灰白胡渣、成熟脸型、高领外套、双胸带、卡扣和肩甲组合。张嘴说话、侧视时的局部透视变化属于表情/姿态变化，未见身份级面部替换。

## Nova 身份与装备复核

Nova 六态保持同一金发马尾/额前发束、冷色眼睛、耳侧通讯设备、贴身 Ghost 风格战斗装、胸甲分片、肩带与肩甲。speaking 的嘴部与 listening 的转头连续合理；damaged 没有新增伤口或装备破损。reflective 眼周冷蓝色反光记录为光照变化，不当作新的疤痕/纹身。

只读参考 `tmp/official-reference/nova/covert-ops.png` 和 `tmp/official-reference/raynor/sc2-cinematic.jpg`，用于人物识别核对：Nova 的金发、Ghost 角色类型和装备语义；Raynor 的成熟深发、胡须和指挥官形象。本轮不是官方模型逐像素符合性认证：生成图的服装/材质是现有衍生设计，Nova 的深色装具不与该参考的银灰护甲完全一致，Raynor 是脱盔通讯形象。未发现本次六态之间身份/装备跳变，因此不以审计名义重设计整个角色。

本轮未联网，也未复制上述参考图；其历史精确下载 URL 未在这两个目录中随附，不伪造出处。两张只读参考不作为本轮新增交付。

## 96px 与细节证据

顺序固定为 idle / speaking / listening / alert-combat / damaged-concerned / reflective。

- [Raynor 96px 六态](../assets/characters/raynor-adjutant/contact-sheet-96-v1.png)，576×96。
- [Nova 96px 六态](../assets/characters/nova-adjutant/contact-sheet-96-v1.png)，576×96。
- [Raynor 384px 细节表](../assets/characters/raynor-adjutant/contact-sheet-detail-v1.png)，1152×768，三列两行。
- [Nova 384px 细节表](../assets/characters/nova-adjutant/contact-sheet-detail-v1.png)，1152×768，三列两行。

接触表由现有 Playwright/Chromium 以 deviceScaleFactor=1 直接缩放原 PNG 截图，未调色、裁改五官、增加锐化或插值。原图均 1254×1254，头部与胸肩裁切稳定，六态没有突然切到不同镜头大小或替换环境。

## 分级发现

| 等级 | 发现 | 判断及后续 |
| --- | --- | --- |
| Critical | 无 | 没有角色错换、身体解剖崩坏或不可用文件。 |
| High | 无 | 没有跨态新增永久伤口、核心面部/装备替换或严重镜头/裁切跳变。 |
| Medium | 两人 idle / alert / damaged 的头颈姿态相近 | 状态表情可用，但 96px 下部分语义主要靠灯光与上下文。不能声称六种情绪无标签盲测可精确识别。 |
| Medium | alert/damaged 背景与面部红光变化较大；reflective 冷光变化 | 是同一环境中的灯光变化，不是背景几何完全重做；直接按六态循环会明显闪色。后续动画应每个状态内部锁定灯光，状态间由事件切换，而非快速轮播。 |
| Medium | 六态各只有单帧 | 缺少同一状态内部的 3–5 帧连续微动作及循环证据；素材身份审计不补齐该缺口。 |

本任务只允许 Critical/High 身份或连续性问题触发 imagegen v2；上述问题未达到该条件，因此不为美化或增强动作额外生图。若后续明确要求完整动画，另开有界帧序列制作，而不是将本轮“保留 v1”解释为已经满足动画验收。

## 逐图尺寸、SHA-256、结论

路径相对 `starcraft-tmg-level3/`。所有旧 v1 保持原样，只新增四张审计接触表和本文档。

| 路径 | 尺寸 | SHA-256 | 结论 |
| --- | --- | --- | --- |
| `assets/characters/raynor-adjutant/alert-combat-v1.png` | 1254×1254 | `dc0b59b6f30d09fb715b513e3fbd9e02d94ad51dd20f642c44356f5f6a5629cf` | 保留为警戒静帧；眉目收紧、肩颈较紧。Medium：姿态与 idle 接近，主要由红警报光提示。 |
| `assets/characters/raynor-adjutant/contact-sheet-96-v1.png` | 576×96 | `09aa4a08864cebfe7d5e45150e0467fff0548c2ede461b48fd5b50e7175e2b08` | 审计衍生接触表；非运行时资产 |
| `assets/characters/raynor-adjutant/contact-sheet-detail-v1.png` | 1152×768 | `253d1a44eeceaeaa1b1688c96dd12b7ce012cba13c1cf3d83ef54eb4a12c8520` | 审计衍生接触表；非运行时资产 |
| `assets/characters/raynor-adjutant/damaged-concerned-v1.png` | 1254×1254 | `a31c350799ecf92340b28d3f64bd93954b7057f308fc8e8369030bcb6616243b` | 保留为担忧静帧：低视、眉间收紧；未见新血迹/伤口/永久疤痕。Medium：体态与 idle 接近。 |
| `assets/characters/raynor-adjutant/idle-v1.png` | 1254×1254 | `7ccea1bc8e16851c0c990ac1bccb428accde52ff91172c9e0b46aa395b17f012` | 保留：成熟面部、深发短须、胸带/肩甲身份基准；无明确开放伤口。 |
| `assets/characters/raynor-adjutant/listening-v1.png` | 1254×1254 | `046684054fd26db951b639bb7507db14cc9499c7b474ae42031ec29ffd37175e` | 保留：视线和头部向侧面偏转，面部透视合理；近远侧肩甲关系连续。 |
| `assets/characters/raynor-adjutant/reflective-v1.png` | 1254×1254 | `cff0f1546988f96a17106aad2b1ddee578c1306b591efa000695c605bd830ace` | 保留：侧下视与较松肩颈；冷光改变脸色但未见新增永久皮肤标记。 |
| `assets/characters/raynor-adjutant/speaking-v1.png` | 1254×1254 | `00b6b055e5172882f3e1d1c0c8312cc3f8335caf3ffabd0bc1715f9b5cd3e5f1` | 保留：嘴部张开、下颌轻动；发型、胡须与面部标记未见身份级跳变。 |
| `assets/characters/nova-adjutant/alert-combat-v1.png` | 1254×1254 | `ab1b267bccef3faa030425ff0f85978186d0f80271a4e9a8e61596839efc5644` | 保留为警戒静帧；凝视与眉目收紧。Medium：与 idle 头颈差异小，红警报灯主导识别。 |
| `assets/characters/nova-adjutant/contact-sheet-96-v1.png` | 576×96 | `22c3b128ffcb3625d545abf9bbdff2a82db5d787ee0e572c79e6153395e822bb` | 审计衍生接触表；非运行时资产 |
| `assets/characters/nova-adjutant/contact-sheet-detail-v1.png` | 1152×768 | `77a156beafb4c4f9883bb2a1718c56bddea11a7a249f4e094e5e6768fa11d227` | 审计衍生接触表；非运行时资产 |
| `assets/characters/nova-adjutant/damaged-concerned-v1.png` | 1254×1254 | `831c968de1649959e3691a053b1ec1404f26195c4744276805d98d45ca2bf5ba` | 保留为担忧静帧：视线下移、表情紧张；无新增伤口/破甲。Medium：与 reflective 低视语义接近。 |
| `assets/characters/nova-adjutant/idle-v1.png` | 1254×1254 | `b2ac717e1dce78bd95dc1ed22d2a24522e46754047b5890e46ca65bb335cc477` | 保留：金发马尾、Ghost 贴身装具、耳机和面部基准。 |
| `assets/characters/nova-adjutant/listening-v1.png` | 1254×1254 | `5a72890e1f6c2d5931036cbd498c939ab15d6a36fb3443030d774c583a284633` | 保留：头颈侧转与视线转移较明确，发束随角度合理。 |
| `assets/characters/nova-adjutant/reflective-v1.png` | 1254×1254 | `30b1a0559a187f2aee68a6938872d69fdad04f79a98c66c0fa08aa05a78686f6` | 保留：低头侧视、眼周冷蓝反光；该反光不当作伤痕或脸部永久标记。 |
| `assets/characters/nova-adjutant/speaking-v1.png` | 1254×1254 | `cae2e9474306d4e88af98c25eeaee37e9c8aa11d2d8fc9d8d9fb756a3432ea6a` | 保留：嘴部轻张、下颌变化；马尾、耳机、胸甲/肩带连续。 |

## 后续连续动作与播放约束

每个语义状态独立生成 3–5 张局部变化帧，统一基准图的脸部永久标记、头发、装备和背景，不能给 damaged 添加新伤口：
- idle：自然呼吸/眨眼；头颈与肩甲运动不改变身份。
- speaking：同一个头位下的小幅下颌/嘴形变化，额头/脸颊/胡须纹理不重绘成伤口。
- listening：视线先行、颈部轻转、轻点头后半幅复位。
- alert：肩颈收紧、短暂前倾、凝视；警报光在这一小段内固定。
- damaged：后缩/斜倾/担忧、回正；保持皮肤、护甲及脸部永久标记不变。
- reflective：低视、缓慢偏头、轻回位；蓝色屏幕反光在这一小段内固定。

这段只是后续规格，没有新生成这些帧。本轮不提供 GIF/WebP 动画预览，以免六个语义状态快速轮播被误认为连续动画。

## 验证范围

读取 12 张原图与四张审计 PNG 的实际尺寸/SHA；目视原图关键状态、两张 96px 表和两张 384px 表。未运行应用/前端测试、未接线、未发布、未 Git 操作。主任务可保留现有 v1 接线；应将“状态静帧可用”和“连续动画未完成”分别记录。
