# Ticket 26 · Slice 265 — SillyTavern 对等与完整同伴包:K3 结项文档

负责人:K3 前端/内容 · 工作树 `.worktrees/ticket-26-slice-264-companion-experience-ui`
基线:`codex/starcraft-integration-20260921` @ `1cced3b` · 日期:2026-09-21
简报:`docs/ticket-26-slice-265-k3-sillytavern-parity-and-companion-packs-brief-v1-2026-09-21.md`
对等矩阵与冻结计划:`docs/ticket-26-slice-265-k3-sillytavern-parity-matrix-and-plan-v1-2026-09-21.md`
图像生成简报:`docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md`

## 1. 范围与不变式(全程遵守)

- 未触碰后端、Rules、Authority、Client Domain、Provider、memory-store 实现、源数据快照、
  Ticket 25 Slice 265 文件、凭据;验证门实测 `packages/` 与 `scripts/support/` 相对基线零漂移。
- 0 付费 Provider 调用 / ¥0;网络仅用于只读一手资料研究(SillyTavern 官方文档/仓库与
  canon 来源 URL 核对)。
- 未伪造任何游戏状态、关系数值、记忆层、持久化、Provider 调用或图像生成回执;
  位图未生成——只产出精确简报与绑定(见缺口 §5.13)。
- 未推送 Git;未派发其他 agent。

## 2. 有序计划与实际执行

| SS | 提交 | 变更文件 | 摘要 |
| --- | --- | --- | --- |
| SS-1 | `1b1a9d9` | 对等矩阵与计划文档 | SillyTavern 1.19.0(release 2026-09-14)一手研究:官方文档 17 页 + 官方仓库扩展清单/版本事实;中文 16 行对等矩阵;冻结 6 步计划。证据抓取存于 `build/ticket-26-slice-265-research/`(git 忽略)。 |
| SS-2 | `618a2a2` | `content/characters/raynor-companion-pack-v1.mjs`、`artanis-companion-pack-v1.mjs`、`companion-catalogue-v1.mjs` | Raynor(7 时代)/Artanis(5 时代)纯呈现包 + 三角色目录;canon 事实带官方 sourceRefs,Project D 角色配置显式标注,无逐字官方台词;凯瑞甘保留为参考包(静态描述符指针,不复制后端真相)。内容文件浏览器安全(仅依赖 portable hash,不经 node:crypto),不被后端运行时 import。 |
| SS-3 | `9fb66e4` | `content/characters/raynor-portrait-states-v1.mjs`、`artanis-portrait-states-v1.mjs`、生成简报文档 | 六状态(idle/speaking/listening/alert_combat/damaged_concerned/reflective)通讯头像状态合同,映射既有帧角色与相位,确定性回退 + 减少动态;12 帧精确生成简报与回填绑定流程给 Codex,assetRef 全部 `PENDING_CODEX_GENERATION`,无伪造回执。 |
| SS-4 | `6cf3391` | `components/character/companion-catalogue-panel.tsx`(新增)、`companion-catalogue-content.d.ts`(新增)、`tactical-adjutant-panel.tsx`(仅新增式挂载) | 浮动副官新增「同伴目录与对等」渐进披露分区:三角色目录卡(阵营色/身份/包状态)、每包传记-时代-关系-世界书-战术身份-资产状态视图、六状态预览板、显式阻塞的多同伴原型(说话者身份/回合顺序/长按 @提及/权限标签,禁用输入框,不伪造消息/持久化/Provider)、产品内对等/缺口面(13 个缺口码)。键触可达、390px 无溢出。inline 变体与全部既有 testID 未变。 |
| SS-5 | `824ad52` | `scripts/verify-ticket-26-slice-265-companion-packs-browser-v1.mjs` | claim-to-pixel 浏览器门(沿用 264 自包含 harness;新增 content/characters 进导出新鲜度监视)。 |
| 门修复 | `75d9d03` | `companion-catalogue-panel.tsx` | 运行 1 失败:`../../../content` 路径深度错(应为 4 级,Metro 无法解析);仅修复该前端路径,运行 2 通过。 |
| SS-6 | 本提交 | 本文档 | 回执、截图索引、缺口清单、顾虑。 |

