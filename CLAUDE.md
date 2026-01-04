# ai-chat プロジェクト仕様書

## プロジェクト概要

### 基本情報
- **プロジェクト名**: ai-chat
- **用途**: エンターテイメント向けAIチャットボット
- **AI API**: Anthropic Claude API
- **デプロイ先**: Google Cloud Run

### コンセプト
ビジネスライクなUI/UXを持つ、シンプルで使いやすいAIチャットアプリケーション。
基本的な対話機能に特化し、セッション単位で会話履歴を管理。

---

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14+ (App Router)
- **言語**: TypeScript
- **スタイリング**: TailwindCSS（推奨）またはCSS Modules
- **状態管理**: React Context API または Zustand（必要に応じて）

### バックエンド
- **API フレームワーク**: Hono（Next.js API Routes経由で実装）
- **ORM**: Prisma.js
- **データベース**: MongoDB
- **認証**: なし（匿名利用）

### その他
- **パッケージマネージャー**: npm または pnpm
- **Node.js バージョン**: 18.x 以上

---

## 主要機能

### 必須機能
1. **基本的な対話機能**
   - ユーザーがメッセージを入力してAIと対話
   - ストリーミングレスポンスでリアルタイム表示
   - Markdown形式のレスポンス対応

2. **会話履歴の管理**
   - セッション単位で会話履歴を保持
   - ブラウザを閉じると履歴は削除される
   - MongoDBに一時的にセッションデータを保存

### 将来的な拡張候補（初期実装不要）
- ユーザー認証機能
- ファイルアップロード機能
- 会話履歴のエクスポート機能
- マルチモーダル対応（画像解析など）

---

## ディレクトリ構成

```
ai-chat/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes（Hono統合）
│   │   └── chat/
│   │       └── route.ts   # チャットAPI
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # トップページ（チャット画面）
│   └── error.tsx          # エラーバウンダリ
├── components/            # Reactコンポーネント
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   └── StreamingText.tsx
│   └── common/
│       ├── ErrorBoundary.tsx
│       └── Loading.tsx
├── lib/                   # ユーティリティ・共通処理
│   ├── prisma.ts         # Prisma クライアント
│   ├── claude.ts         # Claude API クライアント
│   ├── logger.ts         # ロガー設定
│   └── utils.ts          # その他ユーティリティ
├── prisma/
│   └── schema.prisma     # Prismaスキーマ定義
├── types/                # TypeScript型定義
│   ├── chat.ts
│   └── api.ts
├── __tests__/            # テストファイル
│   ├── components/
│   └── lib/
├── public/               # 静的ファイル
├── .env.local            # 環境変数（ローカル）
├── .env.example          # 環境変数のサンプル
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## データモデル（Prisma Schema）

### Session
```prisma
model Session {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String   @unique
  messages  Message[]
  createdAt DateTime @default(now())
  expiresAt DateTime // セッション有効期限
}
```

### Message
```prisma
model Message {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String   @db.ObjectId
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String   // "user" or "assistant"
  content   String
  createdAt DateTime @default(now())
}
```

---

## API設計

### POST /api/chat
チャットメッセージを送信し、AIのレスポンスをストリーミングで返す

**リクエスト**
```typescript
{
  sessionId: string;
  message: string;
}
```

**レスポンス**
- Content-Type: `text/event-stream`
- Server-Sent Events形式でストリーミング

```typescript
// イベント例
data: {"type": "content", "text": "こんにちは"}
data: {"type": "content", "text": "！"}
data: {"type": "done"}
```

### GET /api/chat/history?sessionId={sessionId}
セッションの会話履歴を取得

**レスポンス**
```typescript
{
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
}
```

---

## 環境変数

### 必須
```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx

# MongoDB
DATABASE_URL=mongodb://...

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### オプション
```bash
# セッション有効期限（秒）デフォルト: 3600 (1時間)
SESSION_EXPIRY=3600

# ログレベル
LOG_LEVEL=info
```

---

## コーディング規約

### TypeScript
- **厳格な型定義**: `any` の使用は避け、適切な型を定義する
- **null/undefined**: `??` や `?.` を活用し、安全にアクセス
- **型推論**: 明示的な型注釈が必要な場合のみ記述

### React
- **関数コンポーネント**: クラスコンポーネントは使用しない
- **Hooks**: 適切にカスタムフックを作成して再利用性を高める
- **Props**: インターフェースで型定義し、デフォルト値を設定

### 命名規則
- **ファイル名**: PascalCase（コンポーネント）、camelCase（ユーティリティ）
- **コンポーネント**: PascalCase
- **関数・変数**: camelCase
- **定数**: UPPER_SNAKE_CASE
- **型・インターフェース**: PascalCase（`I` プレフィックスなし）

