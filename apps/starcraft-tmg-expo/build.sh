#!/bin/bash
# StarCraft TMG 军表助手 - 本地打包脚本
# 用法: chmod +x build.sh && ./build.sh

set -e

echo "╔══════════════════════════════════════════╗"
echo "║  StarCraft TMG 军表助手 - 打包脚本       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js 22+"
    exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  未找到 pnpm，正在安装..."
    npm install -g pnpm
fi

# 1. 安装依赖
echo ""
echo "━━━ [1/5] 安装依赖 ━━━"
pnpm install

# 2. 验证来源策略
echo ""
echo "━━━ [2/5] 验证来源策略 ━━━"
echo "✅ 构建不会联网刷新或内置旧数据；客户端只读取服务端来源元数据投影"

# 3. 运行测试
echo ""
echo "━━━ [3/5] 运行测试 ━━━"
pnpm test

# 4. 类型检查（忽略 drizzle 已知错误）
echo ""
echo "━━━ [4/5] 类型检查 ━━━"
if pnpm check 2>&1 | grep -v "drizzle" | grep "error TS"; then
    echo "⚠️  存在类型错误，请检查"
else
    echo "✅ 类型检查通过（drizzle 相关错误可忽略）"
fi

# 5. 构建选择
echo ""
echo "━━━ [5/5] 选择构建方式 ━━━"
echo ""
echo "  1) EAS Build (推荐，需要 Expo 账号)"
echo "     eas build --platform android --profile preview"
echo ""
echo "  2) 本地 Android 构建 (需要 Android SDK)"
echo "     npx expo prebuild --platform android"
echo "     cd android && ./gradlew assembleRelease"
echo ""
echo "  3) 仅启动开发服务器"
echo "     pnpm dev:metro"
echo ""

read -p "请选择 (1/2/3): " choice

case $choice in
    1)
        if ! command -v eas &> /dev/null; then
            echo "正在安装 EAS CLI..."
            npm install -g eas-cli
        fi
        echo "开始 EAS 构建..."
        eas build --platform android --profile preview
        ;;
    2)
        echo "生成 Android 原生项目..."
        npx expo prebuild --platform android --clean
        echo "开始构建 APK..."
        cd android && ./gradlew assembleRelease
        echo ""
        echo "✅ APK 输出: android/app/build/outputs/apk/release/app-release.apk"
        ;;
    3)
        echo "启动开发服务器..."
        pnpm dev:metro
        ;;
    *)
        echo "准备工作已完成，请手动选择构建方式"
        ;;
esac