## 3. 验证回执

**门:companion packs 浏览器门(本 Slice 唯一聚焦门)**
命令:`node scripts/verify-ticket-26-slice-265-companion-packs-browser-v1.mjs`
- 运行 1:exit 1 — `STEP_FAILED … expo export`,Metro 无法解析
  `../../../content/characters/companion-catalogue-v1.mjs`(相对深度少一级)。
  被牵连路径仅为新前端组件;修复 import 深度(`75d9d03`)。
- 运行 2:exit 0 — **passed**,14 项检查、11 行 claim-to-pixel、12 个哈希化截图,
  reportHash `0d6ef3f2405551a6ed1452c4ac8aa1b70705f56900f218d2086411de0780c482`,
  报告 `build/ticket-26-slice-265-companion-packs-browser-v1/browser-report.json`(git 忽略)。
- 覆盖子切片:SS-2、SS-3、SS-4(内容/状态合同/UI 的真实浏览器渲染)。
- 后端哈希断言:9 个模块逐一记录;3 个为 `advanced_by_codex_integration`
  (battle-workbench-v1/probability-v1/in-memory-room-v1,工作树副本与切片基线逐字节一致),
  其余 identical;fixture 后端已验证是切片基线的后代。
- 0 Provider 调用:provider 前缀仅一次 `GET …/metadata`;agent 前缀 0 次;
  边界旗标全 true(无伪造状态、无假持久化、无隐藏思维链、无 force click、
  无伪造生成回执、trainingTruth:false)。
- 两轮收敛,未超三轮预算;该门不再复跑。

Slice 264 三门未复跑(264 代码路径本 Slice 仅新增式扩展;既有 testID/分区/合同不变)。

## 4. Claim-to-pixel 截图索引与诚实说明

全部视口 1500×1050(桌面,键盘)与 390×844(窄屏触控),`reducedMotion: reduce`,
目录:`build/ticket-26-slice-265-companion-packs-browser-v1/browser-evidence/`。

| # | 截图 | 证明的主张(claimId) |
| --- | --- | --- |
| 01 | `01-desktop-collapsed-chip-board.png` | 收拢芯片紧凑且战场实质可见(board_safe_collapsed_chip) |
| 02 | `02-desktop-catalogue-three-companions.png` | 三角色身份区分与包状态(catalogue_three_companion_identity_distinction) |
| 03 | `03-desktop-raynor-pack-detail.png` | Raynor 身份/世界书/时代/关系视图(raynor_identity_worldbook_era_relationship_view) |
| 04 | `04-desktop-artanis-pack-detail.png` | Artanis 视图(artanis_identity_worldbook_era_relationship_view) |
| 05 | `05-desktop-kerrigan-reference.png` | 凯瑞甘参考指针诚实(kerrigan_reference_pointer_honest) |
| 06/07 | `06-desktop-portrait-states-idle.png`、`07-desktop-portrait-states-alert.png` | 六状态映射 + 确定性回退 + 减少动态(six_portrait_states_deterministic_fallback_reduced_motion;六状态逐一 DOM 断言) |
| 08 | `08-desktop-multi-speaker-prototype.png` | 多同伴原型显式阻塞(multi_companion_prototype_visibly_blocked) |
| 09 | `09-desktop-parity-gap-surface.png` | 对等/缺口面完整(parity_gap_surface_complete) |
| 10 | `10-desktop-collapsed-hit-test.png` | 收拢芯片不拦截棋盘控件(collapsed_chip_board_hit_testing) |
| 11 | `11-narrow-catalogue-touch.png` | 390px 触控目录零横向溢出(narrow_touch_catalogue_no_overflow) |
| 12 | `12-narrow-threat-hit-test.png` | 窄屏纯点按威胁开关(narrow_collapsed_chip_hit_testing) |

