import {
  GameState,
  Player,
  Phase,
  Faction,
  PublicGameState,
  PublicPlayer,
  PrivatePlayerState,
  PlayerAction,
  MorningEvent,
  WinResult,
  CardDefinition,
  OracleResult,
  GAME_CONSTANTS,
} from '../../../shared/types';
import { drawCards, createCardInstance } from './CardEngine';
import { resolveActions } from './ActionResolver';

export class GameManager {
  private state: GameState;
  private readyPlayers = new Set<string>();
  private buildSelections = new Map<string, string>(); // playerId -> cardId
  private buildOptionsMap = new Map<string, CardDefinition[]>(); // playerId -> offered cards
  private nightActions: PlayerAction[] = [];
  private nightActionSubmitted = new Set<string>();
  private votes = new Map<string, string>(); // voterId -> targetId
  private oracleHistory = new Map<string, OracleResult[]>(); // playerId -> results
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;

  // Callbacks
  public onPhaseChange?: (phase: Phase, deadline: number) => void;
  public onBuildOptions?: (playerId: string, cards: CardDefinition[]) => void;
  public onStateUpdate?: () => void;
  public onMorningReport?: (events: MorningEvent[]) => void;
  public onGameOver?: (result: WinResult) => void;
  public onPrivateUpdate?: (playerId: string) => void;

  constructor(roomId: string) {
    this.state = {
      roomId,
      phase: 'LOBBY',
      turn: 0,
      players: [],
      logs: [],
      phaseDeadline: 0,
    };
  }

  get phase(): Phase {
    return this.state.phase;
  }

  get players(): Player[] {
    return this.state.players;
  }

  get roomId(): string {
    return this.state.roomId;
  }

  addPlayer(id: string, name: string, avatarUrl: string): boolean {
    if (this.state.phase !== 'LOBBY') return false;
    if (this.state.players.length >= GAME_CONSTANTS.MAX_PLAYERS) return false;
    if (this.state.players.find((p) => p.id === id)) return true; // already in

    this.state.players.push({
      id,
      name,
      avatarUrl,
      hp: GAME_CONSTANTS.STARTING_HP,
      maxHp: GAME_CONSTANTS.STARTING_MAX_HP,
      faction: 'citizen',
      stack: [],
      voteWeight: 1,
      isAlive: true,
    });

    this.onStateUpdate?.();
    return true;
  }

  removePlayer(id: string): void {
    if (this.state.phase !== 'LOBBY') return;
    this.state.players = this.state.players.filter((p) => p.id !== id);
    this.readyPlayers.delete(id);
    this.onStateUpdate?.();
  }

  setReady(playerId: string): void {
    if (this.state.phase !== 'LOBBY') return;
    this.readyPlayers.add(playerId);
    this.onStateUpdate?.();

    if (
      this.state.players.length >= GAME_CONSTANTS.MIN_PLAYERS &&
      this.readyPlayers.size === this.state.players.length
    ) {
      this.startGame();
    }
  }

  isReady(playerId: string): boolean {
    return this.readyPlayers.has(playerId);
  }

  private startGame(): void {
    // Assign factions
    const numWolves = Math.floor(this.state.players.length / 3);
    const shuffled = [...this.state.players].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      const player = this.state.players.find((p) => p.id === shuffled[i].id)!;
      player.faction = i < numWolves ? 'werewolf' : 'citizen';
    }

    // Initialize oracle history
    for (const p of this.state.players) {
      this.oracleHistory.set(p.id, []);
    }

