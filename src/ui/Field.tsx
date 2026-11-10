import { useId, type InputHTMLAttributes } from 'react';
import styles from './Field.module.css';

export function Field({ label, error, hint, ...props }: { label: string; error?: string | null; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint ? (
        <small id={`${id}-hint`} className={styles.hint}>
          {hint}
        </small>
      ) : null}
      {error ? (
        <small id={`${id}-err`} role="alert" className={styles.error}>
          {error}
        </small>
      ) : null}
    </div>
  );
}
