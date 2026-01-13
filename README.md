# AI Chat

エンターテイメント向けAIチャットボットアプリケーション

## 概要

ai-chatは、Anthropic Claude APIを使用したシンプルで使いやすいAIチャットアプリケーションです。
Next.js 14のApp Routerを使用し、モダンなWebアプリケーションとして構築されています。

## 主な機能

- ✨ Claude APIを使用したAIとの対話
- 💬 ストリーミングレスポンスでリアルタイム表示
- 📝 Markdown形式のレスポンス対応
- 🗄️ MongoDBを使用したセッション単位の会話履歴管理
- 💾 **MongoDBなしでも動作**（インメモリストレージに自動フォールバック）
- 🎨 ビジネスライクなUI/UX

## 技術スタック

### フロントエンド
- **Next.js 14+** (App Router)
- **React 18**
- **TypeScript**
- **TailwindCSS**

### バックエンド
- **Hono** (API フレームワーク)
- **Prisma** (ORM)
- **MongoDB** (データベース)
- **Anthropic Claude API**

### その他
- **Pino** (構造化ロギング)
- **Jest** (テスト)

## セットアップ

### 前提条件

- Node.js 18.x 以上
- Anthropic API キー
- MongoDB (オプション - なくてもインメモリストレージで動作します)

### インストール

1. リポジトリのクローン
```bash
git clone <repository-url>
cd ai-chat
```

2. 依存関係のインストール
```bash
npm install
```

3. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Anthropic Claude API (必須)
ANTHROPIC_API_KEY=your-api-key-here

# Database (オプション - 設定しない場合はインメモリストレージを使用)
DATABASE_URL=mongodb://localhost:27017/ai-chat

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Session Configuration (in seconds)
SESSION_EXPIRY=3600

# Logging
LOG_LEVEL=info
```

**注意**: `DATABASE_URL`を設定しない、またはMongoDBに接続できない場合、アプリケーションは自動的にインメモリストレージにフォールバックします。この場合、サーバー再起動時にデータは失われます。

`.env.example` をコピーして使用することもできます：
```bash
cp .env.example .env.local
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 利用可能なスクリプト

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start

# リンターチェック
npm run lint

# テスト実行
npm test

# テストウォッチモード
npm run test:watch

# テストカバレッジ
npm run test:coverage
```

## Prisma操作

```bash
# Prisma Studio起動（データベースGUI）
npx prisma studio

# Prisma Client再生成
npx prisma generate

# スキーマをDBに反映（MongoDB）
npx prisma db push
```

## プロジェクト構造

```
ai-chat/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # トップページ
├── components/            # Reactコンポーネント
│   ├── chat/             # チャット関連コンポーネント
│   └── common/           # 共通コンポーネント
├── lib/                   # ユーティリティ・共通処理
├── prisma/               # Prismaスキーマ
├── types/                # TypeScript型定義
├── __tests__/            # テストファイル
├── CLAUDE.md             # プロジェクト仕様書
└── TODO.md               # 開発計画
```

## 開発ガイドライン

詳細な開発ガイドラインは [CLAUDE.md](./CLAUDE.md) を参照してください。

### コーディング規約

- TypeScriptの厳格な型定義を使用
- `any`の使用は避ける
- 関数コンポーネントを使用（クラスコンポーネントは禁止）
- ESLint + Prettierでコードフォーマット

### テスト

- すべての新機能にはテストを追加
- 目標カバレッジ: 70%以上
- 意味のないアサーション（`expect(true).toBe(true)`など）は禁止

## デプロイ

このアプリケーションはGoogle Cloud Runへのデプロイを想定しています。

詳細なデプロイ手順は [TODO.md](./TODO.md) の Phase 6 を参照してください。

## トラブルシューティング

### MongoDB接続エラー
アプリケーションはMongoDBに接続できない場合、自動的にインメモリストレージを使用します。

コンソールに以下のメッセージが表示されます：
```
[Storage] MongoDB not available, using in-memory storage
[Storage] Note: Data will be lost when server restarts
```

**MongoDBを使用したい場合:**
- `DATABASE_URL`の形式が正しいか確認（`mongodb://...` または `mongodb+srv://...`）
- MongoDBサーバーが起動しているか確認
- ネットワーク接続を確認

**インメモリストレージで問題ない場合:**
- そのまま開発を継続できます
- データはサーバー再起動時に失われることに注意してください

### Claude APIエラー
- `ANTHROPIC_API_KEY`が正しく設定されているか確認
- APIキーの有効性を確認
- レート制限に達していないか確認

### Next.js関連
- Server ComponentとClient Componentの区別を明確に
- `'use client'`ディレクティブを適切に使用

## ライセンス

Private

## 作成者

Built with [Claude Code](https://claude.com/claude-code)
