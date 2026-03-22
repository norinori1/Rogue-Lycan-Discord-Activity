import { create } from 'zustand';
import type {
  PublicGameState,
  PrivatePlayerState,
  CardDefinition,
  CardInstance,
  MorningEvent,
  Phase,
  Faction,
} from '@shared/types';

interface GameOverInfo {
  winner: Faction;
  players: { id: string; name: string; faction: Faction; isAlive: boolean }[];
}

interface GameStore {
  // Connection
  myPlayerId: string | null;
  myName: string | null;
  isConnected: boolean;

  // Public state
  publicState: PublicGameState | null;

  // Private state
  privateState: PrivatePlayerState | null;

  // Build phase
  buildOptions: CardDefinition[] | null;

  // Morning
  morningEvents: MorningEvent[] | null;

  // Vote
  voteCounts: Record<string, number>;

  // Lobby
  readyPlayers: string[];

  // Game over
  gameOverInfo: GameOverInfo | null;

  // UI state
  selectedCard: CardInstance | null;
  selectedTarget: string | null;
  actionSubmitted: boolean;
  voteSubmitted: boolean;

  // Actions
  setConnection: (playerId: string, name: string) => void;
  setMyName: (name: string) => void;
  setPublicState: (state: PublicGameState) => void;
  setPrivateState: (state: PrivatePlayerState) => void;
  setPhase: (phase: Phase, deadline: number) => void;
  setBuildOptions: (cards: CardDefinition[]) => void;
  setMorningEvents: (events: MorningEvent[]) => void;
  setGameOver: (
    winner: Faction,
    players: { id: string; name: string; faction: Faction; isAlive: boolean }[]
  ) => void;
  setReadyPlayers: (playerIds: string[]) => void;
  setVoteCounts: (counts: Record<string, number>) => void;
  selectCard: (card: CardInstance | null) => void;
  selectTarget: (playerId: string | null) => void;
  setActionSubmitted: (submitted: boolean) => void;
  setVoteSubmitted: (submitted: boolean) => void;
  reset: () => void;
}

const initialState = {
  myPlayerId: null,
  myName: null,
  isConnected: false,
  publicState: null,
  privateState: null,
  buildOptions: null,
  morningEvents: null,
  voteCounts: {},
  readyPlayers: [],
  gameOverInfo: null,
  selectedCard: null,
  selectedTarget: null,
  actionSubmitted: false,
  voteSubmitted: false,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnection: (playerId, name) =>
    set({ myPlayerId: playerId, myName: name, isConnected: true }),

  setMyName: (name) => set({ myName: name }),

  setPublicState: (state) => set({ publicState: state }),

  setPrivateState: (state) => set({ privateState: state }),

  setPhase: (phase, deadline) =>
    set((s) => ({
      publicState: s.publicState
        ? { ...s.publicState, phase, phaseDeadline: deadline }
        : null,
      // Reset UI state on phase change
      buildOptions: phase === 'NIGHT_BUILD' ? s.buildOptions : null,
      selectedCard: null,
      selectedTarget: null,
      actionSubmitted: false,
      voteSubmitted: false,
      morningEvents: phase === 'MORNING_RESOLVE' ? s.morningEvents : null,
    })),

  setBuildOptions: (cards) => set({ buildOptions: cards }),

  setMorningEvents: (events) => set({ morningEvents: events }),

  setGameOver: (winner, players) => set({ gameOverInfo: { winner, players } }),

  setReadyPlayers: (playerIds) => set({ readyPlayers: playerIds }),

  setVoteCounts: (counts) => set({ voteCounts: counts }),

  selectCard: (card) => set({ selectedCard: card }),

  selectTarget: (playerId) => set({ selectedTarget: playerId }),

  setActionSubmitted: (submitted) => set({ actionSubmitted: submitted }),

  setVoteSubmitted: (submitted) => set({ voteSubmitted: submitted }),

  reset: () => set(initialState),
}));
