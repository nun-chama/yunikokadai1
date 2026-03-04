import { useEffect, useState } from 'react';
import styles from './ChainDisplay.module.css';

interface Props {
  chainCount: number;
  isResolving: boolean;
}

export default function ChainDisplay({ chainCount, isResolving }: Props) {
  const [visible, setVisible] = useState(false);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (isResolving && chainCount > 1) {
      setDisplayed(chainCount);
      setVisible(true);
    } else if (!isResolving) {
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [isResolving, chainCount]);

  if (!visible || displayed <= 1) return null;

  return (
    <div className={styles.chain} key={displayed}>
      <span className={styles.num}>{displayed}</span>
      <span className={styles.label}>CHAIN!</span>
    </div>
  );
}
