import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { describeNativeActionFormV1, nativeActionFormDefaultsV1,
  compileNativeActionFormValuesV1 } from '../../../../packages/client-domain/native-action-form-v1.mjs';

type Descriptor = { type?: string; const?: unknown; enum?: unknown[];
  properties?: Record<string, Descriptor>; required?: string[]; items?: Descriptor;
  minItems?: number; maxItems?: number; minimum?: number };
type Point = { xMilliInches: number; yMilliInches: number };
const labels: Record<string, string> = {
  activeUnitId: '行动单位', targetUnitId: '目标单位', targetPieceId: '目标单位',
  leadingModelId: '领队模型', modelId: '模型', unitId: '单位',
  paymentCardInstanceIds: '支付卡牌', choice: '能力选项', edgeSide: '进入边',
  entrySegmentId: '进场区段', anchorPieceId: '锚点单位', anchorModelId: '锚点模型',
  placements: '模型最终站位', path: '领队路径', targets: '冲锋目标',
  outcome: '冲锋结果', failureProof: '失败依据', kind: '规则依据', tokenDisplacements: '标记落点',
  tokenId: '战场标记', rotationDegrees: '朝向（度）', elevation: '高度层', supportTerrainIds: '支撑地形',
  allocations: '攻击骰分配', dice: '骰子数量', closeRanksMode: '整队',
  casualtyModelIds: '移除模型（按顺序）', casualtySelectionHash: '伤亡方案',
  coordinate: '位置', xMilliInches: '横向位置（英寸）', yMilliInches: '纵向位置（英寸）',
  pointDefenseSourcePieceIds: '点防御来源', pointDefenseRemovedDieIds: '点防御移除骰',
  surgeTargetUnitId: 'Surge 目标', criticalTargetUnitId: 'Critical 目标',
  convertedFailedArmourDieIndices: '用 TOUGH 转为成功的护甲骰',
};
const choices: Record<string, string> = { top: '上边', bottom: '下边', left: '左边', right: '右边',
  success: '成功', failure: '失败', distance_shortfall: '距离不足', declared_target_spread: '已声明目标相距过远',
  decline: '不整队', move: '整队移动', true: '是', false: '否' };
function Button({ text, onPress, active = false, disabled = false }: {
  text: string; onPress: () => void; active?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[styles.button, active && styles.active, disabled && { opacity: .4 }]}>
    <Text style={styles.text}>{text}</Text></Pressable>;
}
function Field({ name, descriptor: d, value, onChange, names, pickPoint }: {
  name: string; descriptor: Descriptor; value: any; onChange: (value: any) => void;
  names: Record<string, string>; pickPoint: (callback: (point: Point) => void) => void;
}) {
  const title = labels[name] || name;
  const renderValue = (v: any): string => Array.isArray(v)
    ? (v.length ? v.map(renderValue).join(' + ') : '无需支付 / 空选择')
    : name === 'convertedFailedArmourDieIndices' && Number.isSafeInteger(v) ? `第${v + 1}颗护甲骰`
    : v && typeof v === 'object' && 'kind' in v ? renderValue(v.kind)
    : names[String(v)] || choices[String(v)] || String(v ?? '无');
  if (Object.hasOwn(d, 'const')) return <Text style={styles.hint}>{title}：{renderValue(d.const)}</Text>;
  if (d.enum) return <View style={styles.field}><Text style={styles.title}>{title}</Text>
    <View style={styles.row}>{d.enum.map((v, i) => <Button key={i} text={renderValue(v)}
      active={JSON.stringify(value) === JSON.stringify(v)} onPress={() => onChange(v)} />)}</View>
    {!d.enum.length && <Text style={styles.hint}>当前没有可选项</Text>}</View>;
  if (d.type === 'array') {
    const rows = Array.isArray(value) ? value : [];
    return <View style={styles.field}><Text style={styles.title}>{title} · {rows.length}
      {d.minItems != null ? ` / 至少 ${d.minItems}` : ''}</Text>
      {rows.map((row, i) => <View key={i} style={styles.nested}>
        <Text style={styles.hint}>第 {i + 1} 项</Text>
        <Field name={name === 'casualtyModelIds' ? 'modelId' : name} descriptor={d.items!}
          value={row} names={names} pickPoint={pickPoint}
          onChange={next => onChange(rows.map((old, n) => n === i ? next : old))} />
        <Button text="移除此项" onPress={() => onChange(rows.filter((_, n) => n !== i))} />
      </View>)}
      <View style={styles.row}><Button text={`添加${title}`} disabled={d.maxItems != null && rows.length >= d.maxItems}
        onPress={() => onChange([...rows, d.items?.type === 'object' ? {} : undefined])} />
        {!d.minItems && <Button text="选择空列表" active={Array.isArray(value) && !rows.length} onPress={() => onChange([])} />}
      </View></View>;
  }
  if (d.type === 'object') return <View style={styles.nested}>
    {d.properties?.xMilliInches && d.properties?.yMilliInches &&
      <Button text="在战桌上选位置" onPress={() => pickPoint(point => onChange({ ...value, ...point }))} />}
    {Object.entries(d.properties || {}).map(([key, child]) => <Field key={key} name={key}
      descriptor={child} value={value?.[key]} names={names} pickPoint={pickPoint}
      onChange={next => onChange({ ...value, [key]: next })} />)}</View>;
  if (d.type === 'boolean') return <View style={styles.row}><Text style={styles.title}>{title}</Text>
    {[true, false].map(v => <Button key={String(v)} text={choices[String(v)]}
      active={v === value} onPress={() => onChange(v)} />)}</View>;
  const numeric = d.type === 'integer' || d.type === 'number';
  const milli = name.endsWith('MilliInches');
  return <View style={styles.field}><Text style={styles.title}>{title}</Text>
    <TextInput accessibilityLabel={title} style={styles.input} keyboardType={numeric ? 'decimal-pad' : 'default'}
      value={value === undefined ? '' : String(milli ? value / 1000 : value)}
      onChangeText={text => onChange(text.trim() === '' ? undefined : numeric
        ? (milli ? Math.round(Number(text) * 1000) : Number(text)) : text)} /></View>;
}

