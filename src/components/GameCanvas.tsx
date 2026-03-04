import { useEffect, useRef } from 'react';
import { CELL_SIZE, COLS, VISIBLE_ROWS, ROWS, COLOR_HEX, COLOR_DARK, COLOR_GLOW } from '../game/constants';
import type { Board, PuyoPair, PopGroup } from '../game/types';
import type { PuyoColor } from '../game/constants';

interface Props {
  board: Board;
  currentPair: PuyoPair | null;
  popGroups: PopGroup[];
  flashPhase: boolean; // alternates for pop animation
}

const W = COLS * CELL_SIZE;
const H = VISIBLE_ROWS * CELL_SIZE;
const ROW_OFFSET = ROWS - VISIBLE_ROWS; // hidden rows at top

function drawPuyo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: PuyoColor,
  alpha: number = 1,
  glow: boolean = false,
) {
  const r = CELL_SIZE / 2 - 3;
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (glow) {
    ctx.shadowColor = COLOR_GLOW[color];
    ctx.shadowBlur = 20;
  }

  // Body gradient
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, COLOR_HEX[color]);
  grad.addColorStop(1, COLOR_DARK[color]);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Shine
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.1, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + r * 0.28, cy - r * 0.1, r * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx - r * 0.22, cy - r * 0.16, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + r * 0.34, cy - r * 0.16, r * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGhost(ctx: CanvasRenderingContext2D, board: Board, pair: PuyoPair) {
  // Project pair down
  let ghostPair = { ...pair };
  while (true) {
    const nextRow_p = ghostPair.pivot.row + 1;
    const nextRow_s = ghostPair.satellite.row + 1;
    const pOk = nextRow_p >= 0 && nextRow_p < ROWS && board[nextRow_p]![ghostPair.pivot.col] === null;
    const sOk = nextRow_s < ROWS && (nextRow_s < 0 || board[nextRow_s]![ghostPair.satellite.col] === null);
    if (!pOk || !sOk) break;
    ghostPair = {
      ...ghostPair,
      pivot:     { ...ghostPair.pivot,     row: ghostPair.pivot.row + 1 },
      satellite: { ...ghostPair.satellite, row: ghostPair.satellite.row + 1 },
    };
  }

  for (const { row, col, color } of [
    { row: ghostPair.pivot.row,     col: ghostPair.pivot.col,     color: pair.pivotColor },
    { row: ghostPair.satellite.row, col: ghostPair.satellite.col, color: pair.satelliteColor },
  ]) {
    const visRow = row - ROW_OFFSET;
    if (visRow < 0 || visRow >= VISIBLE_ROWS) continue;
    drawPuyo(ctx, col * CELL_SIZE, visRow * CELL_SIZE, color, 0.25);
  }
}

export default function GameCanvas({ board, currentPair, popGroups, flashPhase }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const popCells = new Set(
    popGroups.flatMap(g => g.cells.map(c => `${c.row},${c.col}`))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, H);
      ctx.stroke();
    }
    for (let r = 0; r <= VISIBLE_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(W, r * CELL_SIZE);
      ctx.stroke();
    }

    // Board puyos
    for (let row = ROW_OFFSET; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const color = board[row]![col];
        if (!color) continue;
        const visRow = row - ROW_OFFSET;
        const key = `${row},${col}`;
        const isPopping = popCells.has(key);
        if (isPopping && !flashPhase) continue; // flash: hide on alternate frames
        drawPuyo(ctx, col * CELL_SIZE, visRow * CELL_SIZE, color, 1, isPopping);
      }
    }

    // Ghost piece
    if (currentPair) {
      drawGhost(ctx, board, currentPair);
    }

    // Current piece
    if (currentPair) {
      for (const { row, col, color } of [
        { row: currentPair.pivot.row,     col: currentPair.pivot.col,     color: currentPair.pivotColor },
        { row: currentPair.satellite.row, col: currentPair.satellite.col, color: currentPair.satelliteColor },
      ]) {
        const visRow = row - ROW_OFFSET;
        if (visRow < 0 || visRow >= VISIBLE_ROWS) continue;
        drawPuyo(ctx, col * CELL_SIZE, visRow * CELL_SIZE, color, 1, true);
      }
    }
  }, [board, currentPair, popCells, flashPhase]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block', borderRadius: '0 0 12px 12px' }}
    />
  );
}