### コメント
- **複雑なロジック**: 必ずコメントで説明
- **公開関数**: JSDoc形式でドキュメント化
- **TODO/FIXME**: 残さず、Issue化するか即座に対応

---

## テスト方針

### 単体テスト（Jest/Vitest）
- **対象**: ユーティリティ関数、カスタムフック、APIハンドラー
- **カバレッジ**: 最低70%を目標
- **実装**: `__tests__/` ディレクトリに配置

### テスト原則（CLAUDE.md グローバル設定より）
- テストは必ず実際の機能を検証すること
- `expect(true).toBe(true)` のような意味のないアサーションは絶対に書かない
- 各テストケースは具体的な入力と期待される出力を検証すること
- モックは必要最小限に留め、実際の動作に近い形でテストすること
- ハードコーディングの禁止（詳細はグローバルCLAUDE.md参照）

### テストファイルの構成例
```typescript
// __tests__/lib/claude.test.ts
describe('Claude API Client', () => {
  it('should stream response correctly', async () => {
    // 具体的な入力と出力の検証
  });

  it('should handle API errors', async () => {
    // エラーケースの検証
  });
});
```

---

## エラーハンドリング

### フロントエンド
- **Error Boundary**: アプリ全体をラップし、予期しないエラーをキャッチ
- **エラー表示**: ユーザーフレンドリーなメッセージを表示
- **リトライ機能**: ネットワークエラー時は再試行ボタンを提供

### バックエンド
- **統一エラーレスポンス**:
  ```typescript
  {
    error: {
      code: string;
      message: string;
      details?: unknown;
    }
  }
  ```
- **ステータスコード**: 適切なHTTPステータスコードを返す
  - 400: バリデーションエラー
  - 401: 認証エラー（将来実装時）
  - 500: サーバーエラー

---

## ロギング

### 構造化ロギング
- **ライブラリ**: `winston` または `pino`
- **ログレベル**: `error`, `warn`, `info`, `debug`
- **フォーマット**: JSON形式

### ログ出力項目
```typescript
{
  timestamp: string;
  level: string;
  message: string;
  sessionId?: string;
  userId?: string;
  error?: {
    message: string;
    stack: string;
  };
}
```

### ログ管理
- **開発環境**: コンソール出力
- **本番環境**: Google Cloud Logging に転送

---

## デプロイ

### Google Cloud Run
- **コンテナイメージ**: Dockerfile でビルド
- **環境変数**: Cloud Run の設定で管理
- **スケーリング**: オートスケーリング設定
  - Min instances: 0
  - Max instances: 10（初期設定）
  - Concurrency: 80

### CI/CD（推奨）
- **GitHub Actions**:
  - プッシュ時に自動テスト
  - mainブランチマージ時に自動デプロイ

---

## セキュリティ

### API キー管理
- **絶対に禁止**: API キーをコードにハードコーディング
- **環境変数**: `.env.local` で管理（`.gitignore` に追加）
- **本番環境**: Cloud Run の Secret Manager を使用

### XSS対策
- **サニタイゼーション**: ユーザー入力を適切にエスケープ
- **Markdown**: `react-markdown` などの安全なライブラリを使用

### CSRF対策
- **Next.js**: App Router のデフォルト設定で対応済み

---

## パフォーマンス最適化

### フロントエンド
- **コード分割**: Dynamic Import を活用
- **画像最適化**: Next.js の `<Image>` コンポーネント使用
- **バンドルサイズ**: 定期的に分析し、不要な依存関係を削除

### バックエンド
- **データベース**: 適切なインデックスを設定
- **キャッシング**: 必要に応じてRedis導入を検討（将来）

---

## 開発フロー

### ブランチ戦略
- **main**: 本番環境用
- **develop**: 開発環境用
- **feature/xxx**: 機能開発用

### コミットメッセージ
```
<type>: <subject>

<body>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: コードフォーマット
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド・設定変更

---

## 参考リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Hono Documentation](https://hono.dev/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)

---

## 注意事項

### 開発時の心得
1. **シンプルさを保つ**: 過度な抽象化は避け、必要な機能のみ実装
2. **ユーザー体験優先**: 技術的な凝った実装よりも、使いやすさを重視
3. **ドキュメント**: コードだけでなく、README やコメントも充実させる
4. **継続的改善**: 定期的にコードレビューとリファクタリングを実施

### やってはいけないこと
- API キーのハードコーディング
- テストなしでの本番デプロイ
- グローバル状態の乱用
- エラーハンドリングの省略
- ログの出力なし

---

**最終更新**: 2026-01-04
