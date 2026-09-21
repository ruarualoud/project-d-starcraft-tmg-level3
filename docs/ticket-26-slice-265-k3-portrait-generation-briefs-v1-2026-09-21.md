# Ticket 26 · Slice 265 · SS-3 — Raynor / Artanis 动态通讯头像图像生成简报与绑定(交给 Codex)

日期:2026-09-21 · 作者:K3(前端/内容)· 执行者:Codex 图像工具
状态:**待生成**。本文件不含任何生成回执;在 Codex 产出带哈希回执的帧之前,UI 一律渲染
确定性中性回退,绝不伪造资产或回执。

## 0. 总约束(适用于全部 12 个简报)

- 媒介:高分辨率西式科幻 2D 手绘头像;通讯台裁切构图(胸像,正面或微侧)。
- 输出:PNG,正方形,逻辑分辨率 640×640(允许 512–1024 区间内正方形),单帧。
- 呈现叠加(由渲染层完成,不进入位图):细 CRT 扫描线、低幅噪点、边缘暗角、轻微亮度滚动;
  禁止像素块放大、动漫光晕、紫霓虹重打光、皮肤美颜、现代 HUD 镀铬。
- 权利:`developmentDisplayAllowed: true`,`publicReleaseAllowed: false`,
  独立权利审查前不得公开发布;不复制官方台词/音频;不模仿真人演员声线。
- 失败处置:任何被拒草稿只留本地证据,不进 git;缺帧时 UI 显示带标签的不可用回退,
  绝不借用其他角色的帧。
- 回执格式:沿用 `packages/character-agent/visual-generation-receipt-v1.mjs`;
  每帧必须产出 contentHash + receiptHash,然后回填到对应 state contract 的
  `frameBindings[]`(替换 `PENDING_CODEX_GENERATION` 与两个 null)。
- 绑定文件:
  - `content/characters/raynor-portrait-states-v1.mjs`(`RAYNOR_PORTRAIT_STATE_CONTRACT_V1`)
  - `content/characters/artanis-portrait-states-v1.mjs`(`ARTANIS_PORTRAIT_STATE_CONTRACT_V1`)

## 1. Jim Raynor(Terran,`starcraft.jim_raynor`)

风格锚 `starcraft-raynor-sc1-comms-highres-2d-v1`(见 state contract 的 `styleProfile`):
成熟人类战地指挥官面孔、短深色发、轻胡茬、通讯领军服;SC1/Remastered 通讯裁切、硬光、
模拟传输氛围;橄榄/枪灰/褪色牛仔蓝/暖琥珀色板。拒绝:动漫脸、低清像素块、现代 AI 光泽、
动力装甲过度体量、任何文字/徽标/水印/抄袭 UI。

| 简报 ID | 状态 / 帧角色 | 精确画面指引 | 验收要点 |
| --- | --- | --- | --- |
| `raynor.idle.frame-brief` | idle / neutral | 放松站姿胸像,目光平视镜头,嘴角中性微沉,通讯台冷光从左上打亮面部 | 冷静自持;无微笑夸张;与肩甲轮廓完整 |
| `raynor.speaking.frame-brief` | speaking / speaking | 同构图,张口中等幅度(发音中帧),眉略抬,下颌发力 | 与 neutral 同角度同布光,仅口型/眉部差异 |
| `raynor.listening.frame-brief` | listening / blink | 眼睑半垂的眨眼瞬间帧,视线略偏右(看向说话者),面部其余同 neutral | 仅眼部差异;不可眯成笑眼 |
| `raynor.alert_combat.frame-brief` | alert_combat / warning | 眉头收紧,目光锐化锁定镜头,肩线抬起,背景警示琥珀光增强一档 | 紧张但不恐慌;与 neutral 差异明显可读 |
| `raynor.damaged_concerned.frame-brief` | damaged_concerned / warning(变体) | 眉心压低、嘴角下沉的关切神情,面部亮度降低约 10%,背景光转冷 | 关切/受挫,而非愤怒;与 alert 状态可区分 |
| `raynor.reflective.frame-brief` | reflective / reflect | 视线略向下偏左的沉思神情,面部放松,琥珀眼微光减弱 | 沉思而非疲惫;与 idle 差异可读 |

## 2. Artanis(Protoss,`starcraft.artanis`)

风格锚 `starcraft-artanis-sc1-comms-highres-2d-v1`:星灵大主教——无毛 elongated 头部、
发光青色眼睛、金色仪仗装甲领;深蓝/烧金/骨色/青色板。拒绝:动漫脸、人类面部解剖、
紫品红霓虹、低清像素块、现代 AI 光泽、任何文字/徽标/水印。

| 简报 ID | 状态 / 帧角色 | 精确画面指引 | 验收要点 |
| --- | --- | --- | --- |
| `artanis.idle.frame-brief` | idle / neutral | 庄严平视胸像,眼光恒亮,嘴部(星灵面部)闭合中性,金领完整入画 | 庄重威严;眼亮度克制不过曝 |
| `artanis.speaking.frame-brief` | speaking / speaking | 同构图,下颌张开中幅,眼光增强半档,面部灵能纹路微亮 | 与 neutral 仅口部/眼光差异 |
| `artanis.listening.frame-brief` | listening / blink | 眼光瞬暗的眨眼帧,头微前倾,面部其余同 neutral | 仅眼部差异;头倾角 ≤ 5° |
| `artanis.alert_combat.frame-brief` | alert_combat / warning | 眉脊压低,眼光锐利增亮,肩甲线抬起,背景警示金光增强一档 | 战备威严,而非狰狞 |
| `artanis.damaged_concerned.frame-brief` | damaged_concerned / warning(变体) | 眼光明显转暗(约 30%),面部亮度降低约 10%,头微垂的沉痛神情 | 哀悼/关切;与 alert 可区分 |
| `artanis.reflective.frame-brief` | reflective / reflect | 视线略向上偏右的远眺沉思,眼光柔和,灵能纹路暗 | 冥想感;与 idle 差异可读 |

## 3. 回填绑定流程(Codex)

1. 按上表逐帧生成;每帧产出 PNG + 生成回执(contentHash、byteLength、width、height)。
2. 把每帧的 `assetRef`(资产路径)、`contentHash`、`generationReceiptHash` 回填到对应
   `*-portrait-states-v1.mjs` 的 `frameBindings[]`(该文件随后由 Codex 重新定哈希并纳入后端钉)。
3. 资产存放走既有仓库批准的角色资产树与 content-hash 路由;公开包不内置受限图。
4. 回填后,K3 侧的 UI 状态预览板自动从确定性回退切换到真实帧(按 `frameRole` 映射),
   不需要前端代码变更。

## 4. 诚实声明

本文件创建时(2026-09-21)两个包的 12 帧全部未生成;`frameBindings[].assetRef` 保持
`PENDING_CODEX_GENERATION`,`contentHash`/`generationReceiptHash` 为 `null`。
任何"已生成"的说法都必须附带可核实的回执哈希,否则视为伪造。
