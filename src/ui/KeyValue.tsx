import type { ReactNode } from 'react';
import styles from './KeyValue.module.css';

/** Lista de pares etiqueta → valor (ficha de un registro). Las filas con valor `null` o vacío no se muestran. */
export function KeyValue({ items }: { items: readonly (readonly [string, ReactNode])[] }) {
  const shown = items.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false);
  return (
    <dl className={styles.list}>
      {shown.map(([k, v]) => (
        <div key={k} className={styles.row}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
