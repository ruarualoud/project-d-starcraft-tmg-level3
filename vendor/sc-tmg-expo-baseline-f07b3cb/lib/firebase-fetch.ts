/**
 * Firebase Firestore REST API fetcher
 * Uses REST API to avoid Firebase SDK dependency (smaller bundle, works everywhere)
 */
import type { UnitCard, TacticalCard, GameCard, DataPackage, Upgrade, WeaponProfile, UnitStats, SquadProfile } from './types';
import { extractWeaponKeywords } from './combat-rules';
import { normalizeUnitCard, sanitizeWeaponProfile } from './weapon-profile';


const PROJECT_ID = 'starcrafttmgbeta';
const DATABASE_ID = 'starcrafttmgbeta';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  mapValue?: { fields: Record<string, FirestoreValue> };
  arrayValue?: { values?: FirestoreValue[] };
  nullValue?: string;
}

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
}

function extractValue(v: FirestoreValue): any {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.mapValue) {
    const obj: Record<string, any> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      obj[k] = extractValue(val);
    }
    return obj;
  }
  if (v.arrayValue) {
    return (v.arrayValue.values || []).map(extractValue);
  }
  return null;
}

function extractDoc(doc: FirestoreDocument): Record<string, any> {
  const parts = doc.name.split('/');
  const id = parts[parts.length - 1];
  const data: Record<string, any> = { id };
  for (const [k, v] of Object.entries(doc.fields || {})) {
    data[k] = extractValue(v);
  }
  return data;
}