export function NativeActionForm({ domain, names, modelIds, tokenIds, disabled, onPreview, onPickPoint }: {
  domain: Record<string, unknown>; names: Record<string, string>; modelIds?: string[]; tokenIds?: string[]; disabled: boolean;
  onPreview: (parameters: Record<string, unknown>) => void;
  onPickPoint: (callback: (point: Point) => void) => void;
}) {
  const form = useMemo(() => describeNativeActionFormV1(domain, {modelIds, tokenIds}), [domain, modelIds, tokenIds]);
  const [values, setValues] = useState<Record<string, any>>(() => nativeActionFormDefaultsV1(form));
  const [optional, setOptional] = useState<string[]>([]);
  const required = [...new Set([...form.required, ...form.conditional.flatMap((row: any) =>
    values[row.when?.field] === row.when?.value ? row.required : [])])];
  const compiled = compileNativeActionFormValuesV1(form, values);
  return <View style={styles.form} testID="native-action-form">
    <Text style={styles.title}>设置行动</Text>
    <Text style={styles.hint}>选择目标、支付和站位后预览。规则器会检查实际距离、底盘、地形和行动条件。</Text>
    {Object.entries(form.fields).map(([key, original]) => {
      const forOutcome = form.chargeFieldOutcomes?.[key];
      if (forOutcome && values.outcome !== forOutcome) return null;
      const d = key === 'paymentCardInstanceIds' && form.paymentsByChoice
        ? { enum: form.paymentsByChoice[values.choice ?? 'default'] || [] } : original as Descriptor;
      const enabled = required.includes(key) || Object.hasOwn(d, 'const') || optional.includes(key);
      return enabled ? <Field key={key} name={key} descriptor={d} value={values[key]}
        names={names} pickPoint={onPickPoint} onChange={next => setValues(old => {
          const updated = { ...old, [key]: next };
          if (key === 'choice') delete updated.paymentCardInstanceIds;
          return updated;
        })} /> : <Button key={key} text={`设置${labels[key] || key}（可选）`}
          onPress={() => setOptional(old => [...old, key])} />;
    })}
    {!form.supported && <Text style={styles.hint}>尚缺字段界面：{form.missing.join('、')}</Text>}
    <Button text="预览此行动" disabled={disabled || !compiled.complete}
      onPress={() => onPreview(compiled.parameters)} />
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 12, padding: 12, backgroundColor: '#091b29', borderRadius: 10, borderWidth: 1, borderColor: '#27627a' },
  field: { gap: 7 }, nested: { gap: 8, marginVertical: 4, paddingLeft: 10, borderLeftWidth: 1, borderColor: '#244b61' },
  title: { color: '#d9f3ff', fontSize: 12, fontWeight: '600' }, text: { color: '#c4e8f6', fontSize: 12 },
  hint: { color: '#91afbf', fontSize: 11, lineHeight: 17 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  button: { minHeight: 40, justifyContent: 'center', padding: 10, borderWidth: 1, borderColor: '#315366', borderRadius: 7, backgroundColor: '#102737' },
  active: { backgroundColor: '#16465b', borderColor: '#63bbd6' },
  input: { color: '#e1f5ff', backgroundColor: '#061420', borderWidth: 1, borderColor: '#315366', borderRadius: 6, padding: 10, minHeight: 42 },
});
