import styles from './Overlay.module.css';
import type { GamePhase } from '../game/types';

interface Props {
  phase: GamePhase;
  score: number;
  highScore: number;
  maxChain: number;
  onStart: () => void;
  onResume: () => void;
}

export default function Overlay({ phase, score, highScore, maxChain, onStart, onResume }: Props) {
  if (phase === 'spawn' || phase === 'falling' || phase === 'locking' || phase === 'resolving') {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {phase === 'menu' && (
          <>
            <div className={styles.logo}>
              <span className={styles.logoP}>ぷ</span>
              <span className={styles.logoY}>よ</span>
              <span className={styles.logoU}>ぷ</span>
              <span className={styles.logoO}>よ</span>
            </div>
            <p className={styles.subtitle}>— PUZZLE GAME —</p>
            <button className={styles.btn} onClick={onStart}>
              START GAME
            </button>
            <p className={styles.hint}>Press <kbd>Enter</kbd> to start</p>
          </>
        )}

        {phase === 'paused' && (
          <>
            <h2 className={styles.title}>PAUSED</h2>
            <div className={styles.scoreDisplay}>
              <span>Score</span>
              <span className={styles.scoreNum}>{score.toLocaleString()}</span>
            </div>
            <button className={styles.btn} onClick={onResume}>RESUME</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onStart}>RESTART</button>
            <p className={styles.hint}>Press <kbd>P</kbd> to resume</p>
          </>
        )}

        {phase === 'gameover' && (
          <>
            <h2 className={styles.titleGameOver}>GAME OVER</h2>
            <div className={styles.results}>
              <div className={styles.resultRow}>
                <span>SCORE</span>
                <span className={styles.resultVal}>{score.toLocaleString()}</span>
              </div>
              <div className={styles.resultRow}>
                <span>BEST</span>
                <span className={`${styles.resultVal} ${styles.gold}`}>{highScore.toLocaleString()}</span>
              </div>
              <div className={styles.resultRow}>
                <span>MAX CHAIN</span>
                <span className={styles.resultVal}>{maxChain}</span>
              </div>
            </div>
            <button className={styles.btn} onClick={onStart}>PLAY AGAIN</button>
            <p className={styles.hint}>Press <kbd>Enter</kbd> to play again</p>
          </>
        )}
      </div>
    </div>
  );
}
