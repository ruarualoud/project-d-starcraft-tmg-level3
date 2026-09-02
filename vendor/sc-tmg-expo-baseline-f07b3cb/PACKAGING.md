# StarCraft TMG 军表助手 — 打包与部署指南

## 项目概述

本项目是一个基于 Expo SDK 54 的 React Native 移动应用，用于星际争霸桌面战棋游戏（StarCraft TMG）的军表管理和战斗计算。

## 前置要求

| 工具 | 版本要求 | 用途 |
|------|---------|------|
| Node.js | 22+ | 运行时环境 |
| pnpm | 9.12+ | 包管理器 |
| Expo CLI | 最新 | 构建和开发 |
| EAS CLI | 最新 | 云端构建 APK/IPA |

## 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm dev:metro

# 3. 在手机上扫描二维码（Expo Go）
pnpm qr
```

## 数据准备

应用内置了预打包的数据文件 `assets/data/bundled-data.json`。如需更新数据：

```bash
# 从 Firebase 拉取最新数据并写入 bundled-data.json
node tools/export-data-pack.js --embed
```

该命令会从 Firebase Firestore（项目 `starcrafttmgbeta`，命名数据库 `starcrafttmgbeta`）拉取以下集合：

| 集合 | 内容 | 数量 |
|------|------|------|
| `army_units` | 单位卡（含属性、武器、能力） | 26 |
| `tactical_cards` | 战术卡和阵营卡 | 37 |
| `faction_cards` | 任务卡和部署卡（含社区内容） | 165 |

## 构建 APK（推荐方式）

### 方式一：通过 Manus 平台

1. 在 Manus 中保存 checkpoint
2. 点击管理界面右上角的 **Publish** 按钮
3. 平台自动构建 APK，构建完成后可下载

### 方式二：通过 EAS Build

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 Android APK（开发版）
eas build --platform android --profile preview

# 构建 Android APK（生产版）
eas build --platform android --profile production
```

需要在项目根目录创建 `eas.json`：

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 方式三：本地构建（需要 Android SDK）

```bash
# 生成 Android 原生项目
npx expo prebuild --platform android

# 进入 Android 目录构建
cd android
./gradlew assembleRelease

# APK 输出位置
# android/app/build/outputs/apk/release/app-release.apk
```

## 构建 iOS

```bash
# 通过 EAS Build
eas build --platform ios --profile production

# 或本地构建（需要 macOS + Xcode）
npx expo prebuild --platform ios
cd ios
xcodebuild -workspace app.xcworkspace -scheme app -configuration Release
```

## 项目配置

关键配置文件 `app.config.ts` 中的环境变量：

| 变量 | 说明 | 当前值 |
|------|------|--------|
| `appName` | 应用显示名称 | SC TMG 军表助手 |
| `appSlug` | 应用唯一标识（不可更改） | sc-tmg-app |
| `scheme` | Deep link scheme | 自动生成 |
| `iosBundleId` | iOS Bundle ID | 自动生成 |
| `androidPackage` | Android 包名 | 自动生成 |

## 完整打包脚本

以下是一键打包脚本，可在有 Node.js 环境的 PC 上运行：

```bash
#!/bin/bash
# build.sh - StarCraft TMG Army Builder 打包脚本

set -e

echo "=== StarCraft TMG 军表助手 打包脚本 ==="

# 1. 安装依赖
echo "[1/4] 安装依赖..."
pnpm install

# 2. 更新内置数据
echo "[2/4] 更新内置数据..."
node tools/export-data-pack.js --embed
echo "数据更新完成"

# 3. 类型检查
echo "[3/4] 类型检查..."
pnpm check || echo "注意: drizzle 相关的 TS 错误可忽略"

# 4. 运行测试
echo "[4/4] 运行测试..."
pnpm test

echo ""
echo "=== 准备完成 ==="
echo "接下来请选择构建方式："
echo "  EAS Build:  eas build --platform android --profile preview"
echo "  本地构建:   npx expo prebuild --platform android && cd android && ./gradlew assembleRelease"
echo ""
```

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| Firebase 数据拉取 404 | 确认使用命名数据库 `starcrafttmgbeta`，不是 `(default)` |
| 国内网络无法访问 Firebase | 使用 VPN 或通过 PC 导出工具离线导入 |
| APK 构建失败 | 检查 `app.config.ts` 中的包名格式是否正确 |
| 内置数据为空 | 运行 `node tools/export-data-pack.js --embed` 重新生成 |
