/**
 * Bundled Data Loader
 * 
 * 当App首次启动且本地无数据时，自动从内置的 bundled-data.json 加载数据。
 * 这样即使用户无法访问Firebase，也能有初始数据可用。
 */
import type { DataPackage } from './types';
import * as storage from './storage';

// 内置数据包（在打包时由 export-data-pack.js --embed 生成）
let bundledData: DataPackage | null = null;

try {
  // require 会在打包时静态解析，将JSON内联到bundle中
  bundledData = require('../assets/data/bundled-data.json') as DataPackage;
} catch {
  // 如果文件不存在（开发环境），忽略
  bundledData = null;
}

/**
 * 检查本地是否有数据，如果没有则从内置数据包加载
 * @returns true 如果加载了内置数据
 */
export async function loadBundledDataIfNeeded(): Promise<boolean> {
  if (!bundledData) return false;

  // 检查本地是否已有数据
  const localVersion = await storage.getDataVersion();
  const localUnits = await storage.getUnits();

  // 如果本地已有数据且版本不为0，跳过
  if (localVersion > 0 && localUnits.length > 0) {
    return false;
  }

  // 本地无数据，加载内置数据包
  try {
    await storage.importDataPackage(bundledData);
    console.log(`[BundledData] Loaded bundled data: ${bundledData.units.length} units, ${bundledData.cards.length} cards, ${bundledData.gameCards.length} gameCards, version=${bundledData.version}`);
    return true;
  } catch (e) {
    console.error('[BundledData] Failed to load bundled data:', e);
    return false;
  }
}

/**
 * 获取内置数据包（用于直接导入）
 */
export function getBundledData(): DataPackage | null {
  return bundledData;
}
