import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { emitReady, emitRename } from '../discord/socket';
import { GAME_CONSTANTS, CARD_DEFINITIONS, type CardId } from '@shared/types';

// ===== Card Showcase =====

const ALL_CARD_IDS = Object.keys(CARD_DEFINITIONS) as CardId[];

const ATTR_COLORS: Record<string, { border: string; bg: string; text: string; shadow: string }> = {
  attack:       { border: 'border-red-500',    bg: 'bg-red-950/60',    text: 'text-red-400',    shadow: '0 0 40px rgba(239,68,68,0.45)' },
  defense:      { border: 'border-blue-500',   bg: 'bg-blue-950/60',   text: 'text-blue-400',   shadow: '0 0 40px rgba(59,130,246,0.45)' },
  heal:         { border: 'border-green-500',  bg: 'bg-green-950/60',  text: 'text-green-400',  shadow: '0 0 40px rgba(34,197,94,0.45)' },
  investigate:  { border: 'border-purple-500', bg: 'bg-purple-950/60', text: 'text-purple-400', shadow: '0 0 40px rgba(168,85,247,0.45)' },
  political:    { border: 'border-yellow-500', bg: 'bg-yellow-950/60', text: 'text-yellow-400', shadow: '0 0 40px rgba(234,179,8,0.45)' },
  distribution: { border: 'border-cyan-500',   bg: 'bg-cyan-950/60',   text: 'text-cyan-400',   shadow: '0 0 40px rgba(6,182,212,0.45)' },
  sabotage:     { border: 'border-orange-500', bg: 'bg-orange-950/60', text: 'text-orange-400', shadow: '0 0 40px rgba(249,115,22,0.45)' },
};

const ATTR_LABELS: Record<string, string> = {
  attack: '攻撃', defense: '防御', heal: '回復', investigate: '調査',
  political: '政治', distribution: '流通', sabotage: '妨害',
};

const ATTR_ICONS: Record<string, string> = {
  attack: '⚔️', defense: '🛡️', heal: '💊', investigate: '🔮',
  political: '🗳️', distribution: '📦', sabotage: '🎭',
};

const CARD_INTERVAL_MS = 4500;
const FADE_MS = 500;

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function CardShowcase() {
  const queueRef = useRef<CardId[]>(shuffleArray(ALL_CARD_IDS));
  const [cardIndex, setCardIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCardIndex((prev: number) => {
          const next = prev + 1;
          if (next >= queueRef.current.length) {
            queueRef.current = shuffleArray(ALL_CARD_IDS);
            return 0;
          }
          return next;
        });
        setVisible(true);
      }, FADE_MS);
    }, CARD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const cardId: CardId = queueRef.current[cardIndex];
  const def = CARD_DEFINITIONS[cardId];
  if (!def) return null;

  const mainAttr = def.attribute[0];
  const c = ATTR_COLORS[mainAttr] ?? ATTR_COLORS.attack;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <span className="text-xs tracking-[0.3em] text-gray-500 uppercase">カード紹介</span>

      {/* Card frame */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
          boxShadow: visible ? c.shadow : 'none',
        }}
        className={`w-44 rounded-2xl border-2 flex flex-col items-center gap-2 overflow-hidden ${c.border} ${c.bg}`}
      >
        {/* Art area */}
        <div className="w-full h-36 flex items-center justify-center bg-black/30 border-b border-white/10 text-6xl">
          {ATTR_ICONS[mainAttr] ?? '🃏'}
        </div>

        <div className="w-full px-4 pb-4 flex flex-col items-center gap-2">
          {/* Name */}
          <div className="font-bold text-lg text-center text-white leading-tight">{def.name}</div>

          {/* Attributes */}
          <div className="flex flex-wrap gap-1 justify-center">
            {def.attribute.map((a: string) => (
              <span
                key={a}
                className={`text-xs px-2 py-0.5 rounded-full border ${c.border} ${c.text} bg-black/20`}
              >
                {ATTR_LABELS[a]}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/10" />

          {/* Description */}
          <div className="text-xs text-gray-300 text-center leading-relaxed">{def.description}</div>

          {/* Rarity */}
          <span
            className={`text-xs px-2 py-0.5 rounded border font-bold ${
              def.rarity === 'UR'
                ? 'border-wolf-gold text-wolf-gold bg-yellow-900/20'
                : def.rarity === 'R'
                ? 'border-purple-400 text-purple-400 bg-purple-900/20'
                : 'border-gray-600 text-gray-500'
            }`}
          >
            {def.rarity}
          </span>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1">
        {queueRef.current.map((id, i) => (
          <div
            key={`${id}-${i}`}
            className={`rounded-full transition-all duration-300 ${
              i === cardIndex ? 'w-4 h-1.5 bg-wolf-accent' : 'w-1.5 h-1.5 bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

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
                ['プレイヤー数', `4〜${GAME_CONSTANTS.MAX_PLAYERS}人（偶数）`],
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
              {ALL_CARD_IDS.map((id: CardId) => {
                const def = CARD_DEFINITIONS[id];
                const mainAttr = def.attribute[0];
                const c = ATTR_COLORS[mainAttr] ?? ATTR_COLORS.attack;
                return (
                  <div
                    key={id}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-xs ${c.border} ${c.bg}`}
                  >
                    <span className="text-lg flex-shrink-0 leading-none">{ATTR_ICONS[mainAttr] ?? '🃏'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white text-sm">{def.name}</span>
                        <span className={`text-xs ${c.text}`}>
                          {def.attribute.map((a: string) => ATTR_LABELS[a]).join('・')}
                        </span>
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

// ===== Lobby =====

export function Lobby() {
  const publicState = useGameStore((s) => s.publicState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const myName = useGameStore((s) => s.myName);
  const setMyName = useGameStore((s) => s.setMyName);
  const readyPlayers = useGameStore((s) => s.readyPlayers);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showRules, setShowRules] = useState(false);

  const players = publicState?.players ?? [];
  const isReady = myPlayerId ? readyPlayers.includes(myPlayerId) : false;
  const canStart =
    players.length >= GAME_CONSTANTS.MIN_PLAYERS &&
    players.length % 2 === 0 &&
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
          <p className="text-gray-400 mb-8 text-sm">人狼 x ローグライク カードゲーム</p>

          <div className="w-full bg-wolf-mid rounded-lg p-6 border border-wolf-light">
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
              {players.length >= GAME_CONSTANTS.MIN_PLAYERS && players.length % 2 !== 0 && (
                <p className="text-center text-gray-500 text-sm py-2">
                  ゲーム開始には偶数人数（2ペア以上）が必要です
                </p>
              )}
            </div>

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
