#!/usr/bin/env node
/**
 * SC TMG 数据包导出工具 v2.0
 * 
 * 在能连接 Google 服务的PC上运行此脚本，
 * 从Firebase Firestore拉取所有游戏数据并导出为JSON数据包。
 * 
 * 使用方法:
 *   node export-data-pack.js                    # 导出到当前目录
 *   node export-data-pack.js --output my.json   # 指定输出文件
 *   node export-data-pack.js --embed            # 导出并内置到App assets（打包APK前使用）
 * 
 * 依赖: 无（使用Node.js内置模块）
 * 要求: Node.js 18+
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Firebase配置 - 使用命名数据库 starcrafttmgbeta
const PROJECT_ID = 'starcrafttmgbeta';
const DATABASE_ID = 'starcrafttmgbeta';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

// 解析命令行参数
const args = process.argv.slice(2);
const embedMode = args.includes('--embed');
let outputFile = `sc-tmg-data-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
const outputIdx = args.indexOf('--output');
if (outputIdx !== -1 && args[outputIdx + 1]) {
  outputFile = args[outputIdx + 1];
}

// HTTP请求封装
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON解析失败: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('请求超时')); });
  });
}

// 从Firestore值中提取JS值
function extractValue(field) {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('arrayValue' in field) {
    return (field.arrayValue.values || []).map(extractValue);
  }
  if ('mapValue' in field) {
    const result = {};
    const fields = field.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      result[k] = extractValue(v);
    }
    return result;
  }
  if ('nullValue' in field) return null;
  return null;
}

// 解析Firestore文档
function parseDocument(doc) {
  if (!doc.fields) return null;
  const result = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    result[key] = extractValue(value);
  }
  if (doc.name) {
    const parts = doc.name.split('/');
    result.id = parts[parts.length - 1];
  }
  return result;
}

// 拉取集合中的所有文档
async function fetchCollection(collectionName) {
  const docs = [];
  let pageToken = null;

  console.log(`  正在拉取 ${collectionName}...`);

  while (true) {
    let url = `${FIRESTORE_BASE}/${collectionName}?pageSize=300`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const data = await fetchJSON(url);

    if (data.error) {
      throw new Error(`Firebase错误 (${collectionName}): ${data.error.message || JSON.stringify(data.error)}`);
    }

    if (data.documents) {
      for (const doc of data.documents) {
        const parsed = parseDocument(doc);
        if (parsed) docs.push(parsed);
      }
    }

    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
    } else {
      break;
    }
  }

  console.log(`  ✓ ${collectionName}: ${docs.length} 条记录`);
  return docs;
}

// 提取武器级关键词
function extractWeaponKeywords(desc) {
  if (!desc) return '';
  const upper = desc.toUpperCase();
  const found = [];
  const patterns = [
    /ANTI[- ]?EVADE\s*\(\d+\)/g,
    /BURST\s*FIRE\s*\d+\s*"?\s*\(\d+\)/g,
    /CONCENTRATED\s*FIRE\s*\(\d+\)/g,
    /CRITICAL\s*HIT\s*\(\d+\)/g,
    /DODGE\s*\(\d+\)/g,
    /IMPACT\s*\(\d+\)\s*\d+\+?/g,
    /INDIRECT\s*FIRE/g,
    /LOCKED\s*IN\s*\(\d+\)/g,
    /LONG\s*RANGE\s*(?:\(\d+\s*"?\)|\d+\s*"?)/g,
    /PIERCE\s*(?:\[[^\]]+\]\s*\d+|[A-Z' -]+?\s*\(\d+\))/g,
    /PINPOINT/g,
    /PRECISION\s*\(\d+\)/g,
    /SIDEARM/g,
    /SPILLOVER/g,
    /TOUGH\s*\(\d+\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of upper.matchAll(pattern)) {
      const value = match[0].replace(/\s+/g, ' ').trim();
      if (!found.includes(value)) found.push(value);
    }
  }

  return found.join(', ');
}

// 从升级描述中解析武器数据
function parseWeaponFromDescription(desc) {
  if (!desc) return null;
  const rangeMatch = desc.match(/RANGE:\s*([^|\n\r]+)/i);
  const targetMatch = desc.match(/TARGET:\s*([^|\n\r]+)/i);
  const roaMatch = desc.match(/RoA:\s*([^|\n\r]+)/i);
  const hitMatch = desc.match(/HIT:\s*([^|\n\r]+)/i);
  const dmgMatch = desc.match(/DMG:\s*([^|\n\r]+)/i);
  const surgeMatch = desc.match(/SURGE:\s*([^|\n\r]+)/i);

  if (rangeMatch || hitMatch || dmgMatch) {
    return {
      name: '',
      range: rangeMatch?.[1]?.trim() || '-',
      target: targetMatch?.[1]?.trim() || '-',
      roa: roaMatch?.[1]?.trim() || '1',
      hit: hitMatch?.[1]?.trim() || '-',
      dmg: dmgMatch?.[1]?.trim() || '-',
      surge: surgeMatch?.[1]?.trim(),
      keywords: extractWeaponKeywords(desc),
    };
  }
  return null;
}

// 处理单位数据 → 与App运行时 UnitCard 类型完全一致
function processUnit(raw) {
  const stats = raw.stats || {};
  
  // 处理升级
  const upgrades = (raw.upgrades || []).map(u => {
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

  // 处理小队/大队配置
  let smallProfile = undefined;
  let largeProfile = undefined;

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

  // 兼容 squadProfile 数组格式
  if (!smallProfile && !largeProfile && raw.squadProfile) {
    const profiles = Array.isArray(raw.squadProfile) ? raw.squadProfile : [raw.squadProfile];
    profiles.forEach((p, i) => {
      if (i === 0) {
        smallProfile = { size: 'small', models: p.modelCount || p.models || 0, supply: p.supply || 0, cost: p.cost || 0 };
      }
      if (i === 1) {
        largeProfile = { size: 'large', models: p.modelCount || p.models || 0, supply: p.supply || 0, cost: p.cost || 0 };
      }
    });
  }

  return {
    id: raw.id,
    name: raw.name || '',
    faction: raw.faction || 'Terran',
    unitType: raw.unitType || 'Core',
    stats: {
      shield: stats.shield,
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
  };
}

// 处理战术卡/阵营卡 → 与App运行时 TacticalCard 类型一致
function processCard(raw) {
  const slots = {};
  if (raw.slots) {
    for (const [k, v] of Object.entries(raw.slots)) {
      slots[k] = Number(v) || 0;
    }
  }
  const card = {
    id: raw.id,
    name: raw.name || '',
    faction: raw.faction || 'Terran',
    cost: raw.cost || 0,
    resource: raw.resource,
    slots: slots,
    boosts: raw.boosts || [],
    isFactionCard: raw.isFactionCard || false,
    isUnique: raw.isUnique || false,
    frontUrl: raw.frontUrl || '',
  };
  // Faction tags for faction cards (e.g. ["Khalai"], ["Kerrigan's Swarm"])
  if (raw.factionTags && Array.isArray(raw.factionTags) && raw.factionTags.length > 0) {
    card.factionTags = raw.factionTags;
  }
  return card;
}

// 处理游戏卡 → 与App运行时 GameCard 类型完全一致
// 包含4种类型: mission, deployment, community_mission, community_deployment
function processGameCard(raw) {
  const card = {
    id: raw.id,
    name: raw.name || '',
    faction: raw.faction || '',
    type: raw.type || 'mission',
  };

  // 图片字段
  if (raw.frontUrl) card.frontUrl = raw.frontUrl;
  if (raw.backUrl) card.backUrl = raw.backUrl;

  // Mission 字段
  if (raw.format) card.format = raw.format;
  if (raw.startingSupply != null) card.startingSupply = Number(raw.startingSupply);
  if (raw.extraSupply) card.extraSupply = raw.extraSupply;
  if (raw.gameLength != null) card.gameLength = Number(raw.gameLength);
  if (raw.missionParams) card.missionParams = raw.missionParams;
  if (raw.scoringConditions) card.scoringConditions = raw.scoringConditions;
  if (raw.additionalConditions) card.additionalConditions = raw.additionalConditions;
  if (raw.refId != null) card.refId = raw.refId;

  // Deployment 字段
  if (raw.gameSize) card.gameSize = raw.gameSize;
  if (raw.isManual != null) card.isManual = raw.isManual;

  // Community 字段
  if (raw.authorId) card.authorId = raw.authorId;
  if (raw.authorName) card.authorName = raw.authorName;
  if (raw.status) card.status = raw.status;
  if (Array.isArray(raw.upvotes)) card.upvotes = raw.upvotes;
  if (raw.isOfficial != null) card.isOfficial = raw.isOfficial;
  if (raw.isArchonFavorite != null) card.isArchonFavorite = raw.isArchonFavorite;
  if (raw.isOfTheWeek != null) card.isOfTheWeek = raw.isOfTheWeek;

  return card;
}

// 主函数
async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   SC TMG 数据包导出工具 v2.0        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  if (embedMode) {
    console.log('模式: 内置到App assets（打包APK前使用）');
  } else {
    console.log('模式: 导出数据包文件');
  }
  console.log(`数据库: ${PROJECT_ID}/${DATABASE_ID}`);
  console.log('正在连接 Firebase Firestore...');
  console.log('');

  try {
    // 拉取所有集合 - 使用正确的collection名称
    const [rawUnits, rawTacticalCards, rawFactionCards, versionDoc] = await Promise.all([
      fetchCollection('army_units'),
      fetchCollection('tactical_cards'),
      fetchCollection('faction_cards').catch(e => { console.warn('  ⚠ faction_cards拉取失败:', e.message); return []; }),
      fetchJSON(`${FIRESTORE_BASE}/system_metadata/versions`).catch(() => null),
    ]);

    // 处理版本号
    let version = 0;
    if (versionDoc && versionDoc.fields) {
      const uv = versionDoc.fields.unitsVersion;
      const cv = versionDoc.fields.cardsVersion;
      const unitsV = uv ? parseInt(uv.integerValue || '0') : 0;
      const cardsV = cv ? parseInt(cv.integerValue || '0') : 0;
      version = Math.max(unitsV, cardsV);
    }

    // 处理单位
    const units = rawUnits.map(processUnit);

    // tactical_cards 包含阵营卡(isFactionCard=true)和战术卡(isFactionCard=false)
    // 它们都属于 TacticalCard 类型
    const allCards = rawTacticalCards.map(processCard);

    // faction_cards 集合包含4种类型: mission, deployment, community_mission, community_deployment
    const validTypes = ['mission', 'deployment', 'community_mission', 'community_deployment'];
    const gameCards = rawFactionCards
      .filter(c => validTypes.includes(c.type))
      .map(processGameCard);

    // 构造与App运行时完全一致的 DataPackage 格式
    const dataPack = {
      version: version || Date.now(),
      exportedAt: Date.now(),
      units,
      cards: allCards,
      gameCards,
    };

    // 输出路径
    let outputPath;
    if (embedMode) {
      const assetsDir = path.resolve(__dirname, '..', 'assets', 'data');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      outputPath = path.join(assetsDir, 'bundled-data.json');
    } else {
      outputPath = path.resolve(outputFile);
    }

    fs.writeFileSync(outputPath, JSON.stringify(dataPack, null, 2), 'utf-8');

    const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(1);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('导出完成！');
    console.log(`  文件: ${outputPath}`);
    console.log(`  大小: ${fileSize} KB`);
    console.log('');
    console.log('数据统计:');
    console.log(`  数据版本: ${version}`);
    console.log(`  单位卡: ${units.length}`);
    const factionCardCount = allCards.filter(c => c.isFactionCard).length;
    const tacticCardCount = allCards.filter(c => !c.isFactionCard).length;
    console.log(`  阵营卡: ${factionCardCount}`);
    console.log(`  战术卡: ${tacticCardCount}`);
    const missionCount = gameCards.filter(c => c.type === 'mission').length;
    const deploymentCount = gameCards.filter(c => c.type === 'deployment').length;
    const communityMissionCount = gameCards.filter(c => c.type === 'community_mission').length;
    const communityDeploymentCount = gameCards.filter(c => c.type === 'community_deployment').length;
    console.log(`  官方任务卡: ${missionCount}`);
    console.log(`  官方部署卡: ${deploymentCount}`);
    console.log(`  社区任务卡: ${communityMissionCount}`);
    console.log(`  社区部署卡: ${communityDeploymentCount}`);
    console.log(`  游戏卡总计: ${gameCards.length}`);
    console.log(`  其中官方内容: ${missionCount + deploymentCount}`);
    console.log(`  其中社区内容: ${communityMissionCount + communityDeploymentCount}`);
    console.log(`  游戏卡包含完整任务参数/评分条件/部署地图等字段`);
    console.log(`  卡牌总计: ${allCards.length}`);
    console.log('');

    if (embedMode) {
      console.log('数据已内置到 assets/data/bundled-data.json');
      console.log('格式: 与App运行时 DataPackage 完全一致，可直接加载');
      console.log('');
      console.log('App启动时会自动检测并加载内置数据包。');
    } else {
      console.log('使用方法:');
      console.log('  方式1 - App内导入:');
      console.log('    在App设置页面 → 粘贴导入数据包 → 粘贴此JSON内容');
      console.log('');
      console.log('  方式2 - 内置到APK:');
      console.log('    运行: node export-data-pack.js --embed');
      console.log('    然后打包APK即可内置最新数据');
    }
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ 导出失败:', error.message);
    console.error('');
    console.error('可能原因:');
    console.error('  1. 网络无法连接 Firebase/Google (中国大陆需要科学上网)');
    console.error('  2. Firebase 数据库结构已变更');
    console.error('  3. 请检查网络连接后重试');
    process.exit(1);
  }
}

main();
