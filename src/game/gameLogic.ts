import {
  COLS, ROWS, COLORS, SPAWN_COL, SPAWN_ROW,
  MIN_CHAIN, SCORE_TABLE, CHAIN_BONUS,
} from './constants';
import type { Board, Cell, PuyoPair, PopGroup, GameState, ResolveStep } from './types';
export type { ResolveStep } from './types';
import type { PuyoColor } from './constants';

// ─── Board helpers ────────────────────────────────────────────────────────────

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null) as Cell[]);
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

// ─── Piece generation ─────────────────────────────────────────────────────────

function randomColor(): PuyoColor {
  return COLORS[Math.floor(Math.random() * COLORS.length)]!;
}

export function createPair(): PuyoPair {
  return {
    pivot:     { row: SPAWN_ROW,     col: SPAWN_COL },
    satellite: { row: SPAWN_ROW - 1, col: SPAWN_COL },
    pivotColor:     randomColor(),
    satelliteColor: randomColor(),
  };
}

// ─── Collision detection ──────────────────────────────────────────────────────

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

function isOccupied(board: Board, row: number, col: number): boolean {
  return inBounds(row, col) && board[row]![col] !== null;
}

function pairFits(board: Board, pair: PuyoPair): boolean {
  const { pivot, satellite } = pair;
  const positions = [pivot, satellite];
  return positions.every(({ row, col }) =>
    inBounds(row, col) && !isOccupied(board, row, col)
  );
}

// ─── Movement ─────────────────────────────────────────────────────────────────

export function moveLeft(board: Board, pair: PuyoPair): PuyoPair {
  const moved: PuyoPair = {
    ...pair,
    pivot:     { ...pair.pivot,     col: pair.pivot.col - 1 },
    satellite: { ...pair.satellite, col: pair.satellite.col - 1 },
  };
  return pairFits(board, moved) ? moved : pair;
}

export function moveRight(board: Board, pair: PuyoPair): PuyoPair {
  const moved: PuyoPair = {
    ...pair,
    pivot:     { ...pair.pivot,     col: pair.pivot.col + 1 },
    satellite: { ...pair.satellite, col: pair.satellite.col + 1 },
  };
  return pairFits(board, moved) ? moved : pair;
}

export function moveDown(board: Board, pair: PuyoPair): { pair: PuyoPair; locked: boolean } {
  const moved: PuyoPair = {
    ...pair,
    pivot:     { ...pair.pivot,     row: pair.pivot.row + 1 },
    satellite: { ...pair.satellite, row: pair.satellite.row + 1 },
  };
  if (pairFits(board, moved)) return { pair: moved, locked: false };
  return { pair, locked: true };
}

// Rotation: satellite orbits pivot CW/CCW
export function rotateCW(board: Board, pair: PuyoPair): PuyoPair {
  const dr = pair.satellite.row - pair.pivot.row;
  const dc = pair.satellite.col - pair.pivot.col;
  // CW: (dr, dc) → (dc, -dr)
  let newSat = { row: pair.pivot.row + dc, col: pair.pivot.col - dr };
  const candidate: PuyoPair = { ...pair, satellite: newSat };
  if (pairFits(board, candidate)) return candidate;

  // Wall kick: try shifting pivot left/right
  for (const kick of [-1, 1, -2, 2]) {
    const kicked: PuyoPair = {
      ...candidate,
      pivot:     { ...candidate.pivot,     col: candidate.pivot.col + kick },
      satellite: { ...candidate.satellite, col: candidate.satellite.col + kick },
    };
    if (pairFits(board, kicked)) return kicked;
  }
  return pair;
}

export function rotateCCW(board: Board, pair: PuyoPair): PuyoPair {
  const dr = pair.satellite.row - pair.pivot.row;
  const dc = pair.satellite.col - pair.pivot.col;
  // CCW: (dr, dc) → (-dc, dr)
  const newSat = { row: pair.pivot.row - dc, col: pair.pivot.col + dr };
  const candidate: PuyoPair = { ...pair, satellite: newSat };
  if (pairFits(board, candidate)) return candidate;

  for (const kick of [1, -1, 2, -2]) {
    const kicked: PuyoPair = {
      ...candidate,
      pivot:     { ...candidate.pivot,     col: candidate.pivot.col + kick },
      satellite: { ...candidate.satellite, col: candidate.satellite.col + kick },
    };
    if (pairFits(board, kicked)) return kicked;
  }
  return pair;
}

// ─── Locking ──────────────────────────────────────────────────────────────────

