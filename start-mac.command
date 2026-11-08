#!/usr/bin/env bash
set -e

# Change directory to the repository folder
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "========================================================"
echo "  🐾 Nyanko Sprite Studio for macOS (MacBook Air / Pro)"
echo "========================================================"
echo ""

# 1. Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js が見つかりませんでした。"
  echo ""
  echo "【手軽な解決方法】"
  echo "1. インストール不要版: このフォルダ内の 'Nyanko_Sprite_Studio.html' を"
  echo "   ダブルクリックすると、ブラウザ上で今すぐ全機能を使えます！"
  echo ""
  echo "2. ローカルサーバー版: 公式サイトから Node.js (推奨版 LTS) を入れてください:"
  echo "   👉 https://nodejs.org/"
  echo ""
  echo "キーを押すと終了します..."
  read -n 1 -s
  exit 1
fi

NODE_VER=$(node -v)
echo "✅ Node.js 検出: $NODE_VER"

# 2. Check node_modules
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦 初回セットアップ: 必要なライブラリをインストールしています..."
  npm install
  echo "✅ インストール完了！"
fi

# 3. Open browser after 2 seconds on macOS
(
  sleep 2
  if command -v open >/dev/null 2>&1; then
    open "http://localhost:5173"
  fi
) &

# 4. Start dev server
echo ""
echo "🚀 開発サーバーを起動しています..."
echo "   ブラウザで http://localhost:5173 を自動で開きます。"
echo "   （終了するときは、このウィンドウで Ctrl + C を押してください）"
echo ""

npm run dev
