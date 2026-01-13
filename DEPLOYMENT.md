# ai-chat デプロイ手順書

このドキュメントは、ai-chat アプリケーションを Google Cloud Run にデプロイする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [Google Cloud の初期設定](#google-cloud-の初期設定)
3. [Secret Manager の設定](#secret-manager-の設定)
4. [手動デプロイ](#手動デプロイ)
5. [CI/CD による自動デプロイ](#cicd-による自動デプロイ)
6. [デプロイ後の確認](#デプロイ後の確認)
7. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なツール
- Google Cloud SDK (`gcloud` CLI) インストール済み
- Docker インストール済み
- Node.js 18.x 以上
- Git

### 必要な情報
- Google Cloud プロジェクト ID
- Anthropic API キー
- MongoDB Atlas 接続文字列

---

## Google Cloud の初期設定

### 1. Google Cloud プロジェクトの作成

```bash
# 新しいプロジェクトを作成
gcloud projects create YOUR_PROJECT_ID --name="ai-chat"

# プロジェクトを設定
gcloud config set project YOUR_PROJECT_ID
```

### 2. 必要な API の有効化

```bash
# Cloud Run API
gcloud services enable run.googleapis.com

# Container Registry API
gcloud services enable containerregistry.googleapis.com

# Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Secret Manager API
gcloud services enable secretmanager.googleapis.com
```

### 3. 課金の有効化

Google Cloud Console で課金アカウントをプロジェクトにリンクしてください。

---

## Secret Manager の設定

### 1. Anthropic API キーの保存

```bash
# シークレットを作成
echo -n "YOUR_ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Cloud Run サービスアカウントにアクセス権限を付与
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. MongoDB 接続文字列の保存

```bash
# シークレットを作成
echo -n "mongodb+srv://dbUser:dbUsetPass@my-ai-chat.jfmo47t.mongodb.net/ai-chat?appName=my-ai-chat" | \
  gcloud secrets create mongodb-connection-string \
  --data-file=- \
  --replication-policy="automatic"

# Cloud Run サービスアカウントにアクセス権限を付与
gcloud secrets add-iam-policy-binding mongodb-connection-string \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**注意**: プロジェクト番号は以下のコマンドで確認できます:
```bash
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
```

### 3. シークレットの確認

```bash
# シークレット一覧を表示
gcloud secrets list

# シークレットの詳細を表示
gcloud secrets describe anthropic-api-key
gcloud secrets describe mongodb-connection-string
```

---

## 手動デプロイ

### 方法1: ソースベースデプロイ（推奨）

```bash
# プロジェクトルートで実行
gcloud run deploy ai-chat \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 60s \
  --set-env-vars NODE_ENV=production,SESSION_EXPIRY=3600,LOG_LEVEL=info \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest,DATABASE_URL=mongodb-connection-string:latest
```

### 方法2: Dockerfile を使用したデプロイ

```bash
# 1. Docker イメージをビルド
docker build -t gcr.io/YOUR_PROJECT_ID/ai-chat:latest .

# 2. Container Registry に push
docker push gcr.io/YOUR_PROJECT_ID/ai-chat:latest

# 3. Cloud Run にデプロイ
gcloud run deploy ai-chat \
  --image gcr.io/YOUR_PROJECT_ID/ai-chat:latest \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 60s \
  --set-env-vars NODE_ENV=production,SESSION_EXPIRY=3600,LOG_LEVEL=info \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest,DATABASE_URL=mongodb-connection-string:latest
```

### 方法3: Makefile を使用

```bash
# プロジェクトルートで実行
make deploy PROJECT_ID=YOUR_PROJECT_ID
```

---

## CI/CD による自動デプロイ

### GitHub Actions のセットアップ

#### 1. Workload Identity Federation の設定

```bash
# Workload Identity Pool の作成
gcloud iam workload-identity-pools create "github-pool" \
  --project="YOUR_PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Workload Identity Provider の作成
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="YOUR_PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# サービスアカウントの作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# サービスアカウントに権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Workload Identity の紐付け
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --project="YOUR_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_GITHUB_USERNAME/ai-chat"
```

#### 2. GitHub Secrets の設定

GitHub リポジトリの Settings → Secrets and variables → Actions で以下を追加:

- `GCP_PROJECT_ID`: Google Cloud プロジェクト ID
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: `projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider`
- `GCP_SERVICE_ACCOUNT`: `github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com`

#### 3. 自動デプロイのトリガー

main ブランチに push すると、自動的にデプロイが実行されます:

```bash
git add .
git commit -m "feat: ready for deployment"
git push origin main
```

---

## デプロイ後の確認

### 1. サービスの URL を取得

```bash
gcloud run services describe ai-chat \
  --region asia-northeast1 \
  --format 'value(status.url)'
```

### 2. 動作確認

```bash
# ヘルスチェック
curl https://YOUR_SERVICE_URL

# API テスト
curl -X POST https://YOUR_SERVICE_URL/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-session","message":"Hello"}'
```

### 3. ログの確認

```bash
# リアルタイムログ
gcloud run services logs tail ai-chat --region asia-northeast1

# 最近のログ
gcloud run services logs read ai-chat --region asia-northeast1 --limit 50
```

### 4. Cloud Console での確認

https://console.cloud.google.com/run にアクセスして、サービスの状態を確認:
- CPU 使用率
- メモリ使用量
- リクエスト数
- エラー率

---

## トラブルシューティング

### デプロイが失敗する

#### ビルドエラー
```bash
# ローカルでビルドテスト
npm run build

# Docker イメージのビルドテスト
docker build -t test-image .
docker run -p 3000:3000 test-image
```

#### 権限エラー
```bash
# サービスアカウントの権限を確認
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

### アプリケーションが起動しない

#### ログを確認
```bash
gcloud run services logs tail ai-chat --region asia-northeast1
```

#### 環境変数を確認
```bash
gcloud run services describe ai-chat --region asia-northeast1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

#### シークレットを確認
```bash
gcloud run services describe ai-chat --region asia-northeast1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

### MongoDB 接続エラー

#### 接続文字列を確認
```bash
# Secret Manager から値を取得（注意：本番環境では慎重に扱う）
gcloud secrets versions access latest --secret="mongodb-connection-string"
```

#### MongoDB Atlas の IP ホワイトリストを確認
- Cloud Run からのアクセスを許可するため、`0.0.0.0/0` を追加
- または Cloud Run の Egress IP を個別に追加

### パフォーマンス問題

#### リソースを増やす
```bash
gcloud run services update ai-chat \
  --region asia-northeast1 \
  --memory 1Gi \
  --cpu 2
```

#### 最小インスタンス数を設定
```bash
gcloud run services update ai-chat \
  --region asia-northeast1 \
  --min-instances 1
```

---

## リソースのクリーンアップ

### サービスの削除
```bash
gcloud run services delete ai-chat --region asia-northeast1
```

### コンテナイメージの削除
```bash
gcloud container images delete gcr.io/YOUR_PROJECT_ID/ai-chat --quiet
```

### シークレットの削除
```bash
gcloud secrets delete anthropic-api-key
gcloud secrets delete mongodb-connection-string
```

---

## 参考リンク

- [Cloud Run ドキュメント](https://cloud.google.com/run/docs)
- [Secret Manager ドキュメント](https://cloud.google.com/secret-manager/docs)
- [GitHub Actions と Google Cloud](https://github.com/google-github-actions)
- [Next.js デプロイガイド](https://nextjs.org/docs/deployment)

---

**最終更新**: 2026-01-13
**作成者**: Claude Code
