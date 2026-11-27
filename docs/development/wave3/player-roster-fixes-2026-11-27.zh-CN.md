# Wave3 2.99.12 真人写表修复

范围：`codex/wave3-player-test`，5483，W3-15 真人写表验收。只修改本工作树。已有准备房和独立席位保留，未代玩家出棋，未调用模型。此记录不提升 Wave3 全局完成计数。

## 复现与原因

- 编队单位卡没有折叠入口。付费升级排在完整固有能力文字之后，缺少明确勾选状态；原有付费升级切换回调存在。本轮没有把零费用固有能力改成购买项。
- 扎加拉军表缺少 Creep 卡时，Native 正确拒绝，但产品 Host 未将 `FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID` 归为 422；原界面直接显示内部错误码。隔离离线 HTTP 回归先复现了 500。
- Longshanks 比赛表中的 `Barracks (Proxy)` 和 `Factory (Tech Lab)` 经文本导入，分别变成普通 Barracks 和 Factory。回归在正式目录上先失败，原因是解析器以第一个左括号截断名称。
- 实际双方交表后暴露混合组件问题：Veteran of Tarsonis 的 `marker_armour` 已有源数据、规格验证和自动消费者，但带主动能力的菌毯组件适配器的准入列表漏掉该效果。独立最小源包和真实双席建房均复现 `BATTLEFIELD_ASSET_CREEP_COMPONENT_SOURCE_REQUIRED`。这属于开局装配错误，不能说成玩家军表非法。
- 进一步完整建房复现 `CHARACTERISTIC_TARGET_REACTION_NUMERIC_CONSUMER_REQUIRED`：目标选择反应的组合检查未识别混合表中已有的 Medic Life Support 及坦克射击前升级消费者。按实际反应源路由与各已启用消费者修复，不修改能力费用、护甲数值或攻击结果。

## 修改

- 编队默认收起，可从单位标题展开「编辑升级／详情」。付费升级先显示，提供勾选状态、说明、费用；标题显示含升级总价与已选升级。固有能力单独折叠。
- 增加经过原席位认证的 `/lineups/:id/validate`，复用提交时同一份冻结 Native 军表审计，不替玩家提交、不创建对局。写表页显示预校验提示；准备页校验通过才启用提交。旧请求迟到不能放行已更改的军表。
- 将 Creep 数量错误显示为「必须恰好一张、当前几张、到指挥 → 战术卡修改」。草稿可以保留，正式提交继续由 Native 拒绝非法表。
- 战术卡导入只剥离末尾价格标记，保留卡名中的括号和重复数量。
- 保存按钮不再把点击事件误当成跳过本地校验的布尔参数；修正本页复制邀请的既有 Promise 返回类型。
- 将已经通过来源与规格验证的 `marker_armour` 接入现有混合资产适配器，保留未知来源拒绝。准备房恢复包含「首次开局失败、尚无席位凭据」的房间，重用原房间 ID 与双席军表；成功后清除旧装配错误。战桌初始化失败使用服务恢复提示，不引导玩家修改合法军表。
- 为已启用独立支援反应的 Medic 连接现有近战、远程与模板伤害继续处理；射击前升级按实际声明消费者确认独立所有权，覆盖坦克与 Nova。没有替换规则解析器或添加另一套游戏状态。

## 验证

`node scripts/verify-wave3-player-roster-fixes.mjs` 通过：使用独立离线服务和独立 QA 目录，验证 Creep 0/1/2 张、非法提交 422、合法扎加拉实际提交、预校验不提交席位、拒绝越席字段与无凭据请求；坦克军表八队、六类指挥卡及重复卡无损导入导出，1990 矿／200 气／12 人口一致。

`node apps/starcraft-tmg-expo/node_modules/vitest/vitest.mjs run --root apps/starcraft-tmg-expo lib/__tests__/roster-validation.test.tsx`：3 项通过，覆盖等待校验、旧请求晚返回、非法表不可提交。

混合组件最小回归 `node scripts/verify-wave3-player-roster-fixes.mjs --assets-only` 从红转绿。完整 HTTP 回归扩展为实际坦克表＋扎加拉／Reactive Creep／Hatchery 双席建房，以及未生成凭据的准备房恢复，全部通过；本机证据 `build/player-roster-regression/2026-11-27T11-28-17.746Z/result.public.json`。这些是建房和恢复证明，没有把它们扩写成战斗中的全部反应效果已验收。

全量类型检查仍有本分支既有错误。以 Git HEAD 源文件覆盖读取比较修改前后诊断：44 → 43，无新增；修复了准备页原有的 `Promise<boolean>`／`Promise<void>` 不匹配。未修改其他区域来扩大修复范围。

本树离线 Web 静态导出通过。重启前核对服务进程参数，仅重启 5483；原 Web 导出保存在 `build/playtest-web/web-before-player-fixes`。重启前后的准备房 JSON 哈希一致，`/match` 与 `/prepare` 返回 200。标准 doctor 读取全局模型配置，本轮按用户明确批准改用本树环境核对；Node 24、现有依赖、根目录和分支均已确认。

浏览器交互复验：八队初始收起，坦克可展开、再收起。取消 Smart Shells 时总价 1990 → 1980，重新勾选恢复 1990。扎加拉临时未保存草稿显示明确 Creep 提示，点击「前往指挥选卡」直达战术卡选择；加入一张 Reactive Creep 后错误消失。该草稿未保存、未提交，不影响任一玩家的军表。截图在本机 `build/playtest-web/tank-upgrades-fixed.png` 和 `creep-validation-fixed.png`。所有修改文件（含新增前端测试）的类型诊断为零。

房主军表正式提交结果：原房间 ID 保持不变，双席已提交军表保留。浏览器准备页显示房主 `Terran’s Destiny · Longshanks`、对方已提交，并提供「以我的席位进入对战」。就绪截图仅存于 `build/playtest-web/both-rosters-ready.png`。等待玩家实际进入战桌，尚未执行任何棋子行动。最终类型诊断为既有 43 项、修改文件零错误，未添加依赖。

## Harness 证据边界

`harnessLoopUsed: true`；`targetGames: [starcraft-tmg]`；本轮路由为产品事实核对与 harness 修复。涉及可见状态读取、原生军表审计及真人席位提交；未进入下棋决策。规则权威仍为冻结版本的 Native；没有策略记忆写入、训练候选或付费模型调用。回退使用保留的旧 Web 导出及本分支提交，不能绕过军表审计。

公开比赛表与出处见 [Longshanks 查证](longshanks-polish-terran-tank-roster.zh-CN.md)。房间凭据、邀请和浏览器截图均仅保留在本机 `build`，不进入 Git。
