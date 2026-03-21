import { useGameStore } from '../stores/gameStore';
import { emitVote } from '../discord/socket';
import { PlayerList } from './PlayerList';

export function DayVote() {
  const selectedTarget = useGameStore((s) => s.selectedTarget);
  const voteSubmitted = useGameStore((s) => s.voteSubmitted);
  const selectTarget = useGameStore((s) => s.selectTarget);
  const setVoteSubmitted = useGameStore((s) => s.setVoteSubmitted);
  const privateState = useGameStore((s) => s.privateState);

  const handleVote = () => {
    if (!selectedTarget || voteSubmitted) return;
    emitVote(selectedTarget);
    setVoteSubmitted(true);
  };

  if (voteSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="text-2xl mb-2">🗳️</div>
          <p className="text-gray-400">投票しました</p>
          <p className="text-gray-500 text-sm mt-1">
            他のプレイヤーの投票を待っています...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-6 animate-fade-in">
      <h2 className="text-xl font-bold mb-1">投票</h2>
      <p className="text-gray-400 text-sm mb-6">追放するプレイヤーを選んでください</p>

      <div className="w-full max-w-md mb-6">
        <PlayerList
          selectable
          onSelect={(id) =>
            selectTarget(selectedTarget === id ? null : id)
          }
          selectedId={selectedTarget}
          showVotes
        />
      </div>

      {privateState && (
        <p className="text-sm text-gray-400 mb-4">
          あなたの投票権:{' '}
          <span className="text-wolf-gold font-bold">
            {privateState.stack ? 1 : 1}票
          </span>
        </p>
      )}

      <button
        onClick={handleVote}
        disabled={!selectedTarget}
        className="px-8 py-3 rounded-lg font-bold bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition"
      >
        投票する
      </button>
    </div>
  );
}