    this.state.turn = 1;
    this.transitionTo('NIGHT_BUILD');
  }

  private transitionTo(phase: Phase): void {
    this.state.phase = phase;

    // Clear phase timer
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    switch (phase) {
      case 'NIGHT_BUILD':
        this.beginNightBuild();
        break;
      case 'NIGHT_ACTION':
        this.beginNightAction();
        break;
      case 'MORNING_RESOLVE':
        this.beginMorningResolve();
        break;
      case 'DAY_DISCUSSION':
        this.beginDayDiscussion();
        break;
      case 'DAY_VOTE':
        this.beginDayVote();
        break;
      case 'GAME_OVER':
        break;
    }
  }

  // ===== NIGHT BUILD =====

  private beginNightBuild(): void {
    this.buildSelections.clear();
    this.buildOptionsMap.clear();

    const deadline = Date.now() + GAME_CONSTANTS.NIGHT_BUILD_TIME;
    this.state.phaseDeadline = deadline;

    // Draw 3 cards for each alive player
    for (const player of this.alivePlayers()) {
      const cards = drawCards(GAME_CONSTANTS.BUILD_CHOICES);
      this.buildOptionsMap.set(player.id, cards);
      this.onBuildOptions?.(player.id, cards);
    }

    this.onPhaseChange?.('NIGHT_BUILD', deadline);
    this.onStateUpdate?.();

    this.phaseTimer = setTimeout(() => {
      this.finalizeBuild();
    }, GAME_CONSTANTS.NIGHT_BUILD_TIME);
  }

  selectBuildCard(playerId: string, cardId: string): boolean {
    if (this.state.phase !== 'NIGHT_BUILD') return false;
    const options = this.buildOptionsMap.get(playerId);
    if (!options || !options.find((c) => c.id === cardId)) return false;

    this.buildSelections.set(playerId, cardId);

    // Check if all alive players have selected
    if (this.buildSelections.size === this.alivePlayers().length) {
      this.finalizeBuild();
    }
    return true;
  }

  private finalizeBuild(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    for (const player of this.alivePlayers()) {
      const selectedCardId = this.buildSelections.get(player.id);
      if (selectedCardId) {
        const instance = createCardInstance(selectedCardId as any);
        if (player.stack.length >= GAME_CONSTANTS.MAX_STACK_SIZE) {
          // Auto-discard oldest
          player.stack.shift();
        }
        player.stack.push(instance);
      } else {
        // Auto-select first card if timed out
        const options = this.buildOptionsMap.get(player.id);
        if (options && options.length > 0) {
          const instance = createCardInstance(options[0].id);
          if (player.stack.length >= GAME_CONSTANTS.MAX_STACK_SIZE) {
            player.stack.shift();
          }
          player.stack.push(instance);
        }
      }
      this.onPrivateUpdate?.(player.id);
    }

    this.transitionTo('NIGHT_ACTION');
  }

  // ===== NIGHT ACTION =====

  private beginNightAction(): void {
    this.nightActions = [];
    this.nightActionSubmitted.clear();

    const deadline = Date.now() + GAME_CONSTANTS.NIGHT_ACTION_TIME;
    this.state.phaseDeadline = deadline;

    this.onPhaseChange?.('NIGHT_ACTION', deadline);
    this.onStateUpdate?.();

    this.phaseTimer = setTimeout(() => {
      this.finalizeNightActions();
    }, GAME_CONSTANTS.NIGHT_ACTION_TIME);
  }

  submitAction(
    playerId: string,
    cardInstanceId: string,
    targetId: string | null,
    transferCardInstanceId?: string
  ): boolean {
    if (this.state.phase !== 'NIGHT_ACTION') return false;
    if (this.nightActionSubmitted.has(playerId)) return false;

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player || !player.isAlive) return false;

    const card = player.stack.find((c) => c.instanceId === cardInstanceId);
    if (!card) return false;

    this.nightActions.push({
      playerId,
      cardInstanceId,
      cardId: card.cardId,
      targetId,
      transferCardInstanceId,
    });
    this.nightActionSubmitted.add(playerId);

    if (this.nightActionSubmitted.size === this.alivePlayers().length) {
      this.finalizeNightActions();
    }
    return true;
  }

  skipAction(playerId: string): boolean {
    if (this.state.phase !== 'NIGHT_ACTION') return false;
    if (this.nightActionSubmitted.has(playerId)) return false;

    this.nightActionSubmitted.add(playerId);

    if (this.nightActionSubmitted.size === this.alivePlayers().length) {
      this.finalizeNightActions();
    }
    return true;
  }

  private finalizeNightActions(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    const { events, logs, oracleResults } = resolveActions(
      this.state.players,
      this.nightActions,
      this.state.turn
    );

    this.state.logs.push(...logs);

    // Store oracle results
    for (const [playerId, result] of oracleResults) {
      const history = this.oracleHistory.get(playerId) || [];
      history.push({
        targetId: result.targetId,
        targetName: result.targetName,
        faction: result.faction as any,
        turn: this.state.turn,
      });
      this.oracleHistory.set(playerId, history);
      this.onPrivateUpdate?.(playerId);
    }

    this.onMorningReport?.(events);
    this.transitionTo('MORNING_RESOLVE');
  }

  // ===== MORNING RESOLVE =====

  private beginMorningResolve(): void {
    const deadline = Date.now() + GAME_CONSTANTS.MORNING_RESOLVE_TIME;
    this.state.phaseDeadline = deadline;

    this.onPhaseChange?.('MORNING_RESOLVE', deadline);
    this.onStateUpdate?.();

    // Check win condition
    const winResult = this.checkWinCondition();
    if (winResult) {
      this.phaseTimer = setTimeout(() => {
        this.state.phase = 'GAME_OVER';
        this.onGameOver?.(winResult);
        this.onPhaseChange?.('GAME_OVER', 0);
        this.onStateUpdate?.();
      }, GAME_CONSTANTS.MORNING_RESOLVE_TIME);
    } else {
      this.phaseTimer = setTimeout(() => {
        this.transitionTo('DAY_DISCUSSION');
      }, GAME_CONSTANTS.MORNING_RESOLVE_TIME);
    }
  }

  // ===== DAY DISCUSSION =====

  private beginDayDiscussion(): void {
    const deadline = Date.now() + GAME_CONSTANTS.DAY_DISCUSSION_TIME;
    this.state.phaseDeadline = deadline;

    this.onPhaseChange?.('DAY_DISCUSSION', deadline);
    this.onStateUpdate?.();

    this.phaseTimer = setTimeout(() => {
      this.transitionTo('DAY_VOTE');
    }, GAME_CONSTANTS.DAY_DISCUSSION_TIME);
  }

  // ===== DAY VOTE =====

  private beginDayVote(): void {
    this.votes.clear();

    const deadline = Date.now() + GAME_CONSTANTS.DAY_VOTE_TIME;
    this.state.phaseDeadline = deadline;

    this.onPhaseChange?.('DAY_VOTE', deadline);
    this.onStateUpdate?.();

    this.phaseTimer = setTimeout(() => {
      this.finalizeVotes();
    }, GAME_CONSTANTS.DAY_VOTE_TIME);
  }

  castVote(playerId: string, targetId: string): boolean {
    if (this.state.phase !== 'DAY_VOTE') return false;
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player || !player.isAlive) return false;
    if (player.voteWeight <= 0) return false;

    const target = this.state.players.find((p) => p.id === targetId);
    if (!target || !target.isAlive) return false;

    this.votes.set(playerId, targetId);

    if (this.votes.size === this.alivePlayers().filter((p) => p.voteWeight > 0).length) {
      this.finalizeVotes();
    }
    return true;
  }

  private finalizeVotes(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }

    // Count votes with weights
    const voteCounts = new Map<string, number>();
    for (const [voterId, targetId] of this.votes) {
      const voter = this.state.players.find((p) => p.id === voterId);
      if (!voter) continue;
      const current = voteCounts.get(targetId) || 0;
      voteCounts.set(targetId, current + voter.voteWeight);
    }

    // Find max votes
    let maxVotes = 0;
    let topTargets: string[] = [];
    for (const [targetId, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        topTargets = [targetId];
      } else if (count === maxVotes) {
        topTargets.push(targetId);
      }
    }

    if (topTargets.length > 0 && maxVotes > 0) {
      // Tie-break: random
      const exiledId = topTargets[Math.floor(Math.random() * topTargets.length)];
      const exiled = this.state.players.find((p) => p.id === exiledId);
      if (exiled) {
        exiled.hp = 0;
        exiled.isAlive = false;
        this.state.logs.push({
          turn: this.state.turn,
          phase: 'DAY_VOTE',
          message: `${exiled.name} が追放された（${maxVotes}票）`,
          isPrivate: false,
        });
      }
    }

    // Reset vote weights for next turn
    for (const player of this.state.players) {
      player.voteWeight = player.isAlive ? 1 : 0;
    }

    this.onStateUpdate?.();

    // Check win condition
    const winResult = this.checkWinCondition();
    if (winResult) {
      this.state.phase = 'GAME_OVER';
      this.onGameOver?.(winResult);
      this.onPhaseChange?.('GAME_OVER', 0);
      this.onStateUpdate?.();
    } else {
      this.state.turn++;
      this.transitionTo('NIGHT_BUILD');
    }
  }

  // ===== Helpers =====

  private alivePlayers(): Player[] {
    return this.state.players.filter((p) => p.isAlive);
  }

  private checkWinCondition(): WinResult | null {
    const alive = this.alivePlayers();
    const wolves = alive.filter((p) => p.faction === 'werewolf');
    const citizens = alive.filter((p) => p.faction === 'citizen');

    if (wolves.length === 0) return { winner: 'citizen' };
    if (wolves.length >= citizens.length) return { winner: 'werewolf' };
    return null;
  }

  getPublicState(): PublicGameState {
    return {
      phase: this.state.phase,
      turn: this.state.turn,
      phaseDeadline: this.state.phaseDeadline,
      players: this.state.players.map(
        (p): PublicPlayer => ({
          id: p.id,
          name: p.name,
          avatarUrl: p.avatarUrl,
          hp: p.hp,
          isAlive: p.isAlive,
          stackCount: p.stack.length,
          voteWeight: p.voteWeight,
        })
      ),
      logs: this.state.logs.filter((l) => !l.isPrivate),
    };
  }

  getPrivateState(playerId: string): PrivatePlayerState | null {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return null;

    return {
      myPlayerId: playerId,
      faction: player.faction,
      stack: player.stack,
      oracleResults: this.oracleHistory.get(playerId) || [],
    };
  }

  getVoteCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const [voterId, targetId] of this.votes) {
      const voter = this.state.players.find((p) => p.id === voterId);
      if (!voter) continue;
      const current = counts.get(targetId) || 0;
      counts.set(targetId, current + voter.voteWeight);
    }
    return counts;
  }

  getReadyPlayers(): Set<string> {
    return this.readyPlayers;
  }

  destroy(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }
  }
}
