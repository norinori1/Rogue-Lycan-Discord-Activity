import { useGameStore } from '../stores/gameStore';
import { emitRestart } from '../discord/socket';

export function GameOver() {
  const gameOverInfo = useGameStore((s) => s.gameOverInfo);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  if (!gameOverInfo) return null;

  const isWolf = gameOverInfo.winner === 'werewolf';
  const myFaction = gameOverInfo.players.find((p) => p.id === myPlayerId)?.faction;
  const didWin = myFaction === gameOverInfo.winner;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="text-6xl mb-4">{isWolf ? '🐺' : '🏘️'}</div>
      <h2
        className={`text-3xl font-bold mb-2 ${
          isWolf ? 'text-red-400' : 'text-blue-400'
        }`}
      >
        {isWolf ? '人狼の勝利' : '市民の勝利'}
      </h2>
      <p
        className={`text-lg mb-8 ${
          didWin ? 'text-wolf-gold' : 'text-gray-400'
        }`}
      >
        {didWin ? 'あなたの勝利です！' : 'あなたは敗北しました...'}
      </p>

      {/* Player reveal */}
      <div className="w-full max-w-md">
        <h3 className="text-sm text-gray-400 mb-3 text-center">全プレイヤーの正体</h3>
        <div className="space-y-2">
          {gameOverInfo.players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                player.faction === 'werewolf'
                  ? 'border-red-800 bg-red-900/10'
                  : 'border-blue-800 bg-blue-900/10'
              } ${!player.isAlive ? 'opacity-50' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-wolf-light flex items-center justify-center text-sm font-bold">
                {player.name.charAt(0)}
              </div>
              <span className="flex-1 font-medium">{player.name}</span>
              <span
                className={`text-sm font-bold ${
                  player.faction === 'werewolf'
                    ? 'text-red-400'
                    : 'text-blue-400'
                }`}
              >
                {player.faction === 'werewolf' ? '🐺 人狼' : '🏘️ 市民'}
              </span>
              {!player.isAlive && (
                <span className="text-xs text-gray-500">脱落</span>
              )}
              {player.id === myPlayerId && (
                <span className="text-xs text-wolf-gold">あなた</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => emitRestart()}
        className="mt-8 px-6 py-3 rounded-lg font-bold bg-wolf-accent hover:bg-red-600 transition"
      >
        もう一度遊ぶ
      </button>
    </div>
  );
}
