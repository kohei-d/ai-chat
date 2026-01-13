.PHONY: help install setup dev build start test lint clean prisma-generate prisma-studio prisma-push deploy

# デフォルトターゲット: ヘルプを表示
help:
	@echo "AI Chat - 利用可能なコマンド"
	@echo ""
	@echo "初期セットアップ:"
	@echo "  make install         - 依存関係のインストール"
	@echo "  make setup           - 初期セットアップ（install + Prisma生成 + .env.local作成）"
	@echo ""
	@echo "開発:"
	@echo "  make dev             - 開発サーバー起動"
	@echo "  make prisma-studio   - Prisma Studio起動（データベースGUI）"
	@echo ""
	@echo "ビルドとテスト:"
	@echo "  make build           - 本番ビルド"
	@echo "  make start           - 本番サーバー起動"
	@echo "  make test            - テスト実行"
	@echo "  make test-watch      - テストをウォッチモードで実行"
	@echo "  make test-coverage   - テストカバレッジ計測"
	@echo "  make lint            - ESLintチェック"
	@echo ""
	@echo "Prisma操作:"
	@echo "  make prisma-generate - Prisma Clientの再生成"
	@echo "  make prisma-push     - スキーマをMongoDBに反映"
	@echo ""
	@echo "デプロイ:"
	@echo "  make deploy          - Google Cloud Runへデプロイ"
	@echo ""
	@echo "クリーンアップ:"
	@echo "  make clean           - ビルドキャッシュ削除"
	@echo "  make clean-all       - すべての生成ファイルとnode_modulesを削除"

# 依存関係のインストール
install:
	@echo "📦 依存関係をインストール中..."
	npm install

# 初期セットアップ
setup: install
	@echo "⚙️  初期セットアップを実行中..."
	@if [ ! -f .env.local ]; then \
		echo "📝 .env.local を作成中..."; \
		cp .env.example .env.local; \
		echo "⚠️  .env.local を編集して、必要な環境変数を設定してください"; \
	else \
		echo "✅ .env.local は既に存在します"; \
	fi
	@echo "🔧 Prisma Client を生成中..."
	npx prisma generate
	@echo "✅ セットアップ完了！"
	@echo ""
	@echo "次のステップ:"
	@echo "  1. .env.local を編集して ANTHROPIC_API_KEY を設定"
	@echo "  2. make dev で開発サーバーを起動"

# 開発サーバー起動
dev:
	@echo "🚀 開発サーバーを起動中..."
	npm run dev

# 本番ビルド
build:
	@echo "🏗️  本番ビルドを実行中..."
	npm run build

# 本番サーバー起動
start:
	@echo "▶️  本番サーバーを起動中..."
	npm start

# テスト実行
test:
	@echo "🧪 テストを実行中..."
	npm test

# テストをウォッチモードで実行
test-watch:
	@echo "👀 テストをウォッチモードで実行中..."
	npm run test:watch

# テストカバレッジ計測
test-coverage:
	@echo "📊 テストカバレッジを計測中..."
	npm run test:coverage

# ESLintチェック
lint:
	@echo "🔍 ESLintチェックを実行中..."
	npm run lint

# Prisma Client再生成
prisma-generate:
	@echo "🔧 Prisma Client を再生成中..."
	npx prisma generate

# Prisma Studio起動
prisma-studio:
	@echo "🎨 Prisma Studio を起動中..."
	npx prisma studio

# スキーマをMongoDBに反映
prisma-push:
	@echo "💾 スキーマをMongoDBに反映中..."
	npx prisma db push

# Google Cloud Runへデプロイ
deploy:
	@echo "☁️  Google Cloud Run へデプロイ中..."
	@if [ -z "$(PROJECT_ID)" ]; then \
		echo "❌ エラー: PROJECT_ID が設定されていません"; \
		echo "使用方法: make deploy PROJECT_ID=your-project-id [REGION=region]"; \
		exit 1; \
	fi
	$(eval REGION ?= asia-northeast1)
	@echo "📋 デプロイ設定:"
	@echo "  - Project: $(PROJECT_ID)"
	@echo "  - Region: $(REGION)"
	@echo "  - Service: ai-chat"
	gcloud run deploy ai-chat \
		--source . \
		--project=$(PROJECT_ID) \
		--region=$(REGION) \
		--platform=managed \
		--allow-unauthenticated \
		--port=3000 \
		--memory=512Mi \
		--cpu=1 \
		--min-instances=0 \
		--max-instances=10 \
		--concurrency=80 \
		--timeout=60s \
		--set-env-vars=NODE_ENV=production,SESSION_EXPIRY=3600,LOG_LEVEL=info \
		--set-secrets=ANTHROPIC_API_KEY=anthropic-api-key:latest,DATABASE_URL=mongodb-connection-string:latest
	@echo ""
	@echo "✅ デプロイ完了！"
	@echo "🌐 サービス URL を取得中..."
	@gcloud run services describe ai-chat --region=$(REGION) --project=$(PROJECT_ID) --format='value(status.url)'

# ビルドキャッシュ削除
clean:
	@echo "🧹 ビルドキャッシュを削除中..."
	rm -rf .next
	rm -rf out
	@echo "✅ クリーンアップ完了！"

# すべての生成ファイルとnode_modulesを削除
clean-all: clean
	@echo "🗑️  すべての生成ファイルを削除中..."
	rm -rf node_modules
	rm -rf .next
	rm -rf out
	rm -rf coverage
	@echo "✅ 完全クリーンアップ完了！"
