import { useEffect, useState } from 'react';
import { useGameStore } from '../stores/gameStore';

const PHASE_LABELS: Record<string, string> = {
  NIGHT_BUILD: '夜・構築',
  NIGHT_ACTION: '夜・行動',
  MORNING_RESOLVE: '朝・報告',
  DAY_DISCUSSION: '昼・議論',
  DAY_VOTE: '昼・投票',
};

export function GameHeader() {
  const publicState = useGameStore((s) => s.publicState);
  const privateState = useGameStore((s) => s.privateState);
  const myName = useGameStore((s) => s.myName);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!publicState?.phaseDeadline) return;

    const update = () => {
      const remaining = Math.max(0, publicState.phaseDeadline - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [publicState?.phaseDeadline]);

  if (!publicState) return null;

  const phase = publicState.phase;
  const isNight = phase.startsWith('NIGHT');

  return (
    <header
      className={`px-4 py-3 border-b flex items-center justify-between ${
        isNight ? 'bg-wolf-dark border-indigo-900' : 'bg-wolf-mid border-wolf-light'
      }`}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-wolf-accent">ROGUE-LYCAN</h1>
        <span className="text-sm text-gray-400">
          {publicState.turn > 0 && `${publicState.turn}日目`}
        </span>
        {myName && (
          <span className="text-xs text-gray-300 border border-wolf-light/40 rounded px-1.5 py-0.5">
            {myName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          {PHASE_LABELS[phase] || phase}
        </span>
        {timeLeft > 0 && (
          <span
            className={`text-lg font-mono font-bold ${
              timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-wolf-gold'
            }`}
          >
            {timeLeft}s
          </span>
        )}
        {privateState && (
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              privateState.faction === 'werewolf'
                ? 'bg-red-900/50 text-red-300'
                : 'bg-blue-900/50 text-blue-300'
            }`}
          >
            {privateState.faction === 'werewolf' ? '人狼' : '市民'}
          </span>
        )}
      </div>
    </header>
  );
}
