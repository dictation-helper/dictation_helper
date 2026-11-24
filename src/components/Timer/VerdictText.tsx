import styles from './Timer.module.css';

interface Props {
  within: boolean;
  toleranceSec: number;
}

/** Tolerance verdict shown as an icon plus text, never by color alone. */
export function VerdictText({ within, toleranceSec }: Props) {
  return (
    <p className={`${styles.line} ${within ? styles.ok : styles.bad}`}>
      <span aria-hidden="true">{within ? '✓ ' : '✗ '}</span>
      {within ? `허용 범위 안 (±${toleranceSec}초)` : `허용 범위 밖 (±${toleranceSec}초)`}
    </p>
  );
}
