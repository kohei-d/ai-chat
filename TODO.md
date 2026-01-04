# ai-chat 開発実行計画

## 概要
本ドキュメントは、ai-chatアプリケーションを構築するための実行計画です。
各フェーズを順番に実装し、段階的に機能を追加していきます。

**最終更新**: 2026-01-04

---

## Phase 1: プロジェクト初期セットアップ

### 1.1 プロジェクト基盤の構築
- [x] Next.js 14+ プロジェクトの作成（App Router使用）
  ```bash
  npx create-next-app@latest ai-chat --typescript --tailwind --app --no-src-dir
  ```
- [x] 必要なパッケージのインストール
  - [x] Hono: `npm install hono @hono/node-server`
  - [x] Prisma: `npm install prisma @prisma/client`
  - [x] Claude SDK: `npm install @anthropic-ai/sdk`
  - [x] ロギング: `npm install pino pino-pretty`
  - [x] Markdown: `npm install react-markdown`
  - [x] その他: `npm install uuid @types/uuid`
- [x] 開発ツールのセットアップ
  - [x] ESLint設定の確認・調整
  - [x] Prettier設定の追加
  - [x] `.editorconfig` の作成
- [x] Git初期化とリポジトリ設定
  - [x] `.gitignore` に `.env.local` などを追加
  - [x] 初回コミット

### 1.2 環境変数の設定
- [x] `.env.example` ファイルの作成
  ```
  ANTHROPIC_API_KEY=
  DATABASE_URL=
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  SESSION_EXPIRY=3600
  LOG_LEVEL=info
  ```
- [x] `.env.local` ファイルの作成（実際の値を設定）
- [x] 環境変数の型定義ファイル作成 `types/env.d.ts`

### 1.3 ディレクトリ構成の構築
- [x] 必要なディレクトリを作成
  ```
  mkdir -p components/chat components/common lib types __tests__/components __tests__/lib prisma
  ```
- [x] `README.md` の作成（プロジェクト説明、セットアップ手順）

---

## Phase 2: データベース設計と設定

### 2.1 Prismaのセットアップ
- [ ] Prisma初期化
  ```bash
  npx prisma init --datasource-provider mongodb
  ```
- [ ] `prisma/schema.prisma` の作成
  - [ ] Session モデルの定義
  - [ ] Message モデルの定義
  - [ ] リレーションの設定
- [ ] Prisma Clientの生成
  ```bash
  npx prisma generate
  ```

### 2.2 データベース接続の実装
- [ ] `lib/prisma.ts` の作成（シングルトンパターン）
- [ ] 環境変数からのDATABASE_URL読み込み
- [ ] 接続テストの実装

### 2.3 データベーステスト
- [ ] MongoDB接続確認
- [ ] マイグレーション実行（MongoDBの場合は `prisma db push`）
- [ ] Prisma Studioでスキーマ確認
  ```bash
  npx prisma studio
  ```

---

## Phase 3: バックエンドAPI開発

### 3.1 共通ユーティリティの実装
- [ ] `lib/logger.ts` の作成（pinoを使った構造化ロギング）
- [ ] `lib/utils.ts` の作成（汎用的なヘルパー関数）
- [ ] `lib/claude.ts` の作成（Claude APIクライアント）
  - [ ] ストリーミングレスポンスの実装
  - [ ] エラーハンドリング
  - [ ] リトライロジック

### 3.2 型定義の作成
- [ ] `types/chat.ts` の作成
  - [ ] Message型
  - [ ] Session型
  - [ ] ChatRequest型
  - [ ] ChatResponse型
- [ ] `types/api.ts` の作成
  - [ ] ErrorResponse型
  - [ ] SuccessResponse型

### 3.3 チャットAPIの実装
- [ ] `app/api/chat/route.ts` の作成
  - [ ] POSTメソッドの実装（チャットメッセージ送信）
    - [ ] リクエストバリデーション
    - [ ] セッション取得/作成
    - [ ] メッセージのDB保存
    - [ ] Claude APIへのリクエスト
    - [ ] ストリーミングレスポンスの返却
  - [ ] エラーハンドリング
  - [ ] ロギング

### 3.4 会話履歴取得APIの実装
- [ ] `app/api/chat/history/route.ts` の作成
  - [ ] GETメソッドの実装
    - [ ] sessionIdのクエリパラメータ取得
    - [ ] セッションの会話履歴取得
    - [ ] JSON形式でレスポンス
  - [ ] エラーハンドリング

