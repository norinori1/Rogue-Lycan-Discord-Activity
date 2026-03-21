import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore';
import type {
  PublicGameState,
  PrivatePlayerState,
  CardDefinition,
  MorningEvent,
  Faction,
} from '@shared/types';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectToGame(roomId: string, playerId: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const url = import.meta.env.DEV ? 'http://localhost:3001' : '/.proxy';

  socket = io(url, {
    query: { roomId, playerId },
    transports: ['websocket'],
  });

  const store = useGameStore.getState();

  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  socket.on('state:full', (state: PublicGameState) => {
    useGameStore.getState().setPublicState(state);
  });

  socket.on('state:private', (state: PrivatePlayerState) => {
    useGameStore.getState().setPrivateState(state);
  });

  socket.on('phase:changed', (data: { phase: string; deadline: number }) => {
    useGameStore.getState().setPhase(data.phase as any, data.deadline);
  });

  socket.on('build:options', (data: { cards: CardDefinition[] }) => {
    useGameStore.getState().setBuildOptions(data.cards);
  });

  socket.on('morning:report', (data: { events: MorningEvent[] }) => {
    useGameStore.getState().setMorningEvents(data.events);
  });

  socket.on(
    'game:over',
    (data: {
      winner: Faction;
      players: { id: string; name: string; faction: Faction; isAlive: boolean }[];
    }) => {
      useGameStore.getState().setGameOver(data.winner, data.players);
    }
  );

  socket.on('lobby:ready', (data: { readyPlayers: string[] }) => {
    useGameStore.getState().setReadyPlayers(data.readyPlayers);
  });

  socket.on('vote:update', (data: Record<string, number>) => {
    useGameStore.getState().setVoteCounts(data);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  return socket;
}

// ===== Emit helpers =====

export function emitJoin(name: string, avatarUrl: string): void {
  socket?.emit('player:join', { name, avatarUrl });
}

export function emitReady(): void {
  socket?.emit('player:ready');
}

export function emitBuildSelect(cardId: string): void {
  socket?.emit('build:select', { cardId });
}

export function emitActionSubmit(
  cardInstanceId: string,
  targetId: string | null,
  transferCardInstanceId?: string
): void {
  socket?.emit('action:submit', { cardInstanceId, targetId, transferCardInstanceId });
}

export function emitActionSkip(): void {
  socket?.emit('action:skip');
}

export function emitVote(targetId: string): void {
  socket?.emit('vote:cast', { targetId });
}
