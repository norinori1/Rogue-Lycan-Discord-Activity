import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CARD_DEFINITIONS, GAME_CONSTANTS, type CardId } from '@shared/types';

const ROOM_LIST_REFRESH_INTERVAL_MS = 10000;
const CARD_INTERVAL_MS = 4500;
const CARD_FADE_MS = 500;

interface RoomSummary {
  roomId: string;
  playerCount: number;
  phase: string;
}

interface Props {
  playerName: string;
  selectedRoomId: string;
  onJoinRoom: (roomId: string) => void;
}

function phaseLabel(phase: string): string {
  if (phase === 'LOBBY') return 'ロビー';
  if (phase === 'GAME_OVER') return '終了';
  return '進行中';
}

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
  attack: '攻撃',
  defense: '防御',
  heal: '回復',
  investigate: '調査',
  political: '政治',
  distribution: '流通',
  sabotage: '妨害',
};

const ATTR_ICONS: Record<string, string> = {
  attack: '⚔️',
  defense: '🛡️',
  heal: '💊',
  investigate: '🔮',
  political: '🗳️',
  distribution: '📦',
  sabotage: '🎭',
};

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
        setCardIndex((prev) => {
          const next = prev + 1;
          if (next >= queueRef.current.length) {
            queueRef.current = shuffleArray(ALL_CARD_IDS);
            return 0;
          }
          return next;
        });
        setVisible(true);
      }, CARD_FADE_MS);
    }, CARD_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const cardId = queueRef.current[cardIndex];
  const def = CARD_DEFINITIONS[cardId];
  if (!def) return null;

  const mainAttr = def.attribute[0];
  const c = ATTR_COLORS[mainAttr] ?? ATTR_COLORS.attack;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <span className="text-xs tracking-[0.3em] text-gray-500 uppercase">カード紹介</span>

      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
          transition: `opacity ${CARD_FADE_MS}ms ease, transform ${CARD_FADE_MS}ms ease`,
          boxShadow: visible ? c.shadow : 'none',
        }}
        className={`w-44 rounded-2xl border-2 flex flex-col items-center gap-2 overflow-hidden ${c.border} ${c.bg}`}
      >
        <div className="w-full h-36 flex items-center justify-center bg-black/30 border-b border-white/10 text-6xl">
          {ATTR_ICONS[mainAttr] ?? '🃏'}
        </div>

        <div className="w-full px-4 pb-4 flex flex-col items-center gap-2">
          <div className="font-bold text-lg text-center text-white leading-tight">{def.name}</div>

          <div className="flex flex-wrap gap-1 justify-center">
            {def.attribute.map((a) => (
              <span
                key={a}
                className={`text-xs px-2 py-0.5 rounded-full border ${c.border} ${c.text} bg-black/20`}
              >
                {ATTR_LABELS[a]}
              </span>
            ))}
          </div>

          <div className="w-full h-px bg-white/10" />
          <div className="text-xs text-gray-300 text-center leading-relaxed">{def.description}</div>
          <span className="text-xs px-2 py-0.5 rounded border border-gray-600 text-gray-500 font-bold">
            {def.rarity}
          </span>
        </div>
      </div>

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

export function RoomSelector({ playerName, selectedRoomId, onJoinRoom }: Props) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoomId, setNewRoomId] = useState('');

  const isDiscord = useMemo(() => window.location.href.includes('discordsays'), []);
  const baseUrl = useMemo(() => {
    if (isDiscord) return '/.proxy';
    if (import.meta.env.DEV) return 'http://localhost:3001';
    return import.meta.env.VITE_SERVER_URL || 'https://rogue-lycan-discord-activity.onrender.com';
  }, [isDiscord]);

  const loadRooms = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/rooms`);
      if (!response.ok) {
        throw new Error(`Failed to fetch rooms: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as { rooms?: RoomSummary[] };
      setRooms(data.rooms ?? []);
    } catch (error) {
      console.error('[RoomSelector] Failed to load rooms:', error);
      setError('サーバへの接続に失敗しました。サーバがスリープ中の場合はしばらくすると自動的に復旧します。');
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    loadRooms();
    const timer = setInterval(loadRooms, ROOM_LIST_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadRooms]);

  const createAndJoin = useCallback(() => {
    const id = newRoomId.trim();
    if (!id) return;
    onJoinRoom(id);
  }, [newRoomId, onJoinRoom]);

  return (
    <div className="min-h-screen bg-wolf-dark flex items-center justify-center gap-10 p-6 animate-fade-in">
      <div className="hidden md:block">
        <CardShowcase />
      </div>

      <div className="w-full max-w-2xl bg-wolf-mid border border-wolf-light rounded-xl p-6">
        <h1 className="text-2xl font-bold text-wolf-accent mb-2">ルーム選択</h1>
        <p className="text-sm text-gray-400 mb-6">{playerName} として参加</p>

        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">ルームを作成</h2>
          <div className="flex gap-2">
            <input
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              placeholder="room-001"
              maxLength={40}
              className="flex-1 bg-wolf-dark border border-wolf-light rounded px-3 py-2 text-sm outline-none focus:border-wolf-accent"
            />
            <button
              onClick={createAndJoin}
              disabled={!newRoomId.trim()}
              className="px-4 py-2 rounded bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition text-sm font-semibold"
            >
              作成して参加
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-300">既存ルームに参加</h2>
          <button
            onClick={loadRooms}
            className="text-xs text-gray-400 hover:text-wolf-gold transition"
          >
            更新
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 py-4">読み込み中...</div>
        ) : error ? (
          <div className="text-sm text-red-400 py-4">{error}</div>
        ) : rooms.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">現在アクティブなルームはありません</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {rooms.map((room) => {
              const isInLobby = room.phase === 'LOBBY';
              const isFull = room.playerCount >= GAME_CONSTANTS.MAX_PLAYERS;
              const isDisabled = !isInLobby || isFull;
              const buttonTitle = !isInLobby
                ? '進行中のルームには参加できません'
                : isFull
                ? '満員です'
                : '参加';

              return (
                <div
                  key={room.roomId}
                  className="flex items-center justify-between bg-wolf-dark/60 border border-wolf-light/30 rounded p-3"
                >
                  <div>
                    <div className="font-semibold text-sm">{room.roomId}</div>
                    <div className="text-xs text-gray-400">
                      {room.playerCount}人 / {phaseLabel(room.phase)}
                    </div>
                  </div>
                  <button
                    onClick={() => onJoinRoom(room.roomId)}
                    disabled={isDisabled}
                    title={buttonTitle}
                    className="px-3 py-1.5 text-xs rounded bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition"
                  >
                    参加
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {selectedRoomId && (
          <p className="text-xs text-gray-500 mt-4">選択中ルーム: {selectedRoomId}</p>
        )}
      </div>
    </div>
  );
}
