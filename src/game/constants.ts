export const COLS = 6;
export const ROWS = 13; // 12 visible + 1 hidden top row
export const VISIBLE_ROWS = 12;
export const CELL_SIZE = 48;

export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'] as const;
export type PuyoColor = (typeof COLORS)[number];

export const COLOR_HEX: Record<PuyoColor, string> = {
  red:    '#FF4B6E',
  blue:   '#4B9FFF',
  green:  '#4BFF8F',
  yellow: '#FFD94B',
  purple: '#C04BFF',
};

export const COLOR_DARK: Record<PuyoColor, string> = {
  red:    '#CC1A3F',
  blue:   '#1A6FCC',
  green:  '#1ACC5F',
  yellow: '#CCA91A',
  purple: '#8C1ACC',
};

export const COLOR_GLOW: Record<PuyoColor, string> = {
  red:    'rgba(255,75,110,0.6)',
  blue:   'rgba(75,159,255,0.6)',
  green:  'rgba(75,255,143,0.6)',
  yellow: 'rgba(255,217,75,0.6)',
  purple: 'rgba(192,75,255,0.6)',
};

export const FALL_SPEED_MS = 800;   // ms per one cell drop (normal)
export const SOFT_DROP_MS = 80;     // ms per cell when soft dropping
export const LOCK_DELAY_MS = 500;   // ms before piece locks
export const MIN_CHAIN = 4;          // minimum connected puyos to pop

export const SCORE_TABLE: Record<number, number> = {
  1: 40,
  2: 100,
  3: 200,
  4: 400,
};

export const CHAIN_BONUS = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256];

export const SPAWN_COL = 2; // column where new pieces spawn
export const SPAWN_ROW = 0; // row where new pieces spawn (hidden)
