import { useEffect, useRef, useState } from 'react';
import { CELL_SIZE, COLS, VISIBLE_ROWS } from '../game/constants';
import { useGameLoop } from '../hooks/useGameLoop';
import GameCanvas from './GameCanvas';
import ScorePanel from './ScorePanel';
import Overlay from './Overlay';
import ChainDisplay from './ChainDisplay';
import styles from './Game.module.css';

const BOARD_W = COLS * CELL_SIZE;
const BOARD_H = VISIBLE_ROWS * CELL_SIZE;

export default function Game() {
  const { state, dispatch } = useGameLoop();
  const [flashPhase, setFlashPhase] = useState(false);
  const flashRef = useRef<number | null>(null);

  // Pop animation flash
  useEffect(() => {
    if (state.phase === 'resolving' && state.popGroups.length > 0) {
      flashRef.current = setInterval(() => setFlashPhase(p => !p), 80) as unknown as number;
    } else {
      if (flashRef.current !== null) { clearInterval(flashRef.current); flashRef.current = null; }
      setFlashPhase(false);
    }
    return () => { if (flashRef.current !== null) clearInterval(flashRef.current); };
  }, [state.phase, state.popGroups.length]);

  const handleStart  = () => dispatch({ type: 'START' });
  const handleResume = () => dispatch({ type: 'RESUME' });

  const isResolving = state.phase === 'resolving';

  return (
    <div className={styles.wrapper}>
      {/* Animated background particles */}
      <div className={styles.bg} aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={styles.particle} style={{
            '--x': `${Math.random() * 100}%`,
            '--delay': `${Math.random() * 8}s`,
            '--dur': `${6 + Math.random() * 6}s`,
            '--size': `${8 + Math.random() * 16}px`,
          } as React.CSSProperties} />
        ))}
      </div>

      <div className={styles.layout}>
        {/* Left panel: game board */}
        <div className={styles.boardWrapper}>
          <div className={styles.boardHeader}>
            <span className={styles.boardTitle}>ぷよぷよ</span>
          </div>
          <div
            className={styles.boardContainer}
            style={{ width: BOARD_W, height: BOARD_H, position: 'relative' }}
          >
            <GameCanvas
              board={state.board}
              currentPair={state.currentPair}
              popGroups={state.popGroups}
              flashPhase={flashPhase}
            />
            <Overlay
              phase={state.phase}
              score={state.score}
              highScore={state.highScore}
              maxChain={state.maxChain}
              onStart={handleStart}
              onResume={handleResume}
            />
            <ChainDisplay chainCount={state.chainCount} isResolving={isResolving} />
          </div>
        </div>

        {/* Right panel: score + next */}
        <ScorePanel state={state} />
      </div>
    </div>
  );
}
