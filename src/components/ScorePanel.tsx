import type { GameState } from '../game/types';
import NextPuyo from './NextPuyo';
import styles from './ScorePanel.module.css';

interface Props {
  state: GameState;
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

export default function ScorePanel({ state }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>SCORE</h3>
        <div className={styles.scoreValue}>{state.score.toLocaleString()}</div>
        <div className={styles.hiScore}>BEST: {state.highScore.toLocaleString()}</div>
      </div>

      <div className={styles.section}>
        <StatItem label="LEVEL" value={state.level} />
        <StatItem label="CHAINS" value={state.chains} />
        <StatItem label="MAX CHAIN" value={state.maxChain} />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>NEXT</h3>
        <div className={styles.nextContainer}>
          <NextPuyo pair={state.nextPair} />
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlsTitle}>CONTROLS</div>
        <div className={styles.controlRow}><kbd>←→</kbd><span>Move</span></div>
        <div className={styles.controlRow}><kbd>↓</kbd><span>Soft Drop</span></div>
        <div className={styles.controlRow}><kbd>↑ / X</kbd><span>Rotate CW</span></div>
        <div className={styles.controlRow}><kbd>Z</kbd><span>Rotate CCW</span></div>
        <div className={styles.controlRow}><kbd>P</kbd><span>Pause</span></div>
      </div>
    </div>
  );
}