async function fetchCollection(collectionName: string): Promise<Record<string, any>[]> {
  const results: Record<string, any>[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${BASE_URL}/${collectionName}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    let resp: Response;
    try {
      resp = await fetch(url);
    } catch (networkErr: any) {
      // Network-level failure: DNS, timeout, connection refused, etc.
      const msg = networkErr?.message || '';
      if (msg.includes('Network request failed') || msg.includes('Failed to fetch') || msg.includes('TypeError')) {
        throw new Error(
          `网络连接失败，无法访问 Firebase 服务器。\n\n` +
          `可能原因：\n` +
          `1. 国内网络无法直接访问 Google 服务（需要科学上网）\n` +
          `2. 当前网络不稳定或已断开\n` +
          `3. 防火墙/代理阻止了请求\n\n` +
          `建议：在能访问 Google 的设备上使用PC工具导出数据包，然后通过「离线数据包」功能导入。`
        );
      }
      throw new Error(`网络请求异常: ${msg}\n\n如果您在中国大陆，Firebase(Google)服务可能被防火墙拦截，请使用离线数据包导入。`);
    }

    if (!resp.ok) {
      let detail = '';
      try {
        const errBody = await resp.text();
        detail = errBody.substring(0, 200);
      } catch (_) {}

      if (resp.status === 404) {
        throw new Error(
          `数据源返回 404 (未找到)。\n\n` +
          `集合 "${collectionName}" 可能已更名或不存在。\n` +
          `请检查数据源是否有更新，或使用离线数据包导入。` +
          (detail ? `\n\n服务器响应: ${detail}` : '')
        );
      } else if (resp.status === 403) {
        throw new Error(
          `数据源返回 403 (禁止访问)。\n\n` +
          `Firebase 安全规则可能已更新。\n` +
          `请使用PC端导出工具获取数据，或联系数据维护者。`
        );
      } else if (resp.status >= 500) {
        throw new Error(
          `Firebase 服务器错误 (${resp.status})。\n\n` +
          `这通常是临时问题，请稍后重试。\n` +
          `如果持续出现，请使用离线数据包导入。`
        );
      }
      throw new Error(
        `拉取 ${collectionName} 失败 (HTTP ${resp.status})。\n\n` +
        `请检查网络连接，或使用离线数据包导入。` +
        (detail ? `\n\n服务器响应: ${detail}` : '')
      );
    }

    const data = await resp.json();
    if (data.documents) {
      for (const doc of data.documents) {
        results.push(extractDoc(doc));
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return results;
}

async function fetchDoc(path: string): Promise<Record<string, any> | null> {
  const resp = await fetch(`${BASE_URL}/${path}`);
  if (!resp.ok) return null;
  const doc = await resp.json();
  return extractDoc(doc);
}

// Parse weapon data from upgrade description
function parseWeaponFromDescription(desc: string): WeaponProfile | undefined {
  // Pattern: RANGE: X | TARGET: X | RoA: X | HIT: X | DMG: X
  const rangeMatch = desc.match(/RANGE:\s*([^|\n\r]+)/i);
  const targetMatch = desc.match(/TARGET:\s*([^|\n\r]+)/i);
  const roaMatch = desc.match(/RoA:\s*([^|\n\r]+)/i);
  const hitMatch = desc.match(/HIT:\s*([^|\n\r]+)/i);
  const dmgMatch = desc.match(/DMG:\s*([^|\n\r]+)/i);
  const surgeMatch = desc.match(/SURGE:\s*([^|\n\r]+)/i);

  if (rangeMatch || hitMatch || dmgMatch) {
    // Extract weapon-level keywords from description text
    const keywords = extractWeaponKeywords(desc);
    return sanitizeWeaponProfile({
      name: '',
      range: rangeMatch?.[1]?.trim() || '-',
      target: targetMatch?.[1]?.trim() || '-',
      roa: roaMatch?.[1]?.trim() || '1',
      hit: hitMatch?.[1]?.trim() || '-',
      dmg: dmgMatch?.[1]?.trim() || '-',
      surge: surgeMatch?.[1]?.trim(),
      keywords,
    }, desc);
  }
  return undefined;
}


function mapUnit(raw: Record<string, any>): UnitCard {
  const stats = raw.stats || {};
  const upgrades: Upgrade[] = (raw.upgrades || []).map((u: any) => {
    const weapon = parseWeaponFromDescription(u.description || '');
    return {
      name: u.name || '',
      description: u.description || '',
      phase: u.phase || '',
      costS: u.costS || 0,
      costL: u.costL || 0,
      activation: u.activation || '',
      linkedTo: u.linkedTo || '',
      weapon: weapon ? { ...weapon, name: u.name || '', phase: u.phase || '' } : undefined,
    };
  });

  let smallProfile: SquadProfile | undefined;
  let largeProfile: SquadProfile | undefined;

  if (raw.small) {
    smallProfile = {
      size: 'small',
      models: raw.small.models || 0,
      supply: raw.small.supply || 0,
      cost: raw.small.cost || 0,
    };
  }
  if (raw.large) {
    largeProfile = {
      size: 'large',
      models: raw.large.models || 0,
      supply: raw.large.supply || 0,
      cost: raw.large.cost || 0,
    };
  }

  // Also check squadProfile array format
  if (!smallProfile && !largeProfile && raw.squadProfile) {
    const profiles = Array.isArray(raw.squadProfile) ? raw.squadProfile : [raw.squadProfile];
    profiles.forEach((p: any, i: number) => {
      if (i === 0) {
        smallProfile = { size: 'small', models: p.modelCount || p.models || 0, supply: p.supply || 0, cost: p.cost || 0 };
      }
      if (i === 1) {
        largeProfile = { size: 'large', models: p.modelCount || p.models || 0, supply: p.supply || 0, cost: p.cost || 0 };
      }
    });
  }

  return normalizeUnitCard({
    id: raw.id,
    name: raw.name || '',
    faction: raw.faction || 'Terran',
    unitType: raw.unitType || 'Core',
    stats: {
      speed: stats.speed,
      evade: stats.evade,
      armor: stats.armor,
      hp: stats.hp,
      size: stats.size,
    },
    keywords: raw.keywords || '',
    tags: raw.tags || '',
    upgrades,
    smallProfile,
    largeProfile,
    frontUrl: raw.frontUrl || '',
    isUnique: raw.isUnique || false,
  });
}

function mapCard(raw: Record<string, any>): TacticalCard {
  const slots: Record<string, number> = {};
  if (raw.slots) {
    for (const [k, v] of Object.entries(raw.slots)) {
      slots[k] = Number(v) || 0;
    }
  }
  return {
    id: raw.id,
    name: raw.name || '',
    faction: raw.faction || 'Terran',
    cost: raw.cost || 0,
    resource: raw.resource,
    slots: slots as any,
    boosts: raw.boosts || [],
    isFactionCard: raw.isFactionCard || false,
    isUnique: raw.isUnique || false,
    frontUrl: raw.frontUrl || '',
  };
}

function mapGameCard(raw: Record<string, any>): GameCard {
  return {
    id: raw.id,
    name: raw.name || '',
    faction: raw.faction || '',
    type: raw.type || 'mission',
    frontUrl: raw.frontUrl || undefined,
    backUrl: raw.backUrl || undefined,
    // Mission fields
    format: raw.format || undefined,
    startingSupply: raw.startingSupply != null ? Number(raw.startingSupply) : undefined,
    extraSupply: raw.extraSupply || undefined,
    gameLength: raw.gameLength != null ? Number(raw.gameLength) : undefined,
    missionParams: raw.missionParams || undefined,
    scoringConditions: raw.scoringConditions || undefined,
    additionalConditions: raw.additionalConditions || undefined,
    refId: raw.refId || undefined,
    // Deployment fields
    gameSize: raw.gameSize || undefined,
    isManual: raw.isManual || undefined,
    // Community fields
    authorId: raw.authorId || undefined,
    authorName: raw.authorName || undefined,
    status: raw.status || undefined,
    upvotes: Array.isArray(raw.upvotes) ? raw.upvotes : undefined,
    isOfficial: raw.isOfficial || undefined,
    isArchonFavorite: raw.isArchonFavorite || undefined,
    isOfTheWeek: raw.isOfTheWeek || undefined,
  };
}

export async function fetchServerVersion(): Promise<{ unitsVersion: number; cardsVersion: number }> {
  try {
    const doc = await fetchDoc('system_metadata/versions');
    if (doc) {
      return {
        unitsVersion: doc.unitsVersion || 0,
        cardsVersion: doc.cardsVersion || 0,
      };
    }
  } catch (e) {
    console.warn('Failed to fetch server version:', e);
  }
  return { unitsVersion: 0, cardsVersion: 0 };
}

export async function fetchAllData(): Promise<DataPackage> {
  const [rawUnits, rawTacticalCards, rawFactionCards, version] = await Promise.all([
    fetchCollection('army_units'),
    fetchCollection('tactical_cards'),
    fetchCollection('faction_cards').catch(() => []),
    fetchServerVersion(),
  ]);

  const units = rawUnits.map(mapUnit);
  // tactical_cards 包含阵营卡(isFactionCard=true)和战术卡(isFactionCard=false)
  const cards = rawTacticalCards.map(mapCard);
  // faction_cards 集合包含4种类型: mission, deployment, community_mission, community_deployment
  const gameCards = rawFactionCards
    .filter(c => ['mission', 'deployment', 'community_mission', 'community_deployment'].includes(c.type))
    .map(mapGameCard);

  return {
    version: Math.max(version.unitsVersion, version.cardsVersion),
    exportedAt: Date.now(),
    units,
    cards,
    gameCards,
  };
}
