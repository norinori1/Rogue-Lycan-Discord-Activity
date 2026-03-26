import { useCallback, useEffect, useMemo, useState } from 'react';
import { GAME_CONSTANTS } from '@shared/types';
import { CardShowcase } from './CardShowcase';

const ROOM_LIST_REFRESH_INTERVAL_MS = 10000;

interface RoomSummary {
  roomId: string;
  playerCount: number;
  phase: string;
  spectatorCount: number;
}

interface Props {
  playerName: string;
  selectedRoomId: string;
  onJoinRoom: (roomId: string) => void;
  onSpectateRoom: (roomId: string) => void;
}

function phaseLabel(phase: string): string {
  if (phase === 'LOBBY') return 'ロビー';
  if (phase === 'GAME_OVER') return '終了';
  return '進行中';
}

export function RoomSelector({ playerName, selectedRoomId, onJoinRoom, onSpectateRoom }: Props) {
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
    if (!id || loading || error) return;
    onJoinRoom(id);
  }, [newRoomId, loading, error, onJoinRoom]);

  const hasRoomId = !!newRoomId.trim();
  const hasError = error !== null;
  const isCreateAndJoinDisabled = !hasRoomId || loading || hasError;
  const createDisabledReason = !hasRoomId
    ? 'ルームIDを入力してください'
    : hasError
    ? 'サーバに接続できません'
    : loading
    ? '読み込み中...'
    : undefined;

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
                disabled={isCreateAndJoinDisabled}
                title={createDisabledReason}
                aria-label="作成して参加"
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
              const isGameOver = room.phase === 'GAME_OVER';
              const isFull = room.playerCount >= GAME_CONSTANTS.MAX_PLAYERS;
              const canJoin = isInLobby && !isFull;
              const canSpectate = !isInLobby && !isGameOver;
              const joinDisabled = !canJoin;
              const joinTitle = !isInLobby
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
                      {room.playerCount}人{room.spectatorCount > 0 ? ` / 観戦${room.spectatorCount}人` : ''} / {phaseLabel(room.phase)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canSpectate && (
                      <button
                        onClick={() => onSpectateRoom(room.roomId)}
                        title="観戦する"
                        className="px-3 py-1.5 text-xs rounded bg-wolf-mid border border-wolf-light/50 hover:border-wolf-gold hover:text-wolf-gold transition"
                      >
                        観戦
                      </button>
                    )}
                    <button
                      onClick={() => onJoinRoom(room.roomId)}
                      disabled={joinDisabled}
                      title={joinTitle}
                      className="px-3 py-1.5 text-xs rounded bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition"
                    >
                      参加
                    </button>
                  </div>
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
