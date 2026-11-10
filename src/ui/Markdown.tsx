import { Fragment, type ReactNode } from 'react';
import { Table } from './Table';
import styles from './Markdown.module.css';

/** Negrita, cursiva y código en línea. Sin HTML crudo: todo se devuelve como nodos de React. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const token = m[0];
    if (token.startsWith('**')) out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) out.push(<code key={key++}>{token.slice(1, -1)}</code>);
    else out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    last = i + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l) && l.includes('-');
const cells = (l: string) =>
  l
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

/**
 * Renderizador mínimo del Markdown del compendio: encabezados, párrafos, listas, citas y tablas (que se
 * convierten en tarjetas en móvil). No admite HTML.
 */
export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i] as string;
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(6, Math.max(3, (heading[1] as string).length + 1));
      const Tag = `h${level}` as 'h3' | 'h4' | 'h5' | 'h6';
      nodes.push(<Tag key={key++}>{inline(heading[2] as string)}</Tag>);
      i++;
      continue;
    }
    if (isTableLine(line) && isSeparator(lines[i + 1] ?? '')) {
      const header = cells(line);
      i += 2;
      const rows: ReactNode[][] = [];
      while (i < lines.length && isTableLine(lines[i] as string)) {
        rows.push(cells(lines[i] as string).map((c, n) => <Fragment key={n}>{inline(c)}</Fragment>));
        i++;
      }
      nodes.push(<Table key={key++} columns={header} rows={rows} />);
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i] as string)) {
        quote.push((lines[i] as string).replace(/^\s*>\s?/, ''));
        i++;
      }
      const paragraphs = quote.join('\n').split(/\n\s*\n/).filter(Boolean);
      nodes.push(
        <blockquote key={key++}>
          {paragraphs.map((p, n) => (
            <p key={n}>{inline(p.replace(/\n/g, ' '))}</p>
          ))}
        </blockquote>,
      );
      continue;
    }
    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i] as string)) {
        let text = (lines[i] as string).replace(re, '');
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i] as string) && !re.test(lines[i] as string)) {
          text += ` ${(lines[i] as string).trim()}`;
          i++;
        }
        items.push(text);
      }
      const children = items.map((t, n) => <li key={n}>{inline(t)}</li>);
      nodes.push(ordered ? <ol key={key++}>{children}</ol> : <ul key={key++}>{children}</ul>);
      continue;
    }
    if (/^-{3,}\s*$/.test(line)) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] as string).trim() &&
      !/^(#{1,6}\s|\s*>|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i] as string) &&
      !isTableLine(lines[i] as string)
    ) {
      para.push((lines[i] as string).trim());
      i++;
    }
    if (para.length) nodes.push(<p key={key++}>{inline(para.join(' '))}</p>);
    else i++;
  }
  return <div className={styles.markdown}>{nodes}</div>;
}
