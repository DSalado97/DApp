import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SearchDoc, SearchIndex } from '@/core/search';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Notice } from '@/ui/Notice';
import styles from './SearchPanel.module.css';

const MAX_RESULTS = 60;

export const recordPath = (basePath: string, doc: SearchDoc) => `${basePath}/${doc.kind}/${doc.id.slice(doc.kind.length + 1)}`;

const snippet = (text: string, n = 140) => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);

/**
 * Buscador y explorador del reglamento: búsqueda por nombre, categoría y contenido (MiniSearch) y, sin consulta,
 * lista agrupada por categoría. La consulta y la categoría viven en la URL, de modo que «atrás» las conserva.
 */
export function SearchPanel({ index, basePath, title, intro }: { index: SearchIndex; basePath: string; title: string; intro?: string }) {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = params.get('cat') ?? '';
  const categories = useMemo(() => index.categories(), [index]);

  const update = (next: { q?: string; cat?: string }) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries({ q: next.q ?? query, cat: next.cat ?? category })) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p, { replace: true });
  };

  const hits = useMemo(() => (query.trim() ? index.search(query, { categories: category ? [category] : [], limit: MAX_RESULTS }) : []), [index, query, category]);
  const groups = useMemo(() => {
    const map = new Map<string, SearchDoc[]>();
    for (const d of index.docs) {
      if (category && d.category !== category) continue;
      map.set(d.category, [...(map.get(d.category) ?? []), d]);
    }
    return [...map.entries()];
  }, [index, category]);

  return (
    <>
      <Card title={title}>
        {intro ? <p>{intro}</p> : null}
        <Field label="Buscar" type="search" value={query} onChange={(e) => update({ q: e.target.value })} placeholder="Nombre, categoría o contenido" autoComplete="off" />
        <div className={styles.select}>
          <label htmlFor="rulebook-category">Categoría</label>
          <select id="rulebook-category" value={category} onChange={(e) => update({ cat: e.target.value })}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {query.trim() ? (
        hits.length ? (
          <Card title={`${hits.length}${hits.length === MAX_RESULTS ? '+' : ''} resultados`}>
            <ul className={styles.results}>
              {hits.map(({ doc }) => (
                <li key={doc.id}>
                  <Link to={recordPath(basePath, doc)} className={styles.hit}>
                    <span className={styles.name}>{doc.title}</span>
                    <span className={styles.badge}>{doc.category}</span>
                    <span className={styles.snippet}>{snippet(doc.text)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Notice kind="info">Sin resultados para «{query.trim()}».</Notice>
        )
      ) : (
        groups.map(([name, docs]) => (
          <details key={name} className={styles.group}>
            <summary>
              {name} <span className={styles.count}>({docs.length})</span>
            </summary>
            <ul className={styles.results}>
              {docs.map((d) => (
                <li key={d.id}>
                  <Link to={recordPath(basePath, d)} className={styles.item}>
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))
      )}
    </>
  );
}
