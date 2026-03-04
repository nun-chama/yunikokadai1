import { useEffect, useRef } from 'react';
import { CELL_SIZE, COLOR_HEX, COLOR_DARK, COLOR_GLOW } from '../game/constants';
import type { PuyoPair } from '../game/types';
import type { PuyoColor } from '../game/constants';

interface Props {
  pair: PuyoPair | null;
}

const SIZE = CELL_SIZE * 0.85;
const PAD = 8;
const W = SIZE * 2 + PAD * 3;
const H = SIZE * 3 + PAD * 4;

function drawMiniPuyo(ctx: CanvasRenderingContext2D, x: number, y: number, color: PuyoColor) {
  const r = SIZE / 2 - 2;
  const cx = x + SIZE / 2;
  const cy = y + SIZE / 2;

  ctx.shadowColor = COLOR_GLOW[color];
  ctx.shadowBlur = 12;

  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, COLOR_HEX[color]);
  grad.addColorStop(1, COLOR_DARK[color]);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  ctx.shadowBlur = 0;
}

export default function NextPuyo({ pair }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (!pair) return;

    // satellite on top, pivot on bottom (matching game orientation)
    drawMiniPuyo(ctx, PAD, PAD, pair.satelliteColor);
    drawMiniPuyo(ctx, PAD, PAD + SIZE + PAD, pair.pivotColor);
  }, [pair]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: 'block' }}
    />
  );
}