### 3.5 セッション管理機能
- [ ] セッション有効期限チェック機能の実装
- [ ] 期限切れセッションの自動削除（Cron Jobまたは定期タスク）
- [ ] セッションID生成ユーティリティ

---

## Phase 4: フロントエンド開発

### 4.1 レイアウトとページの作成
- [ ] `app/layout.tsx` の実装
  - [ ] メタデータの設定
  - [ ] グローバルスタイルの適用
  - [ ] Error Boundaryの配置
- [ ] `app/page.tsx` の実装（チャット画面）
  - [ ] 基本レイアウト
  - [ ] ChatContainerの配置
- [ ] `app/error.tsx` の実装（エラー画面）

### 4.2 共通コンポーネントの作成
- [ ] `components/common/ErrorBoundary.tsx`
  - [ ] React Error Boundaryの実装
  - [ ] エラー表示UI
  - [ ] リトライボタン
- [ ] `components/common/Loading.tsx`
  - [ ] ローディングスピナー
  - [ ] スケルトンUI

### 4.3 チャット関連コンポーネントの作成
- [ ] `components/chat/ChatContainer.tsx`
  - [ ] 会話履歴の状態管理
  - [ ] セッションIDの管理
  - [ ] メッセージ送信ロジック
  - [ ] ストリーミングレスポンスの処理
- [ ] `components/chat/ChatMessage.tsx`
  - [ ] メッセージ表示（ユーザー/AI）
  - [ ] Markdownレンダリング
  - [ ] タイムスタンプ表示
- [ ] `components/chat/ChatInput.tsx`
  - [ ] テキスト入力フォーム
  - [ ] 送信ボタン
  - [ ] エンターキーで送信
  - [ ] 入力中のバリデーション
- [ ] `components/chat/StreamingText.tsx`
  - [ ] ストリーミングテキストのアニメーション表示
  - [ ] カーソル点滅エフェクト

### 4.4 スタイリング
- [ ] TailwindCSSの設定調整
- [ ] カラーパレットの定義（ビジネスライク）
- [ ] レスポンシブデザインの実装
- [ ] ダークモード対応（オプション）

### 4.5 クライアント側のユーティリティ
- [ ] セッションID管理（sessionStorageまたはuuid生成）
- [ ] APIクライアント関数の作成
- [ ] エラーハンドリングヘルパー

---

## Phase 5: テスト実装

### 5.1 バックエンドテスト
- [ ] `__tests__/lib/claude.test.ts`
  - [ ] Claude APIクライアントのテスト
  - [ ] ストリーミング処理のテスト
  - [ ] エラーハンドリングのテスト
- [ ] `__tests__/lib/logger.test.ts`
  - [ ] ロギング機能のテスト
- [ ] `__tests__/lib/utils.test.ts`
  - [ ] ユーティリティ関数のテスト

### 5.2 APIエンドポイントテスト
- [ ] `__tests__/api/chat.test.ts`
  - [ ] POST /api/chat のテスト
  - [ ] リクエストバリデーションのテスト
  - [ ] エラーレスポンスのテスト
- [ ] `__tests__/api/chat-history.test.ts`
  - [ ] GET /api/chat/history のテスト

### 5.3 フロントエンドテスト
- [ ] `__tests__/components/ChatMessage.test.tsx`
  - [ ] メッセージ表示のテスト
  - [ ] Markdownレンダリングのテスト
- [ ] `__tests__/components/ChatInput.test.tsx`
  - [ ] 入力フォームのテスト
  - [ ] 送信機能のテスト

### 5.4 テスト設定
- [ ] Jest/Vitestの設定ファイル作成
- [ ] テストカバレッジの設定（目標70%）
- [ ] CI/CDパイプラインでのテスト自動実行設定

---

## Phase 6: デプロイ準備

### 6.1 Dockerfileの作成
- [ ] `Dockerfile` の作成
  - [ ] Multi-stage buildの実装
  - [ ] 本番用最適化
- [ ] `.dockerignore` の作成

### 6.2 Cloud Run設定
- [ ] `cloudbuild.yaml` の作成（オプション）
- [ ] Cloud Run設定の準備
  - [ ] 環境変数の設定
  - [ ] Secret Managerの設定（API キー）
  - [ ] スケーリング設定
- [ ] Cloud Logging統合

