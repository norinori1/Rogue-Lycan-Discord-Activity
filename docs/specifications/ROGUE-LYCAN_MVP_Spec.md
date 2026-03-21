# ROGUE-LYCAN — Discord Activity MVP 仕様書

**バージョン**: 0.1.0-prototype  
**対象プラットフォーム**: Discord Embedded App (Activity)  
**ドキュメント種別**: プロトタイプ仕様書  

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [MVPスコープ](#2-mvpスコープ)
3. [技術スタック](#3-技術スタック)
4. [アーキテクチャ概要](#4-アーキテクチャ概要)
5. [Discord Activity セットアップ](#5-discord-activity-セットアップ)
6. [MVPカードセット](#6-mvpカードセット)
7. [ゲームフロー実装仕様](#7-ゲームフロー実装仕様)
8. [サーバーサイド仕様](#8-サーバーサイド仕様)
9. [クライアントサイド仕様](#9-クライアントサイド仕様)
10. [UI画面設計](#10-ui画面設計)
11. [開発フェーズとロードマップ](#11-開発フェーズとロードマップ)
12. [MVP除外項目](#12-mvp除外項目)

---

## 1. プロジェクト概要

### ゲームコンセプト（再掲）

「人狼」×「ローグライク」を組み合わせた非対称対戦ゲーム。
- ゲーム開始時は全員能力なし
- 毎夜3択でカード（能力）を獲得
- スタック（手札）に蓄積し、任意のタイミングで発動
- HP 管理とカード戦略の組み合わせで陣営勝利を目指す

### Discord Activity として作る理由

| メリット | 説明 |
|---|---|
| ゼロインストール | Discord のボイスチャンネルからすぐ起動できる |
| 参加者管理が楽 | `discordSdk.getParticipants()` でチャンネル参加者を自動取得 |
| 情報秘匿が自然 | プレイヤーごとの iFrame で手札を非公開にしやすい |
| プロトタイプ向き | Vite+React の Web 技術でそのまま動く |

---

## 2. MVPスコープ

### ✅ MVP に含めるもの

| カテゴリ | 内容 |
|---|---|
| プレイヤー数 | 4〜6人固定 |
| 陣営 | 市民 / 人狼 の2陣営のみ |
| カード | N レアリティのみ（UR は除外） |
| ゲームフェーズ | 夜フェーズ（構築 + 行動）→ 朝フェーズ（判定）→ 昼フェーズ（投票）|
| 勝利条件 | 市民：全人狼追放 / 人狼：市民と同数以上になる |
| 通知 | ログ表示（全体通知 + 個人通知）|
| ターン制限 | 各フェーズにタイマーあり（夜:60秒、昼:90秒）|

### ❌ MVP に含めないもの（後フェーズ）

- UR カード（反転、JOKER、正義の鉄槌、皇帝、独裁者）
- カード出現重み調整カード（狂暴化、市民化、ピエロ）
- 皇帝の「道連れ」効果
- スペシャルカード（パン屋、偽証、捜査）
- 観戦者モード
- ゲーム履歴の保存
- DiscordSDK の Rich Presence 連携

---

## 3. 技術スタック

### フロントエンド（クライアント）

```
Vite + React 18 (TypeScript)
@discord/embedded-app-sdk   # Discord Activity 連携
Zustand                     # クライアント状態管理
Socket.IO Client            # リアルタイム通信
Tailwind CSS                # スタイリング（シンプルに保つ）
```

### バックエンド（サーバー）

```
Node.js 20 + TypeScript
Express                     # HTTP (OAuth token エンドポイント)
Socket.IO Server            # リアルタイム通信
                            # ゲーム状態はメモリで管理（DB不要）
```

### ホスティング（プロトタイプ用）

```
フロントエンド : Cloudflare Pages (無料枠)
バックエンド   : Railway / Render (無料枠)
```

### ディレクトリ構成

```
rogue-lycan/
├── client/                   # Vite + React フロントエンド
│   ├── src/
│   │   ├── discord/          # Discord SDK ラッパー
│   │   ├── game/             # ゲームロジック（表示用）
│   │   ├── components/       # UIコンポーネント
│   │   ├── stores/           # Zustand store
│   │   └── main.tsx
│   └── vite.config.ts
├── server/                   # Node.js バックエンド
│   ├── src/
│   │   ├── game/             # ゲームロジック（権威サーバー）
│   │   ├── socket/           # Socket.IO イベントハンドラ
│   │   └── index.ts
│   └── package.json
└── shared/                   # クライアント/サーバー共通型
    └── types.ts
```

---

## 4. アーキテクチャ概要

```
Discord Client
  └── [iFrame / Embedded App]
        ├── Player A の React App ──┐
        ├── Player B の React App ──┤── Socket.IO ──→ Game Server (Node.js)
        ├── Player C の React App ──┤                     │
        └── ...                     ┘              権威サーバー
                                                   ゲーム状態管理
                                                   アクション処理
                                                   結果ブロードキャスト
```

### 状態管理の原則

- **ゲーム状態はサーバーが権威**（チート防止・整合性保証）
- クライアントは「自分の手札」のみ完全に受信する
- 他プレイヤーの手札は枚数のみ表示（内容は秘匿）
- サーバーは全プレイヤーの状態を保持し、フェーズ終了時に結果を差分配信

---

## 5. Discord Activity セットアップ

### 初期化フロー

```typescript
// client/src/discord/setup.ts
import { DiscordSDK } from '@discord/embedded-app-sdk';

export const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

export async function initDiscord() {
  // 1. Discord クライアントの準備完了を待つ
  await discordSdk.ready();

  // 2. OAuth認可
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify', 'guilds'],
  });

  // 3. サーバー経由でアクセストークン取得
  const { access_token } = await fetch('/.proxy/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  }).then(r => r.json());

  // 4. Discord クライアントに認証
  const auth = await discordSdk.commands.authenticate({ access_token });

  // 5. チャンネル参加者取得（ゲームプレイヤー一覧）
  const { participants } = await discordSdk.commands.getInstanceConnectedParticipants();

  return { auth, participants };
}
```

### Discord Developer Portal 設定

```
Application Settings:
  OAuth2 Scopes : identify, guilds
  Redirect URI  : https://<your-domain>/.proxy/api/token
  
Activity Settings:
  URL Mappings:
    /          → https://<frontend-domain>
    /api       → https://<backend-domain>/api
    /socket.io → https://<backend-domain>/socket.io
```

---

## 6. MVPカードセット

MVP で実装するカード（N レアリティのみ）。

### 実装カード一覧

| カードID | 名前 | 属性 | 効果（MVP実装） |
|---|---|---|---|
| `KILL` | 殺害 | 攻撃 | 対象HP -1 |
| `KNIGHT` | 騎士 | 防御 | 対象をその夜の殺害から保護 |
| `DOCTOR` | 医者 | 回復 | 対象HP +1（上限突破可、2日間） |
| `ORACLE` | 占い | 調査 | 対象の陣営を判別（偽証なし） |
| `ELITE` | 上級国民 | 政治 | 翌昼の自分の投票権 +1 |
| `ELECTION` | 選挙干渉 | 政治 | 対象の翌昼投票権を無効化 |
| `TRANSFER` | 譲渡 | 流通 | 自分の手札1枚を他プレイヤーへ渡す |
| `FORGERY` | 偽札 | 妨害 | 外見は「譲渡」。渡ったカードを無効化 |
| `GREED` | 強欲な壺 | 流通 | ランダムに手札へカード2枚追加 |

### カード出現重みテーブル（MVP デフォルト）

```typescript
// shared/types.ts
export const CARD_WEIGHTS: Record<CardId, number> = {
  KILL:     3,
  KNIGHT:   3,
  DOCTOR:   3,
  ORACLE:   3,
  ELITE:    2,
  ELECTION: 2,
  TRANSFER: 2,
  FORGERY:  1,
  GREED:    2,
};
```

### カード型定義

```typescript
// shared/types.ts
export type CardAttribute = 'attack' | 'defense' | 'heal' | 'investigate'
                           | 'political' | 'distribution' | 'sabotage';

export interface CardDefinition {
  id: CardId;
  name: string;
  attribute: CardAttribute[];
  rarity: 'N' | 'R' | 'UR';
  targetType: 'player' | 'self' | 'none';
}
```

---

## 7. ゲームフロー実装仕様

### フェーズ状態機械

```
LOBBY
  └─(全員Ready)──→ NIGHT_BUILD
                       └─(全員選択 or タイムアウト60s)──→ NIGHT_ACTION
                                                              └─(全員行動 or タイムアウト60s)──→ MORNING_RESOLVE
                                                                                                      └─(自動)──→ DAY_DISCUSSION
                                                                                                                      └─(タイムアウト90s)──→ DAY_VOTE
                                                                                                                                                  └─(全員投票 or タイムアウト30s)──→ MORNING_RESOLVE
                                                                                                                                                                                         └─(勝利条件未達)──→ NIGHT_BUILD (ループ)
                                                                                                                                                                                         └─(勝利条件達成)──→ GAME_OVER
```

### フェーズ別サーバー処理

#### NIGHT_BUILD フェーズ

```
1. ウェイト配列からランダムに3枚ドロー（重み付き）
2. 各プレイヤーへ個別に3択カードを送信
3. プレイヤーからの選択を受信
4. 選択されたカードをそのプレイヤーのスタックに追加
5. スタック上限（5枚）チェック → 超過時は選択を要求（or 自動で最古破棄）
```

#### NIGHT_ACTION フェーズ

```
1. 各プレイヤーがスタックからカードを選択し対象を指定
2. 全プレイヤーの行動を収集（またはタイムアウト）
3. アクション処理（優先順位に従い解決）
```

#### アクション解決優先順位（MVP版）

```
Priority 1: 譲渡 / 偽札（手札移動を確定）
Priority 2: 騎士（防御対象を確定）
Priority 3: 殺害 vs 医者（HP変動を計算）
Priority 4: 占い（最終HP/陣営で結果を返す）
Priority 5: 選挙干渉 / 上級国民（翌昼パラメータ設定）
Priority 6: 強欲な壺（カード追加）
```

#### MORNING_RESOLVE フェーズ

```
1. HP 0 以下のプレイヤーを特定
2. 脱落者を公開通知
3. 勝利条件チェック
4. 朝のログ生成（各アクションの公開情報のみ）
5. 翌夜へ移行 or GAME_OVER
```

#### DAY_VOTE フェーズ

```
1. 各プレイヤーの投票権を計算（選挙干渉・上級国民の効果を適用）
2. 投票を収集
3. 最多票のプレイヤーを追放（HP を 0 にする）
4. 同票の場合: ランダムで1名を追放
5. 追放後に勝利条件チェック
```

### 勝利条件

```typescript
function checkWinCondition(players: Player[]): WinResult | null {
  const alive = players.filter(p => p.hp > 0);
  const wolves = alive.filter(p => p.faction === 'werewolf');
  const citizens = alive.filter(p => p.faction === 'citizen');

  if (wolves.length === 0) return { winner: 'citizen' };
  if (wolves.length >= citizens.length) return { winner: 'werewolf' };
  return null;
}
```

---

## 8. サーバーサイド仕様

### 共通型定義

```typescript
// shared/types.ts

export type Faction = 'citizen' | 'werewolf';
export type Phase = 'LOBBY' | 'NIGHT_BUILD' | 'NIGHT_ACTION'
                  | 'MORNING_RESOLVE' | 'DAY_DISCUSSION' | 'DAY_VOTE' | 'GAME_OVER';

export interface Player {
  id: string;            // Discord User ID
  name: string;          // Discord 表示名
  avatarUrl: string;
  hp: number;            // 現在HP
  maxHp: number;         // 上限HP（医者で変動）
  faction: Faction;
  stack: CardInstance[]; // 手札（最大5枚）
  voteWeight: number;    // 投票権（デフォルト1）
  isAlive: boolean;
  tempHpBoostExpiry?: number;  // 医者の上限突破期限（ターン数）
}

export interface CardInstance {
  instanceId: string;   // ユニークID
  cardId: CardId;
  isDisabled: boolean;  // 偽札で無効化されたか
}

export interface GameState {
  roomId: string;        // Discord チャンネルID
  phase: Phase;
  turn: number;          // 現在ターン数（夜の回数）
  players: Player[];
  logs: GameLog[];       // 公開ログ
  phaseDeadline: number; // タイムスタンプ(ms)
}
```

### Socket.IO イベント定義

#### クライアント → サーバー（emit）

| イベント名 | ペイロード | タイミング |
|---|---|---|
| `player:join` | `{ discordUserId, name, avatarUrl }` | ロビー参加時 |
| `player:ready` | `{}` | 準備完了ボタン押下時 |
| `build:select` | `{ cardId: CardId }` | 夜構築フェーズでカード選択時 |
| `action:submit` | `{ cardInstanceId: string, targetId: string \| null }` | 夜行動フェーズでカード使用時 |
| `action:skip` | `{}` | 夜行動フェーズでカード不使用時 |
| `vote:cast` | `{ targetId: string }` | 昼投票フェーズで投票時 |

#### サーバー → クライアント（emit）

| イベント名 | ペイロード | 対象 | 説明 |
|---|---|---|---|
| `state:full` | `PublicGameState` | 全員 | ゲーム全体の公開状態 |
| `state:private` | `PrivatePlayerState` | 個人 | 自分の手札・陣営など秘匿情報 |
| `phase:changed` | `{ phase, deadline }` | 全員 | フェーズ変更通知 |
| `build:options` | `{ cards: CardDefinition[] }` | 個人 | 3択カードの提示 |
| `morning:report` | `{ events: MorningEvent[] }` | 全員 | 朝の結果報告 |
| `log:append` | `{ log: GameLog }` | 全/個人 | ログ追加 |
| `game:over` | `{ winner: Faction, players: Player[] }` | 全員 | ゲーム終了 |

### PrivatePlayerState（秘匿情報）

```typescript
export interface PrivatePlayerState {
  myPlayerId: string;
  faction: Faction;          // 自分の陣営
  stack: CardInstance[];     // 自分の手札（全内容）
  oracleResults: {           // 占い結果（自分が占った履歴）
    targetId: string;
    faction: Faction;
    turn: number;
  }[];
}
```

### PublicGameState（公開情報）

```typescript
export interface PublicGameState {
  phase: Phase;
  turn: number;
  phaseDeadline: number;
  players: PublicPlayer[];   // 手札内容は枚数のみ
  logs: GameLog[];
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatarUrl: string;
  hp: number;
  isAlive: boolean;
  stackCount: number;        // 手札枚数のみ（内容は秘匿）
  voteWeight: number;
}
```

---

## 9. クライアントサイド仕様

### Zustand Store 設計

```typescript
// client/src/stores/gameStore.ts
interface GameStore {
  // 公開状態（サーバーから受信）
  publicState: PublicGameState | null;
  
  // 自分の秘匿状態
  privateState: PrivatePlayerState | null;

  // 夜構築フェーズの3択
  buildOptions: CardDefinition[] | null;

  // UI 状態
  selectedCard: CardInstance | null;
  selectedTarget: string | null;

  // Actions
  setPublicState: (state: PublicGameState) => void;
  setPrivateState: (state: PrivatePlayerState) => void;
  setBuildOptions: (cards: CardDefinition[]) => void;
  selectCard: (card: CardInstance | null) => void;
  selectTarget: (playerId: string | null) => void;
}
```

### Socket.IO 接続管理

```typescript
// client/src/discord/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectToGame(roomId: string, playerId: string) {
  socket = io('/.proxy/api', {
    query: { roomId, playerId },
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('[Socket] Connected'));
  socket.on('state:full', (state) => useGameStore.getState().setPublicState(state));
  socket.on('state:private', (state) => useGameStore.getState().setPrivateState(state));
  socket.on('build:options', (data) => useGameStore.getState().setBuildOptions(data.cards));
  // ... 他イベントのリスナー登録
}
```

---

## 10. UI画面設計

### 画面一覧

```
1. ロビー画面      : 参加者一覧 + 準備完了ボタン
2. 役職開示画面    : 自分の陣営を表示（3秒表示後、自動消去）
3. 夜・構築画面    : 3択カードの提示 + タイマー
4. 夜・行動画面    : 手札表示 + プレイヤー選択 + 使用ボタン
5. 朝・報告画面    : 夜の結果ログ + 脱落者表示
6. 昼・議論画面    : プレイヤーステータス一覧 + ログ
7. 昼・投票画面    : 投票対象選択 + 現在の得票数
8. ゲーム終了画面  : 勝利陣営発表 + 全プレイヤーの役職公開
```

### 各画面の主要コンポーネント

#### ロビー画面

```
┌─────────────────────────────────────┐
│  ROGUE-LYCAN                         │
│  ボイスチャンネル: #ゲーム部屋        │
│                                      │
│  参加者 (4/6)                        │
│  ✅ UserA    ✅ UserB               │
│  ✅ UserC    ⏳ UserD               │
│                                      │
│  [準備完了]  ← 自分のみ押せる        │
└─────────────────────────────────────┘
```

#### 夜・構築画面

```
┌─────────────────────────────────────┐
│  夜 3日目 — カードを1枚選んでください │
│  ⏱ 45秒                             │
│                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ 殺害   │ │ 医者   │ │ 占い   │  │
│  │ 攻撃   │ │ 回復   │ │ 調査   │  │
│  │ HP -1  │ │ HP +1  │ │ 陣営   │  │
│  │        │ │        │ │ 判別   │  │
│  └────────┘ └────────┘ └────────┘  │
│                                      │
│  手札: [騎士][上級国民]  2/5枚       │
└─────────────────────────────────────┘
```

#### 夜・行動画面

```
┌─────────────────────────────────────┐
│  夜 3日目 — アクション               │
│  ⏱ 38秒                             │
│                                      │
│  手札                                │
│  [殺害] [騎士] [医者]  ← 1枚選択    │
│                                      │
│  対象プレイヤー（殺害を選択中）       │
│  ○ UserB  HP:██  手札:3枚           │
│  ○ UserC  HP:█   手札:2枚           │
│  ● UserD  HP:██  手札:4枚  ← 選択中 │
│                                      │
│  [使用する]  [スキップ]              │
└─────────────────────────────────────┘
```

#### 昼・投票画面

```
┌─────────────────────────────────────┐
│  昼 3日目 — 投票                     │
│  ⏱ 22秒                             │
│                                      │
│  投票先を選んでください               │
│  ┌──────────────────────────────┐   │
│  │ UserB  HP:██  現在 2票        │   │
│  │ UserC  HP:█   現在 1票        │   │
│  │ UserD  HP:██  現在 0票 ← 選択 │   │
│  └──────────────────────────────┘   │
│                                      │
│  あなたの投票権: 2票（上級国民使用）  │
│  [投票する]                          │
└─────────────────────────────────────┘
```

---

## 11. 開発フェーズとロードマップ

### Phase 0 — 環境構築（1〜2日）

- [ ] Discord Developer Portal でアプリ作成
- [ ] Vite + React + TypeScript の雛形作成
- [ ] `@discord/embedded-app-sdk` 導入
- [ ] Node.js + Socket.IO サーバー作成
- [ ] OAuth token エンドポイント実装
- [ ] Cloudflare Pages / Railway へのデプロイパイプライン確認

### Phase 1 — ロビーと陣営割り当て（2〜3日）

- [ ] `player:join` / `player:ready` 処理
- [ ] 4〜6人揃ったらゲーム開始
- [ ] 陣営ランダム割り当て（人狼: プレイヤー数/3、切り捨て）
- [ ] 陣営開示画面（自分の iFrame のみに表示）

### Phase 2 — 夜フェーズ（3〜4日）

- [ ] 重み付きカードドロー実装
- [ ] `build:options` / `build:select` 実装
- [ ] スタック管理（追加・上限チェック）
- [ ] `action:submit` / `action:skip` 実装
- [ ] アクション解決エンジン実装（優先順位処理）

### Phase 3 — 朝・昼フェーズ（2〜3日）

- [ ] HP 変動の計算と脱落判定
- [ ] 朝ログ生成と配信
- [ ] 投票権管理（上級国民・選挙干渉の適用）
- [ ] 投票集計と追放処理
- [ ] 勝利条件チェック

### Phase 4 — UI 整備（2〜3日）

- [ ] 全画面の React コンポーネント実装
- [ ] タイマー表示
- [ ] ログ表示（全体/個人別）
- [ ] ゲーム終了画面（役職公開）
- [ ] モバイル対応（Discord Mobile の Safe Area 対応）

### Phase 5 — テスト＆修正（2〜3日）

- [ ] 4〜6人でのローカルテスト
- [ ] エッジケース確認（タイムアウト、切断時の処理）
- [ ] UI / UX フィードバック対応

---

## 12. MVP除外項目

後続フェーズで実装予定の機能。

### 除外カード（後フェーズ）

| カード | 理由 |
|---|---|
| 反転（UR） | 陣営変更後の各種判定が複雑。Phase 2 以降 |
| JOKER（UR） | 任意変換ロジックが UI 含め煩雑 |
| 正義の鉄槌（UR） | 味方判定ロジックに反転との絡みが必要 |
| 皇帝（UR） | 道連れ・易姓革命など多数の特殊ルール |
| 独裁者（UR） | 政治カード無効化との競合ルール |
| 狂暴化 / 市民化 / ピエロ | 出現重みシステムの拡張が前提 |
| パン屋 | 特殊ログの実装が必要 |
| 偽証 | 自動発動トリガーの実装コストが高い |
| 捜査 | ターン履歴の永続管理が必要 |

### 除外機能（後フェーズ）

| 機能 | 理由 |
|---|---|
| 観戦者モード | 秘匿情報の表示設計が複雑 |
| リプレイ | ログ永続化が必要 |
| Rich Presence 連携 | プロトタイプ段階では不要 |
| ゲーム内チャット | Discord のボイス/テキストで代替 |
| カスタムルール | 基本ルールの安定化が先 |

---

*本仕様書は ROGUE-LYCAN プロトタイプの開発指針として作成。実装状況に応じて随時更新すること。*
