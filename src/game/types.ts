import type { PuyoColor } from './constants';

export type Cell = PuyoColor | null;
export type Board = Cell[][];

export type PuyoPair = {
  pivot: { row: number; col: number };
  satellite: { row: number; col: number };
  pivotColor: PuyoColor;
  satelliteColor: PuyoColor;
};

export type GamePhase =
  | 'menu'
  | 'spawn'        // piece is about to spawn
  | 'falling'      // piece is actively falling
  | 'locking'      // piece touched bottom, lock delay
  | 'resolving'    // checking chains
  | 'gameover'
  | 'paused';

export type PopGroup = {
  cells: Array<{ row: number; col: number }>;
  color: PuyoColor;
};

export type ChainResult = {
  groups: PopGroup[];
  chainCount: number;
  score: number;
};

export type ResolveStep = {
  board: Board;
  groups: PopGroup[];
  chainCount: number;
  scoreGained: number;
};

export type GameState = {
  board: Board;
  currentPair: PuyoPair | null;
  nextPair: PuyoPair | null;
  phase: GamePhase;
  score: number;
  highScore: number;
  level: number;
  chains: number;
  maxChain: number;
  linesCleared: number;
  popGroups: PopGroup[];    // groups currently flashing before pop
  chainCount: number;       // current chain in progress
  _resolveSteps?: ResolveStep[];
  _resolveStepIndex?: number;
};
