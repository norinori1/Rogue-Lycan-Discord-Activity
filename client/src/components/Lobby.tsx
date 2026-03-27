import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { emitReady, emitRename, emitGameConfig } from '../discord/socket';
import { GAME_CONSTANTS, CARD_DEFINITIONS } from '@shared/types';
import type { CardId } from '@shared/types';
import { CardShowcase } from './CardShowcase';

// ===== Rules Modal =====

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-wolf-dark border border-wolf-light rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-wolf-light">
          <h2 className="text-xl font-bold text-wolf-accent">📖 ゲームルール</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-3xl leading-none pb-1"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6" style={{ maxHeight: 'calc(80vh - 5rem)' }}>

          {/* Overview */}
          <section>
            <h3 className="text-base font-bold text-wolf-gold mb-2">🐺 概要</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              ROGUE-LYCANは「人狼」×ローグライクのカードゲームです。
              市民と人狼に分かれ、毎夜カードを獲得して能力を強化しながら相手陣営の全滅を目指します。
              ゲーム開始時は全員同等。夜ごとに3択でカードを選び、手札として蓄積・発動して戦います。
            </p>
          </section>

          {/* Basic Params */}
          <section>
            <h3 className="text-base font-bold text-wolf-gold mb-2">📊 基本パラメーター</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['プレイヤー数', `4〜${GAME_CONSTANTS.MAX_PLAYERS}人`],
                ['初期HP', '2'],
                ['最大手札枚数', '5枚'],
                ['人狼の数', '人数 ÷ 3（切り捨て）'],
              ].map(([label, value]) => (
                <div key={label} className="bg-wolf-mid rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">{label}</div>
                  <div className="font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Win Conditions */}
          <section>
            <h3 className="text-base font-bold text-wolf-gold mb-2">🏆 勝利条件</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-700/40 rounded-lg p-3">
                <span className="text-blue-400 font-bold flex-shrink-0">市民</span>
                <span className="text-gray-300">人狼を全員HP0にする（追放含む）</span>
              </div>
              <div className="flex items-start gap-3 bg-red-900/20 border border-red-700/40 rounded-lg p-3">
                <span className="text-red-400 font-bold flex-shrink-0">人狼</span>
                <span className="text-gray-300">生存者のうち人狼数 ≥ 市民数になる</span>
              </div>
            </div>
          </section>

          {/* Game Flow */}
          <section>
            <h3 className="text-base font-bold text-wolf-gold mb-2">🔄 ゲームの流れ</h3>
            <div className="space-y-2 text-sm">
              {[
                { icon: '🌙', phase: '夜：構築フェーズ（60秒）', desc: '提示された3枚のカードから1枚を選んで手札に加える' },
                { icon: '🌙', phase: '夜：行動フェーズ（60秒）', desc: '手札のカードを1枚使用するか、スキップする' },
                { icon: '☀️', phase: '朝：判定フェーズ', desc: 'HP0のプレイヤーが公開される。夜の行動結果が通知される' },
                { icon: '💬', phase: '昼：議論フェーズ（90秒）', desc: '生存者で議論する。1ターン目は投票なし' },
                { icon: '🗳️', phase: '昼：投票フェーズ（30秒）', desc: '最多票のプレイヤーが追放される（同票はランダム）' },
              ].map(({ icon, phase, desc }) => (
                <div key={phase} className="flex items-start gap-3 bg-wolf-mid/60 rounded-lg p-3">
                  <span className="text-xl flex-shrink-0 leading-none mt-0.5">{icon}</span>
                  <div>
                    <div className="font-medium text-white text-xs mb-0.5">{phase}</div>
                    <div className="text-gray-400 text-xs">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Action Priority */}
          <section>
            <h3 className="text-base font-bold text-wolf-gold mb-2">⚡ アクション処理順序</h3>
            <div className="space-y-1 text-xs">
              {[
                '① 譲渡 / 偽札 — 手札の移動・変換を確定',
                '② 騎士 — 防御対象を確定',
                '③ 殺害 / 医者 — HP変動を計算',
                '④ 占い — 最終陣営で結果を返す',
                '⑤ 選挙干渉 / 上級国民 — 翌昼の投票パラメータを設定',
                '⑥ 強欲な壺 — ランダムにカードを2枚追加',
              ].map((step) => (
                <div key={step} className="text-gray-300 bg-wolf-mid/50 rounded px-3 py-2">{step}</div>
              ))}
            </div>
          </section>

          {/* Cards */}
          <section>
            <h3 className="text-base font-bold text-wolf-gold mb-2">🃏 カード一覧</h3>
            <div className="space-y-2">
              {Object.values(CARD_DEFINITIONS).map((def) => {
                return (
                  <div
                    key={def.id}
                    className="flex items-start gap-3 rounded-lg border p-3 text-xs border-wolf-light/40 bg-wolf-mid/60"
                  >
                    <span className="text-lg flex-shrink-0 leading-none">🃏</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white text-sm">{def.name}</span>
                        <span className="text-xs text-gray-400">{def.attribute.join('・')}</span>
                      </div>
                      <div className="text-gray-400">{def.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tactics */}
          <section>
            <h3 className="text-base font-bold text-wolf-gold mb-2">🧠 戦術のヒント</h3>
            <div className="space-y-2 text-xs text-gray-300">
              {[
                ['自傷・自演', '自分に殺害を使い市民のフリをするブラフが可能'],
                ['タンクビルド', '医者でHPを重ね「殺せない市民」を作る'],
                ['ステルス票操作', '選挙干渉の秘匿性により濡れ衣戦術が可能'],
                ['トロイの木馬', '偽札を譲渡のふりで渡して決定的瞬間に無効化'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-2">
                  <span className="text-wolf-accent flex-shrink-0">•</span>
                  <span><strong className="text-white">{title}：</strong>{desc}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ===== Game Config Panel =====

interface GameConfigPanelProps {
  isHost: boolean;
  playerCount: number;
}

function GameConfigPanel({ isHost, playerCount }: GameConfigPanelProps) {
  const gameConfig = useGameStore((s) => s.gameConfig);
  const [open, setOpen] = useState(false);

  const maxWolves = Math.max(1, Math.floor((playerCount - 1) / 2));
  const autoWolfCount =
    playerCount >= GAME_CONSTANTS.MIN_PLAYERS ? Math.floor(playerCount / 3) : null;

  const handleWerewolfCount = (value: number | null) => {
    emitGameConfig({ werewolfCount: value });
  };

  const handleCardToggle = (cardId: CardId, enabled: boolean) => {
    emitGameConfig({ enabledCards: { ...gameConfig.enabledCards, [cardId]: enabled } });
  };

  const enabledCount = Object.values(gameConfig.enabledCards).filter(Boolean).length;

  return (
    <div className="w-full mt-4 border border-wolf-light rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-wolf-dark/60 hover:bg-wolf-dark/80 transition text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          ⚙️ ゲーム設定
          {isHost && (
            <span className="text-xs text-wolf-gold font-normal">(ホスト)</span>
          )}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-5 bg-wolf-dark/40">
          {/* Werewolf count */}
          <div>
            <div className="text-xs font-semibold text-wolf-gold mb-2">🐺 人狼の数</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => isHost && handleWerewolfCount(null)}
                disabled={!isHost}
                className={`px-3 py-1 rounded text-xs border transition ${
                  gameConfig.werewolfCount === null
                    ? 'bg-wolf-accent border-wolf-accent text-white'
                    : 'border-gray-600 text-gray-300 hover:border-gray-400'
                } ${!isHost ? 'cursor-default opacity-70' : ''}`}
              >
                自動{autoWolfCount !== null ? ` (${autoWolfCount}人)` : ''}
              </button>
              {Array.from({ length: maxWolves }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => isHost && handleWerewolfCount(n)}
                  disabled={!isHost}
                  className={`px-3 py-1 rounded text-xs border transition ${
                    gameConfig.werewolfCount === n
                      ? 'bg-wolf-accent border-wolf-accent text-white'
                      : 'border-gray-600 text-gray-300 hover:border-gray-400'
                  } ${!isHost ? 'cursor-default opacity-70' : ''}`}
                >
                  {n}人
                </button>
              ))}
            </div>
            {!isHost && (
              <p className="text-xs text-gray-500 mt-1">ホストのみ変更できます</p>
            )}
          </div>

          {/* Card toggles */}
          <div>
            <div className="text-xs font-semibold text-wolf-gold mb-2">
              🃏 使用するカード{' '}
              <span className="text-gray-400 font-normal">
                ({enabledCount}/{Object.keys(CARD_DEFINITIONS).length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CARD_DEFINITIONS) as CardId[]).map((cardId) => {
                const def = CARD_DEFINITIONS[cardId];
                const enabled = gameConfig.enabledCards[cardId] !== false;
                return (
                  <button
                    key={cardId}
                    onClick={() => isHost && handleCardToggle(cardId, !enabled)}
                    disabled={!isHost}
                    className={`flex items-center gap-2 p-2 rounded border text-xs text-left transition ${
                      enabled
                        ? 'border-wolf-light/60 bg-wolf-mid/60 text-white'
                        : 'border-gray-700/60 bg-wolf-dark/40 text-gray-500'
                    } ${!isHost ? 'cursor-default' : 'hover:border-wolf-accent/60'}`}
                  >
                    <span
                      className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 text-[10px] ${
                        enabled
                          ? 'bg-wolf-accent border-wolf-accent text-white'
                          : 'border-gray-600'
                      }`}
                    >
                      {enabled ? '✓' : ''}
                    </span>
                    <span className="truncate">{def.name}</span>
                  </button>
                );
              })}
            </div>
            {!isHost && (
              <p className="text-xs text-gray-500 mt-1">ホストのみ変更できます</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Lobby =====

interface LobbyProps {
  roomId?: string | null;
  onBack?: () => void;
}

export function Lobby({ roomId, onBack }: LobbyProps) {
  const publicState = useGameStore((s) => s.publicState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const myName = useGameStore((s) => s.myName);
  const setMyName = useGameStore((s) => s.setMyName);
  const readyPlayers = useGameStore((s) => s.readyPlayers);
  const isServerDown = useGameStore((s) => s.isServerDown);
  const hostPlayerId = useGameStore((s) => s.hostPlayerId);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showRules, setShowRules] = useState(false);

  const players = publicState?.players ?? [];
  const isReady = myPlayerId ? readyPlayers.includes(myPlayerId) : false;
  const isHost = !!myPlayerId && myPlayerId === hostPlayerId;
  // True when socket is connected but our player hasn't appeared in the list yet
  // (e.g. player:join was lost while server was waking up from sleep)
  const isRegistering =
    !isServerDown &&
    myPlayerId !== null &&
    publicState !== null &&
    publicState.phase === 'LOBBY' &&
    !players.some((p) => p.id === myPlayerId);
  const canStart =
    players.length >= GAME_CONSTANTS.MIN_PLAYERS &&
    readyPlayers.length === players.length;

  const handleNameEdit = () => {
    if (isReady) return;
    setNameInput(myName ?? '');
    setEditingName(true);
  };

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== myName) {
      setMyName(trimmed);
      emitRename(trimmed);
    }
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSubmit();
    if (e.key === 'Escape') setEditingName(false);
  };

  return (
    <>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      <div className="flex-1 flex items-center justify-center gap-10 p-6 animate-fade-in">
        {/* Left: Card Showcase (hidden on small screens) */}
        <div className="hidden md:block flex-shrink-0">
          <CardShowcase />
        </div>

        {/* Right: Lobby UI */}
        <div className="flex flex-col items-center w-full max-w-md">
          {/* Own name display */}
          <div className="w-full mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-wolf-accent flex items-center justify-center text-sm font-bold flex-shrink-0">
              {(myName ?? '?').charAt(0)}
            </div>
            {editingName ? (
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                maxLength={20}
                className="flex-1 bg-wolf-mid border border-wolf-accent rounded px-2 py-1 text-sm text-white outline-none"
              />
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">{myName}</span>
                {!isReady && (
                  <button
                    onClick={handleNameEdit}
                    className="text-xs text-gray-400 hover:text-wolf-accent transition"
                    title="名前を変更"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>

          <h1 className="text-4xl font-bold text-wolf-accent mb-2">ROGUE-LYCAN</h1>
          <p className={`text-gray-400 text-sm ${roomId ? 'mb-2' : 'mb-8'}`}>人狼 x ローグライク カードゲーム</p>

          {roomId && (
            <p className="text-xs text-gray-500 mb-6">
              ルーム: <span className="text-wolf-gold font-mono">{roomId}</span>
            </p>
          )}

          {onBack && (
            <div className="w-full mb-3">
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition"
              >
                ← ルーム選択に戻る
              </button>
            </div>
          )}

          <div className="w-full bg-wolf-mid rounded-lg p-6 border border-wolf-light">
            {isServerDown && (
              <div className="mb-4 rounded border border-yellow-700/50 bg-yellow-900/20 p-3">
                <p className="text-yellow-300 text-sm">サーバがスリープから起動中です。接続できると参加者が表示されます。</p>
                <p className="text-yellow-200/90 text-xs mt-1">最大1分程度で自動再接続される場合があります。</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-3 py-1 rounded text-xs border border-yellow-500/70 text-yellow-200 hover:bg-yellow-800/40 transition"
                >
                  手動で再接続
                </button>
              </div>
            )}
            {isRegistering && (
              <div className="mb-4 rounded border border-blue-700/50 bg-blue-900/20 p-3 flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
                <p className="text-blue-300 text-sm">サーバに参加登録中です。しばらくお待ちください...</p>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">参加者</h2>
              <span className="text-sm text-gray-400">
                {players.length}/{GAME_CONSTANTS.MAX_PLAYERS}人
              </span>
            </div>

            <div className="space-y-2 mb-6">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded bg-wolf-dark/50"
                >
                  <div className="w-8 h-8 rounded-full bg-wolf-light flex items-center justify-center text-sm">
                    {player.name.charAt(0)}
                  </div>
                  <span className="flex-1">{player.name}</span>
                  {player.id === myPlayerId && (
                    <span className="text-xs text-wolf-gold">(あなた)</span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      readyPlayers.includes(player.id)
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {readyPlayers.includes(player.id) ? '準備完了' : '待機中'}
                  </span>
                </div>
              ))}

              {players.length < GAME_CONSTANTS.MIN_PLAYERS && (
                <p className="text-center text-gray-500 text-sm py-2">
                  あと{GAME_CONSTANTS.MIN_PLAYERS - players.length}人必要です
                </p>
              )}
            </div>

            {/* Game config panel */}
            <GameConfigPanel isHost={isHost} playerCount={players.length} />

            {!isReady ? (
              <button
                onClick={() => emitReady()}
                disabled={players.length < GAME_CONSTANTS.MIN_PLAYERS}
                className="w-full py-3 rounded-lg font-bold text-lg bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition mb-3"
              >
                準備完了
              </button>
            ) : (
              <div className="text-center text-green-400 py-3 mb-3">
                {canStart ? 'まもなくゲーム開始...' : '他のプレイヤーを待っています...'}
              </div>
            )}

            {/* Rules button */}
            <button
              onClick={() => setShowRules(true)}
              className="w-full py-2 rounded-lg text-sm text-gray-400 border border-gray-700 hover:border-wolf-gold hover:text-wolf-gold transition"
            >
              📖 ゲームルールを確認
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
