import { useEffect, useState } from 'react';
import { initDiscord, getAvatarUrl, type DiscordAuth } from './discord/setup';
import { connectToGame, emitJoin } from './discord/socket';
import { useGameStore } from './stores/gameStore';
import { Lobby } from './components/Lobby';
import { FactionReveal } from './components/FactionReveal';
import { NightBuild } from './components/NightBuild';
import { NightAction } from './components/NightAction';
import { MorningReport } from './components/MorningReport';
import { DayDiscussion } from './components/DayDiscussion';
import { DayVote } from './components/DayVote';
import { GameOver } from './components/GameOver';
import { GameHeader } from './components/GameHeader';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFactionReveal, setShowFactionReveal] = useState(false);
  const [prevPhase, setPrevPhase] = useState<string | null>(null);

  const publicState = useGameStore((s) => s.publicState);
  const privateState = useGameStore((s) => s.privateState);
  const phase = publicState?.phase ?? 'LOBBY';

  // Initialize Discord SDK or dev mode
  useEffect(() => {
    async function init() {
      try {
        // Check if running inside Discord
        const isDiscord = window.location.href.includes('discordsays');

        if (isDiscord) {
          const auth = await initDiscord();
          const avatarUrl = getAvatarUrl(auth.user.id, auth.user.avatar);
          const name = auth.user.global_name || auth.user.username;

          useGameStore.getState().setConnection(auth.user.id, name);

          const roomId = auth.channelId || 'default-room';
          connectToGame(roomId, auth.user.id);
          emitJoin(name, avatarUrl);
        } else {
          // Dev mode: generate random player
          const devId = `dev-${Math.random().toString(36).substring(2, 8)}`;
          const devName = `Player_${devId.substring(4, 8)}`;

          useGameStore.getState().setConnection(devId, devName);

          const roomId = new URLSearchParams(window.location.search).get('room') || 'dev-room';
          connectToGame(roomId, devId);
          emitJoin(devName, '');
        }

        setLoading(false);
      } catch (err) {
        console.error('[App] Init failed:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setLoading(false);
      }
    }

    init();
  }, []);

  // Show faction reveal when game starts (transition from LOBBY to NIGHT_BUILD)
  useEffect(() => {
    if (prevPhase === 'LOBBY' && phase === 'NIGHT_BUILD') {
      setShowFactionReveal(true);
      const timer = setTimeout(() => setShowFactionReveal(false), 5000);
      return () => clearTimeout(timer);
    }
    setPrevPhase(phase);
  }, [phase, prevPhase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-wolf-dark">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-wolf-accent mb-4">ROGUE-LYCAN</h1>
          <div className="animate-pulse text-gray-400">接続中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-wolf-dark">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-wolf-accent mb-4">ROGUE-LYCAN</h1>
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-wolf-light rounded hover:bg-wolf-accent transition"
          >
            再接続
          </button>
        </div>
      </div>
    );
  }

  if (showFactionReveal && privateState) {
    return <FactionReveal faction={privateState.faction} />;
  }

  return (
    <div className="min-h-screen bg-wolf-dark flex flex-col">
      {phase !== 'LOBBY' && phase !== 'GAME_OVER' && <GameHeader />}
      <main className="flex-1 flex flex-col">
        {phase === 'LOBBY' && <Lobby />}
        {phase === 'NIGHT_BUILD' && <NightBuild />}
        {phase === 'NIGHT_ACTION' && <NightAction />}
        {phase === 'MORNING_RESOLVE' && <MorningReport />}
        {phase === 'DAY_DISCUSSION' && <DayDiscussion />}
        {phase === 'DAY_VOTE' && <DayVote />}
        {phase === 'GAME_OVER' && <GameOver />}
      </main>
    </div>
  );
}

export default App;
