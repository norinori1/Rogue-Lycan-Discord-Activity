# Deployment Specifications

このドキュメントは、Rogue Lycan Discord Activity のサーバーサイド（バックエンド）およびクライアントサイド（フロントエンド）のデプロイ構成と仕様をまとめたものです。

---

## Server Side (Backend)

| 項目 | 内容 |
|------|------|
| **Framework** | Node.js, Express, Socket.IO |
| **Hosting Service** | [Render](https://render.com) (Web Service) |
| **Deployment Method** | Render Blueprint (`render.yaml`) |
| **Root Directory** | `server` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### 重要な設定事項

- `server/tsconfig.json` には以下の設定が必要です：
  - `"outDir": "./dist"` — コンパイル済みJSファイルの出力先を指定
  - `"noEmit"` は **`tsconfig.json` から削除するか `false` に設定してください** — `true` のままにするとビルド時にJSファイルが生成されず、`npm start` で `MODULE_NOT_FOUND` エラーになります

- サーバーが提供するAPIエンドポイント：
  - `GET /api/health` — ヘルスチェック用。`{"status": "ok"}` を返します
  - `POST /api/token` — Discord OAuthトークン交換用

- WebSocket接続（Socket.IO）もこのサーバーが処理します

- ルートURL（`/`）はHTMLを返さないため、ブラウザで直接アクセスすると `Cannot GET /` と表示されますが、**これは正常な動作です**

### 環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_DISCORD_CLIENT_ID` | Discord Developer Portal で取得したクライアントID（サーバーコード内で `process.env.VITE_DISCORD_CLIENT_ID` として参照されるため、`VITE_` プレフィックスをそのまま使用します） |
| `DISCORD_CLIENT_SECRET` | Discord Developer Portal で取得したクライアントシークレット |
| `CLIENT_URL` | フロントエンドのURL（CORSを許可するため）例: `https://<ユーザー名>.github.io` |
| `PORT` | サーバーが使用するポート番号（Renderが自動設定） |

---

## Client Side (Frontend)

| 項目 | 内容 |
|------|------|
| **Framework** | React, Vite |
| **Hosting Service** | [GitHub Pages](https://pages.github.com) |
| **Deployment Method** | GitHub Actions (`.github/workflows/deploy-client.yml`) |
| **Root Directory** | `client` |

### 重要な設定事項

- `client/vite.config.ts` の `base` プロパティにリポジトリ名を設定する必要があります：
  ```ts
  base: '/Rogue-Lycan-Discord-Activity/',
  ```
  これを設定しないと、GitHub Pages上でアセット（JS/CSSファイル等）のパスが正しく解決されません

- GitHubリポジトリの **Settings > Pages > Build and deployment > Source** を **`GitHub Actions`** に設定してください

### GitHub Actions ワークフロー概要

`main` ブランチへのプッシュ、または手動実行で以下の処理が行われます：

1. `client/` ディレクトリの依存関係をインストール (`npm ci`)
2. Vite でビルド (`npm run build`)
3. `client/dist` を GitHub Pages 用アーティファクトとしてアップロード
4. GitHub Pages にデプロイ

---

## System Architecture

```
Discord App (ユーザー)
      │
      │ Discord Activity として起動
      ▼
┌──────────────────────────────────┐
│     Client Side (GitHub Pages)   │
│  React + Vite                    │
│  https://<user>.github.io/       │
│  Rogue-Lycan-Discord-Activity/   │
└──────────┬───────────────────────┘
           │ HTTP API & Socket.IO (WebSocket)
           ▼
┌──────────────────────────────────┐
│     Server Side (Render)         │
│  Node.js + Express + Socket.IO   │
│  https://<service>.onrender.com  │
└──────────────────────────────────┘
```

1. Discord Activity が起動すると、クライアントサイド（GitHub Pages）を読み込みます
2. クライアントはサーバーサイド（Render）に対して HTTP API および Socket.IO でリアルタイム通信を行います
3. サーバーの CORS 設定（`CLIENT_URL` 環境変数）に、クライアントのURLを許可するよう設定してください

---

## デプロイ手順まとめ

### 初回セットアップ

1. **Render** のダッシュボードで Web Service を作成し、以下を設定します：
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - 環境変数に `VITE_DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `CLIENT_URL` を設定

2. **GitHub** リポジトリの Settings > Pages > Source を `GitHub Actions` に変更します

3. `main` ブランチにコードをプッシュすると、GitHub Actions が自動でフロントエンドをビルド・デプロイします

### 更新時

- `main` ブランチへのプッシュで、クライアントサイドは自動デプロイされます
- サーバーサイドは Render の Auto-Deploy 設定が有効であれば自動デプロイされます