### 6.3 MongoDB設定
- [ ] MongoDB Atlas（またはCloud MongoDB）のセットアップ
- [ ] データベース接続文字列の取得
- [ ] ネットワーク設定（IPホワイトリスト）

### 6.4 CI/CDパイプライン
- [ ] `.github/workflows/test.yml` の作成
  - [ ] プッシュ時の自動テスト
  - [ ] リンターチェック
- [ ] `.github/workflows/deploy.yml` の作成
  - [ ] mainブランチマージ時の自動デプロイ
  - [ ] Cloud Runへのデプロイ

---

## Phase 7: 最終調整とリリース

### 7.1 パフォーマンス最適化
- [ ] バンドルサイズの分析
  ```bash
  npm run build
  npx @next/bundle-analyzer
  ```
- [ ] 不要な依存関係の削除
- [ ] コード分割の最適化
- [ ] 画像最適化（必要に応じて）

### 7.2 セキュリティチェック
- [ ] 依存関係の脆弱性スキャン
  ```bash
  npm audit
  ```
- [ ] APIキーの漏洩チェック
- [ ] XSS/CSRF対策の確認
- [ ] HTTPS強制の設定

### 7.3 ドキュメント整備
- [ ] README.mdの完成
  - [ ] セットアップ手順
  - [ ] 環境変数の説明
  - [ ] デプロイ手順
- [ ] API仕様書の作成（オプション）
- [ ] トラブルシューティングガイド

### 7.4 本番環境テスト
- [ ] ステージング環境での動作確認
- [ ] 負荷テスト（必要に応じて）
- [ ] エラーログの監視設定
- [ ] アラート設定

### 7.5 リリース
- [ ] バージョンタグの作成（v1.0.0）
- [ ] リリースノートの作成
- [ ] 本番環境へのデプロイ
- [ ] 動作確認

---

## Phase 8: 運用と改善（リリース後）

### 8.1 モニタリング
- [ ] Cloud Loggingの監視ダッシュボード作成
- [ ] エラーレートの監視
- [ ] レスポンスタイムの監視
- [ ] コスト監視

### 8.2 継続的改善
- [ ] ユーザーフィードバックの収集
- [ ] パフォーマンス改善
- [ ] バグ修正
- [ ] 新機能の追加検討

---

## マイルストーン

| Phase | 目標期間 | 完了条件 |
|-------|---------|---------|
| Phase 1 | 1日 | プロジェクトセットアップ完了、環境変数設定済み |
| Phase 2 | 1日 | データベース接続確認、スキーマ定義完了 |
| Phase 3 | 2-3日 | APIエンドポイント実装完了、手動テスト成功 |
| Phase 4 | 3-4日 | フロントエンド実装完了、ローカルで動作確認 |
| Phase 5 | 2日 | テスト実装完了、カバレッジ70%以上 |
| Phase 6 | 1-2日 | デプロイ設定完了、ステージング環境稼働 |
| Phase 7 | 1日 | 本番リリース完了 |

**総見積もり**: 約2週間（1人での開発を想定）

---

## 注意事項

### 開発時のチェックリスト
各Phaseの完了時に以下を確認：
- [ ] コードが仕様書（CLAUDE.md）に準拠しているか
- [ ] テストが書かれているか（テストなしコードは禁止）
- [ ] エラーハンドリングが適切か
- [ ] ロギングが実装されているか
- [ ] セキュリティ上の問題がないか
- [ ] パフォーマンスに問題がないか

### よくあるトラブルと対処法
- **MongoDB接続エラー**: DATABASE_URLの形式を確認（`mongodb+srv://...`）
- **Claude APIエラー**: APIキーの有効性確認、レート制限チェック
- **ストリーミングが動かない**: Content-Typeヘッダーが正しいか確認
- **Next.js App Router**: Server ComponentとClient Componentの区別を明確に

---

## 参考コマンド集

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番環境で起動
npm start

# テスト実行
npm test

# テストカバレッジ
npm run test:coverage

# Prisma操作
npx prisma studio          # データベースGUI
npx prisma generate        # Clientの再生成
npx prisma db push         # スキーマをDBに反映

# Docker操作
docker build -t ai-chat .
docker run -p 3000:3000 ai-chat

# Cloud Run デプロイ（手動）
gcloud run deploy ai-chat \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

---

**作成者**: Claude Code
**バージョン**: 1.0.0
**最終更新**: 2026-01-04
