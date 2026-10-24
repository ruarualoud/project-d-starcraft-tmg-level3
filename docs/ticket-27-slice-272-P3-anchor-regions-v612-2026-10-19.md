# T27/S272 P3：模型指定区域，Native搜索完整队形（v612）

本项解决新P0–P6真实运行暴露的工具能力缺口；不恢复旧调查，不是最终军表/Plan发布报告。T27 5/6、T23 33/36、相关余4片，正式Plan0/6、对局0/12。

## 实际原因与改变

849、851等请求只能向`space.solve_static_formation`提交少量精确锚点；墙、obelisk、Goliath和Marine底盘先后拒绝它们。Native给出了真实阻挡，但避开它们的位置仍由语言模型逐点猜。849还重复了已完成的失败查询，850准确标记executed=false/newObservation=false。持续有调用不等于问题收敛。

增加同一个Interface的可选`anchorRegions`：模型声明矩形边界、离散步长和可选偏好点；Native只在指定区内展开leader锚点，再调用原有完整队形／底盘／连续性Implementation。每个联合单位使用完全相同的点／区域合同。模型仍负责区域、意图、单位顺序与最终整组选项选择，Host不选择最终位置、不暗中扩大区域、不添加策略权重。

示例只是调用格式，不是注入模型的战术建议：

```json
{
  "unitId": "u_marauder_2",
  "anchorRegions": [{
    "minimumXInches": 18, "maximumXInches": 26,
    "minimumYInches": 16, "maximumYInches": 24,
    "stepInches": 1,
    "preferredAnchor": {"xInches": 22, "yInches": 20}
  }],
  "maximumJointOptions": 1,
  "maximumJointEvaluations": 128
}
```

- 区域约束leader锚点，**不是整个单位外包络**；全部模型仍需通过原Native几何检查。
- 精确点优先，区域按声明顺序；区域网格按离偏好点的距离、行／列确定性展开，不预分配整个网格。
- 旧精确点单单位无预算调用仍遍历全部给定点；联合／区域默认沿用6选项、128次评估，显式预算仍生效。
- 候选保留`anchorSource`的区域索引与格点来源；无候选只说明有限离散搜索未找到，不证明连续无解、到达、VP或策略最优。
- 公开合同、Native输入字段与单／联合执行共用同一区域合同／展开Module；未另写碰撞规则。

## 真实Native定点验证

`verify-slice272-native-anchor-regions-v612.mjs`从同Run冻结authority与保存的Native stateChanges／明确场景spec恢复**原失败父分支7750d547…**，不重演原Native动作、不另建生产房间。

RED命中Native拒绝区域输入；修后只跑一次GREEN，5次新真实查询：

| 查询 | 实际结果 |
|---|---|
| 单单位显式区域 | 找到1个原生检查通过的候选，约1956ms |
| 3单位联合显式区域 | 找到1个整组候选，3个原生完整几何检查通过，约3726ms |
| 大于百万格点的区域、预算1 | 只评估1个格点，约305ms；不分配整张网格，不宣称无解 |
| 非法0步长 | 返回具体可纠正输入错误，约1ms |
| 已保存的旧精确点见证 | 候选与misses逐值相同，约2305ms；没有重跑旧门禁 |

上述耗时只代表这组诊断，不是所有局面的性能承诺。Provider=0、原Native动作重演=0、源状态变更=0、生产写入=0；原分支布局逐值未变。

- [RED](../build/slice272-native-regions-v612-red.log)
- [一次GREEN及耗时](../build/slice272-native-regions-v612-green.log)
- [849实际失败猜点请求](../build/slice272-projection-owner-v565-inlKbk/849.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/849.reply.json)
- [851实际换点请求](../build/slice272-projection-owner-v565-inlKbk/851.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/851.reply.json)

## 同产品实际继续与未完成边界

90882在856当前advance保存后安全退出，当前请求全部留档。20771无恢复旗标继续同一个inlKbk/projection-owner，日志`build/slice272-live-p5-v612.log`。产品每次实验planner调用本就投影当前工具descriptor，新能力不会通过篡改旧prompt／回执送入。未重置轮数或费用，未扩Web、未开战。

**还须观察真实模型是否选择区域、取得候选、显式应用并关闭必要地图问题，再触发军表／Plan联合修订。** 本门证明工具可用，不证明整链路收敛、策略更优或两种生产模式均通过。

后续实况：857的当前descriptor确有anchorRegions，但模型合理复用了此前已获得的固定点联合候选1509，后续原生9单位场景／控点成功。因此该成功不能归因于区域搜索，也不能宣称模型实际采用了区域。随后错读section序号问题另按v613处理；两项证据范围保持独立。

harnessLoopUsed:true；targetGames:starcraft_tmg；promptPackRoutes:当前实验planner／来源与覆盖审核；harnessToolsCalled:同Native静态单／联合队形；uiTraceEvidence:无新Web；agentDecisionEvidence:849/851/856，采用新能力待观察；memoryTraceEvidence:原记录／次数／费用保留；trainingTraceCandidates:无；rollbackOrDemotionRules:区域越界、原生几何未通过或来源错配不可准入；userVisibleChecks:最终军表/Plan未验收。
