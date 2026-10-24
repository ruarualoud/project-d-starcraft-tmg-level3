# T23 / S248：当前四组地图与验收范围核对

## 结论与下一步

当前 A/B/C/D **没有使用不同初始地图**。四份原 SQLite 冻结 Envelope、对应 `runner-private.json` 的地图配置与既有 Standard 1 主产品接线回执相符；不要因为地图误读再初始化房间。此结论仅支持继续保留当前四组地图，不意味着 Teach、完整对局或全部地图已经验收。

下一直接工作仍为 T27/S272 的 A/B 未解事实及 Plan；v199 独立事实调查入口已实现，真实 B 试验待用户此前选择，本轮未启动。四组没有恢复动作，未新增模型费用。T27 5/6，T23 33/36，主线剩248/272/249/250四片，完整对局0/12。T24仍OPEN；另18张经典图按用户顺序后置，不能从全目标中删去。

## 当前权威源，不依赖旧“running”文案

源目录是 `build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v76-four-arm-startup-config.private.json` 中四个 `originalDirectory`。本次以 SQLite `readOnly:true` 读取 `sc_rooms`，不启动写入型 RoomStore、不调用模型、不执行 Apply/Replay。

| 组 | 原房后缀 | 实际持久化 revision | 初始我方军表成本 | 初始对手军表成本 |
| --- | --- | --- | --- | --- |
| A 固定表有Plan | `query-v33-clean-A-20261013-v1` | 144 | 2000矿 / 115瓦斯，7单位 | 2000矿 / 140瓦斯，8单位 |
| C 同固定表无开局Plan | `query-v33-clean-C-20261013-v1` | 167 | 2000矿 / 115瓦斯，7单位 | 2000矿 / 140瓦斯，8单位 |
| B 详细Teach从头写表 | `t27-88cfa1519cff6a135d3fec10a2e781fa` | 31 | 2000矿 / 175瓦斯，8单位 | 2000矿 / 140瓦斯，8单位 |
| D 较简Teach从头写表 | `t27-d310ed1b8407964d22a084708e42cb83` | 31 | 2000矿 / 175瓦斯，8单位 | 2000矿 / 140瓦斯，8单位 |

这是原房初始军表成本，**不是 A 再采购、当前剩余单位或待修订 Plan 已被正式采用的证明**。当前 Teach A Plan9、B Plan19仍按原停点；不由房间初始数据推断最新 Plan 已审核通过。

四组初始配置均为：

- 地图 `standard-d6-1`；Standard，54×36英寸；Hold Position / GAUNTLET。
- 1804个实际 `state.board.terrain` 单元，完整序列化值一致；不是仅数量相同。
- 编译 `22f5fe3cb7ab053a106f3353bd7b7a8304f3d20e16cc89415568819baa019937`。
- 规则几何 `c04ff2205a890ef6c897ad57449f95499c4a899547950a1aa45be33bea84f3f6`。
- 任务可达审核 `8a1241ff4639f6c6825644aa5c2ea6e84434a3efc39ceeab52e388462c00fc49`。
- 冻结记录均标记每入口可用、必要任务区域可达、语义地形为权威层；`sourceRefreshPerformed:false`。本轮没有重新运行其算法，所以这些字段仅作已保存审核事实，不作为新增完整验证。
- 原始地图配置逐值一致，诊断SHA为`e501eb027af57fc8de1d8835a0fab61c7a809ff22c2aa8bd199e418f1729c29e`；初始1804格完整值诊断SHA为`0098d02043b75d085e5a9013aff3adc4444b1c17fd9596aecb69af15d34e1163`。仅用于此次对照，不新增生产签名门禁。

主产品原接线证据为 `build/slice248-daybreak-resume-web-JgsoAG/native-map-product-integration-20261008/receipt.json`：status=passed，30逻辑地形组、1804规则格，编译及任务审核与上述一致。其检查覆盖配置器、HTTP属性编辑、真实Standard2000工厂、真实写表工作台/房间同几何和冻结美术来源。该门未重跑。

一次只读诊断最初遗漏原自定义 encryption keyId，被原解码器正确拒绝；读取保存的准确 keyId 后成功。未更换密钥、修改验证器或写入数据库，不是产品加密故障。原私钥和凭据未输出。

## 地图验收数字到底覆盖什么

从地图工作树 `../../ticket-24-semantic-map-integration/` 读取已有回执，不重跑：

| 范围 | 现存证据 | 不能据此宣称 |
| --- | --- | --- |
| 官方 Standard1 | 上述主产品接线与四组真实冻结源；既有首图网页验收 | 全部任务/自定义属性组合 |
| 官方 Standard2/3/4、Skirmish1/2 | `build/official-native-five-map-web-rKfpR2/five-map-selected-recipe-acceptance.json`：actualWebVerified=true，连同首图6/9 | 庙台、所有规模及完整人机 |
| 官方 Standard5/6、Skirmish3 | `build/official-native-temple-web-k1qyXi/temple-three-selected-recipe-acceptance.json`：累计9/9；真实r0→4、表面/入口和条件Rules证据 | 同一房间完整地面到最高台全过程；每底盘均能过每入口 |
| Lost Temple | `build/priority-lost-temple-web-XCQ9Yj/lost-temple-selected-recipe-web-acceptance-final.json`：selectedRecipeWebAccepted=true | 完整产品机器席对局；同房完整上台过程 |
| Daybreak6.0.9 | `build/ticket-24-daybreak-forward-inner-stairs-signed-room-v6-9/same-room-ramp-resume-evidence.json`：原房r43、Replay一致、真实坡道过程/Web | 所有部署/任务或全20经典地图 |

官方 Standard 选定配方是54×36英寸/2000；Skirmish选定配方是36×36英寸/500。用户同意的可编辑电子属性仍明确不是官方逐件数值，不能把9张都称为2000分图。优先经典两张均为54×36英寸/Standard2000的选定配方。其余18张经典图后置，九官方不替代二十经典图目标。

## 本轮范围

仅只读本地配置、既有回执和四房冻结源；0新测试、0旧门重跑、0Provider、0Native游戏动作、0房间/草稿写入、0新截图、0费用。没有新地图或几何修改，也没有重新验证任意当前战局的所有路线；本结论不是宽泛的系统无错证明。仅更新此记录、CURRENT_WORK及根TASKS，未改共享代码、提交、清理或刷新来源。
