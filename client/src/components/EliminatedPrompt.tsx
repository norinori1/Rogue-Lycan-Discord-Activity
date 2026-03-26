interface Props {
  onSpectate: () => void;
  onLeave: () => void;
}

export function EliminatedPrompt({ onSpectate, onLeave }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
      <div className="bg-wolf-mid border border-wolf-light rounded-xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <div className="text-5xl mb-4">💀</div>
        <h2 className="text-2xl font-bold text-wolf-accent mb-2">脱落しました</h2>
        <p className="text-gray-400 text-sm mb-8">
          あなたはゲームから脱落しました。
          <br />
          このゲームを観戦しますか？
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onSpectate}
            className="w-full px-6 py-3 rounded-lg font-bold bg-wolf-light hover:bg-gray-500 transition text-white"
          >
            🔭 観戦する
          </button>
          <button
            onClick={onLeave}
            className="w-full px-6 py-3 rounded-lg font-bold bg-wolf-accent hover:bg-red-600 transition"
          >
            ゲームから離れる
          </button>
        </div>
      </div>
    </div>
  );
}
