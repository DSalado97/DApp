import type { ReactNode } from 'react';
import styles from './Table.module.css';

/**
 * Tabla responsive: en pantallas anchas es una tabla normal; en móvil (375 px) cada fila pasa a ser una tarjeta
 * que repite el encabezado de cada columna.
 */
export function Table({ columns, rows, caption }: { columns: readonly string[]; rows: readonly (readonly ReactNode[])[]; caption?: string }) {
  return (
    <table className={styles.table}>
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => (
              <td key={c} data-label={columns[c] ?? ''}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
