import type { ReactNode } from 'react';
import styles from './Notice.module.css';

interface Props {
  kind?: 'info' | 'warn' | 'error';
  children: ReactNode;
}

export function Notice({ kind = 'info', children }: Props) {
  const label = kind === 'error' ? '오류' : kind === 'warn' ? '안내' : '참고';
  return (
    <p className={`${styles.notice} ${kind === 'warn' ? styles.warn : ''} ${kind === 'error' ? styles.error : ''}`} role={kind === 'error' ? 'alert' : undefined}>
      <strong>{label}</strong>
      {children}
    </p>
  );
}
