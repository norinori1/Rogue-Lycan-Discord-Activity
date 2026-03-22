import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { emitReady, emitRename } from '../discord/socket';
import { GAME_CONSTANTS } from '@shared/types';

export function Lobby() {
  const publicState = useGameStore((s) => s.publicState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const myName = useGameStore((s) => s.myName);
  const setMyName = useGameStore((s) => s.setMyName);
  const readyPlayers = useGameStore((s) => s.readyPlayers);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const players = publicState?.players ?? [];
  const isReady = myPlayerId ? readyPlayers.includes(myPlayerId) : false;
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
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      {/* Own name display - top left */}
      <div className="w-full max-w-md mb-4 flex items-center gap-2">
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

      <div className="w-full max-w-md bg-wolf-mid rounded-lg p-6 border border-wolf-light">
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

        {!isReady ? (
          <button
            onClick={() => emitReady()}
            disabled={players.length < GAME_CONSTANTS.MIN_PLAYERS}
            className="w-full py-3 rounded-lg font-bold text-lg bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition"
          >
            準備完了
          </button>
        ) : (
          <div className="text-center text-green-400 py-3">
            {canStart ? 'まもなくゲーム開始...' : '他のプレイヤーを待っています...'}
          </div>
        )}
      </div>
    </div>
  );
}
