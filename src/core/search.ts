import MiniSearch from 'minisearch';

/** Documento indexable. `audience` permite comprobar que el índice del jugador no contiene contenido del DJ. */
export interface SearchDoc {
  id: string;
  /** Tipo de registro (`weapon`, `spell`, `narrative`…): decide la pantalla de detalle. */
  kind: string;
  title: string;
  aliases: string[];
  /** Categoría legible para filtrar y mostrar («Armas», «Hechizos»…). */
  category: string;
  /** Texto de contenido (efectos, descripción…). */
  text: string;
  audience: 'player' | 'dm';
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
}

/** Minúsculas y sin diacríticos: «Entropía» y «entropia» coinciden. */
export function normalizeTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export interface SearchIndex {
  readonly size: number;
  readonly docs: readonly SearchDoc[];
  search(query: string, options?: { categories?: readonly string[]; limit?: number }): SearchHit[];
  categories(): string[];
}

/**
 * Índice MiniSearch por nombre, alias, categoría y contenido. Búsqueda por prefijo y tolerante a erratas leves;
 * el nombre y los alias pesan más que el contenido.
 */
export function createSearchIndex(docs: readonly SearchDoc[]): SearchIndex {
  const ids = new Set<string>();
  for (const d of docs) {
    if (ids.has(d.id)) throw new Error(`Documento de búsqueda duplicado: ${d.id}`);
    ids.add(d.id);
  }
  const byId = new Map(docs.map((d) => [d.id, d]));
  const mini = new MiniSearch<SearchDoc>({
    fields: ['title', 'aliasText', 'category', 'text'],
    storeFields: ['id'],
    extractField: (doc, field) => (field === 'aliasText' ? doc.aliases.join(' ') : ((doc as unknown as Record<string, string>)[field] ?? '')),
    processTerm: (term) => {
      const t = normalizeTerm(term);
      return t.length ? t : null;
    },
    searchOptions: { boost: { title: 4, aliasText: 3, category: 1.5 }, prefix: true, fuzzy: (term) => (term.length > 5 ? 0.15 : false), combineWith: 'AND' },
  });
  mini.addAll(docs as SearchDoc[]);
  const categories = [...new Set(docs.map((d) => d.category))].sort((a, b) => a.localeCompare(b, 'es'));

  return {
    size: docs.length,
    docs,
    categories: () => categories,
    search(query, options = {}) {
      const q = query.trim();
      if (!q) return [];
      const allowed = options.categories?.length ? new Set(options.categories) : null;
      const hits: SearchHit[] = [];
      let found = mini.search(q);
      if (!found.length) {
        // Sin coincidencias con todos los términos: se amplía a cualquiera de los significativos (se ignoran «de», «la»…).
        const significant = q.split(/\s+/).filter((t) => normalizeTerm(t).length >= 4);
        if (significant.length > 1) found = mini.search(significant.join(' '), { combineWith: 'OR' });
      }
      for (const r of found) {
        const doc = byId.get(r.id as string);
        if (!doc || (allowed && !allowed.has(doc.category))) continue;
        hits.push({ doc, score: r.score });
        if (options.limit && hits.length >= options.limit) break;
      }
      return hits;
    },
  };
}
