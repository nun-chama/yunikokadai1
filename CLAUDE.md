# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Type-check + production build → dist/
npm run preview  # Preview production build locally
```

## Architecture

**Stack:** Vite + React 19 + TypeScript, CSS Modules, HTML5 Canvas

### Game Logic (`src/game/`)
Pure TypeScript — no React dependencies.

| File | Responsibility |
|------|---------------|
| `constants.ts` | Board dimensions, colors, timing values, score tables |
| `types.ts` | `Board`, `PuyoPair`, `GameState`, `GamePhase`, `PopGroup` types |
| `gameLogic.ts` | All game rules: movement, rotation (with wall kicks), locking, gravity, flood-fill chain detection, scoring, `resolveChains()` |

`resolveChains(board)` returns a `ResolveStep[]` array — each step represents one chain link with the board state after gravity settles, the popped groups, and score gained. The reducer processes steps one-by-one with 600ms intervals for animation.

### State Management (`src/hooks/useGameLoop.ts`)
Single `useReducer` with `GameState`. Game phases drive timers via `useEffect`:
- `falling` → gravity interval at `getFallSpeed(level)` ms
- `locking` → 500ms lock-delay timeout → `LOCK` action
- `resolving` → 600ms timeout per chain step → `RESOLVE_STEP` action
- `'spawn'` phase (string literal, not in `GamePhase` union) → immediately dispatches `SPAWN`

Keyboard handling is in this hook via `window.addEventListener`. Soft-drop uses its own interval on `ArrowDown` keydown/keyup.

### Rendering (`src/components/`)

| Component | Role |
|-----------|------|
| `Game.tsx` | Root: layout, flash animation interval for pop effect |
| `GameCanvas.tsx` | Canvas renderer: board cells, current piece, ghost piece, pop flash |
| `NextPuyo.tsx` | Small canvas showing the upcoming pair |
| `ScorePanel.tsx` | Score, level, stats, next piece, controls reference |
| `Overlay.tsx` | Menu / pause / game-over screens (rendered over the canvas) |
| `ChainDisplay.tsx` | Animated chain counter (shown when chain ≥ 2) |

Each component has a co-located `*.module.css` file.

### Board Coordinate System
- `board[row][col]`: row 0 is the top (hidden), row `ROWS-1` is the bottom
- `ROWS = 13` (12 visible + 1 hidden), `COLS = 6`
- Canvas renders rows `ROW_OFFSET` (1) through `ROWS-1`, so `visRow = row - ROW_OFFSET`
- Satellite is **above** the pivot (lower row index)

### Scoring
`calculateScore(groups, chainCount)` = base (from pop count) + chain bonus (from `CHAIN_BONUS[]`) + color bonus (number of different colors − 1) × 10. High score persists via `localStorage`.

### Key Constants (`src/game/constants.ts`)
- `MIN_CHAIN = 4` — minimum connected puyos to pop
- `SPAWN_COL = 2` — pivot spawns at column 2
- Game-over detected when column 1 at `SPAWN_COL` is occupied after locking

---

## 要件定義

### 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロダクト名 | ぷよぷよ (Web版) |
| プラットフォーム | Webブラウザ (PC) |
| 技術スタック | Vite / React 19 / TypeScript / HTML5 Canvas / CSS Modules |

### 2. ゲームルール仕様

#### 2.1 フィールド
- サイズ: 横 6 列 × 縦 12 行 (内部的に上部に1行の非表示領域を持つ、計13行)
- セルサイズ: 48px × 48px

#### 2.2 ぷよの種類
- 色数: 5色 (赤・青・緑・黄・紫)
- 単位: 2個ペアで1つのピースとして落下する (pivot + satellite)
- satellite は pivot の真上に配置されてスポーン

#### 2.3 操作
| 入力 | 動作 |
|------|------|
| `←` / `→` | ピースを左右に1列移動 |
| `↓` | ソフトドロップ (80ms/セル) |
| `↑` / `X` | ピースを時計回りに90°回転 |
| `Z` | ピースを反時計回りに90°回転 |
| `P` / `Esc` | ポーズ / 再開 |
| `Enter` | メニュー・ゲームオーバー画面でゲーム開始 |

#### 2.4 回転ルール
- satellite が pivot を中心に90°回転
- 壁際では壁キック (±1, ±2列のシフト) を試みる
- キックが全て失敗した場合は回転しない

#### 2.5 落下・ロック
- 通常落下速度: `800ms / セル`、レベルに応じて短縮 (最小 100ms)
- ロックディレイ: 着地後 500ms 待機してからフィールドに固定

#### 2.6 消去ルール (連鎖)
- 同色が上下左右に4個以上連結すると消える
- 消去後に重力で上のぷよが落下し、再度消去判定を行う (連鎖)
- チェーン数は連続消去の回数をカウントする

#### 2.7 スコア計算
```
score = base + chainBonus + colorBonus

base       = SCORE_TABLE[min(消去数, 4)] × 10
chainBonus = CHAIN_BONUS[chainCount]  // [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256]
colorBonus = (同時消去色数 - 1) × 10
```

#### 2.8 レベルアップ
- `level = floor(score / 1000) + 1`
- レベルが上がるほど落下速度が上昇 (`800 - (level-1) × 60` ms、下限 100ms)

#### 2.9 ゲームオーバー
- ロック後にスポーン列 (列2) の上部 (row 1) にぷよが存在する場合

### 3. 画面仕様

#### 3.1 ゲーム画面レイアウト
```
[ ヘッダー (タイトル) ]
[ ゲームフィールド (Canvas) ] [ スコアパネル ]
                                  ├─ スコア / ハイスコア
                                  ├─ レベル / 総連鎖数 / 最大連鎖数
                                  ├─ NEXTピース
                                  └─ 操作方法
```

#### 3.2 オーバーレイ画面
| フェーズ | 表示内容 |
|----------|----------|
| `menu` | タイトルロゴ・START ボタン・キー案内 |
| `paused` | PAUSED タイトル・現在スコア・RESUME / RESTART ボタン |
| `gameover` | GAME OVER タイトル・最終スコア・ハイスコア・最大連鎖数・PLAY AGAIN ボタン |

#### 3.3 ゲーム中 UI
- ゴーストピース: 落下先を半透明 (alpha 0.25) で表示
- ポップフラッシュ: 消去対象を80ms周期で点滅させる
- チェーン表示: 2連鎖以上でフィールド中央にアニメーション表示

### 4. 永続化

| データ | 保存先 | キー |
|--------|--------|------|
| ハイスコア | `localStorage` | `puyoHighScore` |

### 5. ゲームフェーズ遷移

```
menu
 └─→ falling  ←─────────────────────────────┐
       │                                      │
       │ (着地)                               │
       ↓                                      │
     locking                                  │
       │ (500ms経過)                          │
       ↓                                      │
     LOCK処理 ─→ (連鎖なし) → spawn ─────────┘
       │                                      │
       │ (連鎖あり)                           │
       ↓                                      │
     resolving ─→ (600ms×チェーン数) → spawn ─┘
       │
       │ (game over条件)
       ↓
     gameover
       │
       └─→ menu (PLAY AGAIN)

     paused ←→ falling (P/Escキーでトグル)
```

### 6. 非機能要件

| 項目 | 要件 |
|------|------|
| 対応ブラウザ | Chrome / Edge / Firefox 最新版 |
| レスポンシブ | PC (キーボード操作) のみ対応 |
| フレームレート | Canvas 再描画は React の state 変化に同期 (requestAnimationFrame 非使用) |
| フォント | Orbitron (スコア・UI英字)、Zen Maru Gothic (タイトル・日本語) |
