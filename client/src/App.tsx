import { useEffect, useRef, useState } from 'react';
import { initDiscord, getAvatarUrl, type DiscordAuth } from './discord/setup';
import { connectToGame, emitJoin } from './discord/socket';
import { useGameStore } from './stores/gameStore';
import { Lobby } from './components/Lobby';
import { RoomSelector } from './components/RoomSelector';
import { FactionReveal } from './components/FactionReveal';
import { NightBuild } from './components/NightBuild';
import { NightAction } from './components/NightAction';
import { MorningReport } from './components/MorningReport';
import { DayDiscussion } from './components/DayDiscussion';
import { DayVote } from './components/DayVote';
import { GameOver } from './components/GameOver';
import { GameHeader } from './components/GameHeader';
import { SpectatorView } from './components/SpectatorView';
import { EliminatedPrompt } from './components/EliminatedPrompt';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFactionReveal, setShowFactionReveal] = useState(false);
  const [prevPhase, setPrevPhase] = useState<string | null>(null);
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(null);
  const [isSpectating, setIsSpectating] = useState(false);
  const [showEliminatedPrompt, setShowEliminatedPrompt] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isDiscordMode, setIsDiscordMode] = useState(false);

  const hasInitialized = useRef(false);
  const wasAlive = useRef<boolean | null>(null);

  const publicState = useGameStore((s) => s.publicState);
  const privateState = useGameStore((s) => s.privateState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const myName = useGameStore((s) => s.myName);
  const isSpectator = useGameStore((s) => s.isSpectator);
  const phase = publicState?.phase ?? 'LOBBY';

  // Detect when my player transitions from alive to eliminated (during an active game)
  const myPlayer = publicState?.players.find((p) => p.id === myPlayerId);
  const myPlayerIsAlive = myPlayer?.isAlive;
  useEffect(() => {
    if (myPlayerIsAlive === undefined || isSpectating || phase === 'LOBBY' || phase === 'GAME_OVER') return;

    if (wasAlive.current === null) {
      // First observation — record initial alive state
      wasAlive.current = myPlayerIsAlive;
      return;
    }

    if (wasAlive.current && !myPlayerIsAlive) {
      // Transitioned from alive to dead
      setShowEliminatedPrompt(true);
    }
    wasAlive.current = myPlayerIsAlive;
  }, [myPlayerIsAlive, isSpectating, phase]);

  // Reset wasAlive tracking when we (re)enter a room as a player
  useEffect(() => {
    if (phase === 'LOBBY') {
      wasAlive.current = null;
      setShowEliminatedPrompt(false);
    }
  }, [phase]);

  const handleSpectate = () => {
    setShowEliminatedPrompt(false);
    setIsSpectating(true);
  };

  const handleLeave = () => {
    window.location.reload();
  };

  // Initialize Discord SDK or dev mode
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function init() {
      try {
        // Check if running inside Discord
        const isDiscord = window.location.href.includes('discordsays');

        if (isDiscord) {
          setIsDiscordMode(true);
          const auth = await initDiscord();
          const resolvedAvatarUrl = getAvatarUrl(auth.user.id, auth.user.avatar);
          const name = auth.user.global_name || auth.user.username;

          useGameStore.getState().setConnection(auth.user.id, name);
          setAvatarUrl(resolvedAvatarUrl);

          const roomId = auth.channelId || 'default-room';
          setResolvedRoomId(roomId);
        } else {
          // Dev mode: generate random player
          const devId = `dev-${Math.random().toString(36).substring(2, 8)}`;
          const devName = `Player_${devId.substring(4, 8)}`;

          useGameStore.getState().setConnection(devId, devName);

          const roomId = new URLSearchParams(window.location.search).get('room');
          if (roomId) {
            setResolvedRoomId(roomId);
          }
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

  useEffect(() => {
    if (!resolvedRoomId) return;
    if (!myPlayerId || !myName) return;
    connectToGame(resolvedRoomId, myPlayerId, isSpectating);
    if (!isSpectating) {
      emitJoin(myName, avatarUrl);
    }
  }, [resolvedRoomId, avatarUrl, myPlayerId, myName, isSpectating]);

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

  if (!isDiscordMode && !resolvedRoomId) {
    return (
      <RoomSelector
        playerName={myName ?? 'Player'}
        selectedRoomId=""
        onJoinRoom={(roomId) => {
          setIsSpectating(false);
          setResolvedRoomId(roomId);
        }}
        onSpectateRoom={(roomId) => {
          setIsSpectating(true);
          setResolvedRoomId(roomId);
        }}
      />
    );
  }

  // Spectator banner shown at top (for non-LOBBY, non-GAME_OVER phases)
  const showSpectatorBadge = isSpectator && phase !== 'LOBBY' && phase !== 'GAME_OVER';

  return (
    <div className="min-h-screen bg-wolf-dark flex flex-col">
      {phase !== 'LOBBY' && phase !== 'GAME_OVER' && <GameHeader />}
      {showSpectatorBadge && (
        <div className="bg-wolf-mid/80 border-b border-wolf-light/20 py-1 px-4 text-center">
          <span className="text-xs text-gray-400">🔭 観戦モード — 操作はできません</span>
        </div>
      )}
      <main className="flex-1 flex flex-col">
        {phase === 'LOBBY' && <Lobby />}
        {phase === 'NIGHT_BUILD' && (isSpectator ? <SpectatorView /> : <NightBuild />)}
        {phase === 'NIGHT_ACTION' && (isSpectator ? <SpectatorView /> : <NightAction />)}
        {phase === 'MORNING_RESOLVE' && <MorningReport />}
        {phase === 'DAY_DISCUSSION' && <DayDiscussion />}
        {phase === 'DAY_VOTE' && (isSpectator ? <SpectatorView /> : <DayVote />)}
        {phase === 'GAME_OVER' && <GameOver />}
      </main>
      {showEliminatedPrompt && (
        <EliminatedPrompt onSpectate={handleSpectate} onLeave={handleLeave} />
      )}
    </div>
  );
}

export default App;