诚实说明(像素层面):`02` 与 `03` 逐字节相同(sha256 `4b83e2fa…`)——Raynor 是目录默认
选中项,两次截图间视口像素未变;`08` 与 `09` 同样逐字节相同(sha256 `ddac6e4a…`)——说话者
切换只改动了浮窗内部滚动区之外的文本行,该处不在当前视口内。两处的区分性证据由门内 DOM 断言
(说话者文本、缺口码逐条 testID 断言)承载,报告的 claim 行已记录实际观测方式;
未把字节相同的截图为不同主张谎称"像素证据"。

## 5. Codex 后端缺口清单(诚实,类型化;UI 均已如实呈现不可用/待生成)

沿用 Slice 264(仍 open):1 `CHARACTER_PACKAGE_HASH_PIN_STALE`(High,见 §6)、
2 `COMPANION_RELATIONSHIP_STATE_PROJECTION`、3 `COMPANION_MEMORY_LAYERS_PROJECTION`、
4 `COMPANION_IMPORT_EXPORT_RESTORE_CONTRACT`、5 `MULTI_COMPANION_SIMULTANEOUS_SESSION`、
6 `AGENT_VS_AGENT_COMPANION_POLICY_SURFACE`、7 `SECURE_PROVIDER_PROFILES_LOADED_NOT_PROJECTED`(建议级)。

本 Slice 新增列档:
8. `USER_PERSONA_CONTRACT` — 无用户人设(显示名/头像/描述/锁定)客户端合同。
9. `WORLDBOOK_DYNAMIC_TRIGGER_CONTRACT` — 世界书仅 always 激活;无关键字/regex 动态触发与
   多作用域(全局/角色/人设/聊天)合同。
10. `COMPANION_SUMMARY_PROJECTION` — 无对话摘要投影(SillyTavern Summarize 对等缺失)。
11. `COMPANION_SWIPE_BRANCH_CONTRACT` — 无重roll/编辑重试/分支/检查点合同。
12. `COMPANION_AUTHORS_NOTE_CONTRACT` — 无作者注释注入合同。
13. `COMPANION_LONG_SESSION_RESUME_CONTRACT` — 无长会话恢复合同;当前真实能力 = 会话转写
    64 上限 + 封存离线人格快照。
14. `COMPANION_PACK_BACKEND_PROMOTION` — Raynor/Artanis 包为纯呈现内容;后端封存、
    CharacterPackage 钉哈希、selector 集成归 Codex(内容形状已对齐 `createWorldbook` 等合同,
    可直接提升)。
15. `COMPANION_PACK_ASSET_GENERATION` — 两包 12 帧待 Codex 图像工具按
    `docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md` 生成并回填
    `frameBindings[]`;前端已按 `frameRole` 映射,回填后无需前端改动。
16. 平台级差距(不追求):SillyTavern 式第三方扩展机制不存在于本产品架构。

## 6. 未决 Critical/High 顾虑

- **High · `CHARACTER_PACKAGE_HASH_PIN_STALE`(Codex 所有,沿用 Slice 264 §9)。**
  线上同伴身份/头像路径仍全产品失败关闭;本 Slice 的目录/包呈现不依赖该投影,故全部绿色,
  但"凯瑞甘实时身份"在投影重钉前只能显示诚实扣留态。前端不做也不应做变通。
- 无其他 Critical/High。多同伴、记忆分层、导入导出等缺口全部以显式类型化卡片呈现,
  无一被伪装成完成。

## 7. 研究来源存档

一手来源清单与访问日期(2026-09-21)见对等矩阵文档 §1;抓取原文存于
`build/ticket-26-slice-265-research/sillytavern-docs/`(git 忽略)。
SillyTavern 当前版本事实:release 分支 `package.json` = 1.19.0,release 发布于 2026-09-14。
canon 来源核对:story primer(200)、Kerrigan hero week 模式(200)、Archon TMG 规则(200)、
starcraft2.blizzard.com(200);ftp.blizzard.com 手册 URL 沿用凯瑞甘参考包既有引用
(本网络当日不可达,已在包内 `accessNote` 如实标注)。
