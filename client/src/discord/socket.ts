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
let connectedRoomId: string | null = null;
let connectedPlayerId: string | null = null;
let connectedAsSpectator = false;

// Stored join info so it can be re-emitted automatically on reconnect
// (handles server restarts / waking up from sleep)
let pendingJoinName: string | null = null;
let pendingJoinAvatarUrl: string | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectToGame(roomId: string, playerId: string, isSpectator = false): Socket {
  if (
    socket?.connected &&
    connectedRoomId === roomId &&
    connectedPlayerId === playerId &&
    connectedAsSpectator === isSpectator
  ) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
    connectedRoomId = null;
    connectedPlayerId = null;
    connectedAsSpectator = false;
    pendingJoinName = null;
    pendingJoinAvatarUrl = null;
  }

  const isDiscord = window.location.href.includes('discordsays');
  let url = import.meta.env.VITE_SERVER_URL || 'https://rogue-lycan-discord-activity.onrender.com';
  if (isDiscord) {
    url = '/.proxy';
  } else if (import.meta.env.DEV) {
    url = 'http://localhost:3001';
  }

  const query: Record<string, string> = { roomId, playerId };
  if (isSpectator) query.spectator = 'true';

  socket = io(url, {
    query,
    transports: ['websocket'],
  });
  connectedRoomId = roomId;
  connectedPlayerId = playerId;
  connectedAsSpectator = isSpectator;

  socket.on('connect', () => {
    console.log('[Socket] Connected');
    useGameStore.getState().setServerDown(false);
    // Re-emit player:join on every connect so that the player is registered
    // even after the server restarts or wakes up from sleep (all in-memory
    // state is lost on the server, so re-joining is necessary).
    // Spectators do not send player:join.
    if (!isSpectator && pendingJoinName !== null) {
      socket?.emit('player:join', { name: pendingJoinName, avatarUrl: pendingJoinAvatarUrl ?? '' });
    }
  });

  socket.on('state:full', (state: PublicGameState) => {
    useGameStore.getState().setPublicState(state);
    // Auto-rejoin: if we're in LOBBY but not in the player list, re-emit player:join.
    // This handles the case where the server was sleeping and the WebSocket connected
    // through a proxy layer before the server was fully ready (player:join was lost).
    if (!isSpectator && state.phase === 'LOBBY' && pendingJoinName !== null && connectedPlayerId !== null) {
      const isInList = state.players.some((p) => p.id === connectedPlayerId);
      if (!isInList && socket?.connected) {
        socket.emit('player:join', { name: pendingJoinName, avatarUrl: pendingJoinAvatarUrl ?? '' });
      }
    }
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

  socket.on('spectator:joined', () => {
    useGameStore.getState().setSpectator(true);
  });

  socket.on('spectator:error', (data: { message: string }) => {
    console.error('[Socket] Spectator error:', data.message);
    useGameStore.getState().setServerDown(true);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    // Show the server-down banner on unexpected disconnects so the user knows
    // the connection was lost and reconnection is in progress.
    // 'io client disconnect' means we intentionally called socket.disconnect().
    if (reason !== 'io client disconnect') {
      useGameStore.getState().setServerDown(true);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
    useGameStore.getState().setServerDown(true);
  });

  return socket;
}

// ===== Emit helpers =====

export function emitJoin(name: string, avatarUrl: string): void {
  // Always persist the latest join info so it can be re-sent on reconnect.
  pendingJoinName = name;
  pendingJoinAvatarUrl = avatarUrl;
  // Only emit immediately if already connected; otherwise the 'connect'
  // event handler above will send it once the connection is established.
  if (socket?.connected) {
    socket.emit('player:join', { name, avatarUrl });
  }
}

export function emitRename(name: string): void {
  socket?.emit('player:rename', { name });
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