export function lockPair(board: Board, pair: PuyoPair): Board {
  const next = cloneBoard(board);
  next[pair.pivot.row]![pair.pivot.col] = pair.pivotColor;
  // If satellite is out of top bounds, game over will be detected separately
  if (inBounds(pair.satellite.row, pair.satellite.col)) {
    next[pair.satellite.row]![pair.satellite.col] = pair.satelliteColor;
  }
  return next;
}

// ─── Gravity ──────────────────────────────────────────────────────────────────

export function applyGravity(board: Board): { board: Board; moved: boolean } {
  const next = cloneBoard(board);
  let moved = false;
  // Scan from bottom up
  for (let col = 0; col < COLS; col++) {
    let writeRow = ROWS - 1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (next[row]![col] !== null) {
        if (writeRow !== row) {
          next[writeRow]![col] = next[row]![col];
          next[row]![col] = null;
          moved = true;
        }
        writeRow--;
      }
    }
  }
  return { board: next, moved };
}

// ─── Chain detection ──────────────────────────────────────────────────────────

function floodFill(board: Board, row: number, col: number, color: PuyoColor, visited: boolean[][]): Array<{ row: number; col: number }> {
  const stack = [{ row, col }];
  const group: Array<{ row: number; col: number }> = [];
  while (stack.length) {
    const pos = stack.pop()!;
    if (!inBounds(pos.row, pos.col)) continue;
    if (visited[pos.row]![pos.col]) continue;
    if (board[pos.row]![pos.col] !== color) continue;
    visited[pos.row]![pos.col] = true;
    group.push(pos);
    stack.push(
      { row: pos.row - 1, col: pos.col },
      { row: pos.row + 1, col: pos.col },
      { row: pos.row, col: pos.col - 1 },
      { row: pos.row, col: pos.col + 1 },
    );
  }
  return group;
}

export function findPopGroups(board: Board): PopGroup[] {
  const visited: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const groups: PopGroup[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = board[row]![col];
      if (color === null || visited[row]![col]) continue;
      const group = floodFill(board, row, col, color, visited);
      if (group.length >= MIN_CHAIN) {
        groups.push({ cells: group, color });
      }
    }
  }
  return groups;
}

export function popGroups(board: Board, groups: PopGroup[]): Board {
  const next = cloneBoard(board);
  for (const group of groups) {
    for (const { row, col } of group.cells) {
      next[row]![col] = null;
    }
  }
  return next;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calculateScore(groups: PopGroup[], chainCount: number): number {
  const totalPuyos = groups.reduce((sum, g) => sum + g.cells.length, 0);
  const baseScore = (SCORE_TABLE[Math.min(totalPuyos, 4)] ?? 400) * 10;
  const chainBonus = CHAIN_BONUS[Math.min(chainCount, CHAIN_BONUS.length - 1)] ?? 256;
  const colorBonus = Math.max(0, groups.length - 1) * 10;
  return baseScore + chainBonus + colorBonus;
}

// ─── Game over check ─────────────────────────────────────────────────────────

export function isGameOver(board: Board): boolean {
  // Game over if spawn columns are occupied at the top visible row
  return board[1]![SPAWN_COL] !== null || board[1]![SPAWN_COL + 1] !== null;
}

// ─── Level progression ────────────────────────────────────────────────────────

export function calcLevel(score: number): number {
  return Math.floor(score / 1000) + 1;
}

export function getFallSpeed(level: number): number {
  // Gets faster with level; minimum 100ms
  return Math.max(100, 800 - (level - 1) * 60);
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialState(): GameState {
  const highScore = Number(localStorage.getItem('puyoHighScore') ?? 0);
  return {
    board: createEmptyBoard(),
    currentPair: null,
    nextPair: null,
    phase: 'menu',
    score: 0,
    highScore,
    level: 1,
    chains: 0,
    maxChain: 0,
    linesCleared: 0,
    popGroups: [],
    chainCount: 0,
  };
}

export function startGame(state: GameState): GameState {
  const current = createPair();
  const next = createPair();
  return {
    ...createInitialState(),
    phase: 'falling',
    currentPair: current,
    nextPair: next,
    highScore: state.highScore,
  };
}

// ─── Full chain resolution (synchronous, returns steps) ──────────────────────

export function resolveChains(board: Board): ResolveStep[] {
  const steps: ResolveStep[] = [];
  let current = board;
  let chainCount = 0;

  while (true) {
    const groups = findPopGroups(current);
    if (groups.length === 0) break;
    chainCount++;
    const scoreGained = calculateScore(groups, chainCount);
    const popped = popGroups(current, groups);
    const { board: settled } = applyGravity(popped);
    steps.push({ board: settled, groups, chainCount, scoreGained });
    current = settled;
  }

  return steps;
}
