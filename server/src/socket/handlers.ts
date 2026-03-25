import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/GameManager.js';

const rooms = new Map<string, GameManager>();

export interface RoomSummary {
  roomId: string;
  playerCount: number;
  phase: string;
}

export function getRoomSummaries(): RoomSummary[] {
  return Array.from(rooms.entries())
    .map(([roomId, game]) => ({
      roomId,
      playerCount: game.players.length,
      phase: game.phase,
    }))
    .sort((a, b) => a.roomId.localeCompare(b.roomId));
}

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const roomId = socket.handshake.query.roomId as string;
    const playerId = socket.handshake.query.playerId as string;

    if (!roomId || !playerId) {
      socket.disconnect();
      return;
    }

    console.log(`[Socket] Player ${playerId} connected to room ${roomId}`);

    // Join socket room
    socket.join(roomId);

    // Get or create game manager
    if (!rooms.has(roomId)) {
      const gm = new GameManager(roomId);
      setupGameCallbacks(gm, io);
      rooms.set(roomId, gm);
    }
    const game = rooms.get(roomId)!;

    // Send current state on connect
    socket.emit('state:full', game.getPublicState());
    const privateState = game.getPrivateState(playerId);
    if (privateState) {
      socket.emit('state:private', privateState);
    }

    // ===== Event Handlers =====

    socket.on('player:join', (data: { name: string; avatarUrl: string }) => {
      game.addPlayer(playerId, data.name, data.avatarUrl);
      broadcastState(game, io);
    });

    socket.on('player:rename', (data: { name: string }) => {
      game.renamePlayer(playerId, data.name);
      broadcastState(game, io);
    });

    socket.on('player:ready', () => {
      game.setReady(playerId);
      broadcastState(game, io);
    });

    socket.on('build:select', (data: { cardId: string }) => {
      game.selectBuildCard(playerId, data.cardId);
    });

    socket.on(
      'action:submit',
      (data: { cardInstanceId: string; targetId: string | null; transferCardInstanceId?: string }) => {
        game.submitAction(
          playerId,
          data.cardInstanceId,
          data.targetId,
          data.transferCardInstanceId
        );
      }
    );

    socket.on('action:skip', () => {
      game.skipAction(playerId);
    });

    socket.on('vote:cast', (data: { targetId: string }) => {
      game.castVote(playerId, data.targetId);
      // Broadcast updated vote counts
      const counts = game.getVoteCounts();
      const votesObj: Record<string, number> = {};
      counts.forEach((v, k) => (votesObj[k] = v));
      io.to(roomId).emit('vote:update', votesObj);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Player ${playerId} disconnected from room ${roomId}`);

      // In lobby, remove disconnected player
      if (game.phase === 'LOBBY') {
        game.removePlayer(playerId);
        broadcastState(game, io);
      }

      // Clean up empty rooms
      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (!socketsInRoom || socketsInRoom.size === 0) {
        game.destroy();
        rooms.delete(roomId);
        console.log(`[Socket] Room ${roomId} destroyed`);
      }
    });
  });
}

function setupGameCallbacks(game: GameManager, io: Server): void {
  game.onPhaseChange = (phase, deadline) => {
    io.to(game.roomId).emit('phase:changed', { phase, deadline });
  };

  game.onBuildOptions = (playerId, cards) => {
    // Send to specific player only
    const sockets = io.sockets.adapter.rooms.get(game.roomId);
    if (!sockets) return;
    for (const socketId of sockets) {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.handshake.query.playerId === playerId) {
        s.emit('build:options', { cards });
      }
    }
  };

  game.onStateUpdate = () => {
    broadcastState(game, io);
  };

  game.onMorningReport = (events) => {
    io.to(game.roomId).emit('morning:report', { events });
  };

  game.onGameOver = (result) => {
    // Send full player info (reveal factions)
    const players = game.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      hp: p.hp,
      faction: p.faction,
      isAlive: p.isAlive,
    }));
    io.to(game.roomId).emit('game:over', { winner: result.winner, players });
  };

  game.onPrivateUpdate = (playerId) => {
    const sockets = io.sockets.adapter.rooms.get(game.roomId);
    if (!sockets) return;
    for (const socketId of sockets) {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.handshake.query.playerId === playerId) {
        const privateState = game.getPrivateState(playerId);
        if (privateState) {
          s.emit('state:private', privateState);
        }
      }
    }
  };
}

function broadcastState(game: GameManager, io: Server): void {
  const publicState = game.getPublicState();
  io.to(game.roomId).emit('state:full', publicState);

  // Also send ready status in lobby
  if (game.phase === 'LOBBY') {
    const readyPlayers = Array.from(game.getReadyPlayers());
    io.to(game.roomId).emit('lobby:ready', { readyPlayers });
  }

  // Send private state to each player
  const sockets = io.sockets.adapter.rooms.get(game.roomId);
  if (!sockets) return;
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId);
    if (s) {
      const pid = s.handshake.query.playerId as string;
      const ps = game.getPrivateState(pid);
      if (ps) {
        s.emit('state:private', ps);
      }
    }
  }
}
