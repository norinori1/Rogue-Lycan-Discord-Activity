# ROGUE-LYCAN — Discord Activity

「人狼」×「ローグライク」を組み合わせた非対称対戦カードゲーム。
Discord のボイスチャンネルから直接起動できる Embedded App (Activity) として動作します。

## ゲーム概要

- **プレイ人数**: 4〜6人
- **陣営**: 市民 / 人狼
- **勝利条件**:
  - 市民: 全ての人狼を追放する
  - 人狼: 市民と同数以上になる

### 基本ルール

1. ゲーム開始時、全プレイヤーに陣営がランダムに割り当てられる（人狼はプレイヤー数÷3人）
2. 各プレイヤーは HP:2 でスタート
3. 毎ターン以下のフェーズが進行する:

| フェーズ | 内容 | 制限時間 |
|---|---|---|
| 夜・構築 | 3択からカードを1枚選んで手札に追加 | 60秒 |
| 夜・行動 | 手札のカードを1枚使用（またはスキップ） | 60秒 |
| 朝・報告 | 夜の結果（死亡・護衛等）を表示 | 10秒 |
| 昼・議論 | ボイスチャットで話し合い | 90秒 |
| 昼・投票 | 追放するプレイヤーに投票 | 30秒 |

### カード一覧（MVP）

| カード | 属性 | 効果 |
|---|---|---|
| 殺害 | 攻撃 | 対象のHPを1減らす |
| 騎士 | 防御 | 対象をその夜の殺害から保護 |
| 医者 | 回復 | 対象のHPを1回復（上限突破可、2日間） |
| 占い | 調査 | 対象の陣営を判別 |
| 上級国民 | 政治 | 翌昼の自分の投票権+1 |
| 選挙干渉 | 政治 | 対象の翌昼の投票権を無効化 |
| 譲渡 | 流通 | 自分の手札1枚を他プレイヤーへ渡す |
| 偽札 | 妨害 | 譲渡に見せかけて相手のカードを無効化 |
| 強欲な壺 | 流通 | ランダムにカード2枚を手札に追加 |

## 技術スタック

- **クライアント**: Vite + React 18 + TypeScript + Tailwind CSS + Zustand
- **サーバー**: Node.js + Express + Socket.IO
- **Discord連携**: @discord/embedded-app-sdk

## ディレクトリ構成

```
rogue-lycan/
├── client/              # Vite + React フロントエンド
│   ├── src/
│   │   ├── discord/     # Discord SDK / Socket.IO ラッパー
│   │   ├── components/  # UIコンポーネント
│   │   ├── stores/      # Zustand store
│   │   └── main.tsx
│   └── vite.config.ts
├── server/              # Node.js バックエンド
│   ├── src/
│   │   ├── game/        # ゲームロジック（権威サーバー）
│   │   ├── socket/      # Socket.IO イベントハンドラ
│   │   └── index.ts
│   └── package.json
├── shared/              # クライアント/サーバー共通型定義
│   └── types.ts
└── .env.example
```

## セットアップ方法

### 前提条件

- Node.js 20 以上
- npm
- Discord Developer Portal でアプリを作成済み

### 1. Discord Developer Portal の設定

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. **OAuth2** 設定:
   - Scopes: `identify`, `guilds`
   - Redirect URI: `https://<your-domain>/.proxy/api/token`
3. **Activities** を有効化:
   - URL Mappings:
     - `/` → `https://<frontend-domain>`
     - `/api` → `https://<backend-domain>/api`
     - `/socket.io` → `https://<backend-domain>/socket.io`

cmd でngrok http 3001 を実行してローカルサーバーを公開し、ngrok の URL を Discord の URL Mappings に設定してください。


### 2. 環境変数の設定

```bash

```

`.env` を編集して Discord の Client ID と Client Secret を設定:

```
VITE_DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
PORT=3001
CLIENT_URL=http://localhost:5173
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. 依存関係のインストール

```bash
# サーバー
cd server
npm install

# クライアント
cd ../client
npm install
```

### 4. 開発サーバーの起動

ターミナルを2つ開きます:

```bash
# ターミナル1: サーバー起動
cd server
npm run dev

# ターミナル2: クライアント起動
cd client
npm run dev
```

クライアントは http://localhost:5173 で起動します。
開発モードでは Discord SDK なしで動作し、`?room=test-room` のクエリパラメータでルームを指定できます。
異なる `room` を指定した複数タブを同時に開くことで、複数ルームを同時並行で遊べます。
`?room` を指定しない場合は、アプリ起動時に「ルーム選択UI」が表示され、ルーム作成 / 既存ルーム参加を選べます。

### 5. 本番ビルド

```bash
# クライアントのビルド
cd client
npm run build

# サーバーのビルド
cd ../server
npm run build
npm start
```

## アーキテクチャ

- ゲーム状態はサーバーが権威（チート防止・整合性保証）
- クライアントは自分の手札のみ完全に受信（他プレイヤーの手札は枚数のみ）
- Socket.IO によるリアルタイム通信
- 各フェーズにタイマーがあり、タイムアウト時は自動処理

## GA4（Google Analytics 4）設定

1. Google Analytics で Web データストリームを作成し、測定 ID（`G-...`）を取得
2. 環境変数 `VITE_GA_MEASUREMENT_ID` に測定 ID を設定してクライアントをデプロイ
3. デプロイ後にサイトへアクセスし、GA4 管理画面の「リアルタイム」レポートで `page_view` が届くことを確認

`VITE_GA_MEASUREMENT_ID` が未設定の場合、GA4 は読み込まれません。
