# T27 / S272：火力查询目标过滤合同 v847

## 结论与边界

发现真实请求使用 `targetUnitIds`，而原生查询只消费 `targetIds`；旧实现静默忽略该字段。这是工程输入缺口，不是模型已经证明某种策略更好。

同一个源合同现在负责新工作单编译、绑定后执行／缓存身份、Native 入口。只转换无歧义别名，保留原始提交与转换记录；冲突、错误查询类型、错误列表及不支持字段统一返回可执行的局部纠错说明。不会自动选攻击者、改场景、删除目标约束或替模型做策略取舍。

## 真实来源

- 原 Run：`build/slice272-product-generation-v645-lqMWaS`。
- workflow：`decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c`。
- 模型输入修复结果：`94dc00743a6fb507472e33bcb4300e7e01684caac0ba7916e48d757f1e5c9642`。
- 已执行工具结果：`7a2f1a16046f9a0d1f4a5bff7e8964103dcdeaf39809ccb951e9919580e38d80`。
- 原提交：`queryKind=fire_zone_exchange`、`targetUnitIds=[player2-kerrigan-raptor]`，绑定完整 `stateRef`。
- 旧实际结果四条攻击均为 Goliath→该 Raptor；未发现此次返回数值被扩大目标范围影响，但不能据此认为丢字段设计正确。旧回执不修改、不冒充已规范化查询、不重测它的四条结果。
- 原 PID39406 在 e9300 安全退出，0 在途；下一工作是同问题的方法汇总 `strategy-frontier:investigation:method:bc3be6dbdce4486c`。

## 修改

1. `pregame-scene-laboratory-v1.mjs`：源合同增加 `normalizePregameThreatExchangeInputV1`；Native 直接调用也校验。别名与固定查询类型转换可追踪，未知／冲突不能静默扩大范围。
2. `roster-workflow-laboratory-v1.mjs`：编译仅校验，不改尚未绑定的原工作单；执行完成绑定后规范化，再产生缓存身份及调用原生工具。错误交回现有修复角色。
3. `verify-slice272-threat-input-v847.mjs`：真实保存请求复现，六类异常注入及正常别名／规范输入／编译边界验证。

## 验证

- RED PID63840：Native 替身收到 `targetIds=undefined`，具体 bug 复现。
- 唯一 GREEN PID64781，退出0：目标准确到达原生消费字段；原提交保留；冲突双字段、非数组目标、无效攻击者、空目标名、错误查询类型、未知字段六类均在原生调用前返回源合同纠错；编译与执行共用校验。
- 日志：`build/slice272-v847-red-1792620638934.log`、`build/slice272-v847-green-1792620714517.log`。
- 0 Provider / 0 Native Rules / 0 生产写入；旧通过门禁未重跑。这不是完整真实生成或策略优势验收。

## 原位续行

PID65149，存储守护65150；日志 `build/slice272-v847-threat-input-resume-1792620744657.log`。从原 e9300 续行，不新建 Run、不改军表／历史回复／费用。正式 r4 仍为 2000矿／170气；最终 Plan0/6、对局0/12。T27 5/6、T23 33/36，剩余 S272/S248/S249/S250 四片。

下一真实验收：双组测量被方法汇总正确消费，交回独立来源／覆盖核对与战略决策；不得将局部输入修复当作最终产物完成。

## 真实续行至 e9386

原 PID65149 继续，不是新 Run。冷恢复超过90秒且 CPU较高；本轮仅记录性能项，未改恢复算法。e9301已发布新工具合同，e9307起真实方法请求。

方法完成3次 Flash：先读双组攻击与投影原件，随后提出结论；系统因新增读取要求作者确认，最终保存提案 `142761d03d839fdfb94aaf4764b6a5c6b5ce4b82f5337e5388fa84ccad6ed2f6`。无新 Native 实验、无军表／Plan提交。

**仍有模型事实误读，不能通过**：作者声称无Ares两枪数值与有Ares相同。真实第二请求 `7e55035f183af1cc4e6f6bb7625e16efe0dc2ed1095c3350eb454211e8e4e9d6`（986804字符）已包含原始数值及确定性行差：Underbelly预期伤亡1.7777777777777777／1.4722222222222223，差0.30555555555555536。故这次不能归因于材料漏传，也未通过人工修改输出掩盖。

系统已生成6项独立来源核对，claim3明确覆盖“matching Autocannon/Underbelly values”这句错误；六项首请求均已读实际来源，最终确认仍待，父覆盖waiting_dependency。原提案 acceptanceGranted=false，不是正式策略批准。后续必须观察既有审核／局部修订能否消除错误，而不是再为同数值重跑工具。

本轮截至e9386共9个已返回Flash、483924units、Provider累计41737ms，含方法3次370412units，不重复相加；旧账继续保留，不把Provider耗时当端到端时间。

方法请求／回复：

- `23e24f95d3e1b42931c8066d77879501355a8760e12a10692bf2e5ed62d6e5b8` → `27c624818ad7999600281d8f28a8706d7c0abde08af530020f2e5d509018b4d8`
- `7e55035f183af1cc4e6f6bb7625e16efe0dc2ed1095c3350eb454211e8e4e9d6` → `6a33a7580c86a34b0235f96492aff8b06fbec99ce41c5b1fe6b134722ea95a8d`
- `b4cea15791b30a2a045cc385d6cd75399506c497e466125ce985ec53fca84b50` → `1a4032cfee4e371ec36e1f7c5259709db275e52542eb216c4b20a1020443c1dd`

各来源审核请求／回复与费用保存在各自work.operationState.calls，完整正文位于同workflow/artifacts，不重复制大文件。正式Plan0/6、余4片不变。
