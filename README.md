# BugSniper

Bug Sniper は、60秒間でソースコード中の不具合を見つける、コードレビューゲームです。

## 🚀 デプロイ設定

このプロジェクトは Cloudflare Workers にデプロイされます。

### GitHub Secrets の設定

GitHub Actions による自動デプロイを有効にするには、以下の Secrets を設定してください：

1. GitHubリポジトリの `Settings` > `Secrets and variables` > `Actions` に移動
2. 以下の Secrets を追加：

   - `CF_API_TOKEN`: Cloudflare API Token
   - `CF_ACCOUNT_ID`: Cloudflare Account ID

#### Cloudflare API Token の取得方法

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. `My Profile` > `API Tokens` に移動
3. `Create Token` をクリック
4. `Edit Cloudflare Workers` テンプレートを使用
5. 必要な権限を設定：
   - Account Resources: `Workers Scripts:Edit`
   - Zone Resources: 必要に応じて設定
6. `Continue to summary` > `Create Token` をクリック
7. 生成されたトークンをコピーして `CF_API_TOKEN` として保存

#### Cloudflare Account ID の取得方法

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. `Workers & Pages` に移動
3. 右サイドバーに表示される `Account ID` をコピー
4. `CF_ACCOUNT_ID` として保存

### Cloudflare リソースの作成（今後必要になります）

プロジェクトが進行すると、以下のリソースが必要になります：

#### D1 Database の作成
```bash
wrangler d1 create bug-sniper-db
```

作成後、`wrangler.jsonc` の D1 設定のコメントを外して、`database_id` を設定してください。

#### KV Namespace の作成
```bash
wrangler kv:namespace create "BUG_SNIPER_CACHE"
```

作成後、`wrangler.jsonc` の KV 設定のコメントを外して、namespace ID を設定してください。

#### R2 Bucket の作成
```bash
wrangler r2 bucket create bug-sniper-assets
```

作成後、`wrangler.jsonc` の R2 設定のコメントを外してください。

## 📦 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# デプロイ
npm run deploy
```

## 🔄 CI/CD

`main` ブランチへの push 時に、GitHub Actions が自動的に Cloudflare Workers へデプロイします。

ワークフローファイル: `.github/workflows/deploy.yml`
